# Moonwave Counselor

`Moonwave Counselor`는 이 저장소의 [@zootopiafresh/agent-core](/Users/donghwan/zoopibot/packages/agent-core/README.md)를 별도 프로젝트처럼 붙여본 토이 앱입니다.  
주제는 `가벼운 정서 지원 / 체크인 상담`이며, Zoopibot 전용 Prisma/SSE/UI 없이도 같은 런타임이 동작한다는 점을 보여주는 데 목적이 있습니다.

## 특징

- 별도 폴더 안의 독립 `git` 프로젝트 형태
- 루트 SDK의 `ConversationRuntime`, `OpenClaw transport`, `EventHub`를 그대로 사용
- 상담 에이전트용 `AgentSpec`과 JSON requirement override 예제 포함
- 메모리 store 기반이라 DB 없이 바로 실행 가능
- SSE 이벤트로 진행 상태와 메시지 완료를 구독 가능

## 안전 고지

이 프로젝트는 `전문 심리치료나 응급 대응 서비스`가 아닙니다.  
자해, 자살, 타해 위험이 있거나 즉각적인 도움이 필요하면 지역 응급 서비스와 전문 위기상담 채널을 우선 이용해야 합니다.

## 빠른 시작

```bash
cd /Users/donghwan/zoopibot/playgrounds/moonwave-counselor
cp .env.example .env
npm install
npm run dev:with-gateway
```

이미 OpenClaw Gateway가 떠 있다면 아래처럼 앱만 실행해도 됩니다.

```bash
npm run dev
```

## Gateway 토큰 설정

`OPENCLAW_GATEWAY_TOKEN`은 `앱이 OpenClaw Gateway에 붙을 때 쓰는 인증 토큰`입니다.  
이 값이 비어 있거나 Gateway와 다르면 상담 요청 시 `401 Unauthorized`가 납니다.

### 가장 쉬운 방법

이 저장소 루트에서 이미 OpenClaw를 세팅했다면 [/Users/donghwan/zoopibot/.env](/Users/donghwan/zoopibot/.env)의 아래 값을 그대로 복사하면 됩니다.

```bash
OPENCLAW_GATEWAY_TOKEN=...
```

그리고 이 토이 프로젝트의 `.env`에도 같은 값을 넣습니다.

```bash
OPENCLAW_GATEWAY_TOKEN=...
```

### 처음부터 새로 세팅하는 방법

루트 프로젝트 기준으로 아래 스크립트 중 하나를 먼저 실행하면 Gateway 토큰이 자동으로 준비됩니다.

```bash
/Users/donghwan/zoopibot/scripts/setup-openclaw.sh
```

또는 서버/비대화형 환경이라면:

```bash
/Users/donghwan/zoopibot/scripts/bootstrap-openclaw.sh
```

이후 생성된 토큰을 토이 프로젝트 `.env`에 복사하면 됩니다.

### 증상 체크

- `401 Unauthorized`
  - 토이 프로젝트의 `OPENCLAW_GATEWAY_TOKEN`이 비어 있거나 Gateway와 다릅니다.
- 연결은 되지만 모델 호출이 안 됨
  - Gateway 인증 자체보다 provider 인증이 덜 된 상태일 수 있습니다. 이 경우 루트 프로젝트의 OpenClaw provider 설정을 먼저 끝내야 합니다.

## API

### 1. 스레드 만들기

```bash
curl -s -X POST http://127.0.0.1:4310/threads
```

### 2. 이벤트 구독

```bash
curl -N http://127.0.0.1:4310/threads/<threadId>/events
```

### 3. 메시지 보내기

```bash
curl -s -X POST http://127.0.0.1:4310/threads/<threadId>/messages \
  -H 'content-type: application/json' \
  -d '{
    "input": "요즘 잠들기 전에 마음이 계속 불안해져요.",
    "requirementSetId": "daily-checkin"
  }'
```

### 4. 히스토리 조회

```bash
curl -s http://127.0.0.1:4310/threads/<threadId>/messages
```

## Requirement override

기본 에이전트는 차분한 공감형 상담 톤으로 동작합니다.  
`.env`의 `REQUIREMENTS_FILE` 값을 바꾸면 JSON 기반 requirement override를 적용할 수 있습니다.

- 기본 예제: [requirements/daily-checkin.json](/Users/donghwan/zoopibot/playgrounds/moonwave-counselor/requirements/daily-checkin.json)
- 기본 agent spec: [src/agent-spec.ts](/Users/donghwan/zoopibot/playgrounds/moonwave-counselor/src/agent-spec.ts)

## 내부 연결 지점

- 런타임 구성: [src/runtime.ts](/Users/donghwan/zoopibot/playgrounds/moonwave-counselor/src/runtime.ts)
- HTTP 서버: [src/server.ts](/Users/donghwan/zoopibot/playgrounds/moonwave-counselor/src/server.ts)
- OpenClaw 자동기동 래퍼: [run-with-openclaw.mjs](/Users/donghwan/zoopibot/playgrounds/moonwave-counselor/run-with-openclaw.mjs)
