import { createOpenClawClient, getOpenClawConfigFromEnv } from '@/lib/openclaw-client';
import type { TransportAdapter } from '@/lib/conversation/types';

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
