import { spawn as nodeSpawn } from "node:child_process";
import { existsSync as nodeExistsSync } from "node:fs";
import net from "node:net";
import process from "node:process";

export const signalExitCodes = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function defaultIsPortOpen(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function defaultWaitForPort(host, port, timeoutMs, isPortOpen = defaultIsPortOpen) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(host, port)) {
      return true;
    }

    await sleep(250);
  }

  return false;
}

export function resolveOpenClawRunnerConfig({
  appCommand,
  env = process.env,
  gatewayCmdDefault,
  projectDir,
}) {
  if (!Array.isArray(appCommand) || appCommand.length === 0) {
    throw new Error("[run-with-openclaw] 실행할 앱 명령을 넘겨주세요.");
  }

  const gatewayPort = Number.parseInt(env.OPENCLAW_GATEWAY_PORT || "18789", 10);
  if (Number.isNaN(gatewayPort) || gatewayPort <= 0) {
    throw new Error(
      `[run-with-openclaw] 잘못된 OPENCLAW_GATEWAY_PORT 값입니다: ${env.OPENCLAW_GATEWAY_PORT}`
    );
  }

  return {
    appCommand,
    autoStart: !["0", "false", "no"].includes(
      (env.OPENCLAW_AUTOSTART || "1").toLowerCase()
    ),
    env,
    gatewayCmd: env.OPENCLAW_CMD || gatewayCmdDefault,
    gatewayHost: env.OPENCLAW_GATEWAY_HOST || "127.0.0.1",
    gatewayPort,
    projectDir,
  };
}

export function createOpenClawRunner(config, dependencies = {}) {
  const spawn = dependencies.spawn || nodeSpawn;
  const existsSync = dependencies.existsSync || nodeExistsSync;
  const isPortOpen = dependencies.isPortOpen || defaultIsPortOpen;
  const waitForPort =
    dependencies.waitForPort ||
    ((host, port, timeoutMs) => defaultWaitForPort(host, port, timeoutMs, isPortOpen));
  const kill = dependencies.kill || process.kill.bind(process);
  const exit = dependencies.exit || process.exit.bind(process);
  const logger = dependencies.logger || console;
  const platform = dependencies.platform || process.platform;

  let gatewayChild = null;
  let appChild = null;
  let ownsGateway = false;
  let shuttingDown = false;
  let resolved = false;

  function childExitPromise(child) {
    return new Promise((resolve) => {
      if (!child || child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }

      child.once("exit", () => resolve());
    });
  }

  function spawnManaged(command, args, label) {
    const child = spawn(command, args, {
      cwd: config.projectDir,
      env: config.env,
      stdio: "inherit",
      detached: platform !== "win32",
    });

    child.once("error", (error) => {
      if (resolved) {
        return;
      }

      logger.error(`[run-with-openclaw] ${label} 실행 실패: ${error.message}`);
      void shutdown(1);
    });

    return child;
  }

  async function stopChild(child, label) {
    if (!child || child.exitCode !== null || child.signalCode !== null) {
      return;
    }

    const pid = child.pid;
    const killTarget = platform === "win32" ? pid : -pid;

    try {
      kill(killTarget, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") {
        logger.error(`[run-with-openclaw] ${label} 종료 신호 전달 실패: ${error.message}`);
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
      kill(killTarget, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") {
        logger.error(`[run-with-openclaw] ${label} 강제 종료 실패: ${error.message}`);
      }
    }

    await childExitPromise(child);
  }

  async function shutdown(exitCode) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    await Promise.all([
      stopChild(appChild, "앱"),
      ownsGateway ? stopChild(gatewayChild, "OpenClaw Gateway") : Promise.resolve(),
    ]);

    resolved = true;
    exit(exitCode);
  }

  async function startGatewayIfNeeded() {
    if (!config.autoStart) {
      logger.log("[run-with-openclaw] OPENCLAW_AUTOSTART=0 이므로 기존 Gateway만 사용합니다.");
      return;
    }

    if (!existsSync(config.gatewayCmd)) {
      throw new Error(`[run-with-openclaw] OpenClaw 실행 파일이 없습니다: ${config.gatewayCmd}`);
    }

    if (await isPortOpen(config.gatewayHost, config.gatewayPort)) {
      logger.log(
        `[run-with-openclaw] 기존 Gateway를 재사용합니다: http://${config.gatewayHost}:${config.gatewayPort}`
      );
      return;
    }

    logger.log("[run-with-openclaw] OpenClaw Gateway를 시작합니다.");
    gatewayChild = spawnManaged(config.gatewayCmd, ["gateway"], "OpenClaw Gateway");
    ownsGateway = true;

    const ready = await waitForPort(config.gatewayHost, config.gatewayPort, 15000);
    if (!ready) {
      if (gatewayChild.exitCode !== null) {
        throw new Error(
          `Gateway가 비정상 종료되었습니다 (code=${gatewayChild.exitCode ?? "null"})`
        );
      }

      throw new Error("Gateway 포트가 15초 내에 열리지 않았습니다.");
    }

    logger.log(
      `[run-with-openclaw] Gateway 준비 완료: http://${config.gatewayHost}:${config.gatewayPort}`
    );
  }

  function wireChildExitHandlers() {
    appChild.once("exit", (code, signal) => {
      if (shuttingDown) {
        return;
      }

      const exitCode = signal ? signalExitCodes[signal] || 1 : code || 0;
      void shutdown(exitCode);
    });

    if (ownsGateway && gatewayChild) {
      gatewayChild.once("exit", (code, signal) => {
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
    } catch (error) {
      logger.error(`[run-with-openclaw] ${error.message}`);
      await shutdown(1);
      return;
    }

    logger.log(`[run-with-openclaw] 앱 실행: ${config.appCommand.join(" ")}`);
    appChild = spawnManaged(config.appCommand[0], config.appCommand.slice(1), "앱");
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

    targetProcess.on("uncaughtException", (error) => {
      logger.error(
        `[run-with-openclaw] 처리되지 않은 예외: ${error.stack || error.message}`
      );
      void shutdown(1);
    });

    targetProcess.on("unhandledRejection", (reason) => {
      const message =
        reason instanceof Error ? reason.stack || reason.message : String(reason);
      logger.error(`[run-with-openclaw] 처리되지 않은 Promise 거부: ${message}`);
      void shutdown(1);
    });
  }

  return {
    attachProcessHandlers,
    shutdown,
    start,
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
