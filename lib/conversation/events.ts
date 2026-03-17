import { emitChatSessionEvent } from '@/lib/chat-events';
import { serializeConversationMessage } from '@/lib/conversation/legacy-message';
import {
  ConversationEventHub,
  createConversationEventSink,
  type ConversationEvent,
  type EventSink,
} from '@zootopiafresh/agent-core';

export {
  ConversationEventHub,
  createConversationEventSink,
  type ConversationEvent,
  type EventSink,
};

export function createZoopibotEventSink(): EventSink {
  return {
    emit(event) {
      if (
        event.type !== 'message.created' &&
        event.type !== 'message.updated' &&
        event.type !== 'message.completed' &&
        event.type !== 'message.failed'
      ) {
        return;
      }

      emitChatSessionEvent({
        type: event.type,
        sessionId: event.threadId,
        message: serializeConversationMessage(event.message),
      });
    },
  };
}
