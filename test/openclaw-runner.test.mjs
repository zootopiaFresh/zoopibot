import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  createOpenClawRunner,
  resolveOpenClawRunnerConfig,
} from "../lib/openclaw-runner.mjs";

class FakeChild extends EventEmitter {
  constructor(pid) {
    super();
    this.pid = pid;
    this.exitCode = null;
    this.signalCode = null;
  }

  finish(code = 0, signal = null) {
    this.exitCode = code;
    this.signalCode = signal;
    this.emit("exit", code, signal);
  }
}

function createLogger() {
  const logs = [];
  const errors = [];

  return {
    errors,
    logs,
    logger: {
      error: (...args) => errors.push(args.join(" ")),
      log: (...args) => logs.push(args.join(" ")),
    },
  };
}

test("resolveOpenClawRunnerConfig applies defaults", () => {
  const config = resolveOpenClawRunnerConfig({
    appCommand: ["yarn", "dev:app"],
    env: {},
    gatewayCmdDefault: "/tmp/openclaw-cli.sh",
    projectDir: "/workspace/app",
  });

  assert.deepEqual(config, {
    appCommand: ["yarn", "dev:app"],
    autoStart: true,
    env: {},
    gatewayCmd: "/tmp/openclaw-cli.sh",
    gatewayHost: "127.0.0.1",
    gatewayPort: 18789,
    projectDir: "/workspace/app",
  });
});

test("resolveOpenClawRunnerConfig validates missing app command", () => {
  assert.throws(
    () =>
      resolveOpenClawRunnerConfig({
        appCommand: [],
        env: {},
        gatewayCmdDefault: "/tmp/openclaw-cli.sh",
        projectDir: "/workspace/app",
      }),
    new Error("[run-with-openclaw] 실행할 앱 명령을 넘겨주세요.")
  );
});

test("runner reuses existing gateway when port is already open", async () => {
  const { logger, logs } = createLogger();
  const spawns = [];

  const runner = createOpenClawRunner(
    {
      appCommand: ["yarn", "dev:app"],
      autoStart: true,
      env: {},
      gatewayCmd: "/tmp/openclaw-cli.sh",
      gatewayHost: "127.0.0.1",
      gatewayPort: 18789,
      projectDir: "/workspace/app",
    },
    {
      existsSync: () => true,
      exit: () => {
        throw new Error("exit should not be called");
      },
      isPortOpen: async () => true,
      logger,
      spawn: (command, args) => {
        spawns.push({ command, args });
        return new FakeChild(100);
      },
    }
  );

  await runner.start();

  assert.equal(spawns.length, 1);
  assert.deepEqual(spawns[0], {
    command: "yarn",
    args: ["dev:app"],
  });
  assert.ok(logs.some((line) => line.includes("기존 Gateway를 재사용합니다")));
  assert.equal(runner.getState().ownsGateway, false);
});

test("runner starts gateway before app when port is closed", async () => {
  const { logger, logs } = createLogger();
  const spawns = [];
  let portCheckCount = 0;

  const runner = createOpenClawRunner(
    {
      appCommand: ["yarn", "dev:app"],
      autoStart: true,
      env: {},
      gatewayCmd: "/tmp/openclaw-cli.sh",
      gatewayHost: "127.0.0.1",
      gatewayPort: 18789,
      projectDir: "/workspace/app",
    },
    {
      existsSync: () => true,
      exit: () => {
        throw new Error("exit should not be called");
      },
      isPortOpen: async () => {
        portCheckCount += 1;
        return false;
      },
      logger,
      spawn: (command, args) => {
        spawns.push({ command, args });
        return new FakeChild(spawns.length);
      },
      waitForPort: async () => true,
    }
  );

  await runner.start();

  assert.equal(portCheckCount, 1);
  assert.equal(spawns.length, 2);
  assert.deepEqual(spawns[0], {
    command: "/tmp/openclaw-cli.sh",
    args: ["gateway"],
  });
  assert.deepEqual(spawns[1], {
    command: "yarn",
    args: ["dev:app"],
  });
  assert.ok(logs.some((line) => line.includes("OpenClaw Gateway를 시작합니다.")));
  assert.ok(logs.some((line) => line.includes("Gateway 준비 완료")));
  assert.equal(runner.getState().ownsGateway, true);
});

test("runner exits with code 1 when gateway binary is missing", async () => {
  const { logger, errors } = createLogger();
  const exitCodes = [];

  const runner = createOpenClawRunner(
    {
      appCommand: ["yarn", "dev:app"],
      autoStart: true,
      env: {},
      gatewayCmd: "/tmp/openclaw-cli.sh",
      gatewayHost: "127.0.0.1",
      gatewayPort: 18789,
      projectDir: "/workspace/app",
    },
    {
      existsSync: () => false,
      exit: (code) => {
        exitCodes.push(code);
      },
      logger,
      spawn: () => new FakeChild(1),
    }
  );

  await runner.start();

  assert.deepEqual(exitCodes, [1]);
  assert.ok(errors.some((line) => line.includes("OpenClaw 실행 파일이 없습니다")));
});

test("runner shuts down app with gateway exit code when owned gateway exits first", async () => {
  const { logger, errors } = createLogger();
  const exitCodes = [];
  const kills = [];
  const children = [];

  const runner = createOpenClawRunner(
    {
      appCommand: ["yarn", "dev:app"],
      autoStart: true,
      env: {},
      gatewayCmd: "/tmp/openclaw-cli.sh",
      gatewayHost: "127.0.0.1",
      gatewayPort: 18789,
      projectDir: "/workspace/app",
    },
    {
      existsSync: () => true,
      exit: (code) => {
        exitCodes.push(code);
      },
      isPortOpen: async () => false,
      kill: (pid, signal) => {
        kills.push({ pid, signal });
        const target = children.find((child) => child.pid === Math.abs(pid));
        if (target && target.exitCode === null && target.signalCode === null) {
          target.finish(signal === "SIGTERM" ? 0 : 1, signal);
        }
      },
      logger,
      spawn: (command, args) => {
        const child = new FakeChild(children.length + 1);
        child.command = command;
        child.args = args;
        children.push(child);
        return child;
      },
      waitForPort: async () => true,
    }
  );

  await runner.start();
  children[0].finish(null, "SIGTERM");
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(exitCodes, [143]);
  assert.ok(
    errors.some((line) =>
      line.includes("Gateway가 먼저 종료되어 앱도 함께 종료합니다. (code=143)")
    )
  );
  assert.equal(kills.length >= 1, true);
});
