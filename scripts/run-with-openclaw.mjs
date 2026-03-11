#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const gatewayCmd = process.env.OPENCLAW_CMD || path.join(projectDir, "scripts/openclaw-cli.sh");
const gatewayHost = process.env.OPENCLAW_GATEWAY_HOST || "127.0.0.1";
const gatewayPort = Number.parseInt(process.env.OPENCLAW_GATEWAY_PORT || "18789", 10);
const autoStart = !["0", "false", "no"].includes((process.env.OPENCLAW_AUTOSTART || "1").toLowerCase());
const appCommand = process.argv.slice(2);

if (appCommand.length === 0) {
  console.error("[run-with-openclaw] 실행할 앱 명령을 넘겨주세요.");
  process.exit(1);
}

if (Number.isNaN(gatewayPort) || gatewayPort <= 0) {
  console.error(`[run-with-openclaw] 잘못된 OPENCLAW_GATEWAY_PORT 값입니다: ${process.env.OPENCLAW_GATEWAY_PORT}`);
  process.exit(1);
}

if (autoStart && !existsSync(gatewayCmd)) {
  console.error(`[run-with-openclaw] OpenClaw 실행 파일이 없습니다: ${gatewayCmd}`);
  process.exit(1);
}

let gatewayChild = null;
let appChild = null;
let ownsGateway = false;
let shuttingDown = false;
let resolved = false;

const signalExitCodes = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(host, port, timeoutMs = 500) {
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

async function waitForPort(host, port, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(host, port)) {
      return true;
    }
    await sleep(250);
  }
  return false;
}

function spawnManaged(command, args, label) {
  const child = spawn(command, args, {
    cwd: projectDir,
    env: process.env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });

  child.once("error", (error) => {
    if (resolved) {
      return;
    }
    console.error(`[run-with-openclaw] ${label} 실행 실패: ${error.message}`);
    void shutdown(1);
  });

  return child;
}

function childExitPromise(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    child.once("exit", () => resolve());
  });
}

async function stopChild(child, label) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const pid = child.pid;
  const killTarget = process.platform === "win32" ? pid : -pid;

  try {
    process.kill(killTarget, "SIGTERM");
  } catch (error) {
    const err = /** @type {{ code?: string }} */ (error);
    if (err.code !== "ESRCH") {
      console.error(`[run-with-openclaw] ${label} 종료 신호 전달 실패: ${error.message}`);
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
    process.kill(killTarget, "SIGKILL");
  } catch (error) {
    const err = /** @type {{ code?: string }} */ (error);
    if (err.code !== "ESRCH") {
      console.error(`[run-with-openclaw] ${label} 강제 종료 실패: ${error.message}`);
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
  process.exit(exitCode);
}

async function startGatewayIfNeeded() {
  if (!autoStart) {
    console.log("[run-with-openclaw] OPENCLAW_AUTOSTART=0 이므로 기존 Gateway만 사용합니다.");
    return;
  }

  if (await isPortOpen(gatewayHost, gatewayPort)) {
    console.log(`[run-with-openclaw] 기존 Gateway를 재사용합니다: http://${gatewayHost}:${gatewayPort}`);
    return;
  }

  console.log("[run-with-openclaw] OpenClaw Gateway를 시작합니다.");
  gatewayChild = spawnManaged(gatewayCmd, ["gateway"], "OpenClaw Gateway");
  ownsGateway = true;

  const ready = await waitForPort(gatewayHost, gatewayPort, 15000);
  if (!ready) {
    if (gatewayChild.exitCode !== null) {
      throw new Error(`Gateway가 비정상 종료되었습니다 (code=${gatewayChild.exitCode ?? "null"})`);
    }
    throw new Error("Gateway 포트가 15초 내에 열리지 않았습니다.");
  }

  console.log(`[run-with-openclaw] Gateway 준비 완료: http://${gatewayHost}:${gatewayPort}`);
}

async function main() {
  try {
    await startGatewayIfNeeded();
  } catch (error) {
    console.error(`[run-with-openclaw] ${error.message}`);
    await shutdown(1);
    return;
  }

  console.log(`[run-with-openclaw] 앱 실행: ${appCommand.join(" ")}`);
  appChild = spawnManaged(appCommand[0], appCommand.slice(1), "앱");

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
      console.error(`[run-with-openclaw] Gateway가 먼저 종료되어 앱도 함께 종료합니다. (code=${exitCode})`);
      void shutdown(exitCode);
    });
  }
}

for (const signal of Object.keys(signalExitCodes)) {
  process.on(signal, () => {
    if (shuttingDown) {
      return;
    }
    void shutdown(signalExitCodes[signal] || 1);
  });
}

process.on("uncaughtException", (error) => {
  console.error(`[run-with-openclaw] 처리되지 않은 예외: ${error.stack || error.message}`);
  void shutdown(1);
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
  console.error(`[run-with-openclaw] 처리되지 않은 Promise 거부: ${message}`);
  void shutdown(1);
});

await main();
