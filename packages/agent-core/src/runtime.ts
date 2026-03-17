import { randomUUID } from 'node:crypto';

import {
  BUILTIN_STEP_KINDS,
  createSpecResolver,
  StaticAgentRegistry,
  StaticToolRegistry,
} from './registry';
import type {
  AIRunner,
  AgentRegistry,
  ConversationMessage,
  ConversationRuntime,
  ConversationRunAck,
  ConversationState,
  ConversationStore,
  ConversationThreadHandle,
  EventSink,
  PromptRules,
  ResolvedAgentSpec,
  SendInput,
  SpecResolver,
  StartRunInput,
  StepDefinition,
  StepHandler,
  StepHandlerMap,
  StepHandlerUtilities,
  ToolRegistry,
  TransportAdapter,
  WorkflowContext,
  WorkflowErrorLogInput,
  WorkflowHistoryMessage,
  WorkflowState,
  WorkflowStepState,
} from './types';

interface CreateConversationRuntimeOptions<
  Capabilities extends Record<string, unknown> = Record<string, unknown>
> {
  transport: TransportAdapter;
  store: ConversationStore;
  agentRegistry?: AgentRegistry;
  toolRegistry?: ToolRegistry;
  eventSink?: EventSink;
  specResolver?: SpecResolver;
  capabilities?: Capabilities;
  stepHandlers?: StepHandlerMap<Capabilities>;
  defaultAgentId?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function toHistoryMessages(messages: ConversationMessage[], currentOutputMessageId: string): WorkflowHistoryMessage[] {
  return messages
    .filter((message) => message.id !== currentOutputMessageId)
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
      artifacts: message.result?.artifacts ?? null,
    }));
}

