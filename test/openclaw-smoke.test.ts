import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpenClawClient, getOpenClawConfigFromEnv } from '../lib/openclaw-client';

test('OpenClaw live smoke test', { skip: process.env.RUN_OPENCLAW_SMOKE !== '1' }, async () => {
  const client = createOpenClawClient(getOpenClawConfigFromEnv(process.env));
  const ok = await client.testConnection();

  assert.equal(ok, true, 'Gateway connection check failed');

  const result = await client.call('ping', {
    systemPrompt: 'Reply with a very short answer.',
    timeout: 30000,
  });

  assert.equal(typeof result, 'string');
  assert.notEqual(result.trim(), '');
});
