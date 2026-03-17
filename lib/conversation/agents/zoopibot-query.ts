import type { AgentSpec } from '@zootopiafresh/agent-core';

export const zoopibotQueryAgentSpec: AgentSpec = {
  id: 'zoopibot-query',
  defaultRequirementSpec: {
    id: 'default',
    allowedTools: ['execute_query'],
    thresholds: {
      initialSchemaLimit: 4,
      recoverySchemaLimit: 8,
      maxSchemaRecoveryAttempts: 1,
      maxQueryExecutionRecoveryAttempts: 2,
    },
    outputContract: {
      includeArtifacts: ['sql', 'presentation', 'resultSnapshot', 'validation'],
      includeMeta: true,
    },
    promptRules: {
      plannerAppendix: [],
      sqlAppendix: [],
      presentationAppendix: [],
    },
    progressStages: [
      { id: 'queued', label: '질문 접수', detail: '요청을 등록했습니다.' },
      { id: 'schema', label: '관련 스키마 탐색', detail: '질문과 관련된 테이블과 컬럼을 찾는 중입니다.' },
      { id: 'verify', label: 'SQL 검증 및 결과 확인', detail: 'SQL을 실행하고 결과를 검증하는 중입니다.' },
      { id: 'report', label: '리포트 정리', detail: '설명과 리포트 구성을 정리하는 중입니다.' },
    ],
    steps: [
      { id: 'prepare-history', kind: 'prepare_history' },
      { id: 'stage-schema', kind: 'emit_step', config: { stageId: 'schema' } },
      { id: 'resolve-schema', kind: 'resolve_schema' },
      { id: 'model-call', kind: 'model_call' },
      {
        id: 'stage-verify',
        kind: 'emit_step',
        when: {
          metaEquals: { autoExecute: true },
          stateTrue: ['hasSql'],
          stateFalse: ['validatedFalse'],
        },
        config: { stageId: 'verify' },
      },
      {
        id: 'execute-query',
        kind: 'execute_query',
        when: {
          stateTrue: ['hasSql'],
        },
        config: { toolId: 'execute_query' },
      },
      {
        id: 'stage-report',
        kind: 'emit_step',
        when: {
          metaEquals: { autoExecute: true },
          stateTrue: ['hasSql'],
          stateFalse: ['validatedFalse'],
        },
        config: { stageId: 'report' },
      },
      {
        id: 'build-result',
        kind: 'build_result',
        when: {
          metaEquals: { autoExecute: true },
          stateTrue: ['hasSql'],
          stateFalse: ['validatedFalse'],
        },
      },
      { id: 'update-message', kind: 'update_message' },
    ],
  },
};
