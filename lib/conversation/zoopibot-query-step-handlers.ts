import type {
  AIRunner,
  ConversationMessage,
  StepHandlerMap,
  WorkflowHistoryMessage,
  WorkflowState,
} from '@zootopiafresh/agent-core';

import { generateSQL } from '@/lib/claude';
import type { QueryResultSnapshot, ReportPresentation } from '@/lib/presentation';

import {
  buildZoopibotMessageResult,
  readZoopibotHistorySql,
  type ZoopibotValidationArtifactData,
} from './zoopibot-result';

export interface ResolveSchemaInput {
  question: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string; sql?: string }>;
  sessionId?: string;
  limit?: number;
  excludedTables?: string[];
  retryReason?: string;
  previousSelectedItems?: string[];
  promptRules?: {
    plannerAppendix?: string[];
    sqlAppendix?: string[];
    presentationAppendix?: string[];
  };
  aiRunner?: AIRunner;
}

export interface ResolveSchemaResult {
  schema: string;
  source: 'mysql-explorer' | 'schema-prompts';
  selectedItems: string[];
  selectedChars: number;
  fallbackUsed: boolean;
}

export interface BuildPresentationInput {
  question: string;
  sql: string;
  explanation: string;
  queryResult: QueryExecutionResult;
  sessionId?: string;
  promptRules?: {
    plannerAppendix?: string[];
    sqlAppendix?: string[];
    presentationAppendix?: string[];
  };
  aiRunner?: AIRunner;
}

export interface QueryExecutionResult {
  rows: any[];
  fields: any[];
}

