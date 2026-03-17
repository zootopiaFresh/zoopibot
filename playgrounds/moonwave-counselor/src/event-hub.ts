import { EventEmitter } from 'node:events';

import type { ConversationEvent, EventSink } from '@zootopiafresh/agent-core';

export class MoonwaveEventHub {
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

export function createMoonwaveEventSink(hub: MoonwaveEventHub): EventSink {
  return {
    emit(event) {
      hub.emit(event);
    },
  };
}
