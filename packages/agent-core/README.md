# @zootopiafresh/agent-core

`@zootopiafresh/agent-core`는 Node 서버에서 사용하는 에이전트 런타임 코어 패키지입니다.

이 패키지는 아래를 제공합니다.

- thread / message / run 단위의 conversation runtime
- `AgentSpec` / `RequirementSpec` / `StepHandler` 기반 실행 구조
- OpenClaw client / transport / runner
- in-memory store / event hub / 테스트용 헬퍼

이 패키지가 직접 하지 않는 일도 분명합니다.

- Prisma 같은 앱별 DB 스키마 설계
- SSE payload나 UI 직렬화 규약
- 특정 도메인 전용 workflow 구현
- 브라우저 프런트엔드 런타임

즉, `agent-core`는 앱이 얹히는 공통 엔진이고, 앱 어댑터는 별도로 두는 구조입니다.

## 지원 범위

- Node 20+
- 서버 환경 전용
- ESM / CJS import 지원
- GitHub Packages 배포

브라우저 전용 SDK가 아니라서, 클라이언트 번들에 직접 넣는 용도는 아닙니다.

## 설치

GitHub Packages에서 설치합니다.

프로젝트 루트 `.npmrc`:

```ini
@zootopiafresh:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

토큰 준비:

```bash
export NODE_AUTH_TOKEN="$(gh auth token)"
```

`gh auth token`이 `read:packages` 권한을 못 갖고 있으면 아래로 갱신합니다.

```bash
gh auth refresh --scopes read:packages,write:packages
```

설치:

```bash
yarn add @zootopiafresh/agent-core
```

`npm`을 쓰는 경우도 동일합니다.

```bash
npm install @zootopiafresh/agent-core
```

## OpenClaw 최소 환경 변수

OpenClaw transport를 함께 쓸 경우 최소한 이 값은 필요합니다.

```bash
OPENCLAW_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=...
OPENCLAW_AGENT_ID=main
```

설명:

- `OPENCLAW_URL`: Gateway 주소
- `OPENCLAW_GATEWAY_TOKEN`: Gateway 인증 토큰
- `OPENCLAW_AGENT_ID`: Gateway에 등록된 agent id

이 저장소에서 이미 OpenClaw를 세팅했다면 [/Users/donghwan/zoopibot/.env](/Users/donghwan/zoopibot/.env)의 `OPENCLAW_GATEWAY_TOKEN` 값을 그대로 복사해도 됩니다.

기본 OpenClaw client는 요청/응답 내용을 콘솔에 자동 출력하지 않습니다. 디버깅이 필요하면 `createOpenClawClient(..., { logger })`로 logger를 직접 주입하세요.

## OpenClaw 세팅 도우미

이제 패키지에는 OpenClaw 초기 세팅을 보조하는 CLI도 포함됩니다.

초기 세팅:

```bash
agent-core openclaw init --provider openai-api-key
```

상태 점검:

```bash
agent-core openclaw doctor
```

`init`가 해주는 일:

- `.env` 생성 또는 업데이트
- `.env.example` 생성 또는 업데이트
- `run-with-openclaw.mjs` wrapper 생성
- 가능하면 `package.json`에 `openclaw:doctor`, `dev:with-gateway` script 추가
- provider별 추가 인증 힌트 출력

예:

```bash
agent-core openclaw init --project-dir ./apps/demo --provider openai-codex
agent-core openclaw init --provider openai-api-key --api-key sk-...
agent-core openclaw doctor --project-dir ./apps/demo
```

programmatic helper가 필요하면 `@zootopiafresh/agent-core/openclaw`에서 아래를 쓸 수 있습니다.

- `setupOpenClawProject`
- `doctorOpenClawProject`
- `getOpenClawProviderMetadata`
- `generateOpenClawSecret`

## 핵심 개념

### Runtime

`createConversationRuntime()`가 중심입니다. transport, store, spec resolver, event sink를 조합해 실행 엔진을 만듭니다.

### Thread

`runtime.thread(threadId)`는 대화 채널 하나를 나타냅니다. 앱에서는 보통 chat session 하나가 thread 하나입니다.

### Run

사용자 입력 1건이 들어올 때마다 새 run이 생깁니다. `runId`는 내부 실행 추적용입니다.

### AgentSpec

기본 agent 정의입니다. step 순서, 기본 progress stage, output contract를 정의합니다.

### RequirementSpec

기본 AgentSpec 위에 덮어쓰는 운영/프로젝트 규칙입니다. 예를 들어 같은 agent라도 `planner`, `writer`, `coach` 같은 모드로 바꿀 수 있습니다.

### StepHandler

실제 실행 코드를 가진 step 구현입니다. 코어 built-in step만으로 충분한 경우도 있고, 앱이 custom step을 추가할 수도 있습니다.

## 가장 자주 쓰는 공개 경로

### `@zootopiafresh/agent-core`

- `createConversationRuntime`
- `createSpecResolver`
- `createJsonRequirementProvider`
- `createStaticRequirementProvider`
- `StaticAgentRegistry`
- `StaticToolRegistry`
- `ConversationEventHub`
- `createConversationEventSink`
- 모든 public 타입 export

### `@zootopiafresh/agent-core/openclaw`

- `createOpenClawClient`
- `getOpenClawConfigFromEnv`
- `createOpenClawTransport`
- `createOpenClawRunner`
- `resolveOpenClawRunnerConfig`
- `setupOpenClawProject`
- `doctorOpenClawProject`
- `getOpenClawProviderMetadata`
- `generateOpenClawSecret`

### `@zootopiafresh/agent-core/testing`

- `createMemoryConversationStore`

## 빠른 시작

아래 예시는 별도 DB 없이 memory store로 바로 실행되는 가장 작은 형태입니다.

```ts
import {
  createConversationRuntime,
  createSpecResolver,
  StaticAgentRegistry,
  StaticToolRegistry,
  type AgentSpec,
} from '@zootopiafresh/agent-core';
import { createMemoryConversationStore } from '@zootopiafresh/agent-core/testing';
import { createOpenClawTransport } from '@zootopiafresh/agent-core/openclaw';

