#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  createOpenClawRunner,
  resolveOpenClawRunnerConfig,
} from "../../lib/openclaw-runner.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir);

let config;

try {
  config = resolveOpenClawRunnerConfig({
    appCommand: process.argv.slice(2),
    env: process.env,
    gatewayCmdDefault: path.join(process.cwd(), "scripts/openclaw-cli.sh"),
    projectDir,
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const runner = createOpenClawRunner(config);
runner.attachProcessHandlers(process);
await runner.start();
