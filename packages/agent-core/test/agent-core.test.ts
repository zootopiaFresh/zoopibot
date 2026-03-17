import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createConversationRuntime,
  createJsonRequirementProvider,
  createSpecResolver,
  StaticAgentRegistry,
  StaticToolRegistry,
  type AgentSpec,
} from '../src/index';
import { createOpenClawClient } from '../src/openclaw-client';
import { createMemoryConversationStore } from '../src/store-memory';
import type { TransportAdapter } from '../src/types';

function createReplyAgentSpec(): AgentSpec {
  return {
    id: 'demo-agent',
    defaultRequirementSpec: {
      id: 'default',
      allowedTools: [],
      outputContract: {
        includeArtifacts: [],
        includeMeta: false,
      },
      progressStages: [
        { id: 'queued', label: '접수', detail: '요청을 등록했습니다.' },
        { id: 'reply', label: '응답', detail: '응답을 만들고 있습니다.' },
      ],
      steps: [
        { id: 'prepare-history', kind: 'prepare_history' },
        { id: 'stage-reply', kind: 'emit_step', config: { stageId: 'reply' } },
        {
          id: 'generate-reply',
          kind: 'generate_reply',
          config: {
            systemPrompt: '당신은 한국어로 답하는 짧은 데모 어시스턴트입니다.',
          },
        },
        { id: 'update-message', kind: 'update_message' },
      ],
    },
  };
}

test('createOpenClawClient is silent by default', async () => {
  let consoleLogCalls = 0;
  let consoleErrorCalls = 0;
  const originalLog = console.log;
  const originalError = console.error;

  console.log = () => {
    consoleLogCalls += 1;
  };
  console.error = () => {
    consoleErrorCalls += 1;
  };

  try {
    const client = createOpenClawClient(
      {
        baseUrl: 'http://gateway.local',
      },
      {
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              id: 'ok',
              choices: [
                {
                  index: 0,
                  message: { role: 'assistant', content: 'hello' },
                  finish_reason: 'stop',
                },
              ],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          ),
      }
    );

    const result = await client.call('ping');
    assert.equal(result, 'hello');
    assert.equal(consoleLogCalls, 0);
    assert.equal(consoleErrorCalls, 0);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
});

test('runtime.ask uses the only registered agent automatically', async () => {
  const agentSpec = createReplyAgentSpec();
  const agentRegistry = new StaticAgentRegistry([agentSpec]);
  const toolRegistry = new StaticToolRegistry([]);
  const transport: TransportAdapter = {
    async call() {
      return { content: '자동 기본 agent 선택이 동작했습니다.' };
    },
    async health() {
      return true;
    },
  };

  const runtime = createConversationRuntime({
    transport,
    store: createMemoryConversationStore(),
    agentRegistry,
    toolRegistry,
    specResolver: createSpecResolver({ agentRegistry, toolRegistry }),
  });

  const output = await runtime.ask('짧게 답해줘.');
  assert.equal(output, '자동 기본 agent 선택이 동작했습니다.');
});

test('runtime.ask throws a clear error when no default agent is available', async () => {
  const agentRegistry = new StaticAgentRegistry([
    createReplyAgentSpec(),
    {
      ...createReplyAgentSpec(),
      id: 'second-agent',
    },
  ]);
  const toolRegistry = new StaticToolRegistry([]);
  const transport: TransportAdapter = {
    async call() {
      return { content: 'unused' };
    },
    async health() {
      return true;
    },
  };

  const runtime = createConversationRuntime({
    transport,
    store: createMemoryConversationStore(),
    agentRegistry,
    toolRegistry,
    specResolver: createSpecResolver({ agentRegistry, toolRegistry }),
  });

  await assert.rejects(
    () => runtime.ask('agent를 지정하지 않은 호출'),
    /`ask\(\)`를 사용하려면 `agentId`를 명시하거나 createConversationRuntime에 `defaultAgentId`를 설정하세요\./
  );
});

test('spec resolver rejects emit_step that references a missing progress stage', async () => {
  const badSpec: AgentSpec = {
    id: 'broken-agent',
    defaultRequirementSpec: {
      id: 'default',
      allowedTools: [],
      outputContract: {
        includeArtifacts: [],
        includeMeta: false,
      },
      progressStages: [{ id: 'queued', label: '접수', detail: '등록' }],
      steps: [
        { id: 'prepare-history', kind: 'prepare_history' },
        { id: 'bad-stage', kind: 'emit_step', config: { stageId: 'missing-stage' } },
      ],
    },
  };

  const agentRegistry = new StaticAgentRegistry([badSpec]);
  const toolRegistry = new StaticToolRegistry([]);
  const resolver = createSpecResolver({ agentRegistry, toolRegistry });

  await assert.rejects(
    () => resolver.resolve('broken-agent'),
    /존재하지 않는 progress stage를 참조합니다: missing-stage/
  );
});

test('json requirement provider reloads when the file changes', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'agent-core-req-'));
  const requirementsFile = path.join(tempDir, 'requirements.json');

  await writeFile(
    requirementsFile,
    JSON.stringify({
      'demo-agent:coach': {
        id: 'coach',
        allowedTools: [],
        outputContract: {
          includeArtifacts: [],
          includeMeta: false,
        },
        progressStages: [{ id: 'queued', label: '접수', detail: '등록' }],
        steps: [{ id: 'prepare-history', kind: 'prepare_history' }],
      },
    }),
    'utf-8'
  );

  const provider = createJsonRequirementProvider(requirementsFile);
  const first = await provider('demo-agent', 'coach');
  assert.equal(first?.id, 'coach');

  await new Promise((resolve) => setTimeout(resolve, 20));
  await writeFile(
    requirementsFile,
    JSON.stringify({
      'demo-agent:coach': {
        id: 'coach-v2',
        allowedTools: [],
        outputContract: {
          includeArtifacts: [],
          includeMeta: false,
        },
        progressStages: [{ id: 'queued', label: '접수', detail: '등록' }],
        steps: [{ id: 'prepare-history', kind: 'prepare_history' }],
      },
    }),
    'utf-8'
  );

  const second = await provider('demo-agent', 'coach');
  assert.equal(second?.id, 'coach-v2');
});
