import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSpecResolver,
  createStaticRequirementProvider,
  StaticAgentRegistry,
  StaticToolRegistry,
} from '@/lib/conversation/registry';
import { zoopibotQueryAgentSpec } from '@/lib/conversation/agents/zoopibot-query';

test('spec resolver merges requirement overrides into default agent spec', async () => {
  const agentRegistry = new StaticAgentRegistry([zoopibotQueryAgentSpec]);
  const toolRegistry = new StaticToolRegistry([
    {
      id: 'execute_query',
      description: 'test tool',
      async execute() {
        return { rows: [], fields: [] };
      },
    },
  ]);
  const specResolver = createSpecResolver({
    agentRegistry,
    toolRegistry,
    requirementProvider: createStaticRequirementProvider({
      'zoopibot-query:strict': {
        id: 'strict',
        thresholds: {
          initialSchemaLimit: 9,
        },
        promptRules: {
          sqlAppendix: ['반드시 LIMIT 10을 고려하세요.'],
        },
      },
    }),
  });

  const resolved = await specResolver.resolve('zoopibot-query', 'strict');

  assert.equal(resolved.requirementSetId, 'strict');
  assert.equal(resolved.thresholds.initialSchemaLimit, 9);
  assert.deepEqual(resolved.promptRules.sqlAppendix, ['반드시 LIMIT 10을 고려하세요.']);
  assert.ok(resolved.steps.length > 0);
});

test('spec resolver rejects unknown tools from overrides', async () => {
  const agentRegistry = new StaticAgentRegistry([zoopibotQueryAgentSpec]);
  const toolRegistry = new StaticToolRegistry([
    {
      id: 'execute_query',
      description: 'test tool',
      async execute() {
        return { rows: [], fields: [] };
      },
    },
  ]);
  const specResolver = createSpecResolver({
    agentRegistry,
    toolRegistry,
    requirementProvider: createStaticRequirementProvider({
      'zoopibot-query:broken': {
        id: 'broken',
        allowedTools: ['missing_tool'],
      },
    }),
  });

  await assert.rejects(
    specResolver.resolve('zoopibot-query', 'broken'),
    /등록되지 않은 tool/
  );
});
