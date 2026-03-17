#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';

import {
  doctorOpenClawProject,
  setupOpenClawProject,
  type OpenClawProviderMode,
} from './openclaw-setup';

type CliFlags = Record<string, string | boolean>;

function parseFlags(argv: string[]) {
  const positional: string[] = [];
  const flags: CliFlags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const normalized = token.slice(2);
    if (normalized.startsWith('no-')) {
      flags[normalized.slice(3)] = false;
      continue;
    }

    const [key, inlineValue] = normalized.split('=', 2);
    if (inlineValue !== undefined) {
      flags[key] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positional, flags };
}

function printHelp() {
  console.log(`@zootopiafresh/agent-core CLI

사용법:
  agent-core openclaw init [options]
  agent-core openclaw doctor [options]

주요 옵션:
  --project-dir <path>        대상 프로젝트 경로 (기본값: 현재 디렉터리)
  --provider <name>           openai-api-key | openai-codex | anthropic-api-key | anthropic-setup-token
  --openclaw-cmd <command>    OpenClaw 실행 파일 경로 또는 명령명 (기본값: openclaw)
  --gateway-host <host>       Gateway host (기본값: 127.0.0.1)
  --gateway-port <port>       Gateway port (기본값: 18789)
  --agent-id <id>             OPENCLAW_AGENT_ID (기본값: main)
  --model <model>             primary model override
  --api-key <secret>          OPENAI_API_KEY 또는 ANTHROPIC_API_KEY 값
  --gateway-token <secret>    OPENCLAW_GATEWAY_TOKEN override
  --overwrite-wrapper         기존 generated wrapper를 덮어씀
  --no-package-json           package.json script 자동 추가를 끔

예시:
  agent-core openclaw init --provider openai-api-key
  agent-core openclaw doctor
  agent-core openclaw init --project-dir ./apps/demo --provider openai-codex
`);
}

function readStringFlag(flags: CliFlags, key: string) {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

function readBooleanFlag(flags: CliFlags, key: string) {
  const value = flags[key];
  if (typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

function readNumberFlag(flags: CliFlags, key: string) {
  const value = readStringFlag(flags, key);
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`숫자 옵션이 잘못되었습니다: --${key}=${value}`);
  }

  return parsed;
}

async function run() {
  const { positional, flags } = parseFlags(process.argv.slice(2));
  const [group, action] = positional;

  if (!group || flags.help || flags.h) {
    printHelp();
    return;
  }

  if (group !== 'openclaw') {
    throw new Error(`지원하지 않는 명령 그룹입니다: ${group}`);
  }

  const projectDir = path.resolve(readStringFlag(flags, 'project-dir') || process.cwd());
  const provider = readStringFlag(flags, 'provider') as OpenClawProviderMode | undefined;

  if (action === 'init') {
    const result = await setupOpenClawProject({
      projectDir,
      provider,
      openclawCmd: readStringFlag(flags, 'openclaw-cmd'),
      gatewayHost: readStringFlag(flags, 'gateway-host'),
      gatewayPort: readNumberFlag(flags, 'gateway-port'),
      gatewayToken: readStringFlag(flags, 'gateway-token'),
      agentId: readStringFlag(flags, 'agent-id'),
      model: readStringFlag(flags, 'model'),
      providerSecret: readStringFlag(flags, 'api-key'),
      overwriteWrapper: readBooleanFlag(flags, 'overwrite-wrapper') ?? false,
      updatePackageJsonScripts: readBooleanFlag(flags, 'package-json') ?? true,
      envFile: readStringFlag(flags, 'env-file'),
      envExampleFile: readStringFlag(flags, 'env-example-file'),
      wrapperFile: readStringFlag(flags, 'wrapper-file'),
    });

    console.log('[agent-core] OpenClaw init 완료');
    console.log(`- project: ${result.projectDir}`);
    console.log(`- provider: ${result.provider}`);
    console.log(`- gateway: ${result.gatewayUrl}`);
    console.log(`- env: ${result.envFile}`);
    console.log(`- env.example: ${result.envExampleFile}`);
    console.log(`- wrapper: ${result.wrapperFile}`);
    if (result.createdFiles.length > 0) {
      console.log(`- created: ${result.createdFiles.join(', ')}`);
    }
    if (result.updatedFiles.length > 0) {
      console.log(`- updated: ${result.updatedFiles.join(', ')}`);
    }
    if (result.skippedFiles.length > 0) {
      console.log(`- skipped: ${result.skippedFiles.join(', ')}`);
    }
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`- warning: ${warning}`);
      }
    }
    if (result.authHint) {
      console.log(`- auth: ${result.authHint}`);
    }
    console.log('');
    console.log('다음 단계:');
    for (const step of result.nextSteps) {
      console.log(`- ${step}`);
    }
    return;
  }

  if (action === 'doctor') {
    const result = await doctorOpenClawProject({
      projectDir,
      provider,
      openclawCmd: readStringFlag(flags, 'openclaw-cmd'),
      envFile: readStringFlag(flags, 'env-file'),
      wrapperFile: readStringFlag(flags, 'wrapper-file'),
    });

    console.log('[agent-core] OpenClaw doctor');
    for (const check of result.checks) {
      const prefix =
        check.status === 'ok' ? 'OK' : check.status === 'warn' ? 'WARN' : 'FAIL';
      console.log(`- ${prefix} ${check.id}: ${check.message}`);
    }
    if (result.authHint) {
      console.log(`- HINT auth: ${result.authHint}`);
    }

    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  throw new Error(`지원하지 않는 openclaw 명령입니다: ${String(action)}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[agent-core] ${message}`);
  process.exitCode = 1;
});
