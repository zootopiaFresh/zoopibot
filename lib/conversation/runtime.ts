import { randomUUID } from 'crypto';

import { generateSQL } from '@/lib/claude';
import {
  createSpecResolver,
  StaticAgentRegistry,
  StaticToolRegistry,
} from '@/lib/conversation/registry';
import type {
  AgentRegistry,
  AgentWorkflowState,
  BuildPresentationInput,
  ConversationMessage,
  ConversationMessageStatus,
  ConversationResultEnvelope,
  ConversationRun,
  ConversationRunAck,
  ConversationRuntime,
  ConversationState,
  ConversationStore,
  ConversationThreadHandle,
  EventSink,
  PromptRules,
  QueryExecutionResult,
  ResolvedAgentSpec,
  ResolveSchemaResult,
  SendInput,
  SpecResolver,
  StartRunInput,
  StepDefinition,
  StepStateFlag,
  ToolRegistry,
  TransportAdapter,
  ValidationMode,
  WorkflowContext,
  WorkflowErrorLogInput,
  WorkflowStepState,
} from '@/lib/conversation/types';

interface CreateConversationRuntimeOptions {
  transport: TransportAdapter;
  store: ConversationStore;
  agentRegistry?: AgentRegistry;
  toolRegistry?: ToolRegistry;
  eventSink?: EventSink;
  specResolver?: SpecResolver;
  capabilities?: WorkflowContext['capabilities'];
}

function nowIso() {
  return new Date().toISOString();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMetaBoolean(meta: Record<string, unknown> | undefined, key: string, fallback = false) {
  const value = meta?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeMetaString(meta: Record<string, unknown> | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === 'string' ? value : undefined;
}

function buildProgressLog(
  progressStages: ResolvedAgentSpec['progressStages'],
  activeStageId: string,
  options?: { failed?: boolean; detail?: string }
) {
  const activeIndex = progressStages.findIndex((stage) => stage.id === activeStageId);
  const activeStage =
    progressStages.find((stage) => stage.id === activeStageId) ?? progressStages[0];
  const detail = options?.detail || activeStage?.detail || '';

  return progressStages
    .map((stage, index) => {
      let marker = '[todo]';
      if (index < activeIndex) {
        marker = '[done]';
      } else if (index === activeIndex) {
        marker = options?.failed ? '[fail]' : '[run]';
      }

      const text = index === activeIndex && detail ? `${stage.label} - ${detail}` : stage.label;
      return `${marker} ${text}`;
    })
    .join('\n');
}

function toQueryHistory(messages: ConversationMessage[], currentOutputMessageId: string) {
  return messages
    .filter((message) => message.id !== currentOutputMessageId)
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
      sql: message.result?.sql ?? undefined,
    }));
}

function hasStateFlag(state: AgentWorkflowState, flag: StepStateFlag) {
  switch (flag) {
    case 'hasSql':
      return Boolean(state.result?.sql?.trim());
    case 'needsData':
      return Boolean(state.result?.needsData && state.result?.dataQuery);
    case 'validatedFalse':
      return state.result?.validated === false;
    case 'hasValidatedExecution':
      return Boolean(state.validatedExecution);
    case 'hasPresentation':
      return Boolean(state.presentation);
    case 'hasResultSnapshot':
      return Boolean(state.resultSnapshot);
    default:
      return false;
  }
}

function matchesStepCondition(
  step: StepDefinition,
  state: AgentWorkflowState,
  meta: Record<string, unknown> | undefined
) {
  if (!step.when) {
    return true;
  }

  if (step.when.metaEquals) {
    for (const [key, expected] of Object.entries(step.when.metaEquals)) {
      if (meta?.[key] !== expected) {
        return false;
      }
    }
  }

  if (step.when.stateTrue?.some((flag) => !hasStateFlag(state, flag))) {
    return false;
  }

  if (step.when.stateFalse?.some((flag) => hasStateFlag(state, flag))) {
    return false;
  }

  return true;
}