const counselorSpec: AgentSpec = {
  id: 'counselor',
  defaultRequirementSpec: {
    id: 'default',
    allowedTools: [],
    outputContract: {
      includeArtifacts: [],
      includeMeta: false,
    },
    progressStages: [
      { id: 'listen', label: '감정 정리', detail: '사용자 메시지를 읽고 있습니다.' },
      { id: 'reply', label: '응답 준비', detail: '답변을 정리하고 있습니다.' },
    ],
    steps: [
      { id: 'prepare-history', kind: 'prepare_history' },
      { id: 'stage-listen', kind: 'emit_step', config: { stageId: 'listen' } },
      {
        id: 'generate-reply',
        kind: 'generate_reply',
        config: {
          systemPrompt: '당신은 한국어로 답하는 차분한 상담형 어시스턴트입니다.',
          replyAppendix: [
            '한 번에 너무 많은 질문을 던지지 마세요.',
            '마지막에는 짧은 되묻기 질문 하나만 남기세요.',
          ],
        },
      },
      { id: 'update-message', kind: 'update_message' },
    ],
  },
};

const agentRegistry = new StaticAgentRegistry([counselorSpec]);
const toolRegistry = new StaticToolRegistry([]);

const runtime = createConversationRuntime({
  transport: createOpenClawTransport(),
  store: createMemoryConversationStore(),
  agentRegistry,
  toolRegistry,
  specResolver: createSpecResolver({
    agentRegistry,
    toolRegistry,
  }),
});

const run = await runtime.thread('demo-thread').send({
  input: '요즘 너무 지쳐서 어디서부터 회복해야 할지 모르겠어.',
  agentId: 'counselor',
});

const messages = await runtime.thread('demo-thread').history();
const output = messages.find((message) => message.id === run.outputMessageId);

