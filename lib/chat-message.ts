import { parseStoredPresentation, parseStoredQueryResult } from './presentation';
import { parseStructuredSqlResponse } from './structured-response';

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

function normalizeAssistantContent(message: SerializableChatMessage) {
  if (message.role !== 'assistant' || typeof message.content !== 'string') {
    return message;
  }

  const parsed = parseStructuredSqlResponse(message.content);
  if (!parsed) {
    return message;
  }

  const normalizedExplanation = parsed.response.explanation.trim();
  const normalizedSql =
    typeof message.sql === 'string' && message.sql.trim()
      ? message.sql
      : (parsed.response.sql || parsed.response.dataQuery || null);
  const fallbackContent = parsed.response.needsData
    ? '데이터 확인용 쿼리를 생성했습니다.'
    : normalizedSql
      ? '쿼리를 생성했습니다.'
      : message.content;

  return {
    ...message,
    content: normalizedExplanation || fallbackContent,
    sql: normalizedSql,
  };
}

export function isActiveChatMessageStatus(status?: string | null) {
  return status === CHAT_MESSAGE_STATUS.PENDING || status === CHAT_MESSAGE_STATUS.RUNNING;
}

export function serializeChatMessage(message: SerializableChatMessage) {
  const normalizedMessage = normalizeAssistantContent(message);

  return {
    ...normalizedMessage,
    status: normalizeStatus(normalizedMessage.status),
    errorMessage: normalizedMessage.errorMessage ?? null,
    parseError: Boolean(normalizedMessage.parseError),
    validated: normalizedMessage.validated ?? null,
    validationMode: normalizedMessage.validationMode ?? null,
    validationError: normalizedMessage.validationError ?? null,
    validationAttempts: normalizedMessage.validationAttempts ?? null,
    presentation: parseStoredPresentation(
      typeof normalizedMessage.presentation === 'string' ? normalizedMessage.presentation : null
    ),
    resultSnapshot: parseStoredQueryResult(
      typeof normalizedMessage.resultSnapshot === 'string' ? normalizedMessage.resultSnapshot : null
    ),
  };
}
