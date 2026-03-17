import type {
  ConversationArtifact,
  ConversationMessageResult,
  OutputContract,
  WorkflowHistoryMessage,
} from '@zootopiafresh/agent-core';

import type { QueryResultSnapshot, ReportPresentation } from '@/lib/presentation';

export interface ZoopibotValidationArtifactData {
  validated?: boolean | null;
  mode?: string | null;
  error?: string | null;
  attempts?: number | null;
}

function getArtifact<T = unknown>(
  result: ConversationMessageResult | null | undefined,
  key: string,
  expectedKind?: string
): ConversationArtifact<T> | null {
  const artifact = result?.artifacts?.[key] ?? null;
  if (!artifact) {
    return null;
  }

  if (expectedKind && artifact.kind !== expectedKind) {
    return null;
  }

  return artifact as ConversationArtifact<T>;
}

export function buildZoopibotMessageResult(input: {
  outputContract: OutputContract;
  sql?: string | null;
  presentation?: ReportPresentation | null;
  resultSnapshot?: QueryResultSnapshot | null;
  validation?: ZoopibotValidationArtifactData | null;
  meta?: Record<string, unknown> | null;
}): ConversationMessageResult {
  const included = new Set(input.outputContract.includeArtifacts ?? []);
  const artifacts: Record<string, ConversationArtifact | null> = {};

  if (included.has('sql') && input.sql?.trim()) {
    artifacts.sql = {
      kind: 'sql',
      data: input.sql,
    };
  }

  if (included.has('presentation') && input.presentation) {
    artifacts.presentation = {
      kind: 'presentation',
      data: input.presentation,
    };
  }

  if (included.has('resultSnapshot') && input.resultSnapshot) {
    artifacts.resultSnapshot = {
      kind: 'resultSnapshot',
      data: input.resultSnapshot,
    };
  }

  if (included.has('validation') && input.validation) {
    artifacts.validation = {
      kind: 'validation',
      data: input.validation,
    };
  }

  return {
    artifacts,
    meta: input.outputContract.includeMeta ? (input.meta ?? null) : null,
  };
}

export function readZoopibotSql(result: ConversationMessageResult | null | undefined) {
  return getArtifact<string>(result, 'sql', 'sql')?.data ?? null;
}

export function readZoopibotPresentation(result: ConversationMessageResult | null | undefined) {
  return getArtifact<ReportPresentation>(result, 'presentation', 'presentation')?.data ?? null;
}

export function readZoopibotResultSnapshot(result: ConversationMessageResult | null | undefined) {
  return getArtifact<QueryResultSnapshot>(result, 'resultSnapshot', 'resultSnapshot')?.data ?? null;
}

export function readZoopibotValidation(result: ConversationMessageResult | null | undefined) {
  return getArtifact<ZoopibotValidationArtifactData>(result, 'validation', 'validation')?.data ?? null;
}

export function readZoopibotHistorySql(historyMessage: WorkflowHistoryMessage) {
  return readZoopibotSql(
    historyMessage.artifacts
      ? {
          artifacts: historyMessage.artifacts,
          meta: null,
        }
      : null
  ) ?? undefined;
}
