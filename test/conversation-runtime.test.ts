import assert from 'node:assert/strict';
import test from 'node:test';

import { createConversationRuntime } from '@/lib/conversation/runtime';
import {
  BUILTIN_STEP_KINDS,
  createSpecResolver,
  StaticAgentRegistry,
  StaticToolRegistry,
} from '@/lib/conversation/registry';
import { createMemoryConversationStore } from '@/lib/conversation/store-memory';
import { zoopibotQueryAgentSpec } from '@/lib/conversation/agents/zoopibot-query';
import type { ConversationEvent, EventSink, TransportAdapter } from '@/lib/conversation/types';
import {
  createZoopibotQueryStepHandlers,
  ZOOPIBOT_QUERY_STEP_KINDS,
} from '@/lib/conversation/zoopibot-query-step-handlers';
import {
  readZoopibotPresentation,
  readZoopibotResultSnapshot,
  readZoopibotSql,
  readZoopibotValidation,
} from '@/lib/conversation/zoopibot-result';

function createEventCollector() {
  const events: ConversationEvent[] = [];
  const sink: EventSink = {
    emit(event) {
      events.push(event);
    },
  };

  return { events, sink };
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error('waitFor timeout');
}

test('conversation runtime starts a run immediately and completes it in background', async () => {
  const store = createMemoryConversationStore();
  await store.ensureThread('thread-1');

  const transport: TransportAdapter = {
    async call() {
      return {
        content: JSON.stringify({
          sql: 'SELECT 1 AS value',
          explanation: '테스트 설명입니다.',
          needsData: false,
          dataQuery: '',
        }),
      };
    },
    async health() {
      return true;
    },
  };
  const toolRegistry = new StaticToolRegistry([
    {
      id: 'execute_query',
      description: 'execute query',
      async execute() {
        return {
          rows: [{ value: 1 }],
          fields: [{ name: 'value' }],
        };
      },
    },
  ]);
  const agentRegistry = new StaticAgentRegistry([zoopibotQueryAgentSpec]);
  const specResolver = createSpecResolver({
    agentRegistry,
    toolRegistry,
    supportedStepKinds: [...Array.from(BUILTIN_STEP_KINDS), ...ZOOPIBOT_QUERY_STEP_KINDS],
  });
  const eventCollector = createEventCollector();
  const runtime = createConversationRuntime({
    transport,
    store,
    toolRegistry,
    agentRegistry,
    specResolver,
    eventSink: eventCollector.sink,
    stepHandlers: createZoopibotQueryStepHandlers(),
    capabilities: {
      async resolveSchema() {
        return {
          schema: 'CREATE TABLE example (value INTEGER);',
          source: 'schema-prompts',
          selectedItems: ['example'],
          selectedChars: 32,
          fallbackUsed: false,
        };
      },
      async executeQuery(sql) {
        assert.match(sql, /SELECT 1 AS value/);
        return {
          rows: [{ value: 1 }],
          fields: [{ name: 'value' }],
        };
      },
      async buildPresentation() {
        return {
          snapshot: {
            rows: [{ value: 1 }],
            fields: [{ name: 'value' }],
            totalRows: 1,
            truncated: false,
          },
          presentation: {
            version: 'v1',
            title: '테스트',
            blocks: [{ type: 'narrative', body: '요약입니다.' }],
          },
        };
      },
      async logError() {},
    },
  });

  const ack = await runtime.thread('thread-1').start({
    input: '테스트 질문',
    agentId: 'zoopibot-query',
    meta: {
      autoExecute: true,
      userId: 'user-1',
    },
  });

  assert.equal(ack.run.status, 'queued');
  assert.equal(ack.inputMessage.role, 'user');
  assert.equal(ack.outputMessage.role, 'assistant');
  assert.equal(ack.outputMessage.status, 'pending');

  await waitFor(async () => {
    const run = await store.getRun(ack.run.id);
    return run?.status === 'completed';
  });

  const run = await store.getRun(ack.run.id);
  const messages = await store.listMessages('thread-1');
  const outputMessage = messages.find((message) => message.id === ack.outputMessage.id);

  assert.equal(run?.status, 'completed');
  assert.equal(outputMessage?.status, 'completed');
  assert.equal(outputMessage?.content, '테스트 설명입니다.');
  assert.equal(readZoopibotSql(outputMessage?.result), 'SELECT 1 AS value');
  assert.equal(readZoopibotPresentation(outputMessage?.result)?.title, '테스트');
  assert.equal(readZoopibotResultSnapshot(outputMessage?.result)?.totalRows, 1);
  assert.equal(readZoopibotValidation(outputMessage?.result)?.validated, true);

  assert.ok(eventCollector.events.some((event) => event.type === 'message.created'));
  assert.ok(eventCollector.events.some((event) => event.type === 'message.completed'));
  assert.ok(eventCollector.events.some((event) => event.type === 'run.completed'));
});
