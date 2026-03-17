import type { PrismaClient } from '@prisma/client';
import type {
  BeginRunInput,
  ConversationMessage,
  ConversationMessageResult,
  ConversationRun,
  ConversationRunAck,
  ConversationState,
  ConversationStore,
  ConversationThread,
  WorkflowCheckpoint,
} from '@zootopiafresh/agent-core';

import {
  parseStoredPresentation,
  parseStoredQueryResult,
  serializePresentation,
  serializeQueryResult,
} from '@/lib/presentation';
import {
  buildZoopibotMessageResult,
  readZoopibotPresentation,
  readZoopibotResultSnapshot,
  readZoopibotSql,
  readZoopibotValidation,
} from '@/lib/conversation/zoopibot-result';

function parseJsonRecord(raw?: string | null): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function stringifyJson(value: Record<string, unknown> | null | undefined) {
  return value ? JSON.stringify(value) : null;
}

function toIso(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString();
}

function toConversationRun(run: any): ConversationRun {
  return {
    id: run.id,
    threadId: run.sessionId,
    agentId: run.agentId,
    requirementSetId: run.requirementSetId ?? null,
    status: run.status,
    inputMessageId: run.inputMessageId ?? null,
    outputMessageId: run.outputMessageId ?? null,
    startedAt: toIso(run.startedAt),
    completedAt: toIso(run.completedAt),
    error: run.errorMessage ?? null,
    meta: parseJsonRecord(run.meta),
  };
}

function toConversationResultEnvelope(message: any): ConversationMessageResult | null {
  const presentation = parseStoredPresentation(message.presentation);
  const resultSnapshot = parseStoredQueryResult(message.resultSnapshot);

  if (
    !message.sql &&
    !presentation &&
    !resultSnapshot &&
    message.validated == null &&
    !message.validationMode &&
    !message.validationError &&
    message.validationAttempts == null
  ) {
    return null;
  }

  return buildZoopibotMessageResult({
    outputContract: {
      includeArtifacts: ['sql', 'presentation', 'resultSnapshot', 'validation'],
      includeMeta: true,
    },
    sql: message.sql ?? null,
    presentation,
    resultSnapshot,
    validation: {
      validated: message.validated ?? null,
      mode: message.validationMode ?? null,
      error: message.validationError ?? null,
      attempts: message.validationAttempts ?? null,
    },
  });
}

function toConversationMessage(message: any): ConversationMessage {
  return {
    id: message.id,
    threadId: message.sessionId,
    runId: message.runId ?? null,
    role: message.role,
    content: message.content,
    status: message.status,
    result: toConversationResultEnvelope(message),
    parseError: Boolean(message.parseError),
    error: message.errorMessage ?? null,
    createdAt: toIso(message.createdAt) ?? new Date().toISOString(),
    startedAt: toIso(message.startedAt),
    completedAt: toIso(message.completedAt),
  };
}

function buildMessageUpdateData(patch: Partial<ConversationMessage>) {
  const data: Record<string, unknown> = {};

  if (patch.content !== undefined) data.content = patch.content;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.error !== undefined) data.errorMessage = patch.error;
  if (patch.parseError !== undefined) data.parseError = patch.parseError;
  if (patch.startedAt !== undefined) data.startedAt = patch.startedAt ? new Date(patch.startedAt) : null;
  if (patch.completedAt !== undefined) data.completedAt = patch.completedAt ? new Date(patch.completedAt) : null;

  if (patch.result !== undefined) {
    const validation = readZoopibotValidation(patch.result);
    data.sql = readZoopibotSql(patch.result);
    data.presentation = serializePresentation(readZoopibotPresentation(patch.result));
    data.resultSnapshot = serializeQueryResult(readZoopibotResultSnapshot(patch.result));
    data.validated = validation?.validated ?? null;
    data.validationMode = validation?.mode ?? null;
    data.validationError = validation?.error ?? null;
    data.validationAttempts = validation?.attempts ?? null;
  }

  return data;
}

function buildRunUpdateData(patch: Partial<ConversationRun>) {
  const data: Record<string, unknown> = {};

  if (patch.status !== undefined) data.status = patch.status;
  if (patch.inputMessageId !== undefined) data.inputMessageId = patch.inputMessageId;
  if (patch.outputMessageId !== undefined) data.outputMessageId = patch.outputMessageId;
  if (patch.error !== undefined) data.errorMessage = patch.error;
  if (patch.startedAt !== undefined) data.startedAt = patch.startedAt ? new Date(patch.startedAt) : null;
  if (patch.completedAt !== undefined) data.completedAt = patch.completedAt ? new Date(patch.completedAt) : null;
  if (patch.meta !== undefined) data.meta = stringifyJson(patch.meta ?? null);

  return data;
}

