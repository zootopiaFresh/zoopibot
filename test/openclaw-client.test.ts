import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOpenClawClient,
  getOpenClawConfigFromEnv,
} from '../lib/openclaw-client';

const silentLogger = {
  log: () => {},
  error: () => {},
};

test('getOpenClawConfigFromEnv returns defaults when env is empty', () => {
  const config = getOpenClawConfigFromEnv({});

  assert.deepEqual(config, {
    baseUrl: 'http://127.0.0.1:18789',
    token: '',
    agentId: 'main',
    model: 'openclaw',
    defaultTimeoutMs: 120000,
  });
});

test('OpenClaw client sends expected request shape and returns content', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  const client = createOpenClawClient(
    {
      baseUrl: 'http://gateway.local/',
      token: 'secret-token',
      agentId: 'agent-main',
    },
    {
      fetchImpl: async (input, init) => {
        requestUrl = String(input);
        requestInit = init;

        return new Response(
          JSON.stringify({
            id: 'chatcmpl-1',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'gateway-response',
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 11,
              completion_tokens: 7,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      },
      logger: silentLogger,
    }
  );

  const result = await client.call('user prompt', {
    systemPrompt: 'system prompt',
    sessionKey: 'session-1',
  });

  assert.equal(result, 'gateway-response');
  assert.equal(requestUrl, 'http://gateway.local/v1/chat/completions');
  assert.equal(requestInit?.method, 'POST');
  assert.deepEqual(requestInit?.headers, {
    'Content-Type': 'application/json',
    Authorization: 'Bearer secret-token',
    'x-openclaw-agent-id': 'agent-main',
    'x-openclaw-session-key': 'session-1',
  });
  assert.deepEqual(JSON.parse(String(requestInit?.body)), {
    model: 'openclaw',
    messages: [
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'user prompt' },
    ],
    stream: false,
  });
});

test('OpenClaw client surfaces gateway HTTP errors', async () => {
  const client = createOpenClawClient(
    { baseUrl: 'http://gateway.local' },
    {
      fetchImpl: async () => new Response('invalid token', { status: 401 }),
      logger: silentLogger,
    }
  );

  await assert.rejects(
    () => client.call('prompt'),
    new Error('OpenClaw Gateway 응답 오류 (401): invalid token')
  );
});

test('OpenClaw client translates connection refused errors', async () => {
  const client = createOpenClawClient(
    { baseUrl: 'http://gateway.local' },
    {
      fetchImpl: async () => {
        throw Object.assign(new TypeError('fetch failed'), {
          cause: { code: 'ECONNREFUSED' },
        });
      },
      logger: silentLogger,
    }
  );

  await assert.rejects(
    () => client.call('prompt'),
    new Error('OpenClaw Gateway에 연결할 수 없습니다. `openclaw gateway` 명령으로 Gateway를 시작하세요.')
  );
});

test('OpenClaw testConnection returns false on fetch failure', async () => {
  const client = createOpenClawClient(
    { baseUrl: 'http://gateway.local' },
    {
      fetchImpl: async () => {
        throw new Error('network down');
      },
      logger: silentLogger,
    }
  );

  const ok = await client.testConnection();

  assert.equal(ok, false);
});
