import { executeQuery } from '@/lib/mysql';
import { logGenerationError, type ErrorType } from '@/lib/error-logger';
import { buildPresentationFromQueryResult } from '@/lib/reporting';
import { resolveSchemaContext } from '@/lib/schema-explorer';
import { ConversationEventHub, createConversationEventSink, createZoopibotEventSink } from '@/lib/conversation/events';
import { zoopibotQueryAgentSpec } from '@/lib/conversation/agents/zoopibot-query';
import { createPrismaConversationStore } from '@/lib/conversation/store-prisma';
import { createZoopibotQueryStepHandlers, ZOOPIBOT_QUERY_STEP_KINDS } from '@/lib/conversation/zoopibot-query-step-handlers';
import { prisma } from '@/lib/db';
import {
  BUILTIN_STEP_KINDS,
  createConversationRuntime,
  createJsonRequirementProvider,
  createSpecResolver,
  StaticAgentRegistry,
  StaticToolRegistry,
} from '@zootopiafresh/agent-core';
import { createOpenClawTransport } from '@zootopiafresh/agent-core/openclaw';

const globalConversation = globalThis as unknown as {
  conversationRuntime?: ReturnType<typeof createConversationRuntime>;
  conversationEventHub?: ConversationEventHub;
};

export function getConversationEventHub() {
  if (!globalConversation.conversationEventHub) {
    globalConversation.conversationEventHub = new ConversationEventHub();
  }

  return globalConversation.conversationEventHub;
}

export function getConversationRuntime() {
  if (globalConversation.conversationRuntime) {
    return globalConversation.conversationRuntime;
  }

  const toolRegistry = new StaticToolRegistry([
    {
      id: 'execute_query',
      description: 'Execute read-only SQL',
      async execute(input) {
        return executeQuery(String(input));
      },
    },
  ]);
  const agentRegistry = new StaticAgentRegistry([zoopibotQueryAgentSpec]);
  const requirementProvider = process.env.CONVERSATION_REQUIREMENTS_FILE
    ? createJsonRequirementProvider(process.env.CONVERSATION_REQUIREMENTS_FILE)
    : undefined;
  const specResolver = createSpecResolver({
    agentRegistry,
    toolRegistry,
    requirementProvider,
    supportedStepKinds: [...Array.from(BUILTIN_STEP_KINDS), ...ZOOPIBOT_QUERY_STEP_KINDS],
  });
  const runtime = createConversationRuntime({
    transport: createOpenClawTransport(),
    store: createPrismaConversationStore(prisma),
    agentRegistry,
    toolRegistry,
    specResolver,
    eventSink: createConversationEventSink(getConversationEventHub(), [createZoopibotEventSink()]),
    stepHandlers: createZoopibotQueryStepHandlers(),
    capabilities: {
      async resolveSchema(input) {
        return resolveSchemaContext(
          input.question,
          input.history,
          input.sessionId,
          {
            limit: input.limit,
            excludedTables: input.excludedTables,
            retryReason: input.retryReason,
            previousSelectedItems: input.previousSelectedItems,
          },
          {
            aiRunner: input.aiRunner,
            plannerAppendix: input.promptRules?.plannerAppendix,
          }
        );
      },
      async executeQuery(sql) {
        return executeQuery(sql);
      },
      async buildPresentation(input) {
        return buildPresentationFromQueryResult(
          input.question,
          input.sql,
          input.explanation,
          input.queryResult,
          input.sessionId,
          {
            aiRunner: input.aiRunner,
            presentationAppendix: input.promptRules?.presentationAppendix,
          }
        );
      },
      async logError(input) {
        const errorType: ErrorType =
          input.errorType === 'parse_error' ||
          input.errorType === 'db_query_error' ||
          input.errorType === 'timeout' ||
          input.errorType === 'context_load_error' ||
          input.errorType === 'cli_error'
            ? input.errorType
            : 'cli_error';
        await logGenerationError({
          errorType,
          errorMessage: input.errorMessage,
          userId: input.userId,
          sessionId: input.threadId,
          messageId: input.messageId,
          prompt: input.prompt,
          rawResponse: input.rawResponse,
          metadata: input.metadata,
        });
      },
    },
  });

  globalConversation.conversationRuntime = runtime;
  return runtime;
}
