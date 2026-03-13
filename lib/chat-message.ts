import { parseStoredPresentation, parseStoredQueryResult } from './presentation';

export const CHAT_MESSAGE_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ChatMessageStatus =
  (typeof CHAT_MESSAGE_STATUS)[keyof typeof CHAT_MESSAGE_STATUS];

interface SerializableChatMessage {
  id: string;
  role: string;
  content: string;
  sql?: string | null;
  presentation?: string | null;
  resultSnapshot?: string | null;
  status?: string | null;
  errorMessage?: string | null;
  parseError?: boolean | null;
  validated?: boolean | null;
  validationMode?: string | null;
  validationError?: string | null;
  validationAttempts?: number | null;
  createdAt?: Date | string;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
}

function normalizeStatus(status?: string | null): ChatMessageStatus {
  if (
    status === CHAT_MESSAGE_STATUS.PENDING ||
    status === CHAT_MESSAGE_STATUS.RUNNING ||
    status === CHAT_MESSAGE_STATUS.COMPLETED ||
    status === CHAT_MESSAGE_STATUS.FAILED
  ) {
    return status;
  }

  return CHAT_MESSAGE_STATUS.COMPLETED;
}

export function isActiveChatMessageStatus(status?: string | null) {
  return status === CHAT_MESSAGE_STATUS.PENDING || status === CHAT_MESSAGE_STATUS.RUNNING;
}

export function serializeChatMessage(message: SerializableChatMessage) {
  return {
    ...message,
    status: normalizeStatus(message.status),
    errorMessage: message.errorMessage ?? null,
    parseError: Boolean(message.parseError),
    validated: message.validated ?? null,
    validationMode: message.validationMode ?? null,
    validationError: message.validationError ?? null,
    validationAttempts: message.validationAttempts ?? null,
    presentation: parseStoredPresentation(
      typeof message.presentation === 'string' ? message.presentation : null
    ),
    resultSnapshot: parseStoredQueryResult(
      typeof message.resultSnapshot === 'string' ? message.resultSnapshot : null
    ),
  };
}
