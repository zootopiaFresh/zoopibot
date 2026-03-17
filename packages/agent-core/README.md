# @zootopiafresh/agent-core

Node 서버 환경에서 사용하는 에이전트 런타임 코어 패키지입니다.

- generic conversation runtime
- AgentSpec / RequirementSpec / StepHandler 기반 실행
- OpenClaw client / transport / runner subpath 제공
- 메모리 store / event hub 같은 테스트용 도구 포함

Zoopibot의 query agent, Prisma store, SSE bridge 같은 앱 어댑터는 이 패키지 밖에 둡니다.

## 설치

```bash
yarn add @zootopiafresh/agent-core
```

OpenClaw를 같이 쓸 경우 최소 환경변수:

```bash
OPENCLAW_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=...
OPENCLAW_AGENT_ID=main
```

`OPENCLAW_GATEWAY_TOKEN`은 Gateway 인증 토큰입니다. 이 저장소에서 이미 OpenClaw를 세팅했다면 [/Users/donghwan/zoopibot/.env](/Users/donghwan/zoopibot/.env)의 `OPENCLAW_GATEWAY_TOKEN` 값을 그대로 복사해도 됩니다.

GitHub Packages에서 설치할 경우 `.npmrc`에 아래 scope 설정이 필요합니다.

```ini
@zootopiafresh:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

## 공개 경로

- `@zootopiafresh/agent-core`
  - `createConversationRuntime`
  - `createSpecResolver`
  - `StaticAgentRegistry`
  - `StaticToolRegistry`
  - `ConversationEventHub`
  - `createConversationEventSink`
- `@zootopiafresh/agent-core/openclaw`
  - `createOpenClawClient`
  - `createOpenClawTransport`
  - `createOpenClawRunner`
  - `resolveOpenClawRunnerConfig`
- `@zootopiafresh/agent-core/testing`
  - `createMemoryConversationStore`

## 최소 예시

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
      { id: 'generate-reply', kind: 'generate_reply' },
      { id: 'update-message', kind: 'update_message' },
    ],
  },
};

const runtime = createConversationRuntime({
  transport: createOpenClawTransport(),
  store: createMemoryConversationStore(),
  agentRegistry: new StaticAgentRegistry([counselorSpec]),
  toolRegistry: new StaticToolRegistry([]),
  specResolver: createSpecResolver({
    agentRegistry: new StaticAgentRegistry([counselorSpec]),
    toolRegistry: new StaticToolRegistry([]),
  }),
});
```

실제 소비 예제는 [Moonwave Counselor](/Users/donghwan/zoopibot/playgrounds/moonwave-counselor/README.md)에서 확인할 수 있습니다.
