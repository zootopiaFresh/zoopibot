import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { callOpenClaw, getAIBackendMode } from './openclaw';

const execAsync = promisify(exec);

export interface AIRunOptions {
  sessionKey?: string;
  timeout?: number;
}

function normalizeAIRunOptions(
  sessionKeyOrOptions?: string | AIRunOptions
): AIRunOptions {
  if (!sessionKeyOrOptions) {
    return {};
  }

  if (typeof sessionKeyOrOptions === 'string') {
    return { sessionKey: sessionKeyOrOptions };
  }

  return sessionKeyOrOptions;
}

/**
 * AI 백엔드를 통해 프롬프트를 실행한다.
 * AI_BACKEND 환경변수에 따라 Claude CLI 또는 OpenClaw Gateway를 사용.
 *
 * - AI_BACKEND=openclaw → OpenClaw Gateway HTTP API
 * - AI_BACKEND=claude-cli (기본값) → Claude CLI (shell exec)
 */
export async function runAI(
  prompt: string,
  sessionKeyOrOptions?: string | AIRunOptions
): Promise<string> {
  const options = normalizeAIRunOptions(sessionKeyOrOptions);
  const mode = getAIBackendMode();

  if (mode === 'openclaw') {
    return callOpenClaw(prompt, {
      sessionKey: options.sessionKey,
      timeout: options.timeout,
    });
  }

  return runClaudeCLI(prompt, options);
}

// Claude CLI를 사용하여 프롬프트 실행
export async function runClaudeCLI(
  prompt: string,
  options?: AIRunOptions
): Promise<string> {
  const tempFile = join(tmpdir(), `claude-prompt-${Date.now()}.txt`);
  await writeFile(tempFile, prompt, 'utf-8');

  try {
    console.log('[Claude CLI] Executing command...');
    console.log('[Claude CLI] HOME:', process.env.HOME);
    console.log('[Claude CLI] PATH:', process.env.PATH?.split(':').slice(0, 3));

    const command = `cat ${tempFile} | claude --output-format json`;
    const timeoutMs = options?.timeout ?? 120000;

    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        HOME: process.env.HOME || '',
        PATH: process.env.PATH || '',
      },
      maxBuffer: 1024 * 1024 * 10,
      timeout: timeoutMs,
    });

    if (stderr) {
      console.error('[Claude CLI] stderr:', stderr);
    }

    console.log('[Claude CLI] stdout length:', stdout.length);
    console.log('[Claude CLI] stdout preview:', stdout.substring(0, 300));

    if (!stdout.trim()) {
      throw new Error('Claude CLI에서 응답을 받지 못했습니다.');
    }

    try {
      const result = JSON.parse(stdout);

      if (result.type === 'result' && result.is_error === false) {
        return result.result || '';
      }

      if (result.is_error === true) {
        throw new Error(result.result || 'Claude CLI 에러');
      }

      if (Array.isArray(result)) {
        const textBlocks = result.filter((item: any) => item.type === 'text');
        return textBlocks.length > 0
          ? textBlocks[textBlocks.length - 1].text
          : stdout;
      }

      return result.output || result.text || result.result || stdout;
    } catch {
      console.warn('[Claude CLI] JSON parse failed, returning raw output');
      return stdout.trim();
    }
  } catch (error: any) {
    console.error('[Claude CLI] Execution error:', error);

    if (error.code === 'ENOENT') {
      throw new Error(
        'Claude CLI가 설치되지 않았습니다. npm install -g @anthropic-ai/claude-code 를 실행하세요.'
      );
    }

    if (error.killed) {
      throw new Error(
        `Claude CLI 실행 시간이 초과되었습니다. (${Math.round(
          (options?.timeout ?? 120000) / 1000
        )}초)`
      );
    }

    throw new Error(`Claude CLI 실행 실패: ${error.message}`);
  } finally {
    await unlink(tempFile).catch(() => {});
  }
}
