import assert from 'node:assert/strict';
import test from 'node:test';

import { createConversationRuntime } from '@/lib/conversation/runtime';
import {
  createSpecResolver,
  StaticAgentRegistry,
  StaticToolRegistry,
} from '@/lib/conversation/registry';
import { createMemoryConversationStore } from '@/lib/conversation/store-memory';
import type { AgentSpec, EventSink, TransportAdapter } from '@zootopiafresh/agent-core';

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

test('conversation runtime supports a non-SQL generate_reply agent', async () => {
  const store = createMemoryConversationStore();
  const transport: TransportAdapter = {
    async call() {
      return {
        content: '많이 지치셨겠어요. 오늘 가장 버거웠던 순간을 한 가지만 같이 살펴볼까요?',
      };
    },
    async health() {
      return true;
    },
  };
  const toolRegistry = new StaticToolRegistry();
  const counselorSpec: AgentSpec = {
    id: 'counselor',
    defaultRequirementSpec: {
      id: 'default',
      allowedTools: [],
      outputContract: {
        includeArtifacts: [],
        includeMeta: false,
      },
      progressStages: [
        { id: 'listen', label: '감정 정리', detail: '사용자 메시지의 감정을 읽고 있습니다.' },
        { id: 'reply', label: '응답 준비', detail: '공감과 다음 질문을 정리하고 있습니다.' },
      ],
      steps: [
        { id: 'prepare-history', kind: 'prepare_history' },
        { id: 'stage-listen', kind: 'emit_step', config: { stageId: 'listen' } },
        {
          id: 'generate-reply',
          kind: 'generate_reply',
          config: {
            systemPrompt:
              '당신은 한국어로 답하는 차분한 감정 지원 대화 에이전트입니다. 진단이나 처방은 하지 마세요.',
          },
        },
        { id: 'stage-reply', kind: 'emit_step', config: { stageId: 'reply' } },
        { id: 'update-message', kind: 'update_message' },
      ],
    },
  };
  const agentRegistry = new StaticAgentRegistry([counselorSpec]);
  const specResolver = createSpecResolver({
    agentRegistry,
    toolRegistry,
  });
  const events: string[] = [];
  const runtime = createConversationRuntime({
    transport,
    store,
    toolRegistry,
    agentRegistry,
    specResolver,
    eventSink: {
      emit(event) {
        events.push(event.type);
      },
    } satisfies EventSink,
  });

  const ack = await runtime.thread('counsel-thread').start({
    input: '요즘 계속 무기력해서 아무것도 손에 안 잡혀요.',
    agentId: 'counselor',
  });

  await waitFor(async () => {
    const run = await store.getRun(ack.run.id);
    return run?.status === 'completed';
  });

  const messages = await store.listMessages('counsel-thread');
  const outputMessage = messages.find((message) => message.id === ack.outputMessage.id);

  assert.equal(outputMessage?.status, 'completed');
  assert.equal(
    outputMessage?.content,
    '많이 지치셨겠어요. 오늘 가장 버거웠던 순간을 한 가지만 같이 살펴볼까요?'
  );
  assert.deepEqual(outputMessage?.result?.artifacts ?? {}, {});
  assert.equal(outputMessage?.result?.meta ?? null, null);
  assert.ok(events.includes('message.completed'));
  assert.ok(events.includes('run.completed'));
});