export interface ZoopibotQueryCapabilities extends Record<string, unknown> {
  resolveSchema?: (input: ResolveSchemaInput) => Promise<ResolveSchemaResult>;
  executeQuery?: (sql: string) => Promise<QueryExecutionResult>;
  buildPresentation?: (input: BuildPresentationInput) => Promise<{
    snapshot: QueryResultSnapshot;
    presentation: ReportPresentation;
  }>;
  logError?: (input: {
    errorType: string;
    errorMessage: string;
    userId?: string;
    threadId?: string;
    runId?: string;
    messageId?: string;
    prompt?: string;
    rawResponse?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

interface QueryModelResult {
  sql: string;
  explanation: string;
  needsData?: boolean;
  dataQuery?: string;
  parseError?: boolean;
  validated?: boolean;
  validationMode?: 'none' | 'data-query' | 'final-sql';
  validationError?: string;
  validationAttempts?: number;
}

interface ZoopibotQueryState {
  recoveryHistory: Array<{ role: 'user' | 'assistant'; content: string; sql?: string }>;
  schemaResult?: ResolveSchemaResult;
  schemaResults: ResolveSchemaResult[];
  result?: QueryModelResult;
  queryResult?: QueryExecutionResult;
  validatedExecution?: QueryExecutionResult | null;
  presentation?: ReportPresentation | null;
  resultSnapshot?: QueryResultSnapshot | null;
  dataQueryExecuted: boolean;
  executionRecoveryAttempts: number;
}

const ZOOPIBOT_QUERY_STATE_KEY = 'zoopibotQueryState';

function normalizeMetaBoolean(meta: Record<string, unknown> | undefined, key: string, fallback = false) {
  const value = meta?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

function toQueryHistory(history: WorkflowHistoryMessage[]) {
  return history.map((message) => ({
    role: message.role,
    content: message.content,
    sql: readZoopibotHistorySql(message),
  }));
}

function getQueryState(state: WorkflowState): ZoopibotQueryState {
  const existing = state.values[ZOOPIBOT_QUERY_STATE_KEY] as ZoopibotQueryState | undefined;
  if (existing) {
    return existing;
  }

  const next: ZoopibotQueryState = {
    recoveryHistory: [],
    schemaResults: [],
    validatedExecution: null,
    dataQueryExecuted: false,
    executionRecoveryAttempts: 0,
  };
  state.values[ZOOPIBOT_QUERY_STATE_KEY] = next;
  return next;
}

function syncFlags(state: WorkflowState, queryState: ZoopibotQueryState) {
  const result = queryState.result;

  const toggle = (flag: string, enabled: boolean) => {
    if (enabled) {
      state.flags.add(flag);
    } else {
      state.flags.delete(flag);
    }
  };

  toggle('hasSql', Boolean(result?.sql?.trim()));
  toggle('needsData', Boolean(result?.needsData && result?.dataQuery));
  toggle('validatedFalse', result?.validated === false);
  toggle('hasValidatedExecution', Boolean(queryState.validatedExecution));
  toggle('hasPresentation', Boolean(queryState.presentation));
  toggle('hasResultSnapshot', Boolean(queryState.resultSnapshot));
}

function shouldRetryWithBroaderSchema(result: QueryModelResult | undefined) {
  if (!result) {
    return false;
  }

  if (result.sql.trim() || result.needsData || result.parseError) {
    return false;
  }

  const explanation = result.explanation.trim();
  if (!explanation) {
    return true;
  }

  return /(없었|없습니다|없어요|찾지 못|못했|확인되지 않|불명확|모호|추정|다른 이름|연관 테이블|대체 용어|스키마|테이블)/.test(
    explanation
  );
}

function buildRecoveryHistory(
  history: Array<{ role: 'user' | 'assistant'; content: string; sql?: string }>,
  priorContexts: ResolveSchemaResult[],
  previousResult: QueryModelResult
) {
  const priorTables = Array.from(
    new Set(priorContexts.flatMap((context) => context.selectedItems))
  );

  return [
    ...history,
    {
      role: 'assistant' as const,
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
  history: Array<{ role: 'user' | 'assistant'; content: string; sql?: string }>,
  failedQuery: string,
  errorMessage: string,
  previousResult: QueryModelResult,
  stage: 'data-query' | 'final-sql'
) {
  return [
    ...history,
    {
      role: 'assistant' as const,
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

function hasNewSchemaContext(nextContext: ResolveSchemaResult, priorContexts: ResolveSchemaResult[]) {
  const seenItems = new Set(priorContexts.flatMap((context) => context.selectedItems));
  if (nextContext.selectedItems.some((item) => !seenItems.has(item))) {
    return true;
  }

  return priorContexts.every(
    (context) =>
      context.source !== nextContext.source || context.selectedChars !== nextContext.selectedChars
  );
}

async function executeQueryTool(
  sql: string,
  context: Parameters<NonNullable<StepHandlerMap<ZoopibotQueryCapabilities>[string]>>[0]
) {
  const tool = context.runtime.tools.get('execute_query');
  if (tool) {
    return (await tool.execute(sql, {
      threadId: context.runtime.threadId,
      runId: context.runtime.runId,
      meta: context.runtime.meta,
    })) as QueryExecutionResult;
  }

  const fallback = context.runtime.capabilities.executeQuery;
  if (fallback) {
    return fallback(sql);
  }

  throw new Error('query 실행 도구를 찾을 수 없습니다: execute_query');
}

function setMessagePatch(
  context: Parameters<NonNullable<StepHandlerMap<ZoopibotQueryCapabilities>[string]>>[0],
  queryState: ZoopibotQueryState
) {
  if (!queryState.result) {
    return;
  }

  const validation: ZoopibotValidationArtifactData | null =
    queryState.result.validated === undefined &&
    !queryState.result.validationMode &&
    !queryState.result.validationError &&
    queryState.result.validationAttempts == null
      ? null
      : {
          validated: queryState.result.validated ?? null,
          mode: queryState.result.validationMode ?? null,
          error: queryState.result.validationError ?? null,
          attempts: queryState.result.validationAttempts ?? null,
        };

  context.state.values.messagePatch = {
    content: queryState.result.explanation || '쿼리를 생성했습니다.',
    status: 'completed',
    result: buildZoopibotMessageResult({
      outputContract: context.runtime.spec.outputContract,
      sql: queryState.result.sql || null,
      presentation: queryState.presentation ?? null,
      resultSnapshot: queryState.resultSnapshot ?? null,
      validation,
      meta: {
        needsData: Boolean(queryState.result.needsData),
        dataQuery: queryState.result.dataQuery ?? null,
      },
    }),
    parseError: Boolean(queryState.result.parseError),
    error: null,
  } satisfies Partial<ConversationMessage>;
}

function buildAIPromptRules(
  promptRules: Parameters<typeof generateSQL>[6]
) {
  return promptRules;
}

export const ZOOPIBOT_QUERY_STEP_KINDS = [
  'resolve_schema',
  'model_call',
  'execute_query',
  'build_result',
];

export function createZoopibotQueryStepHandlers(): StepHandlerMap<ZoopibotQueryCapabilities> {
  return {
    async resolve_schema(context) {
      const caps = context.runtime.capabilities;
      const resolver = caps.resolveSchema;
      if (!resolver) {
        throw new Error('resolve_schema capability가 필요합니다.');
      }

      const queryState = getQueryState(context.state);
      queryState.recoveryHistory = toQueryHistory(context.state.history);

      const excludedTables = queryState.schemaResults.flatMap((result) => result.selectedItems);
      const schemaResult = await resolver({
        question: context.runtime.input,
        history: queryState.recoveryHistory,
        sessionId: context.runtime.threadId,
        limit: context.runtime.spec.thresholds.initialSchemaLimit,
        excludedTables,
        promptRules: context.runtime.spec.promptRules,
        aiRunner: context.aiRunner,
      });

      queryState.schemaResult = schemaResult;
      queryState.schemaResults.push(schemaResult);
      syncFlags(context.state, queryState);
    },

    async model_call(context) {
      const caps = context.runtime.capabilities;
      const queryState = getQueryState(context.state);
      const activeSchema = queryState.schemaResult?.schema;
      let result = await generateSQL(
        context.runtime.input,
        activeSchema,
        queryState.recoveryHistory,
        undefined,
        context.runtime.userId,
        context.runtime.threadId,
        buildAIPromptRules({
          aiRunner: context.aiRunner,
          sqlAppendix: context.runtime.spec.promptRules.sqlAppendix,
        })
      );

      const maxSchemaRecoveryAttempts = context.runtime.spec.thresholds.maxSchemaRecoveryAttempts ?? 1;
      const recoverySchemaLimit = context.runtime.spec.thresholds.recoverySchemaLimit ?? 8;

      for (let attempt = 0; attempt < maxSchemaRecoveryAttempts; attempt += 1) {
        if (!shouldRetryWithBroaderSchema(result)) {
          break;
        }

        const resolver = caps.resolveSchema;
        if (!resolver) {
          break;
        }

        const priorSelectedItems = Array.from(
          new Set(queryState.schemaResults.flatMap((schemaResult) => schemaResult.selectedItems))
        );
        const retryContext = await resolver({
          question: context.runtime.input,
          history: queryState.recoveryHistory,
          sessionId: context.runtime.threadId,
          limit: recoverySchemaLimit,
          excludedTables: priorSelectedItems,
          retryReason: result.explanation,
          previousSelectedItems: priorSelectedItems,
          promptRules: context.runtime.spec.promptRules,
          aiRunner: context.aiRunner,
        });

        if (!hasNewSchemaContext(retryContext, queryState.schemaResults)) {
          break;
        }

        queryState.schemaResults.push(retryContext);
        queryState.schemaResult = retryContext;
        queryState.recoveryHistory = buildRecoveryHistory(
          toQueryHistory(context.state.history),
          queryState.schemaResults.slice(0, -1),
          result
        );
        result = await generateSQL(
          context.runtime.input,
          retryContext.schema,
          queryState.recoveryHistory,
          undefined,
          context.runtime.userId,
          context.runtime.threadId,
          buildAIPromptRules({
            aiRunner: context.aiRunner,
            sqlAppendix: context.runtime.spec.promptRules.sqlAppendix,
          })
        );
      }

      queryState.result = result;
      syncFlags(context.state, queryState);
      setMessagePatch(context, queryState);
    },

    async execute_query(context) {
      const queryState = getQueryState(context.state);
      if (!queryState.result) {
        return;
      }

      const maxExecutionRecoveryAttempts =
        context.runtime.spec.thresholds.maxQueryExecutionRecoveryAttempts ?? 2;

      while (queryState.result.needsData && queryState.result.dataQuery) {
        try {
          const queryResult = await executeQueryTool(queryState.result.dataQuery, context);
          queryState.dataQueryExecuted = true;
          queryState.queryResult = queryResult;
          queryState.result = await generateSQL(
            context.runtime.input,
            queryState.schemaResult?.schema,
            queryState.recoveryHistory,
            {
              query: queryState.result.dataQuery,
              data: queryResult.rows,
            },
            context.runtime.userId,
            context.runtime.threadId,
            buildAIPromptRules({
              aiRunner: context.aiRunner,
              sqlAppendix: context.runtime.spec.promptRules.sqlAppendix,
            })
          );
        } catch (error: any) {
          const failedDataQuery = queryState.result.dataQuery ?? '';
          await context.utils.logError({
            errorType: 'db_query_error',
            errorMessage: `데이터 확인 쿼리 실패: ${error.message}`,
            userId: context.runtime.userId,
            threadId: context.runtime.threadId,
            runId: context.runtime.runId,
            messageId: context.runtime.outputMessage.id,
            prompt: context.runtime.input,
            metadata: { dataQuery: failedDataQuery },
          });

          queryState.executionRecoveryAttempts += 1;
          if (queryState.executionRecoveryAttempts > maxExecutionRecoveryAttempts) {
            queryState.result = {
              ...queryState.result,
              sql: '',
              explanation: `⚠️ 데이터 확인 쿼리 실행에 계속 실패했습니다: ${error.message}\n\n마지막 시도 쿼리:\n\`\`\`sql\n${failedDataQuery}\n\`\`\`\n\n숫자를 확정하지 않고 여기서 멈춥니다. 스키마나 컬럼명을 다시 확인한 뒤 재시도해주세요.`,
              needsData: false,
              parseError: true,
              validated: false,
              validationMode: 'data-query',
              validationError: error.message,
              validationAttempts: queryState.executionRecoveryAttempts,
            };
            break;
          }

          queryState.recoveryHistory = buildQueryFailureHistory(
            queryState.recoveryHistory,
            failedDataQuery,
            error.message,
            queryState.result,
            'data-query'
          );

          queryState.result = await generateSQL(
            context.runtime.input,
            queryState.schemaResult?.schema,
            queryState.recoveryHistory,
            undefined,
            context.runtime.userId,
            context.runtime.threadId,
            buildAIPromptRules({
              aiRunner: context.aiRunner,
              sqlAppendix: context.runtime.spec.promptRules.sqlAppendix,
            })
          );
        }
      }

      if (!normalizeMetaBoolean(context.runtime.meta, 'autoExecute', true) || !queryState.result?.sql?.trim()) {
        if (queryState.result && queryState.result.validated === undefined) {
          queryState.result = {
            ...queryState.result,
            validated: !queryState.result.parseError,
            validationMode: queryState.dataQueryExecuted ? 'data-query' : 'none',
            validationAttempts: queryState.executionRecoveryAttempts,
          };
        }
        syncFlags(context.state, queryState);
        setMessagePatch(context, queryState);
        return;
      }

      while (queryState.result.sql.trim()) {
        try {
          const queryResult = await executeQueryTool(queryState.result.sql, context);
          queryState.validatedExecution = queryResult;
          queryState.result = {
            ...queryState.result,
            validated: true,
            validationMode: 'final-sql',
            validationAttempts: queryState.executionRecoveryAttempts,
          };
          break;
        } catch (error: any) {
          await context.utils.logError({
            errorType: 'db_query_error',
            errorMessage: `최종 SQL 검증 실패: ${error.message}`,
            userId: context.runtime.userId,
            threadId: context.runtime.threadId,
            runId: context.runtime.runId,
            messageId: context.runtime.outputMessage.id,
            prompt: context.runtime.input,
            metadata: { sql: queryState.result.sql },
          });

          queryState.executionRecoveryAttempts += 1;
          if (queryState.executionRecoveryAttempts > maxExecutionRecoveryAttempts) {
            queryState.result = {
              ...queryState.result,
              explanation: `⚠️ 최종 SQL 실행 검증에 실패했습니다: ${error.message}\n\n마지막 시도 쿼리:\n\`\`\`sql\n${queryState.result.sql}\n\`\`\`\n\n검증에 실패했기 때문에 이 결과를 확정 답변으로 사용하지 않습니다.`,
              validated: false,
              validationMode: 'final-sql',
              validationError: error.message,
              validationAttempts: queryState.executionRecoveryAttempts,
            };
            break;
          }

          queryState.recoveryHistory = buildQueryFailureHistory(
            queryState.recoveryHistory,
            queryState.result.sql,
            error.message,
            queryState.result,
            'final-sql'
          );

          queryState.result = await generateSQL(
            context.runtime.input,
            queryState.schemaResult?.schema,
            queryState.recoveryHistory,
            undefined,
            context.runtime.userId,
            context.runtime.threadId,
            buildAIPromptRules({
              aiRunner: context.aiRunner,
              sqlAppendix: context.runtime.spec.promptRules.sqlAppendix,
            })
          );
          queryState.validatedExecution = null;
        }
      }

      if (queryState.result && queryState.result.validated === undefined) {
        queryState.result = {
          ...queryState.result,
          validated: !queryState.result.parseError,
          validationMode: queryState.dataQueryExecuted ? 'data-query' : 'none',
          validationAttempts: queryState.executionRecoveryAttempts,
        };
      }
      syncFlags(context.state, queryState);
      setMessagePatch(context, queryState);
    },

    async build_result(context) {
      const caps = context.runtime.capabilities;
      const queryState = getQueryState(context.state);

      if (!queryState.result?.sql || queryState.result.validated === false) {
        setMessagePatch(context, queryState);
        return;
      }

      const buildPresentation = caps.buildPresentation;
      if (!buildPresentation) {
        setMessagePatch(context, queryState);
        return;
      }

      try {
        const executionResult =
          queryState.validatedExecution ??
          (await executeQueryTool(queryState.result.sql, context));

        const built = await buildPresentation({
          question: context.runtime.input,
          sql: queryState.result.sql,
          explanation: queryState.result.explanation,
          queryResult: executionResult,
          sessionId: context.runtime.threadId,
          promptRules: context.runtime.spec.promptRules,
          aiRunner: context.aiRunner,
        });

        queryState.resultSnapshot = built.snapshot;
        queryState.presentation = built.presentation;

        await context.runtime.events.emit({
          type: 'artifact.ready',
          threadId: context.runtime.threadId,
          runId: context.runtime.runId,
          artifactKey: 'resultSnapshot',
          artifact: { kind: 'resultSnapshot', data: built.snapshot },
        });
        await context.runtime.events.emit({
          type: 'artifact.ready',
          threadId: context.runtime.threadId,
          runId: context.runtime.runId,
          artifactKey: 'presentation',
          artifact: { kind: 'presentation', data: built.presentation },
        });
      } catch (error: any) {
        await context.utils.logError({
          errorType: 'db_query_error',
          errorMessage: `자동 실행 실패: ${error.message}`,
          userId: context.runtime.userId,
          threadId: context.runtime.threadId,
          runId: context.runtime.runId,
          messageId: context.runtime.outputMessage.id,
          prompt: context.runtime.input,
          metadata: { sql: queryState.result.sql },
        });
      }

      syncFlags(context.state, queryState);
      setMessagePatch(context, queryState);
    },
  };
}
