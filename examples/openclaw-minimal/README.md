# OpenClaw Minimal Example

이 예제는 Zoopibot 내부 공통 모듈을 다른 프로젝트에서 어떻게 붙일 수 있는지 보여줍니다.

구성:
- `chat.ts`: 공개 client entrypoint 사용 예제
- `run-with-openclaw.mjs`: 공개 runner entrypoint 사용 예제
- `bootstrap-openclaw.sh`: 공개 shell entrypoint 사용 예제
- `.env.example`: 최소 환경 변수 예시
- `openclaw/skills/demo-api/SKILL.md`: 예시 skill

## 목적

다른 프로젝트에서 아래 공개 계약만 써도 OpenClaw를 붙일 수 있다는 점을 보여줍니다.

- `lib/openclaw-client.ts`
- `lib/openclaw-runner.mjs`
- `scripts/lib/openclaw-public.sh`

## 예시 실행

### 1. Gateway client 호출

```bash
./node_modules/.bin/tsx examples/openclaw-minimal/chat.ts "hello from example"
```

필수 env:

```bash
OPENCLAW_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=...
OPENCLAW_AGENT_ID=main
```

토큰 설명:

- `OPENCLAW_GATEWAY_TOKEN`은 Gateway HTTP 인증 토큰입니다.
- Gateway가 인증을 요구하는데 이 값이 비어 있거나 다르면 `401 Unauthorized`가 납니다.
- 이 저장소에서 이미 OpenClaw를 세팅했다면 [/Users/donghwan/zoopibot/.env](/Users/donghwan/zoopibot/.env)의 `OPENCLAW_GATEWAY_TOKEN`을 그대로 써도 됩니다.
- 새로 세팅해야 하면 [/Users/donghwan/zoopibot/scripts/setup-openclaw.sh](/Users/donghwan/zoopibot/scripts/setup-openclaw.sh) 또는 [/Users/donghwan/zoopibot/scripts/bootstrap-openclaw.sh](/Users/donghwan/zoopibot/scripts/bootstrap-openclaw.sh)을 먼저 실행하는 편이 가장 빠릅니다.

### 2. 앱과 Gateway를 같이 실행

```bash
node examples/openclaw-minimal/run-with-openclaw.mjs node -e "setInterval(() => {}, 1000)"
```

### 3. OpenClaw 설정 파일 생성

```bash
APP_URL=http://localhost:3000 \
APP_SERVICE_TOKEN=demo-token \
examples/openclaw-minimal/bootstrap-openclaw.sh
```

이 스크립트는 다음 adapter 변수들을 사용합니다.

- `OPENCLAW_PROJECT_SKILL_NAME=demo-api`
- `OPENCLAW_PROJECT_URL_ENV_NAME=APP_URL`
- `OPENCLAW_PROJECT_SERVICE_TOKEN_ENV_NAME=APP_SERVICE_TOKEN`

## 복사 기준

다른 프로젝트에 옮길 때는 이 예제 전체를 복사할 필요는 없습니다.

필수:
- 공개 entrypoint import/source
- 프로젝트별 skill 이름
- 프로젝트 URL env 이름
- 프로젝트 서비스 토큰 env 이름

선택:
- bootstrap 스크립트 형식
- demo skill 구조
