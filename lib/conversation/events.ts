import { EventEmitter } from 'events';

import { emitChatSessionEvent } from '@/lib/chat-events';
import { serializeConversationMessage } from '@/lib/conversation/legacy-message';
import type { ConversationEvent, EventSink } from '@/lib/conversation/types';

export class ConversationEventHub {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  emit(event: ConversationEvent) {
    this.emitter.emit(`thread:${event.threadId}`, event);
  }

  subscribe(threadId: string, listener: (event: ConversationEvent) => void) {
    const channel = `thread:${threadId}`;
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }
}

export function createConversationEventSink(
  hub: ConversationEventHub,
  sinks: EventSink[] = []
): EventSink {
  return {
    async emit(event) {
      hub.emit(event);
      for (const sink of sinks) {
        await sink.emit(event);
      }
    },
  };
}

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
