import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';

import { createOpenClawClient, type OpenClawConnectionCheckResult } from './openclaw-client';
import { commandExists as defaultCommandExists } from './openclaw-command';

export const signalExitCodes: Record<string, number> = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

interface RunnerConfigInput {
  appCommand: string[];
  env?: Record<string, string | undefined>;
  gatewayCmdDefault: string;
  projectDir: string;
}

export interface OpenClawRunnerConfig {
  appCommand: string[];
  autoStart: boolean;
  env: Record<string, string | undefined>;
  gatewayCmd: string;
  gatewayHost: string;
  gatewayPort: number;
  projectDir: string;
}

interface RunnerDependencies {
  spawn?: typeof nodeSpawn;
  commandExists?: typeof defaultCommandExists;
  isPortOpen?: typeof defaultIsPortOpen;
  verifyGateway?: typeof defaultVerifyGateway;
  waitForGatewayReady?: typeof defaultWaitForGatewayReady;
  kill?: typeof process.kill;
  exit?: typeof process.exit;
  logger?: Console;
  platform?: NodeJS.Platform;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

async function defaultIsPortOpen(host: string, port: number, timeoutMs = 500) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });

    const finish = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function defaultWaitForPort(
  host: string,
  port: number,
  timeoutMs: number,
  isPortOpen = defaultIsPortOpen
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(host, port)) {
      return true;
    }

    await sleep(250);
  }

  return false;
}

async function defaultVerifyGateway(
  config: OpenClawRunnerConfig
): Promise<OpenClawConnectionCheckResult> {
  const client = createOpenClawClient({
    agentId: config.env.OPENCLAW_AGENT_ID || 'main',
    baseUrl: `http://${config.gatewayHost}:${config.gatewayPort}`,
    token: config.env.OPENCLAW_GATEWAY_TOKEN || '',
  });

  return client.checkConnection();
}

async function defaultWaitForGatewayReady(
  config: OpenClawRunnerConfig,
  timeoutMs: number,
  isPortOpen = defaultIsPortOpen,
  verifyGateway = defaultVerifyGateway
) {
  const startedAt = Date.now();
  let lastResult: OpenClawConnectionCheckResult = {
    ok: false,
    code: 'network-error',
    message: 'OpenClaw Gateway 응답을 아직 확인하지 못했습니다.',
  };

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(config.gatewayHost, config.gatewayPort)) {
      lastResult = await verifyGateway(config);
      if (lastResult.ok) {
        return lastResult;
      }
    }

    await sleep(250);
  }

  return lastResult.code === 'ok'
    ? lastResult
    : {
        ...lastResult,
        message: `${lastResult.message} (timeout=${timeoutMs}ms)`,
      };
}

function buildGatewayStartArgs(config: OpenClawRunnerConfig) {
  const args = ['gateway', 'run', '--force', '--port', String(config.gatewayPort)];
  const token = config.env.OPENCLAW_GATEWAY_TOKEN?.trim();

  if (token) {
    args.push('--token', token);
  }

  return args;
}

export function resolveOpenClawRunnerConfig({
  appCommand,
  env = process.env,
  gatewayCmdDefault,
  projectDir,
}: RunnerConfigInput): OpenClawRunnerConfig {
  if (!Array.isArray(appCommand) || appCommand.length === 0) {
    throw new Error('[run-with-openclaw] 실행할 앱 명령을 넘겨주세요.');
  }

  const gatewayPort = Number.parseInt(env.OPENCLAW_GATEWAY_PORT || '18789', 10);
  if (Number.isNaN(gatewayPort) || gatewayPort <= 0) {
    throw new Error(
      `[run-with-openclaw] 잘못된 OPENCLAW_GATEWAY_PORT 값입니다: ${env.OPENCLAW_GATEWAY_PORT}`
    );
  }

  return {
    appCommand,
    autoStart: !['0', 'false', 'no'].includes((env.OPENCLAW_AUTOSTART || '1').toLowerCase()),
    env,
    gatewayCmd: env.OPENCLAW_CMD || gatewayCmdDefault,
    gatewayHost: env.OPENCLAW_GATEWAY_HOST || '127.0.0.1',
    gatewayPort,
    projectDir,
  };
}

