export interface OpenClawConfig {
  baseUrl: string;
  token?: string;
  agentId: string;
  model: string;
  defaultTimeoutMs: number;
}

export interface OpenClawCallOptions {
  sessionKey?: string;
  systemPrompt?: string;
  timeout?: number;
}

export interface OpenClawMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenClawResponse {
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

export type OpenClawConnectionCheckCode =
  | 'ok'
  | 'unauthorized'
  | 'http-error'
  | 'connection-refused'
  | 'timeout'
  | 'network-error';

export interface OpenClawConnectionCheckResult {
  ok: boolean;
  code: OpenClawConnectionCheckCode;
  message: string;
  status?: number;
  details?: string;
}

type OpenClawFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

interface OpenClawLogger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

interface OpenClawClientDependencies {
  fetchImpl?: OpenClawFetch;
  logger?: OpenClawLogger;
}

const silentLogger: OpenClawLogger = {
  log() {},
  error() {},
};

const DEFAULT_OPENCLAW_CONFIG: OpenClawConfig = {
  baseUrl: 'http://127.0.0.1:18789',
  token: '',
  agentId: 'main',
  model: 'openclaw',
  defaultTimeoutMs: 120000,
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function getErrorCode(error: unknown) {
  if (error && typeof error === 'object') {
    const directCode = (error as { code?: unknown }).code;
    if (typeof directCode === 'string') {
      return directCode;
    }

    const cause = (error as { cause?: { code?: unknown } }).cause;
    if (cause && typeof cause.code === 'string') {
      return cause.code;
    }
  }

  return undefined;
}

function buildHeaders(
  config: OpenClawConfig,
  options?: OpenClawCallOptions
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-openclaw-agent-id': config.agentId,
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  if (options?.sessionKey) {
    headers['x-openclaw-session-key'] = options.sessionKey;
  }

  return headers;
}

export function getOpenClawConfigFromEnv(
  env: Record<string, string | undefined> = process.env
): OpenClawConfig {
  return {
    baseUrl: env.OPENCLAW_URL || DEFAULT_OPENCLAW_CONFIG.baseUrl,
    token: env.OPENCLAW_GATEWAY_TOKEN || DEFAULT_OPENCLAW_CONFIG.token,
    agentId: env.OPENCLAW_AGENT_ID || DEFAULT_OPENCLAW_CONFIG.agentId,
    model: DEFAULT_OPENCLAW_CONFIG.model,
    defaultTimeoutMs: DEFAULT_OPENCLAW_CONFIG.defaultTimeoutMs,
  };
}

export function createOpenClawClient(
  inputConfig: Partial<OpenClawConfig> = {},
  dependencies: OpenClawClientDependencies = {}
) {
  const config: OpenClawConfig = {
    ...DEFAULT_OPENCLAW_CONFIG,
    ...inputConfig,
    baseUrl: normalizeBaseUrl(inputConfig.baseUrl || DEFAULT_OPENCLAW_CONFIG.baseUrl),
  };
  const fetchImpl: OpenClawFetch = dependencies.fetchImpl || fetch;
  const logger = dependencies.logger || silentLogger;

  async function checkConnection(timeoutMs = 10000): Promise<OpenClawConnectionCheckResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(config),
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'ping' }],
          stream: false,
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        return {
          ok: true,
          code: 'ok',
          status: response.status,
          message: 'OpenClaw Gateway 응답을 확인했습니다.',
        };
      }

      const details = (await response.text()).trim();
      if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          code: 'unauthorized',
          status: response.status,
          details,
          message: `OpenClaw Gateway 인증에 실패했습니다. OPENCLAW_GATEWAY_TOKEN을 확인하세요. (${response.status})`,
        };
      }

      return {
        ok: false,
        code: 'http-error',
        status: response.status,
        details,
        message: details
          ? `OpenClaw Gateway 응답 오류 (${response.status}): ${details}`
          : `OpenClaw Gateway 응답 오류 (${response.status})`,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          ok: false,
          code: 'timeout',
          message: `OpenClaw Gateway 연결 확인이 ${timeoutMs / 1000}초 안에 끝나지 않았습니다.`,
        };
      }

      if (getErrorCode(error) === 'ECONNREFUSED') {
        return {
          ok: false,
          code: 'connection-refused',
          message:
            'OpenClaw Gateway에 연결할 수 없습니다. `openclaw gateway run`으로 Gateway를 시작하거나 자동 기동 설정을 확인하세요.',
        };
      }

      return {
        ok: false,
        code: 'network-error',
        message: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function call(prompt: string, options?: OpenClawCallOptions): Promise<string> {
    const messages: OpenClawMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeoutMs = options?.timeout || config.defaultTimeoutMs;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.log('[OpenClaw] Sending request to Gateway...');
      logger.log('[OpenClaw] URL:', `${config.baseUrl}/v1/chat/completions`);
      logger.log('[OpenClaw] Agent:', config.agentId);
      logger.log('[OpenClaw] Prompt length:', prompt.length);

      const response = await fetchImpl(`${config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(config, options),
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[OpenClaw] HTTP error:', response.status, errorText);
        throw new Error(`OpenClaw Gateway 응답 오류 (${response.status}): ${errorText}`);
      }

      const data: OpenClawResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('OpenClaw Gateway에서 응답을 받지 못했습니다.');
      }

      const content = data.choices[0].message.content;
      logger.log('[OpenClaw] Response length:', content.length);
      logger.log('[OpenClaw] Response preview:', content.substring(0, 200));

      if (data.usage) {
        logger.log(
          '[OpenClaw] Tokens - input:',
          data.usage.prompt_tokens,
          'output:',
          data.usage.completion_tokens
        );
      }

      return content;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`OpenClaw Gateway 실행 시간이 초과되었습니다. (${timeoutMs / 1000}초)`);
      }

      if (getErrorCode(error) === 'ECONNREFUSED') {
        throw new Error(
          'OpenClaw Gateway에 연결할 수 없습니다. `openclaw gateway run`으로 Gateway를 시작하거나 자동 기동 설정을 확인하세요.'
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function testConnection(): Promise<boolean> {
    return (await checkConnection()).ok;
  }

  return {
    call,
    checkConnection,
    testConnection,
    config,
  };
}
