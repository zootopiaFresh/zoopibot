import { generateSQL, type SQLResponse } from './claude';
import { logGenerationError } from './error-logger';
import { executeQuery } from './mysql';
import {
  resolveSchemaContext,
  type ResolvedSchemaContext,
} from './schema-explorer';

export interface ChatHistoryLike {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
}

interface GenerateSQLWithRecoveryOptions {
  question: string;
  history?: ChatHistoryLike[];
  userId?: string;
  sessionId?: string;
  validateFinalSql?: boolean;
}

interface ValidatedExecutionResult {
  sql: string;
  rows: any[];
  fields: any[];
}

interface GenerateSQLWithRecoveryResult {
  result: SQLResponse;
  schemaContexts: ResolvedSchemaContext[];
  validatedExecution: ValidatedExecutionResult | null;
}

const INITIAL_SCHEMA_LIMIT = 4;
const RECOVERY_SCHEMA_LIMIT = 8;
const MAX_SCHEMA_RECOVERY_ATTEMPTS = 1;
const MAX_QUERY_EXECUTION_RECOVERY_ATTEMPTS = 2;

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

function buildQueryFailureHistory(
  history: ChatHistoryLike[] | undefined,
  failedQuery: string,
  errorMessage: string,
  previousResult: SQLResponse,
  stage: 'data-query' | 'final-sql'
): ChatHistoryLike[] {
  return [
    ...(history ?? []),
    {
      role: 'assistant',
      content: [
        stage === 'data-query'
          ? '직전 시도에서는 데이터 확인용 SQL 실행이 실패했습니다.'
          : '직전 시도에서는 최종 SQL 실행 검증이 실패했습니다.',
        previousResult.explanation.trim()
          ? `직전 응답 요약: ${previousResult.explanation.trim()}`
          : '직전 응답 요약: 없음',
        `실패 원인: ${errorMessage}`,
        `실패 SQL:\n\`\`\`sql\n${failedQuery}\n\`\`\``,
        '이번에는 실제 스키마에 맞는 실행 가능한 SQL만 작성하세요.',
        '실제 조회 결과가 없는 상태에서는 explanation에 확정 수치를 쓰지 마세요.',
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
  const { question, history, userId, sessionId, validateFinalSql = false } = options;
  const schemaContexts: ResolvedSchemaContext[] = [];
  let validatedExecution: ValidatedExecutionResult | null = null;
  let recoveryHistory = history;
  let executionRecoveryAttempts = 0;
  let dataQueryExecuted = false;

  const resolveDataQueries = async (currentResult: SQLResponse): Promise<SQLResponse> => {
    while (currentResult.needsData && currentResult.dataQuery) {
      try {
        const queryResult = await executeQuery(currentResult.dataQuery);
        dataQueryExecuted = true;
        currentResult = await generateSQL(
          question,
          activeContext.schema,
          recoveryHistory,
          {
            query: currentResult.dataQuery,
            data: queryResult.rows,
          },
          userId,
          sessionId
        );
      } catch (queryError: any) {
        const failedDataQuery = currentResult.dataQuery ?? '';
        logGenerationError({
          errorType: 'db_query_error',
          errorMessage: `데이터 확인 쿼리 실패: ${queryError.message}`,
          userId,
          sessionId,
          prompt: question,
          metadata: { dataQuery: failedDataQuery },
        });

        executionRecoveryAttempts += 1;
        if (executionRecoveryAttempts > MAX_QUERY_EXECUTION_RECOVERY_ATTEMPTS) {
          return {
            ...currentResult,
            sql: '',
            explanation: `⚠️ 데이터 확인 쿼리 실행에 계속 실패했습니다: ${queryError.message}\n\n마지막 시도 쿼리:\n\`\`\`sql\n${failedDataQuery}\n\`\`\`\n\n숫자를 확정하지 않고 여기서 멈춥니다. 스키마나 컬럼명을 다시 확인한 뒤 재시도해주세요.`,
            needsData: false,
            parseError: true,
            validated: false,
            validationMode: 'data-query',
            validationError: queryError.message,
            validationAttempts: executionRecoveryAttempts,
          };
        }

        recoveryHistory = buildQueryFailureHistory(
          recoveryHistory,
          failedDataQuery,
          queryError.message,
          currentResult,
          'data-query'
        );

        currentResult = await generateSQL(
          question,
          activeContext.schema,
          recoveryHistory,
          undefined,
          userId,
          sessionId
        );
      }
    }

    return currentResult;
  };

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

  result = await resolveDataQueries(result);

  while (validateFinalSql && result.sql.trim()) {
    try {
      const queryResult = await executeQuery(result.sql);
      validatedExecution = {
        sql: result.sql,
        rows: queryResult.rows,
        fields: queryResult.fields,
      };
      result = {
        ...result,
        validated: true,
        validationMode: 'final-sql',
        validationAttempts: executionRecoveryAttempts,
      };
      break;
    } catch (queryError: any) {
      logGenerationError({
        errorType: 'db_query_error',
        errorMessage: `최종 SQL 검증 실패: ${queryError.message}`,
        userId,
        sessionId,
        prompt: question,
        metadata: { sql: result.sql },
      });

      executionRecoveryAttempts += 1;
      if (executionRecoveryAttempts > MAX_QUERY_EXECUTION_RECOVERY_ATTEMPTS) {
        result = {
          ...result,
          explanation: `⚠️ 최종 SQL 실행 검증에 실패했습니다: ${queryError.message}\n\n마지막 시도 쿼리:\n\`\`\`sql\n${result.sql}\n\`\`\`\n\n검증에 실패했기 때문에 이 결과를 확정 답변으로 사용하지 않습니다.`,
          validated: false,
          validationMode: 'final-sql',
          validationError: queryError.message,
          validationAttempts: executionRecoveryAttempts,
        };
        break;
      }

      recoveryHistory = buildQueryFailureHistory(
        recoveryHistory,
        result.sql,
        queryError.message,
        result,
        'final-sql'
      );

      result = await generateSQL(
        question,
        activeContext.schema,
        recoveryHistory,
        undefined,
        userId,
        sessionId
      );

      validatedExecution = null;
      result = await resolveDataQueries(result);
    }
  }

  if (result.validated === undefined) {
    result = {
      ...result,
      validated: dataQueryExecuted ? !result.parseError : !validateFinalSql && !result.parseError,
      validationMode: dataQueryExecuted ? 'data-query' : 'none',
      validationAttempts: executionRecoveryAttempts,
    };
  }

  return {
    result,
    schemaContexts,
    validatedExecution,
  };
}
