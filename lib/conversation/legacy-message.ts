import type { ConversationMessage } from '@zootopiafresh/agent-core';

import {
  readZoopibotPresentation,
  readZoopibotResultSnapshot,
  readZoopibotSql,
  readZoopibotValidation,
} from './zoopibot-result';

export function serializeConversationMessage(message: ConversationMessage) {
  const validation = readZoopibotValidation(message.result);

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    sql: readZoopibotSql(message.result),
    presentation: readZoopibotPresentation(message.result),
    resultSnapshot: readZoopibotResultSnapshot(message.result),
    status: message.status,
    errorMessage: message.error ?? null,
    parseError: Boolean(message.parseError),
    validated: validation?.validated ?? null,
    validationMode: validation?.mode ?? null,
    validationError: validation?.error ?? null,
    validationAttempts: validation?.attempts ?? null,
    createdAt: message.createdAt,
    startedAt: message.startedAt ?? null,
    completedAt: message.completedAt ?? null,
  };
}