console.log(output?.content);
```

## `start()`와 `send()` 차이

### `thread.start()`

- 즉시 ack를 반환합니다
- background run이 뒤에서 계속 실행됩니다
- SSE나 별도 polling UI가 있는 서버에서 보통 이 경로를 씁니다

### `thread.send()`

- 내부적으로 `start()` 후 completion까지 기다립니다
- 테스트나 CLI, 간단한 server helper에 적합합니다

### `ask()`

- 등록된 agent가 정확히 1개면 그 agent를 자동 사용합니다
- agent가 여러 개면 `agentId`를 넘기거나 runtime 생성 시 `defaultAgentId`를 설정해야 합니다

## Requirement override 예시

같은 agent라도 mode별로 system prompt와 진행 단계를 바꿀 수 있습니다.

`requirements/personas.json`

```json
{
  "counselor:coach": {
    "id": "coach",
    "allowedTools": [],
    "outputContract": {
      "includeArtifacts": [],
      "includeMeta": false
    },
    "progressStages": [
      {
        "id": "listen",
        "label": "쟁점 정리",
        "detail": "현재 고민의 핵심을 정리하고 있습니다."
      },
      {
        "id": "reply",
        "label": "질문 설계",
        "detail": "생각을 선명하게 만드는 질문을 고르고 있습니다."
      }
    ],
    "steps": [
      { "id": "prepare-history", "kind": "prepare_history" },
      { "id": "stage-listen", "kind": "emit_step", "config": { "stageId": "listen" } },
      {
        "id": "generate-reply",
        "kind": "generate_reply",
        "config": {
          "systemPrompt": "당신은 한국어로 답하는 사고 정리 코치입니다.",
          "replyAppendix": [
            "정답을 단정하기보다 선택지를 구조화하세요.",
            "마지막에는 되묻기 질문 하나를 남기세요."
          ]
        }
      },
      { "id": "update-message", "kind": "update_message" }
    ]
  }
}
```

불러오기:

```ts
import {
  createConversationRuntime,
  createJsonRequirementProvider,
  createSpecResolver,
  StaticAgentRegistry,
  StaticToolRegistry,
} from '@zootopiafresh/agent-core';

const specResolver = createSpecResolver({
  agentRegistry,
  toolRegistry,
  requirementProvider: createJsonRequirementProvider('/absolute/path/to/personas.json'),
});
```

이후 호출 시:

```ts
await runtime.thread('demo-thread').send({
  input: '생각이 너무 많아서 결정을 못 하겠어.',
  agentId: 'counselor',
  requirementSetId: 'coach',
});
```

## StepKind 메모

현재 코어 built-in으로 바로 쓸 수 있는 대표 step은 아래입니다.

- `prepare_history`
- `emit_step`
- `generate_reply`
- `update_message`

도메인 전용 step은 앱에서 별도 handler로 추가하는 방식이 맞습니다.

## OpenClaw runner를 같이 쓸 때

개발 환경에서 Gateway 자동 기동까지 원하면 `openclaw` subpath의 runner를 같이 씁니다.

```ts
import {
  createOpenClawRunner,
  resolveOpenClawRunnerConfig,
} from '@zootopiafresh/agent-core/openclaw';

const runner = createOpenClawRunner();
const config = resolveOpenClawRunnerConfig(process.env);
await runner.run(config, ['node', '--import', 'tsx', 'src/server.ts']);
```

실전에서는 이 부분을 별도 `run-with-openclaw.mjs` 래퍼 파일로 두는 편이 관리가 쉽습니다.

## 설치 후 바로 막히는 지점

### `401 Unauthorized`

대부분 `OPENCLAW_GATEWAY_TOKEN`이 비었거나 틀린 경우입니다.

### `404 Not Found` 또는 패키지를 찾을 수 없음

대부분 `.npmrc`의 `@zootopiafresh` scope 설정이 없거나, `NODE_AUTH_TOKEN`이 비어 있는 경우입니다.

### `gh auth token`은 되는데 install이 안 됨

`gh auth status`에서 `read:packages`가 있는지 먼저 확인하세요.

### `OpenClaw Gateway에 연결할 수 없습니다`

Gateway가 꺼져 있거나 `OPENCLAW_URL`이 잘못된 경우입니다.

## 실제 소비 예제

- 상담형 예제: [Moonwave Counselor](/Users/donghwan/zoopibot/playgrounds/moonwave-counselor/README.md)
- ChatGPT 스타일 데모: [Aurora Chat Demo](/Users/donghwan/zoopibot/playgrounds/aurora-chat-demo/README.md)

## 릴리즈

배포 플로우는 [/Users/donghwan/zoopibot/docs/agent-core-release.md](/Users/donghwan/zoopibot/docs/agent-core-release.md)를 참고하세요.
