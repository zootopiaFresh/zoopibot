# OpenClaw Public Contract

이 문서는 다른 프로젝트에서 재사용할 때 의존해야 하는 공개 경로를 정리합니다.

## TypeScript public entrypoints

### Client

파일:
- `lib/openclaw-client.ts`

공개 API:
- `createOpenClawClient`
- `getOpenClawConfigFromEnv`
- 타입: `OpenClawCallOptions`, `OpenClawConfig`, `OpenClawMessage`, `OpenClawResponse`

용도:
- OpenClaw Gateway HTTP client 재사용

### Runner

파일:
- `lib/openclaw-runner.mjs`

공개 API:
- `createOpenClawRunner`
- `resolveOpenClawRunnerConfig`
- `signalExitCodes`

용도:
- 앱 실행 시 Gateway 자동 기동/종료 orchestration 재사용

## Shell public entrypoint

파일:
- `scripts/lib/openclaw-public.sh`

공개 함수:
- `generate_secret`
- `upsert_env_file`
- `delete_env_file`
- `openclaw_provider_metadata`
- `clear_openclaw_provider_secret_envs`
- `install_openclaw_skill`
- `build_openclaw_skill_entry_json`
- `write_openclaw_config`

용도:
- setup/bootstrap 스크립트에서 OpenClaw provider/env/config/skill 처리를 재사용

## Adapter inputs

Zoopibot 기본값은 아래 adapter 변수로 주입됩니다.

- `OPENCLAW_PROJECT_SKILL_NAME`
- `OPENCLAW_PROJECT_SKILL_SOURCE_DIR`
- `OPENCLAW_PROJECT_URL_ENV_NAME`
- `OPENCLAW_PROJECT_SERVICE_TOKEN_ENV_NAME`
- `OPENCLAW_PROJECT_PUBLIC_URL`
- `OPENCLAW_PROJECT_SERVICE_TOKEN`

다른 프로젝트에서는 위 변수만 바꿔도 동일한 setup/bootstrap 로직을 재사용할 수 있습니다.

## Internal implementation paths

아래 경로는 구현 세부사항이므로 다른 프로젝트에서 직접 의존하지 않는 것을 권장합니다.

- `lib/shared/openclaw-client.ts`
- `lib/shared/openclaw-runner.mjs`
- `scripts/lib/openclaw-common.sh`

## Packaging decision

현재 결정:
- 별도 npm/package 분리는 아직 하지 않음
- 이 repo 안에서 공개 entrypoint + 예제 + 문서 방식으로 유지

이유:
- 아직 실제 소비 프로젝트가 하나도 붙지 않은 상태에서 package로 먼저 승격하면 변경 비용이 커집니다.
- 지금은 계약을 고정하고, 두 번째 소비 프로젝트가 붙을 때 package 승격이 더 안전합니다.

승격 조건:
- 다른 프로젝트가 실제로 이 공개 계약을 사용하기 시작함
- import/source 경로와 adapter 변수 세트가 안정화됨
- smoke test 요구사항이 공통화됨