function shouldRetryWithBroaderSchema(result: AgentWorkflowState['result']) {
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
  history: AgentWorkflowState['history'],
  priorContexts: ResolveSchemaResult[],
  previousResult: NonNullable<AgentWorkflowState['result']>
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
  history: AgentWorkflowState['history'],
  failedQuery: string,
  errorMessage: string,
  previousResult: NonNullable<AgentWorkflowState['result']>,
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

function applyOutputContract(
  outputContract: ResolvedAgentSpec['outputContract'],
  result: NonNullable<AgentWorkflowState['result']>,
  presentation: AgentWorkflowState['presentation'],
  resultSnapshot: AgentWorkflowState['resultSnapshot']
): ConversationResultEnvelope {
  return {
    sql: outputContract.includeSql ? result.sql || null : null,
    presentation:
      outputContract.includePresentation && presentation
        ? { kind: 'presentation', data: presentation }
        : null,
    resultSnapshot:
      outputContract.includeResultSnapshot && resultSnapshot
        ? { kind: 'resultSnapshot', data: resultSnapshot }
        : null,
    validation: outputContract.includeValidation
      ? {
          validated: result.validated ?? null,
          mode: result.validationMode ?? null,
          error: result.validationError ?? null,
          attempts: result.validationAttempts ?? null,
        }
      : null,
  };
}

function createTransportRunner(ctx: WorkflowContext) {
  return async (
    prompt: string,
    options?: string | { sessionKey?: string; systemPrompt?: string; timeout?: number }
  ) => {
    const normalizedOptions =
      typeof options === 'string' ? { sessionKey: options } : options ?? {};
    const response = await ctx.transport.call({
      prompt,
      systemPrompt: normalizedOptions.systemPrompt,
      threadKey: normalizedOptions.sessionKey || ctx.threadState?.threadKey || ctx.threadId,
      timeoutMs: normalizedOptions.timeout,
    });

    return response.content;
  };
}

async function logWorkflowError(
  ctx: WorkflowContext,
  input: WorkflowErrorLogInput
) {
  if (ctx.capabilities.logError) {
    await ctx.capabilities.logError(input);
    return;
  }

  console.error('[ConversationRuntime]', input.errorType, input.errorMessage, input.metadata);
}

async function executeQueryTool(
  toolRegistry: ToolRegistry,
  toolId: string,
  ctx: WorkflowContext,
  sql: string
) {
  const tool = toolRegistry.get(toolId);
  if (tool) {
    return (await tool.execute(sql, {
      threadId: ctx.threadId,
      runId: ctx.runId,
      meta: ctx.meta,
    })) as QueryExecutionResult;
  }

  if (ctx.capabilities.executeQuery) {
    return ctx.capabilities.executeQuery(sql);
  }

  throw new Error(`query 실행 도구를 찾을 수 없습니다: ${toolId}`);
}

async function emitProgress(
  ctx: WorkflowContext,
  state: AgentWorkflowState,
  stageId: string,
  options?: { failed?: boolean; detail?: string }
) {
  const stage = ctx.spec.progressStages.find((item) => item.id === stageId);
  state.activeStageId = stageId;

  await ctx.events.emit({
    type: 'step.changed',
    threadId: ctx.threadId,
    runId: ctx.runId,
    step: {
      runId: ctx.runId,
      step: stageId,
      label: stage?.label,
      status: options?.failed ? 'failed' : 'running',
      detail: options?.detail || stage?.detail,
      updatedAt: nowIso(),
    },
  });

  ctx.outputMessage = await ctx.store.updateMessage(ctx.outputMessage.id, {
    content: buildProgressLog(ctx.spec.progressStages, stageId, options),
    status: 'running',
    startedAt: ctx.outputMessage.startedAt ?? nowIso(),
  });

  await ctx.events.emit({
    type: 'message.updated',
    threadId: ctx.threadId,
    message: ctx.outputMessage,
  });
}

async function runStep(
  step: StepDefinition,
  ctx: WorkflowContext,
  state: AgentWorkflowState
) {
  const aiRunner = createTransportRunner(ctx);
  const promptRules: PromptRules = ctx.spec.promptRules;

  switch (step.kind) {
    case 'prepare_history': {
      state.history = toQueryHistory(ctx.history, ctx.outputMessage.id);
      state.recoveryHistory = state.history;
      return;
    }

    case 'emit_step': {
      const stageId =
        typeof step.config?.stageId === 'string' ? step.config.stageId : 'schema';
      await emitProgress(ctx, state, stageId);
      return;
    }

    case 'resolve_schema': {
      const resolver = ctx.capabilities.resolveSchema;
      if (!resolver) {
        throw new Error('resolve_schema capability가 필요합니다.');
      }

      const excludedTables = state.schemaResults.flatMap((result) => result.selectedItems);
      const schemaResult = await resolver({
        question: ctx.input,
        history: state.recoveryHistory,
        sessionId: ctx.threadId,
        limit: ctx.spec.thresholds.initialSchemaLimit,
        excludedTables,
        promptRules,
        aiRunner,
      });

      state.schemaResult = schemaResult;
      state.schemaResults.push(schemaResult);
      return;
    }

    case 'model_call': {
      const activeSchema = state.schemaResult?.schema;
      let result = await generateSQL(
        ctx.input,
        activeSchema,
        state.recoveryHistory,
        undefined,
        ctx.userId,
        ctx.threadId,
        {
          aiRunner,
          sqlAppendix: promptRules.sqlAppendix,
        }
      );

      for (let attempt = 0; attempt < ctx.spec.thresholds.maxSchemaRecoveryAttempts; attempt += 1) {
        if (!shouldRetryWithBroaderSchema(result)) {
          break;
        }

        const resolver = ctx.capabilities.resolveSchema;
        if (!resolver) {
          break;
        }

        const priorSelectedItems = Array.from(
          new Set(state.schemaResults.flatMap((schemaResult) => schemaResult.selectedItems))
        );
        const retryContext = await resolver({
          question: ctx.input,
          history: state.recoveryHistory,
          sessionId: ctx.threadId,
          limit: ctx.spec.thresholds.recoverySchemaLimit,
          excludedTables: priorSelectedItems,
          retryReason: result.explanation,
          previousSelectedItems: priorSelectedItems,
          promptRules,
          aiRunner,
        });

        if (!hasNewSchemaContext(retryContext, state.schemaResults)) {
          break;
        }

        state.schemaResults.push(retryContext);
        state.schemaResult = retryContext;
        state.recoveryHistory = buildRecoveryHistory(
          state.history,
          state.schemaResults.slice(0, -1),
          result
        );
        result = await generateSQL(
          ctx.input,
          retryContext.schema,
          state.recoveryHistory,
          undefined,
          ctx.userId,
          ctx.threadId,
          {
            aiRunner,
            sqlAppendix: promptRules.sqlAppendix,
          }
        );
      }

      state.result = result;
      return;
    }

    case 'execute_query': {
      const toolId =
        typeof step.config?.toolId === 'string' ? step.config.toolId : 'execute_query';
      if (!state.result) {
        return;
      }

      while (state.result.needsData && state.result.dataQuery) {
        try {
          const queryResult = await executeQueryTool(ctx.tools, toolId, ctx, state.result.dataQuery);
          state.dataQueryExecuted = true;
          state.queryResult = queryResult;
          state.result = await generateSQL(
            ctx.input,
            state.schemaResult?.schema,
            state.recoveryHistory,
            {
              query: state.result.dataQuery,
              data: queryResult.rows,
            },
            ctx.userId,
            ctx.threadId,
            {
              aiRunner,
              sqlAppendix: promptRules.sqlAppendix,
            }
          );
        } catch (error: any) {
          const failedDataQuery = state.result.dataQuery ?? '';
          await logWorkflowError(ctx, {
            errorType: 'db_query_error',
            errorMessage: `데이터 확인 쿼리 실패: ${error.message}`,
            userId: ctx.userId,
            threadId: ctx.threadId,
            runId: ctx.runId,
            messageId: ctx.outputMessage.id,
            prompt: ctx.input,
            metadata: { dataQuery: failedDataQuery },
          });

          state.executionRecoveryAttempts += 1;
          if (state.executionRecoveryAttempts > ctx.spec.thresholds.maxQueryExecutionRecoveryAttempts) {
            state.result = {
              ...state.result,
              sql: '',
              explanation: `⚠️ 데이터 확인 쿼리 실행에 계속 실패했습니다: ${error.message}\n\n마지막 시도 쿼리:\n\`\`\`sql\n${failedDataQuery}\n\`\`\`\n\n숫자를 확정하지 않고 여기서 멈춥니다. 스키마나 컬럼명을 다시 확인한 뒤 재시도해주세요.`,
              needsData: false,
              parseError: true,
              validated: false,
              validationMode: 'data-query',
              validationError: error.message,
              validationAttempts: state.executionRecoveryAttempts,
            };
            break;
          }

          state.recoveryHistory = buildQueryFailureHistory(
            state.recoveryHistory ?? state.history,
            failedDataQuery,
            error.message,
            state.result,
            'data-query'
          );

          state.result = await generateSQL(
            ctx.input,
            state.schemaResult?.schema,
            state.recoveryHistory,
            undefined,
            ctx.userId,
            ctx.threadId,
            {
              aiRunner,
              sqlAppendix: promptRules.sqlAppendix,
            }
          );
        }
      }

      if (!normalizeMetaBoolean(ctx.meta, 'autoExecute', true) || !state.result?.sql?.trim()) {
        if (state.result && state.result.validated === undefined) {
          state.result = {
            ...state.result,
            validated: state.dataQueryExecuted ? !state.result.parseError : !state.result.parseError,
            validationMode: state.dataQueryExecuted ? 'data-query' : 'none',
            validationAttempts: state.executionRecoveryAttempts,
          };
        }
        return;
      }

      while (state.result.sql.trim()) {
        try {
          const queryResult = await executeQueryTool(ctx.tools, toolId, ctx, state.result.sql);
          state.validatedExecution = queryResult;
          state.result = {
            ...state.result,
            validated: true,
            validationMode: 'final-sql',
            validationAttempts: state.executionRecoveryAttempts,
          };
          break;
        } catch (error: any) {
          await logWorkflowError(ctx, {
            errorType: 'db_query_error',
            errorMessage: `최종 SQL 검증 실패: ${error.message}`,
            userId: ctx.userId,
            threadId: ctx.threadId,
            runId: ctx.runId,
            messageId: ctx.outputMessage.id,
            prompt: ctx.input,
            metadata: { sql: state.result.sql },
          });

          state.executionRecoveryAttempts += 1;
          if (state.executionRecoveryAttempts > ctx.spec.thresholds.maxQueryExecutionRecoveryAttempts) {
            state.result = {
              ...state.result,
              explanation: `⚠️ 최종 SQL 실행 검증에 실패했습니다: ${error.message}\n\n마지막 시도 쿼리:\n\`\`\`sql\n${state.result.sql}\n\`\`\`\n\n검증에 실패했기 때문에 이 결과를 확정 답변으로 사용하지 않습니다.`,
              validated: false,
              validationMode: 'final-sql',
              validationError: error.message,
              validationAttempts: state.executionRecoveryAttempts,
            };
            break;
          }

          state.recoveryHistory = buildQueryFailureHistory(
            state.recoveryHistory ?? state.history,
            state.result.sql,
            error.message,
            state.result,
            'final-sql'
          );

          state.result = await generateSQL(
            ctx.input,
            state.schemaResult?.schema,
            state.recoveryHistory,
            undefined,
            ctx.userId,
            ctx.threadId,
            {
              aiRunner,
              sqlAppendix: promptRules.sqlAppendix,
            }
          );
          state.validatedExecution = null;
        }
      }

      if (state.result && state.result.validated === undefined) {
        state.result = {
          ...state.result,
          validated: state.dataQueryExecuted ? !state.result.parseError : !state.result.parseError,
          validationMode: state.dataQueryExecuted ? 'data-query' : 'none',
          validationAttempts: state.executionRecoveryAttempts,
        };
      }
      return;
    }

    case 'build_result': {
      if (!state.result?.sql || state.result.validated === false) {
        return;
      }

      const buildPresentation = ctx.capabilities.buildPresentation;
      if (!buildPresentation) {
        return;
      }

      try {
        const executionResult =
          state.validatedExecution ??
          (await executeQueryTool(ctx.tools, 'execute_query', ctx, state.result.sql));

        const built = await buildPresentation({
          question: ctx.input,
          sql: state.result.sql,
          explanation: state.result.explanation,
          queryResult: executionResult,
          sessionId: ctx.threadId,
          promptRules,
          aiRunner,
        } as BuildPresentationInput);

        state.resultSnapshot = built.snapshot;
        state.presentation = built.presentation;

        await ctx.events.emit({
          type: 'artifact.ready',
          threadId: ctx.threadId,
          runId: ctx.runId,
          artifact: { kind: 'resultSnapshot', data: built.snapshot },
        });
        await ctx.events.emit({
          type: 'artifact.ready',
          threadId: ctx.threadId,
          runId: ctx.runId,
          artifact: { kind: 'presentation', data: built.presentation },
        });
      } catch (error: any) {
        await logWorkflowError(ctx, {
          errorType: 'db_query_error',
          errorMessage: `자동 실행 실패: ${error.message}`,
          userId: ctx.userId,
          threadId: ctx.threadId,
          runId: ctx.runId,
          messageId: ctx.outputMessage.id,
          prompt: ctx.input,
          metadata: { sql: state.result.sql },
        });
      }
      return;
    }

    case 'update_message': {
      if (!state.result) {
        throw new Error('업데이트할 결과가 없습니다.');
      }

      const resultEnvelope = applyOutputContract(
        ctx.spec.outputContract,
        state.result,
        state.presentation,
        state.resultSnapshot
      );

      ctx.outputMessage = await ctx.store.updateMessage(ctx.outputMessage.id, {
        content: state.result.explanation || '쿼리를 생성했습니다.',
        status: 'completed',
        result: resultEnvelope,
        parseError: Boolean(state.result.parseError),
        error: null,
        completedAt: nowIso(),
      });

      await ctx.events.emit({
        type: 'message.completed',
        threadId: ctx.threadId,
        message: ctx.outputMessage,
      });
      return;
    }

    default:
      throw new Error(`지원하지 않는 step kind입니다: ${String(step.kind)}`);
  }
}

async function executeWorkflow(ctx: WorkflowContext) {
  const state: AgentWorkflowState = {
    history: [],
    recoveryHistory: [],
    schemaResults: [],
    dataQueryExecuted: false,
    executionRecoveryAttempts: 0,
    validatedExecution: null,
  };

  for (const step of ctx.spec.steps) {
    if (!matchesStepCondition(step, state, ctx.meta)) {
      continue;
    }

    const stepState: WorkflowStepState = {
      runId: ctx.runId,
      step: step.id,
      label: step.label ?? step.id,
      status: 'running',
      updatedAt: nowIso(),
    };

    await ctx.store.saveCheckpoint(ctx.runId, {
      runId: ctx.runId,
      threadId: ctx.threadId,
      step: step.id,
      status: 'running',
      attempt: state.executionRecoveryAttempts,
      payload: { kind: step.kind },
      createdAt: stepState.updatedAt,
    });
    await ctx.events.emit({
      type: 'step.changed',
      threadId: ctx.threadId,
      runId: ctx.runId,
      step: stepState,
    });

    try {
      await runStep(step, ctx, state);
      await ctx.store.saveCheckpoint(ctx.runId, {
        runId: ctx.runId,
        threadId: ctx.threadId,
        step: step.id,
        status: 'completed',
        attempt: state.executionRecoveryAttempts,
        payload: { kind: step.kind },
        createdAt: nowIso(),
      });
    } catch (error: any) {
      await ctx.store.saveCheckpoint(ctx.runId, {
        runId: ctx.runId,
        threadId: ctx.threadId,
        step: step.id,
        status: 'failed',
        attempt: state.executionRecoveryAttempts,
        payload: { kind: step.kind, error: error.message },
        createdAt: nowIso(),
      });
      throw error;
    }
  }
}

export function createConversationRuntime(
  options: CreateConversationRuntimeOptions
): ConversationRuntime {
  const transport = options.transport;
  const store = options.store;
  const agentRegistry = options.agentRegistry ?? new StaticAgentRegistry([]);
  const toolRegistry = options.toolRegistry ?? new StaticToolRegistry([]);
  const specResolver =
    options.specResolver ??
    createSpecResolver({
      agentRegistry,
      toolRegistry,
    });
  const eventSink: EventSink = options.eventSink ?? {
    emit() {},
  };
  const capabilities = options.capabilities ?? {};

  async function processRun(ack: ConversationRunAck) {
    let ctx: WorkflowContext | null = null;

    try {
      const currentThreadState = await store.loadThreadState(ack.run.threadId);
      const threadState: ConversationState = {
        backend: 'openclaw',
        threadKey: currentThreadState?.threadKey || ack.run.threadId,
        lastRunId: ack.run.id,
        meta: currentThreadState?.meta ?? {},
      };
      await store.saveThreadState(ack.run.threadId, threadState);

      const runningRun = await store.updateRun(ack.run.id, {
        status: 'running',
        startedAt: nowIso(),
      });
      await eventSink.emit({
        type: 'run.started',
        threadId: ack.run.threadId,
        run: runningRun,
      });

      const allMessages = await store.listMessages(ack.run.threadId);
      const resolvedSpec = await specResolver.resolve(
        runningRun.agentId,
        runningRun.requirementSetId ?? undefined
      );
      ctx = {
        threadId: ack.run.threadId,
        runId: ack.run.id,
        agentId: runningRun.agentId,
        requirementSetId: runningRun.requirementSetId ?? undefined,
        userId: normalizeMetaString(runningRun.meta ?? undefined, 'userId'),
        input: ack.inputMessage.content,
        run: runningRun,
        inputMessage: ack.inputMessage,
        outputMessage: ack.outputMessage,
        history: allMessages,
        threadState,
        spec: resolvedSpec,
        transport,
        store,
        events: eventSink,
        tools: toolRegistry,
        capabilities,
        meta: runningRun.meta ?? undefined,
      };

      await executeWorkflow(ctx);
      const completedRun = await store.updateRun(ack.run.id, {
        status: 'completed',
        completedAt: nowIso(),
        error: null,
      });
      await eventSink.emit({
        type: 'run.completed',
        threadId: ack.run.threadId,
        run: completedRun,
      });
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : '메시지 처리 중 오류가 발생했습니다.';
      const fallbackStages =
        ctx?.spec.progressStages ?? [
          { id: 'schema', label: '관련 스키마 탐색', detail: '질문과 관련된 테이블과 컬럼을 찾는 중입니다.' },
        ];
      const failedStageId =
        fallbackStages.find((stage) => stage.id === 'schema')?.id ?? fallbackStages[0].id;

      if (ctx) {
        await logWorkflowError(ctx, {
          errorType: errorMessage.includes('시간이 초과') ? 'timeout' : 'cli_error',
          errorMessage,
          userId: ctx.userId,
          threadId: ctx.threadId,
          runId: ctx.runId,
          messageId: ctx.outputMessage.id,
          prompt: ctx.input,
        });
      } else {
        console.error('[ConversationRuntime] processRun setup failed:', errorMessage);
      }

      const failedMessage = await store.updateMessage(
        ctx?.outputMessage.id ?? ack.outputMessage.id,
        {
          content: buildProgressLog(fallbackStages, failedStageId, {
            failed: true,
            detail: errorMessage,
          }),
          status: 'failed',
          error: errorMessage,
          completedAt: nowIso(),
        }
      );

      const failedRun = await store.updateRun(ack.run.id, {
        status: 'failed',
        error: errorMessage,
        completedAt: nowIso(),
      });
      await eventSink.emit({
        type: 'message.failed',
        threadId: ctx?.threadId ?? ack.run.threadId,
        message: failedMessage,
      });
      await eventSink.emit({
        type: 'run.failed',
        threadId: ctx?.threadId ?? ack.run.threadId,
        run: failedRun,
      });
    }
  }

  function createThreadHandle(threadId: string): ConversationThreadHandle {
    return {
      async start(input: StartRunInput) {
        const resolvedSpec = await specResolver.resolve(input.agentId, input.requirementSetId);
        const queuedStage = resolvedSpec.progressStages[0];
        const ack = await store.beginRun({
          threadId,
          input: input.input,
          agentId: input.agentId,
          requirementSetId: input.requirementSetId,
          meta: input.meta,
          initialOutputContent: buildProgressLog(
            resolvedSpec.progressStages,
            queuedStage?.id ?? 'queued'
          ),
        });

        await eventSink.emit({
          type: 'run.created',
          threadId,
          run: ack.run,
        });
        await eventSink.emit({
          type: 'message.created',
          threadId,
          message: ack.inputMessage,
        });
        await eventSink.emit({
          type: 'message.created',
          threadId,
          message: ack.outputMessage,
        });

        void processRun(ack).catch((error) => {
          console.error('[ConversationRuntime] background run failed:', error);
        });

        return ack;
      },

      async send(input: SendInput) {
        const ack = await this.start(input);
        const timeoutMs = input.timeoutMs ?? 120000;
        const pollIntervalMs = input.pollIntervalMs ?? 50;
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
          const run = await store.getRun(ack.run.id);
          if (run && (run.status === 'completed' || run.status === 'failed')) {
            return run;
          }
          await delay(pollIntervalMs);
        }

        throw new Error(`Conversation run 실행 시간이 초과되었습니다. (${timeoutMs / 1000}초)`);
      },

      async history() {
        return store.listMessages(threadId);
      },

      async state() {
        return store.loadThreadState(threadId);
      },

      async clear() {
        await store.saveThreadState(threadId, {});
      },
    };
  }

  return {
    async ask(input, options) {
      const threadId = `ephemeral:${randomUUID()}`;
      const run = await createThreadHandle(threadId).send({
        input,
        agentId: options?.agentId || 'zoopibot-query',
        requirementSetId: options?.requirementSetId,
        meta: options?.meta,
      });

      const outputMessageId = run.outputMessageId;
      if (!outputMessageId) {
        return '';
      }

      const messages = await store.listMessages(threadId);
      return messages.find((message) => message.id === outputMessageId)?.content ?? '';
    },

    thread(threadId) {
      return createThreadHandle(threadId);
    },
  };
}