export function createOpenClawRunner(config: OpenClawRunnerConfig, dependencies: RunnerDependencies = {}) {
  const spawn = dependencies.spawn || nodeSpawn;
  const commandExists = dependencies.commandExists || defaultCommandExists;
  const isPortOpen = dependencies.isPortOpen || defaultIsPortOpen;
  const verifyGateway = dependencies.verifyGateway || defaultVerifyGateway;
  const waitForGatewayReady =
    dependencies.waitForGatewayReady ||
    ((nextConfig, timeoutMs) =>
      defaultWaitForGatewayReady(nextConfig, timeoutMs, isPortOpen, verifyGateway));
  const kill = dependencies.kill || process.kill.bind(process);
  const exit = dependencies.exit || process.exit.bind(process);
  const logger = dependencies.logger || console;
  const platform = dependencies.platform || process.platform;

  let gatewayChild: ChildProcess | null = null;
  let appChild: ChildProcess | null = null;
  let ownsGateway = false;
  let shuttingDown = false;
  let resolved = false;

  function childExitPromise(child: ChildProcess | null) {
    return new Promise<void>((resolve) => {
      if (!child || child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }

      child.once('exit', () => resolve());
    });
  }

  function spawnManaged(command: string, args: string[], label: string) {
    const child = spawn(command, args, {
      cwd: config.projectDir,
      env: config.env as NodeJS.ProcessEnv,
      stdio: 'inherit',
      detached: platform !== 'win32',
    }) as ChildProcess;

    child.once('error', (error: Error) => {
      if (resolved) {
        return;
      }

      logger.error(`[run-with-openclaw] ${label} 실행 실패: ${error.message}`);
      void shutdown(1);
    });

    return child;
  }

  async function stopChild(child: ChildProcess | null, label: string) {
    if (!child || child.exitCode !== null || child.signalCode !== null) {
      return;
    }

    const pid = child.pid;
    if (pid == null) {
      logger.error(`[run-with-openclaw] ${label} PID를 찾지 못해 종료를 건너뜁니다.`);
      return;
    }
    const killTarget = platform === 'win32' ? pid : -pid;

    try {
      kill(killTarget, 'SIGTERM');
    } catch (error: unknown) {
      if (!isNodeError(error) || error.code !== 'ESRCH') {
        const message = isNodeError(error) ? error.message : String(error);
        logger.error(`[run-with-openclaw] ${label} 종료 신호 전달 실패: ${message}`);
      }
      return;
    }

    const exited = Promise.race([
      childExitPromise(child).then(() => true),
      sleep(5000).then(() => false),
    ]);

    if (await exited) {
      return;
    }

    try {
      kill(killTarget, 'SIGKILL');
    } catch (error: unknown) {
      if (!isNodeError(error) || error.code !== 'ESRCH') {
        const message = isNodeError(error) ? error.message : String(error);
        logger.error(`[run-with-openclaw] ${label} 강제 종료 실패: ${message}`);
      }
    }

    await childExitPromise(child);
  }

  async function shutdown(exitCode: number) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    await Promise.all([
      stopChild(appChild, '앱'),
      ownsGateway ? stopChild(gatewayChild, 'OpenClaw Gateway') : Promise.resolve(),
    ]);

    resolved = true;
    exit(exitCode);
  }

  async function startGatewayIfNeeded() {
    if (!config.autoStart) {
      logger.log('[run-with-openclaw] OPENCLAW_AUTOSTART=0 이므로 기존 Gateway만 사용합니다.');
      return;
    }

    const portAlreadyOpen = await isPortOpen(config.gatewayHost, config.gatewayPort);
    let existingGatewayResult: OpenClawConnectionCheckResult | null = null;

    if (portAlreadyOpen) {
      existingGatewayResult = await verifyGateway(config);
      if (existingGatewayResult.ok) {
        logger.log(
          `[run-with-openclaw] 기존 Gateway를 재사용합니다: http://${config.gatewayHost}:${config.gatewayPort}`
        );
        return;
      }
    }

    if (!commandExists(config.gatewayCmd)) {
      if (existingGatewayResult) {
        throw new Error(
          `[run-with-openclaw] 기존 Gateway를 재사용할 수 없고 OpenClaw 실행 파일도 없습니다: ${config.gatewayCmd}. 마지막 확인: ${existingGatewayResult.message}`
        );
      }

      throw new Error(`[run-with-openclaw] OpenClaw 실행 파일을 찾지 못했습니다: ${config.gatewayCmd}`);
    }

    if (existingGatewayResult) {
      logger.log(
        `[run-with-openclaw] 기존 Gateway 응답이 현재 설정과 맞지 않아 재시작합니다: ${existingGatewayResult.message}`
      );
    }

    logger.log('[run-with-openclaw] OpenClaw Gateway를 시작합니다.');
    gatewayChild = spawnManaged(
      config.gatewayCmd,
      buildGatewayStartArgs(config),
      'OpenClaw Gateway'
    );
    ownsGateway = true;
    const currentGatewayChild = gatewayChild;

    const ready = await waitForGatewayReady(config, 15000);
    if (!ready.ok) {
      if (currentGatewayChild.exitCode !== null) {
        throw new Error(
          `Gateway가 비정상 종료되었습니다 (code=${currentGatewayChild.exitCode ?? 'null'})`
        );
      }

      throw new Error(
        `Gateway가 15초 내에 현재 설정으로 준비되지 않았습니다. 마지막 확인: ${ready.message}`
      );
    }

    logger.log(
      `[run-with-openclaw] Gateway 준비 완료: http://${config.gatewayHost}:${config.gatewayPort}`
    );
  }

  function wireChildExitHandlers() {
    appChild?.once('exit', (code, signal) => {
      if (shuttingDown) {
        return;
      }

      const exitCode = signal ? signalExitCodes[signal] || 1 : code || 0;
      void shutdown(exitCode);
    });

    if (ownsGateway && gatewayChild) {
      gatewayChild.once('exit', (code, signal) => {
        if (shuttingDown) {
          return;
        }

        const exitCode = signal ? signalExitCodes[signal] || 1 : code || 1;
        logger.error(
          `[run-with-openclaw] Gateway가 먼저 종료되어 앱도 함께 종료합니다. (code=${exitCode})`
        );
        void shutdown(exitCode);
      });
    }
  }

  async function start() {
    try {
      await startGatewayIfNeeded();
    } catch (error: any) {
      logger.error(`[run-with-openclaw] ${error.message}`);
      await shutdown(1);
      return;
    }

    logger.log(`[run-with-openclaw] 앱 실행: ${config.appCommand.join(' ')}`);
    appChild = spawnManaged(config.appCommand[0], config.appCommand.slice(1), '앱');
    wireChildExitHandlers();
  }

  function attachProcessHandlers(targetProcess = process) {
    for (const signal of Object.keys(signalExitCodes)) {
      targetProcess.on(signal, () => {
        if (shuttingDown) {
          return;
        }

        void shutdown(signalExitCodes[signal] || 1);
      });
    }

    targetProcess.on('uncaughtException', (error) => {
      logger.error(`[run-with-openclaw] 처리되지 않은 예외: ${error.stack || error.message}`);
      void shutdown(1);
    });

    targetProcess.on('unhandledRejection', (reason) => {
      const message =
        reason instanceof Error ? reason.stack || reason.message : String(reason);
      logger.error(`[run-with-openclaw] 처리되지 않은 Promise 거부: ${message}`);
      void shutdown(1);
    });
  }

  return {
    start,
    shutdown,
    attachProcessHandlers,
    startGatewayIfNeeded,
    getState() {
      return {
        appChild,
        gatewayChild,
        ownsGateway,
        resolved,
        shuttingDown,
      };
    },
  };
}
