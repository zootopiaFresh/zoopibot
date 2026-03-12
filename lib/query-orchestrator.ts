import { generateSQL, type SQLResponse } from './claude';
import { logGenerationError } from './error-logger';
import { executeQuery } from './mysql';
import {
  resolveSchemaContext,
  type ResolvedSchemaContext,
} from './schema-explorer';

interface ChatHistoryLike {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
}

interface GenerateSQLWithRecoveryOptions {
  question: string;
  history?: ChatHistoryLike[];
  userId?: string;
  sessionId?: string;
}

interface GenerateSQLWithRecoveryResult {
  result: SQLResponse;
  schemaContexts: ResolvedSchemaContext[];
}

const INITIAL_SCHEMA_LIMIT = 4;
const RECOVERY_SCHEMA_LIMIT = 8;
const MAX_SCHEMA_RECOVERY_ATTEMPTS = 1;

function shouldRetryWithBroaderSchema(result: SQLResponse) {
  if (result.sql.trim() || result.needsData || result.parseError) {
    return false;
  }

  const explanation = result.explanation.trim();
  if (!explanation) {
    return true;
  }

  return /(없었|없습니다|없어요|찾지 못|못했|확인되지 않|불명확|모호|추정|다른 이름|연관 테이블|대체 용어|스키마|테이블)/.test(explanation);
}

function buildRecoveryHistory(
  history: ChatHistoryLike[] | undefined,
  priorContexts: ResolvedSchemaContext[],
  previousResult: SQLResponse
): ChatHistoryLike[] {
  const priorTables = Array.from(
    new Set(priorContexts.flatMap((context) => context.selectedItems))
  );

  return [
    ...(history ?? []),
    {
      role: 'assistant',
      content: [
        '직전 시도에서는 질문에 맞는 핵심 스키마를 확정하지 못했습니다.',
        priorTables.length > 0 ? `이미 확인한 테이블: ${priorTables.join(', ')}` : '이미 확인한 테이블: 없음',
        `직전 응답 요약: ${previousResult.explanation.trim() || '설명 없음'}`,
        '이번에는 새로 제공된 스키마를 우선 검토해 다시 SQL을 작성하세요.',
      ].join('\n'),
    },
  ];
}

function hasNewSchemaContext(
  nextContext: ResolvedSchemaContext,
  priorContexts: ResolvedSchemaContext[]
) {
  const seenItems = new Set(priorContexts.flatMap((context) => context.selectedItems));
  if (nextContext.selectedItems.some((item) => !seenItems.has(item))) {
    return true;
  }

  return priorContexts.every(
    (context) =>
      context.source !== nextContext.source || context.selectedChars !== nextContext.selectedChars
  );
}

export async function generateSQLWithRecovery(
  options: GenerateSQLWithRecoveryOptions
): Promise<GenerateSQLWithRecoveryResult> {
  const { question, history, userId, sessionId } = options;
  const schemaContexts: ResolvedSchemaContext[] = [];

  let activeContext = await resolveSchemaContext(question, history, sessionId, {
    limit: INITIAL_SCHEMA_LIMIT,
  });
  schemaContexts.push(activeContext);

  let result = await generateSQL(
    question,
    activeContext.schema,
    history,
    undefined,
    userId,
    sessionId
  );

  for (let attempt = 0; attempt < MAX_SCHEMA_RECOVERY_ATTEMPTS; attempt += 1) {
    if (!shouldRetryWithBroaderSchema(result)) {
      break;
    }

    const priorSelectedItems = Array.from(
      new Set(schemaContexts.flatMap((context) => context.selectedItems))
    );
    const retryContext = await resolveSchemaContext(question, history, sessionId, {
      limit: RECOVERY_SCHEMA_LIMIT,
      excludedTables: priorSelectedItems,
      retryReason: result.explanation,
      previousSelectedItems: priorSelectedItems,
    });

    if (!hasNewSchemaContext(retryContext, schemaContexts)) {
      break;
    }

    console.log(
      `[QueryOrchestrator] schema recovery attempt=${attempt + 1} tables=${retryContext.selectedItems.join(', ')} source=${retryContext.source}`
    );

    schemaContexts.push(retryContext);
    activeContext = retryContext;
    result = await generateSQL(
      question,
      activeContext.schema,
      buildRecoveryHistory(history, schemaContexts.slice(0, -1), result),
      undefined,
      userId,
      sessionId
    );
  }

  if (result.needsData && result.dataQuery) {
    try {
      const queryResult = await executeQuery(result.dataQuery);
      result = await generateSQL(
        question,
        activeContext.schema,
        history,
        {
          query: result.dataQuery,
          data: queryResult.rows,
        },
        userId,
        sessionId
      );
    } catch (queryError: any) {
      logGenerationError({
        errorType: 'db_query_error',
        errorMessage: `데이터 확인 쿼리 실패: ${queryError.message}`,
        userId,
        sessionId,
        prompt: question,
        metadata: { dataQuery: result.dataQuery },
      });

      result = {
        ...result,
        sql: '',
        explanation: `⚠️ 데이터 확인 중 오류가 발생했습니다: ${queryError.message}\n\n시도한 쿼리:\n\`\`\`sql\n${result.dataQuery}\n\`\`\`\n\n질문을 다시 시도해주세요.`,
        needsData: false,
        parseError: true,
      };
    }
  }

  return {
    result,
    schemaContexts,
  };
}
