import type { ConversationMessage } from '@/lib/conversation/types';

export function serializeConversationMessage(message: ConversationMessage) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    sql: message.result?.sql ?? null,
    presentation: message.result?.presentation?.data ?? null,
    resultSnapshot: message.result?.resultSnapshot?.data ?? null,
    status: message.status,
    errorMessage: message.error ?? null,
    parseError: Boolean(message.parseError),
    validated: message.result?.validation?.validated ?? null,
    validationMode: message.result?.validation?.mode ?? null,
    validationError: message.result?.validation?.error ?? null,
    validationAttempts: message.result?.validation?.attempts ?? null,
    createdAt: message.createdAt,
    startedAt: message.startedAt ?? null,
    completedAt: message.completedAt ?? null,
  };
}
