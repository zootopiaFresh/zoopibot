import { readFile } from 'fs/promises';
import { resolve } from 'path';

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
  StepKind,
  Thresholds,
  ToolDefinition,
  ToolRegistry,
} from '@/lib/conversation/types';

const DEFAULT_THRESHOLDS: Thresholds = {
  initialSchemaLimit: 4,
  recoverySchemaLimit: 8,
  maxSchemaRecoveryAttempts: 1,
  maxQueryExecutionRecoveryAttempts: 2,
};

const DEFAULT_OUTPUT_CONTRACT: OutputContract = {
  includeSql: true,
  includePresentation: true,
  includeResultSnapshot: true,
  includeValidation: true,
};

const DEFAULT_PROMPT_RULES: PromptRules = {
  plannerAppendix: [],
  sqlAppendix: [],
  presentationAppendix: [],
};

const DEFAULT_PROGRESS_STAGES: ProgressStageConfig[] = [
  { id: 'queued', label: '질문 접수', detail: '요청을 등록했습니다.' },
  { id: 'schema', label: '관련 스키마 탐색', detail: '질문과 관련된 테이블과 컬럼을 찾는 중입니다.' },
  { id: 'verify', label: 'SQL 검증 및 결과 확인', detail: 'SQL을 실행하고 결과를 검증하는 중입니다.' },
  { id: 'report', label: '리포트 정리', detail: '설명과 리포트 구성을 정리하는 중입니다.' },
];

const BUILTIN_STEP_KINDS = new Set<StepKind>([
  'prepare_history',
  'emit_step',
  'resolve_schema',
  'model_call',
  'execute_query',
  'build_result',
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

function mergeRequirementSpec(
  agentSpec: AgentSpec,
  override: RequirementSpec | null,
): ResolvedAgentSpec {
  const base = agentSpec.defaultRequirementSpec;

  return {
    id: agentSpec.id,
    requirementSetId: override?.id || base.id,
    steps: override?.steps ?? base.steps ?? [],
    allowedTools: override?.allowedTools ?? base.allowedTools ?? [],
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      ...base.thresholds,
      ...override?.thresholds,
    },
    outputContract: {
      ...DEFAULT_OUTPUT_CONTRACT,
      ...base.outputContract,
      ...override?.outputContract,
    },
    promptRules: mergePromptRules(base.promptRules, override?.promptRules),
    progressStages: override?.progressStages ?? base.progressStages ?? DEFAULT_PROGRESS_STAGES,
  };
}

function validateSteps(steps: StepDefinition[]) {
  for (const step of steps) {
    if (!BUILTIN_STEP_KINDS.has(step.kind)) {
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
}): SpecResolver {
  const { agentRegistry, toolRegistry, requirementProvider } = options;

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
      validateSteps(resolved.steps);
      validateTools(toolRegistry, resolved.allowedTools, resolved.steps);
      return resolved;
    },
  };
}
