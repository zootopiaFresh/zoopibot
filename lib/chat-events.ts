import { EventEmitter } from 'events';

type ChatSessionEventName =
  | 'message.created'
  | 'message.updated'
  | 'message.completed'
  | 'message.failed';

export interface ChatSessionEvent {
  type: ChatSessionEventName;
  sessionId: string;
  message: Record<string, unknown>;
}

const globalForChatEvents = globalThis as unknown as {
  chatEvents?: EventEmitter;
};

const chatEvents = globalForChatEvents.chatEvents ?? new EventEmitter();
chatEvents.setMaxListeners(100);

if (!globalForChatEvents.chatEvents) {
  globalForChatEvents.chatEvents = chatEvents;
}

function getChannelName(sessionId: string) {
  return `session:${sessionId}`;
}

export function emitChatSessionEvent(event: ChatSessionEvent) {
  chatEvents.emit(getChannelName(event.sessionId), event);
}

export function subscribeToChatSessionEvents(
  sessionId: string,
  listener: (event: ChatSessionEvent) => void
) {
  const channel = getChannelName(sessionId);
  chatEvents.on(channel, listener);

  return () => {
    chatEvents.off(channel, listener);
  };
}