export function createPrismaConversationStore(prisma: PrismaClient): ConversationStore {
  const threadState = new Map<string, ConversationState>();

  return {
    async getThread(threadId) {
      const thread = await prisma.chatSession.findUnique({
        where: { id: threadId },
      });

      if (!thread) {
        return null;
      }

      return {
        id: thread.id,
        title: thread.title,
        createdAt: toIso(thread.createdAt) ?? undefined,
        updatedAt: toIso(thread.updatedAt) ?? undefined,
      };
    },

    async ensureThread(threadId) {
      const thread = await prisma.chatSession.findUnique({
        where: { id: threadId },
      });

      if (!thread) {
        throw new Error(`세션을 찾을 수 없습니다: ${threadId}`);
      }

      return {
        id: thread.id,
        title: thread.title,
        createdAt: toIso(thread.createdAt) ?? undefined,
        updatedAt: toIso(thread.updatedAt) ?? undefined,
      };
    },

    async beginRun(input: BeginRunInput): Promise<ConversationRunAck> {
      return prisma.$transaction(async (tx) => {
        const existingMessageCount = await tx.chatMessage.count({
          where: { sessionId: input.threadId },
        });

        const now = new Date();
        const run = await tx.chatRun.create({
          data: {
            agentId: input.agentId,
            requirementSetId: input.requirementSetId ?? null,
            status: 'queued',
            sessionId: input.threadId,
            meta: stringifyJson(input.meta ?? null),
          },
        });

        const inputMessage = await tx.chatMessage.create({
          data: {
            role: 'user',
            content: input.input,
            sessionId: input.threadId,
            runId: run.id,
          },
        });

        const outputMessage = await tx.chatMessage.create({
          data: {
            role: 'assistant',
            content: input.initialOutputContent,
            sessionId: input.threadId,
            runId: run.id,
            status: 'pending',
          },
        });

        const nextTitle =
          existingMessageCount === 0
            ? input.input.length > 30
              ? `${input.input.slice(0, 30)}...`
              : input.input
            : undefined;

        await tx.chatRun.update({
          where: { id: run.id },
          data: {
            inputMessageId: inputMessage.id,
            outputMessageId: outputMessage.id,
          },
        });

        await tx.chatSession.update({
          where: { id: input.threadId },
          data: {
            title: nextTitle,
            updatedAt: now,
          },
        });

        return {
          run: toConversationRun({
            ...run,
            inputMessageId: inputMessage.id,
            outputMessageId: outputMessage.id,
          }),
          inputMessage: toConversationMessage(inputMessage),
          outputMessage: toConversationMessage(outputMessage),
        };
      });
    },

    async listMessages(threadId) {
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: threadId },
        orderBy: { createdAt: 'asc' },
      });

      return messages.map(toConversationMessage);
    },

    async updateMessage(messageId, patch) {
      const message = await prisma.chatMessage.update({
        where: { id: messageId },
        data: buildMessageUpdateData(patch),
      });

      return toConversationMessage(message);
    },

    async getRun(runId) {
      const run = await prisma.chatRun.findUnique({
        where: { id: runId },
      });

      return run ? toConversationRun(run) : null;
    },

    async updateRun(runId, patch) {
      const run = await prisma.chatRun.update({
        where: { id: runId },
        data: buildRunUpdateData(patch),
      });

      return toConversationRun(run);
    },

    async saveThreadState(threadId, state) {
      threadState.set(threadId, state);
    },

    async loadThreadState(threadId) {
      return threadState.get(threadId) ?? null;
    },

    async saveCheckpoint(runId, checkpoint) {
      await prisma.chatRunCheckpoint.create({
        data: {
          runId,
          step: checkpoint.step,
          status: checkpoint.status,
          attempt: checkpoint.attempt ?? null,
          payload: stringifyJson(checkpoint.payload ?? null),
        },
      });
    },

    async loadLatestCheckpoint(runId) {
      const checkpoint = await prisma.chatRunCheckpoint.findFirst({
        where: { runId },
        orderBy: { createdAt: 'desc' },
        include: {
          run: {
            select: { sessionId: true },
          },
        },
      });

      if (!checkpoint) {
        return null;
      }

      return {
        runId,
        threadId: checkpoint.run.sessionId,
        step: checkpoint.step,
        status: checkpoint.status as WorkflowCheckpoint['status'],
        attempt: checkpoint.attempt ?? undefined,
        payload: parseJsonRecord(checkpoint.payload) ?? undefined,
        createdAt: toIso(checkpoint.createdAt) ?? new Date().toISOString(),
      };
    },
  };
}
