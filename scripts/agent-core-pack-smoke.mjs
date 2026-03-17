import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const keepArtifacts = process.argv.includes('--keep');

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const packDir = mkdtempSync(path.join(os.tmpdir(), 'agent-core-pack-'));
const smokeDir = mkdtempSync(path.join(os.tmpdir(), 'agent-core-smoke-'));

try {
  const tarballName = run(
    'npm',
    ['pack', './packages/agent-core', '--pack-destination', packDir],
    rootDir
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .at(-1);

  if (!tarballName) {
    throw new Error('agent-core tarball 이름을 찾지 못했습니다.');
  }

  const tarballPath = path.join(packDir, tarballName);
  run('npm', ['init', '-y'], smokeDir);
  run('npm', ['install', tarballPath], smokeDir);

  run(
    'node',
    [
      '--input-type=module',
      '-e',
      "import { createConversationRuntime, ConversationEventHub } from '@zootopiafresh/agent-core'; import { createOpenClawClient } from '@zootopiafresh/agent-core/openclaw'; import { createMemoryConversationStore } from '@zootopiafresh/agent-core/testing'; if (!createConversationRuntime || !ConversationEventHub || !createOpenClawClient || !createMemoryConversationStore) process.exit(1);",
    ],
    smokeDir
  );

  run(
    'node',
    [
      '-e',
      "const core = require('@zootopiafresh/agent-core'); const openclaw = require('@zootopiafresh/agent-core/openclaw'); const testing = require('@zootopiafresh/agent-core/testing'); if (!core.createConversationRuntime || !core.ConversationEventHub || !openclaw.createOpenClawClient || !testing.createMemoryConversationStore) process.exit(1);",
    ],
    smokeDir
  );

  run(
    path.join(smokeDir, 'node_modules', '.bin', 'agent-core'),
    ['--help'],
    smokeDir
  );

  run(
    path.join(smokeDir, 'node_modules', '.bin', 'agent-core'),
    ['openclaw', 'init', '--project-dir', smokeDir, '--provider', 'openai-codex'],
    smokeDir
  );

  const envExample = readFileSync(path.join(smokeDir, '.env.example'), 'utf8');
  const wrapper = readFileSync(path.join(smokeDir, 'run-with-openclaw.mjs'), 'utf8');
  if (!envExample.includes('OPENCLAW_PROVIDER_MODE=openai-codex')) {
    throw new Error('agent-core init가 .env.example에 provider를 쓰지 못했습니다.');
  }
  if (!wrapper.includes('createOpenClawRunner')) {
    throw new Error('agent-core init가 wrapper 파일을 만들지 못했습니다.');
  }

  console.log(`[agent-core:smoke] tarball ok: ${tarballPath}`);
  if (keepArtifacts) {
    console.log(`[agent-core:smoke] kept temp smoke project: ${smokeDir}`);
  }
} finally {
  if (!keepArtifacts) {
    rmSync(packDir, { recursive: true, force: true });
    rmSync(smokeDir, { recursive: true, force: true });
  }
}
