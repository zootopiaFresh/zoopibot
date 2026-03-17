import { randomUUID } from 'node:crypto';

import type {
  BeginRunInput,
  ConversationMessage,
  ConversationRun,
  ConversationRunAck,
  ConversationState,
  ConversationStore,
  ConversationThread,
  WorkflowCheckpoint,
} from './types';

function nowIso() {
  return new Date().toISOString();
}

export function createMemoryConversationStore(): ConversationStore {
  const threads = new Map<string, ConversationThread>();
  const messages = new Map<string, ConversationMessage[]>();
  const runs = new Map<string, ConversationRun>();
  const threadStates = new Map<string, ConversationState>();
  const checkpoints = new Map<string, WorkflowCheckpoint[]>();

  async function getThread(threadId: string) {
    return threads.get(threadId) ?? null;
  }

  async function ensureThread(threadId: string) {
    const existing = threads.get(threadId);
    if (existing) {
      return existing;
    }

    const thread: ConversationThread = {
      id: threadId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    threads.set(threadId, thread);
    messages.set(threadId, []);
    return thread;
  }

  async function beginRun(input: BeginRunInput): Promise<ConversationRunAck> {
    const thread = await ensureThread(input.threadId);
    const threadMessages = messages.get(input.threadId) ?? [];
    const createdAt = nowIso();
    const runId = randomUUID();
    const inputMessageId = randomUUID();
    const outputMessageId = randomUUID();

    const run: ConversationRun = {
      id: runId,
      threadId: input.threadId,
      agentId: input.agentId,
      requirementSetId: input.requirementSetId ?? null,
      status: 'queued',
      inputMessageId,
      outputMessageId,
      meta: input.meta ?? null,
    };

    const inputMessage: ConversationMessage = {
      id: inputMessageId,
      threadId: input.threadId,
      runId,
      role: 'user',
      content: input.input,
      status: 'completed',
      createdAt,
    };

    const outputMessage: ConversationMessage = {
      id: outputMessageId,
      threadId: input.threadId,
      runId,
      role: 'assistant',
      content: input.initialOutputContent,
      status: 'pending',
      createdAt,
    };

    if (threadMessages.length === 0) {
      thread.title = input.input.length > 30 ? `${input.input.slice(0, 30)}...` : input.input;
    }
    thread.updatedAt = createdAt;
    threadMessages.push(inputMessage, outputMessage);
    messages.set(input.threadId, threadMessages);
    runs.set(runId, run);

    return { run, inputMessage, outputMessage };
  }

  async function listMessages(threadId: string) {
    return [...(messages.get(threadId) ?? [])];
  }

  async function updateMessage(messageId: string, patch: Partial<ConversationMessage>) {
    for (const threadMessages of Array.from(messages.values())) {
      const index = threadMessages.findIndex((message) => message.id === messageId);
      if (index === -1) {
        continue;
      }

      threadMessages[index] = {
        ...threadMessages[index],
        ...patch,
      };
      return threadMessages[index];
    }

    throw new Error(`메시지를 찾을 수 없습니다: ${messageId}`);
  }

  async function getRun(runId: string) {
    return runs.get(runId) ?? null;
  }

  async function updateRun(runId: string, patch: Partial<ConversationRun>) {
    const existing = runs.get(runId);
    if (!existing) {
      throw new Error(`run을 찾을 수 없습니다: ${runId}`);
    }

    const next = {
      ...existing,
      ...patch,
    };
    runs.set(runId, next);
    return next;
  }

  async function saveThreadState(threadId: string, state: ConversationState) {
    threadStates.set(threadId, state);
  }

  async function loadThreadState(threadId: string) {
    return threadStates.get(threadId) ?? null;
  }

  async function saveCheckpoint(runId: string, checkpoint: WorkflowCheckpoint) {
    const existing = checkpoints.get(runId) ?? [];
    existing.push(checkpoint);
    checkpoints.set(runId, existing);
  }

  async function loadLatestCheckpoint(runId: string) {
    const existing = checkpoints.get(runId) ?? [];
    return existing.at(-1) ?? null;
  }

  return {
    getThread,
    ensureThread,
    beginRun,
    listMessages,
    updateMessage,
    getRun,
    updateRun,
    saveThreadState,
    loadThreadState,
    saveCheckpoint,
    loadLatestCheckpoint,
  };
}

