import { createOpenClawClient, getOpenClawConfigFromEnv } from './openclaw-client';
import type { TransportAdapter } from './types';

export function createOpenClawTransport(): TransportAdapter {
  const client = createOpenClawClient(getOpenClawConfigFromEnv(process.env));

  return {
    async call(input) {
      const content = await client.call(input.prompt, {
        sessionKey: input.threadKey,
        systemPrompt: input.systemPrompt,
        timeout: input.timeoutMs,
      });

      return { content };
    },
    async health() {
      return client.testConnection();
    },
  };
}

