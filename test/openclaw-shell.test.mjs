import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const commonLibPath = path.join(process.cwd(), "scripts/lib/openclaw-public.sh");

async function runBash(script, env = {}) {
  return execFileAsync(
    "bash",
    ["-lc", script],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env,
      },
    }
  );
}

test("shell env helpers upsert and delete quoted values", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "zoopibot-openclaw-shell-"));
  const envFile = path.join(tempDir, ".env");

  await writeFile(envFile, 'FOO="one"\nBAR="two"\n', "utf8");

  await runBash(
    `
      source "${commonLibPath}"
      upsert_env_file "${envFile}" "FOO" "updated"
      upsert_env_file "${envFile}" "BAZ" "three"
      delete_env_file "${envFile}" "BAR"
    `
  );

  const result = await readFile(envFile, "utf8");
  assert.equal(result, 'FOO="updated"\nBAZ="three"\n');
});

test("shell config helper writes provider env block and generic skill entry", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "zoopibot-openclaw-config-"));
  const configFile = path.join(tempDir, "openclaw.json");
  const workspaceDir = path.join(tempDir, "workspace");

  await runBash(
    `
      source "${commonLibPath}"
      SKILL_JSON="$(build_openclaw_skill_entry_json \
        "demo-skill" \
        "APP_URL=http://localhost:3000" \
        "APP_TOKEN=service-token")"
      write_openclaw_config \
        "${configFile}" \
        "${workspaceDir}" \
        "openai/gpt-5.4" \
        "18789" \
        "gateway-token" \
        "$SKILL_JSON" \
        "OPENAI_API_KEY" \
        "openai-secret"
    `
  );

  const config = await readFile(configFile, "utf8");
  assert.match(config, /"OPENAI_API_KEY": "openai-secret"/);
  assert.match(config, /"primary": "openai\/gpt-5\.4"/);
  assert.match(config, /"token": "gateway-token"/);
  assert.match(config, /"demo-skill": {/);
  assert.match(config, /"APP_TOKEN": "service-token"/);
});

test("shell provider metadata returns defaults and auth hints", async () => {
  const { stdout } = await runBash(
    `
      source "${commonLibPath}"
      openclaw_provider_metadata "openai-codex" "/tmp/openclaw-cli.sh"
      echo "DEFAULT_MODEL=$OPENCLAW_PROVIDER_DEFAULT_MODEL"
      echo "INLINE_ENV_KEY=$OPENCLAW_PROVIDER_INLINE_ENV_KEY"
      echo "AUTH_HINT=$OPENCLAW_PROVIDER_AUTH_HINT"
    `
  );

  assert.match(stdout, /DEFAULT_MODEL=openai-codex\/gpt-5\.4/);
  assert.match(stdout, /INLINE_ENV_KEY=$/m);
  assert.match(stdout, /AUTH_HINT=\/tmp\/openclaw-cli\.sh models auth login --provider openai-codex/);
});

test("shell provider secret cleanup preserves selected key only", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "zoopibot-openclaw-secrets-"));
  const envFile = path.join(tempDir, ".env");

  await writeFile(
    envFile,
    'OPENAI_API_KEY="openai"\nANTHROPIC_API_KEY="anthropic"\nKEEP="yes"\n',
    "utf8"
  );

  await runBash(
    `
      source "${commonLibPath}"
      clear_openclaw_provider_secret_envs "${envFile}" "OPENAI_API_KEY"
    `
  );

  const result = await readFile(envFile, "utf8");
  assert.equal(result, 'OPENAI_API_KEY="openai"\nKEEP="yes"\n');
});

test("shell skill installer replaces existing generic skill directory", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "zoopibot-openclaw-skill-"));
  const projectDir = path.join(tempDir, "project");
  const skillsDir = path.join(tempDir, "skills");
  const sourceSkillDir = path.join(projectDir, "openclaw/skills/demo-skill");
  const targetSkillDir = path.join(skillsDir, "demo-skill");

  await mkdir(sourceSkillDir, { recursive: true });
  await mkdir(targetSkillDir, { recursive: true });
  await writeFile(path.join(sourceSkillDir, "SKILL.md"), "new-skill", "utf8");
  await writeFile(path.join(targetSkillDir, "SKILL.md"), "old-skill", "utf8");

  await runBash(
    `
      source "${commonLibPath}"
      install_openclaw_skill "${sourceSkillDir}" "${skillsDir}" "demo-skill"
    `
  );

  const copiedSkill = await readFile(path.join(targetSkillDir, "SKILL.md"), "utf8");
  assert.equal(copiedSkill, "new-skill");
});
