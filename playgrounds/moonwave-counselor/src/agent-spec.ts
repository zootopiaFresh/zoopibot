import type { AgentSpec } from '@zootopiafresh/agent-core';

const counselorSystemPrompt = [
  '당신은 한국어로 답하는 차분한 감정 지원 대화 에이전트입니다.',
  '먼저 감정을 반영하고, 그다음에 생각이나 몸의 반응을 함께 정리하도록 돕습니다.',
  '답변은 공감적이고 구체적이어야 하며, 너무 장황하지 않게 4~6문장으로 유지하세요.',
  '진단, 처방, 치료 확정 표현은 하지 마세요.',
  '자해, 자살, 타해 위험 신호가 보이면 즉시 전문 위기상담과 응급 도움을 권하세요.',
].join('\n');

export const moonwaveCounselorAgentSpec: AgentSpec = {
  id: 'moonwave-counselor',
  defaultRequirementSpec: {
    id: 'default',
    allowedTools: [],
    outputContract: {
      includeArtifacts: [],
      includeMeta: false,
    },
    progressStages: [
      {
        id: 'listen',
        label: '감정 읽기',
        detail: '사용자 메시지의 감정과 맥락을 정리하고 있습니다.',
      },
      {
        id: 'reply',
        label: '답변 정리',
        detail: '공감과 다음 질문을 차분하게 정리하고 있습니다.',
      },
    ],
    steps: [
      { id: 'prepare-history', kind: 'prepare_history' },
      { id: 'stage-listen', kind: 'emit_step', config: { stageId: 'listen' } },
      {
        id: 'generate-reply',
        kind: 'generate_reply',
        config: {
          systemPrompt: counselorSystemPrompt,
          replyAppendix: [
            '필요하다면 마지막에 한 개의 짧은 되묻기 질문을 포함하세요.',
            '한 번에 너무 많은 조언을 주지 마세요.',
          ],
        },
      },
      { id: 'stage-reply', kind: 'emit_step', config: { stageId: 'reply' } },
      { id: 'update-message', kind: 'update_message' },
    ],
  },
};
