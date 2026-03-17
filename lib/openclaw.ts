import {
  createOpenClawClient,
  getOpenClawConfigFromEnv,
  type OpenClawCallOptions,
} from './openclaw-client';

/**
 * OpenClaw Gateway에 메시지를 보내고 응답을 받는다.
 * OpenAI-compatible /v1/chat/completions 엔드포인트 사용.
 */
export async function callOpenClaw(
  prompt: string,
  options?: OpenClawCallOptions
): Promise<string> {
  return createOpenClawClient(getOpenClawConfigFromEnv()).call(prompt, options);
}

/**
 * OpenClaw Gateway 연결 상태 확인
 */
export async function testOpenClawConnection(): Promise<boolean> {
  return createOpenClawClient(getOpenClawConfigFromEnv()).testConnection();
}

/**
 * AI 백엔드 모드 확인
 */
export function getAIBackendMode(): 'openclaw' | 'claude-cli' {
  return process.env.AI_BACKEND === 'openclaw' ? 'openclaw' : 'claude-cli';
}

export {
  createOpenClawClient,
  getOpenClawConfigFromEnv,
} from './openclaw-client';
export type {
  OpenClawCallOptions,
  OpenClawConfig,
  OpenClawMessage,
  OpenClawResponse,
} from './openclaw-client';