function normalizeConfigStringArray(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildReplyPrompt(
  history: WorkflowHistoryMessage[],
  input: string,
  appendix: string[]
) {
  const conversationContext =
    history.length > 0
      ? history
          .slice(-6)
          .map((message) =>
            message.role === 'user'
              ? `사용자: ${message.content}`
              : `어시스턴트: ${message.content}`
          )
          .join('\n')
      : '';

  const appendixBlock =
    appendix.length > 0
      ? `추가 지시:\n${appendix.map((item) => `- ${item}`).join('\n')}\n\n`
      : '';

  return [
    '아래 대화 흐름을 참고해 한국어로 답변하세요.',
    conversationContext ? `이전 대화:\n${conversationContext}` : '',
    appendixBlock,
    `현재 사용자 메시지: ${input}`,
    '답변은 자연스럽고 직접적이어야 하며, 필요한 경우 한두 개의 짧은 다음 질문을 포함해도 됩니다.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function matchesStepCondition(
  step: StepDefinition,
  state: WorkflowState,
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

  if (step.when.stateTrue?.some((flag) => !state.flags.has(flag))) {
    return false;
  }

  if (step.when.stateFalse?.some((flag) => state.flags.has(flag))) {
    return false;
  }

  return true;
}

function createTransportRunner(runtime: WorkflowContext): AIRunner {
  return async (
    prompt: string,
    options?: string | { sessionKey?: string; systemPrompt?: string; timeout?: number }
  ) => {
    const normalizedOptions =
      typeof options === 'string' ? { sessionKey: options } : options ?? {};
    const response = await runtime.transport.call({
      prompt,
      systemPrompt: normalizedOptions.systemPrompt,
      threadKey: normalizedOptions.sessionKey || runtime.threadState?.threadKey || runtime.threadId,
      timeoutMs: normalizedOptions.timeout,
    });

    return response.content;
  };
}

function createBuiltInStepHandlers<
  Capabilities extends Record<string, unknown> = Record<string, unknown>
>(): StepHandlerMap<Capabilities> {
  return {
    async prepare_history({ runtime, state }) {
      state.history = toHistoryMessages(runtime.history, runtime.outputMessage.id);
      state.values.history = state.history;
    },

    async emit_step({ step, utils }) {
      const stageId =
        typeof step.config?.stageId === 'string' ? step.config.stageId : 'queued';
      await utils.emitProgress(stageId);
    },

    async generate_reply({ step, runtime, state, aiRunner }) {
      const systemPrompt =
        typeof step.config?.systemPrompt === 'string' && step.config.systemPrompt.trim()
          ? step.config.systemPrompt.trim()
          : '당신은 한국어로 답하는 신중한 대화형 에이전트입니다.';
      const replyAppendix = normalizeConfigStringArray(step.config?.replyAppendix);
      const reply = await aiRunner(buildReplyPrompt(state.history, runtime.input, replyAppendix), {
        systemPrompt,
      });

      state.values.messagePatch = {
        content: reply.trim() || '지금 느끼는 상태를 조금만 더 들려주세요.',
        status: 'completed',
        result: {
          artifacts: {},
          meta: null,
        },
        parseError: false,
        error: null,
      } satisfies Partial<ConversationMessage>;
    },

    async update_message({ runtime, state }) {
      const patch = state.values.messagePatch as Partial<ConversationMessage> | undefined;
      if (!patch) {
        throw new Error('업데이트할 메시지 patch가 없습니다.');
      }

      runtime.outputMessage = await runtime.store.updateMessage(runtime.outputMessage.id, {
        ...patch,
        status: patch.status ?? 'completed',
        completedAt: patch.completedAt ?? nowIso(),
      });

      await runtime.events.emit({
        type: 'message.completed',
        threadId: runtime.threadId,
        message: runtime.outputMessage,
      });
    },
  };
}

export function createConversationRuntime<
  Capabilities extends Record<string, unknown> = Record<string, unknown>
>(options: CreateConversationRuntimeOptions<Capabilities>): ConversationRuntime {
  const transport = options.transport;
  const store = options.store;
  const agentRegistry = options.agentRegistry ?? new StaticAgentRegistry([]);
  const toolRegistry = options.toolRegistry ?? new StaticToolRegistry([]);
  const stepHandlers = {
    ...createBuiltInStepHandlers<Capabilities>(),
    ...(options.stepHandlers ?? {}),
  };
  const specResolver =
    options.specResolver ??
    createSpecResolver({
      agentRegistry,
      toolRegistry,
      supportedStepKinds: [
        ...Array.from(BUILTIN_STEP_KINDS),
        ...Object.keys(options.stepHandlers ?? {}),
      ],
    });
  const eventSink: EventSink = options.eventSink ?? {
    emit() {},
  };
  const capabilities = (options.capabilities ?? {}) as Capabilities;
  const defaultAgentId =
    options.defaultAgentId ||
    (agentRegistry instanceof StaticAgentRegistry ? agentRegistry.getDefaultAgentId() : undefined);

  async function logWorkflowError(runtime: WorkflowContext<Capabilities>, input: WorkflowErrorLogInput) {
    const handler = (runtime.capabilities as Record<string, unknown>).logError;
    if (typeof handler === 'function') {
      await (handler as (payload: WorkflowErrorLogInput) => Promise<void>)(input);
      return;
    }

    console.error('[ConversationRuntime]', input.errorType, input.errorMessage, input.metadata);
  }

  async function emitProgress(
    runtime: WorkflowContext<Capabilities>,
    state: WorkflowState,
    stageId: string,
    options?: { failed?: boolean; detail?: string }
  ) {
    const stage = runtime.spec.progressStages.find((item) => item.id === stageId);
    state.activeStageId = stageId;

    await runtime.events.emit({
      type: 'step.changed',
      threadId: runtime.threadId,
      runId: runtime.runId,
      step: {
        runId: runtime.runId,
        step: stageId,
        label: stage?.label,
        status: options?.failed ? 'failed' : 'running',
        detail: options?.detail || stage?.detail,
        updatedAt: nowIso(),
      },
    });

    runtime.outputMessage = await runtime.store.updateMessage(runtime.outputMessage.id, {
      content: buildProgressLog(runtime.spec.progressStages, stageId, options),
      status: 'running',
      startedAt: runtime.outputMessage.startedAt ?? nowIso(),
    });

    await runtime.events.emit({
      type: 'message.updated',
      threadId: runtime.threadId,
      message: runtime.outputMessage,
    });
  }

  async function executeWorkflow(runtime: WorkflowContext<Capabilities>) {
    const state: WorkflowState = {
      history: [],
      flags: new Set<string>(),
      values: {},
    };

    for (const step of runtime.spec.steps) {
      if (!matchesStepCondition(step, state, runtime.meta)) {
        continue;
      }

      const stepHandler = stepHandlers[step.kind];
      if (!stepHandler) {
        throw new Error(`지원하지 않는 StepKind입니다: ${String(step.kind)}`);
      }

      const stepState: WorkflowStepState = {
        runId: runtime.runId,
        step: step.id,
        label: step.label ?? step.id,
        status: 'running',
        updatedAt: nowIso(),
      };

      await runtime.store.saveCheckpoint(runtime.runId, {
        runId: runtime.runId,
        threadId: runtime.threadId,
        step: step.id,
        status: 'running',
        payload: { kind: step.kind },
        createdAt: stepState.updatedAt,
      });
      await runtime.events.emit({
        type: 'step.changed',
        threadId: runtime.threadId,
        runId: runtime.runId,
        step: stepState,
      });

      try {
        const utils: StepHandlerUtilities = {
          emitProgress: (stageId, progressOptions) =>
            emitProgress(runtime, state, stageId, progressOptions),
          logError: (input) => logWorkflowError(runtime, input),
        };
        await stepHandler({
          step,
          runtime,
          state,
          aiRunner: createTransportRunner(runtime),
          utils,
        });
        await runtime.store.saveCheckpoint(runtime.runId, {
          runId: runtime.runId,
          threadId: runtime.threadId,
          step: step.id,
          status: 'completed',
          payload: { kind: step.kind },
          createdAt: nowIso(),
        });
      } catch (error: any) {
        await runtime.store.saveCheckpoint(runtime.runId, {
          runId: runtime.runId,
          threadId: runtime.threadId,
          step: step.id,
          status: 'failed',
          payload: { kind: step.kind, error: error.message },
          createdAt: nowIso(),
        });
        throw error;
      }
    }
  }

  async function processRun(ack: ConversationRunAck) {
    let runtime: WorkflowContext<Capabilities> | null = null;

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
      runtime = {
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

      await executeWorkflow(runtime);
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
        runtime?.spec.progressStages ?? [
          { id: 'queued', label: '처리 시작', detail: '요청을 등록했습니다.' },
        ];
      const failedStageId = fallbackStages[0].id;

      if (runtime) {
        await logWorkflowError(runtime, {
          errorType: errorMessage.includes('시간이 초과') ? 'timeout' : 'runtime_error',
          errorMessage,
          userId: runtime.userId,
          threadId: runtime.threadId,
          runId: runtime.runId,
          messageId: runtime.outputMessage.id,
          prompt: runtime.input,
        });
      } else {
        console.error('[ConversationRuntime] processRun setup failed:', errorMessage);
      }

      const failedMessage = await store.updateMessage(
        runtime?.outputMessage.id ?? ack.outputMessage.id,
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
        threadId: runtime?.threadId ?? ack.run.threadId,
        message: failedMessage,
      });
      await eventSink.emit({
        type: 'run.failed',
        threadId: runtime?.threadId ?? ack.run.threadId,
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
      const agentId = options?.agentId || defaultAgentId;
      if (!agentId) {
        throw new Error(
          '`ask()`를 사용하려면 `agentId`를 명시하거나 createConversationRuntime에 `defaultAgentId`를 설정하세요.'
        );
      }

      const run = await createThreadHandle(threadId).send({
        input,
        agentId,
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
