/**
 * OpenClaw Gateway HTTP 클라이언트
 *
 * OpenClaw Gateway의 /v1/chat/completions API를 통해
 * AI 응답을 받는 클라이언트. Claude CLI 대신 사용 가능.
 */

const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://127.0.0.1:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const OPENCLAW_AGENT_ID = process.env.OPENCLAW_AGENT_ID || 'main';

interface OpenClawMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenClawResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

/**
 * OpenClaw Gateway에 메시지를 보내고 응답을 받는다.
 * OpenAI-compatible /v1/chat/completions 엔드포인트 사용.
 */
export async function callOpenClaw(
  prompt: string,
  options?: {
    sessionKey?: string;
    systemPrompt?: string;
    timeout?: number;
  }
): Promise<string> {
  const messages: OpenClawMessage[] = [];

  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-openclaw-agent-id': OPENCLAW_AGENT_ID,
  };

  if (OPENCLAW_TOKEN) {
    headers['Authorization'] = `Bearer ${OPENCLAW_TOKEN}`;
  }

  if (options?.sessionKey) {
    headers['x-openclaw-session-key'] = options.sessionKey;
  }

  const controller = new AbortController();
  const timeoutMs = options?.timeout || 120000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log('[OpenClaw] Sending request to Gateway...');
    console.log('[OpenClaw] URL:', `${OPENCLAW_URL}/v1/chat/completions`);
    console.log('[OpenClaw] Agent:', OPENCLAW_AGENT_ID);
    console.log('[OpenClaw] Prompt length:', prompt.length);

    const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'openclaw',
        messages,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenClaw] HTTP error:', response.status, errorText);
      throw new Error(`OpenClaw Gateway 응답 오류 (${response.status}): ${errorText}`);
    }

    const data: OpenClawResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('OpenClaw Gateway에서 응답을 받지 못했습니다.');
    }

    const content = data.choices[0].message.content;
    console.log('[OpenClaw] Response length:', content.length);
    console.log('[OpenClaw] Response preview:', content.substring(0, 200));

    if (data.usage) {
      console.log('[OpenClaw] Tokens - input:', data.usage.prompt_tokens, 'output:', data.usage.completion_tokens);
    }

    return content;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`OpenClaw Gateway 실행 시간이 초과되었습니다. (${timeoutMs / 1000}초)`);
    }

    if (error.cause?.code === 'ECONNREFUSED') {
      throw new Error(
        'OpenClaw Gateway에 연결할 수 없습니다. `openclaw gateway` 명령으로 Gateway를 시작하세요.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * OpenClaw Gateway 연결 상태 확인
 */
export async function testOpenClawConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OPENCLAW_TOKEN && { Authorization: `Bearer ${OPENCLAW_TOKEN}` }),
        'x-openclaw-agent-id': OPENCLAW_AGENT_ID,
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [{ role: 'user', content: 'ping' }],
        stream: false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * AI 백엔드 모드 확인
 */
export function getAIBackendMode(): 'openclaw' | 'claude-cli' {
  return process.env.AI_BACKEND === 'openclaw' ? 'openclaw' : 'claude-cli';
}
