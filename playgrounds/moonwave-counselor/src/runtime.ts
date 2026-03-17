import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ConversationEventHub as MoonwaveEventHub,
  createConversationEventSink as createMoonwaveEventSink,
  createJsonRequirementProvider,
  createSpecResolver,
  StaticAgentRegistry,
  StaticToolRegistry,
  createConversationRuntime,
  type WorkflowErrorLogInput,
} from '@zootopiafresh/agent-core';
import { createMemoryConversationStore } from '@zootopiafresh/agent-core/testing';
import { createOpenClawTransport } from '@zootopiafresh/agent-core/openclaw';
import { moonwaveCounselorAgentSpec } from './agent-spec';

const globalMoonwave = globalThis as typeof globalThis & {
  moonwaveRuntime?: ReturnType<typeof createConversationRuntime>;
  moonwaveEventHub?: MoonwaveEventHub;
};

function getProjectDir() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

export function getMoonwaveEventHub() {
  if (!globalMoonwave.moonwaveEventHub) {
    globalMoonwave.moonwaveEventHub = new MoonwaveEventHub();
  }

  return globalMoonwave.moonwaveEventHub;
}

export function getMoonwaveRuntime() {
  if (globalMoonwave.moonwaveRuntime) {
    return globalMoonwave.moonwaveRuntime;
  }

  const projectDir = getProjectDir();
  const toolRegistry = new StaticToolRegistry([]);
  const agentRegistry = new StaticAgentRegistry([moonwaveCounselorAgentSpec]);
  const requirementProvider = process.env.REQUIREMENTS_FILE
    ? createJsonRequirementProvider(path.resolve(projectDir, process.env.REQUIREMENTS_FILE))
    : undefined;
  const specResolver = createSpecResolver({
    agentRegistry,
    toolRegistry,
    requirementProvider,
  });

  globalMoonwave.moonwaveRuntime = createConversationRuntime({
    transport: createOpenClawTransport(),
    store: createMemoryConversationStore(),
    agentRegistry,
    toolRegistry,
    specResolver,
    eventSink: createMoonwaveEventSink(getMoonwaveEventHub()),
    capabilities: {
      async logError(input: WorkflowErrorLogInput) {
        console.error('[MoonwaveCounselor]', input.errorType, input.errorMessage, input.metadata);
      },
    },
  });

  return globalMoonwave.moonwaveRuntime;
}
