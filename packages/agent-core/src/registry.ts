import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type {
  AgentRegistry,
  AgentSpec,
  OutputContract,
  ProgressStageConfig,
  PromptRules,
  RequirementSpec,
  ResolvedAgentSpec,
  SpecResolver,
  StepDefinition,
  Thresholds,
  ToolDefinition,
  ToolRegistry,
} from './types';

const DEFAULT_THRESHOLDS: Thresholds = {};

const DEFAULT_OUTPUT_CONTRACT: OutputContract = {
  includeArtifacts: [],
  includeMeta: true,
};

const DEFAULT_PROMPT_RULES: PromptRules = {
  plannerAppendix: [],
  sqlAppendix: [],
  presentationAppendix: [],
};

const DEFAULT_PROGRESS_STAGES: ProgressStageConfig[] = [
  { id: 'queued', label: '처리 시작', detail: '요청을 등록했습니다.' },
];

export const BUILTIN_STEP_KINDS = new Set([
  'prepare_history',
  'emit_step',
  'generate_reply',
  'update_message',
]);

type RequirementProvider = (
  agentId: string,
  requirementSetId?: string
) => Promise<RequirementSpec | null>;

export class StaticAgentRegistry implements AgentRegistry {
  private readonly agents = new Map<string, AgentSpec>();

  constructor(agentSpecs: AgentSpec[]) {
    for (const spec of agentSpecs) {
      this.agents.set(spec.id, spec);
    }
  }

  get(agentId: string) {
    return this.agents.get(agentId);
  }
}

export class StaticToolRegistry implements ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  constructor(toolDefinitions: ToolDefinition[] = []) {
    for (const definition of toolDefinitions) {
      this.tools.set(definition.id, definition);
    }
  }

  get(id: string) {
    return this.tools.get(id);
  }

  list() {
    return Array.from(this.tools.values());
  }
}

export function createStaticRequirementProvider(
  specs: Record<string, RequirementSpec | undefined>
): RequirementProvider {
  return async (agentId, requirementSetId) => {
    if (requirementSetId) {
      const scopedKey = `${agentId}:${requirementSetId}`;
      if (specs[scopedKey]) {
        return specs[scopedKey] ?? null;
      }
    }

    return specs[agentId] ?? null;
  };
}

export function createJsonRequirementProvider(filePath: string): RequirementProvider {
  return async (agentId, requirementSetId) => {
    const absolutePath = resolve(filePath);
    const raw = await readFile(absolutePath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, RequirementSpec | undefined>;

    if (requirementSetId) {
      const scopedKey = `${agentId}:${requirementSetId}`;
      if (parsed[scopedKey]) {
        return parsed[scopedKey] ?? null;
      }
    }

    return parsed[agentId] ?? null;
  };
}

function mergePromptRules(
  base: PromptRules | undefined,
  override: PromptRules | undefined
): PromptRules {
  return {
    plannerAppendix: override?.plannerAppendix ?? base?.plannerAppendix ?? DEFAULT_PROMPT_RULES.plannerAppendix,
    sqlAppendix: override?.sqlAppendix ?? base?.sqlAppendix ?? DEFAULT_PROMPT_RULES.sqlAppendix,
    presentationAppendix:
      override?.presentationAppendix ??
      base?.presentationAppendix ??
      DEFAULT_PROMPT_RULES.presentationAppendix,
  };
}

function mergeOutputContract(
  base: OutputContract | undefined,
  override: OutputContract | undefined
): OutputContract {
  return {
    includeArtifacts:
      override?.includeArtifacts ?? base?.includeArtifacts ?? DEFAULT_OUTPUT_CONTRACT.includeArtifacts,
    includeMeta: override?.includeMeta ?? base?.includeMeta ?? DEFAULT_OUTPUT_CONTRACT.includeMeta,
  };
}

function mergeRequirementSpec(agentSpec: AgentSpec, override: RequirementSpec | null): ResolvedAgentSpec {
  const base = agentSpec.defaultRequirementSpec;

  return {
    id: agentSpec.id,
    requirementSetId: override?.id || base.id,
    steps: override?.steps ?? base.steps ?? [],
    allowedTools: override?.allowedTools ?? base.allowedTools ?? [],
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      ...(base.thresholds ?? {}),
      ...(override?.thresholds ?? {}),
    },
    outputContract: mergeOutputContract(base.outputContract, override?.outputContract),
    promptRules: mergePromptRules(base.promptRules, override?.promptRules),
    progressStages: override?.progressStages ?? base.progressStages ?? DEFAULT_PROGRESS_STAGES,
  };
}

function validateSteps(steps: StepDefinition[], supportedStepKinds: Set<string>) {
  for (const step of steps) {
    if (!supportedStepKinds.has(step.kind)) {
      throw new Error(`지원하지 않는 StepKind입니다: ${String(step.kind)}`);
    }
  }
}

function validateTools(toolRegistry: ToolRegistry, allowedTools: string[], steps: StepDefinition[]) {
  for (const toolId of allowedTools) {
    if (!toolRegistry.get(toolId)) {
      throw new Error(`등록되지 않은 tool입니다: ${toolId}`);
    }
  }

  for (const step of steps) {
    const toolId = typeof step.config?.toolId === 'string' ? step.config.toolId : null;
    if (!toolId) {
      continue;
    }

    if (!allowedTools.includes(toolId)) {
      throw new Error(`step ${step.id}에서 허용되지 않은 tool을 사용합니다: ${toolId}`);
    }
  }
}

export function createSpecResolver(options: {
  agentRegistry: AgentRegistry;
  toolRegistry: ToolRegistry;
  requirementProvider?: RequirementProvider;
  supportedStepKinds?: Iterable<string>;
}): SpecResolver {
  const { agentRegistry, toolRegistry, requirementProvider } = options;
  const supportedStepKinds = new Set(options.supportedStepKinds ?? BUILTIN_STEP_KINDS);

  return {
    async resolve(agentId, requirementSetId) {
      const agentSpec = agentRegistry.get(agentId);
      if (!agentSpec) {
        throw new Error(`등록되지 않은 agent입니다: ${agentId}`);
      }

      const override = requirementProvider
        ? await requirementProvider(agentId, requirementSetId)
        : null;

      const resolved = mergeRequirementSpec(agentSpec, override);
      validateSteps(resolved.steps, supportedStepKinds);
      validateTools(toolRegistry, resolved.allowedTools, resolved.steps);
      return resolved;
    },
  };
}

