# OpenClaw Conversation Runtime Architecture

## Goal

목표는 주피봇 전체를 공통화하는 것이 아닙니다.
목표는 주피봇의 핵심인 `대화/에이전트 기능`을 다른 프로젝트에도 다시 얹을 수 있게
runtime 단위로 분리하는 것입니다.

이 runtime은 아래를 유지해야 합니다.

1. 멀티턴 대화
2. 상태 저장
3. 비동기 run 단위 실행
4. 단계형 에이전트 실행
5. 재시도/복구
6. 진행 이벤트
7. OpenClaw 또는 다른 backend 교체 가능성

즉, `askAI("...")` 같은 쉬운 함수는 최상단 sugar일 뿐이고,
핵심은 `thread + workflow + store + events`를 가진 conversation runtime 입니다.

## Scope

이 문서가 다루는 범위:
- 채팅 세션
- 메시지 로그
- run lifecycle
- 에이전트 단계 실행
- workflow checkpoint
- OpenClaw transport
- 이벤트 스트림

이 문서가 다루지 않는 범위:
- 관리자 화면
- 사용자 관리/권한
- Slack 연동
- 일반 제품 설정 UI

## Design Shift

이전 생각은 `붙이기 쉬운 SDK`에 가까웠습니다.
하지만 주피봇의 실제 가치는 단순 텍스트 호출이 아니라
`상태 있는 에이전트 실행`에 있습니다.

그래서 기준점을 바꿉니다.

1. `runtime first`
2. `facade second`

즉:
- 먼저 주피봇 수준의 대화 엔진을 담을 수 있는 runtime을 만든다.
- 그 위에 `askAI()` 같은 쉬운 API를 얹는다.

## Key observation from current Zoopibot

현재 주피봇은 OpenClaw 자체에 제품 상태를 맡기지 않습니다.

- 대화의 진실 원본은 `ChatSession`, `ChatMessage`
- 진행 상태도 DB와 이벤트로 관리
- 히스토리도 프롬프트에 직접 재구성
- OpenClaw `sessionKey`는 선택적 transport 힌트에 가깝다

이 점은 중요합니다.

분리 후에도 source of truth 는 runtime store 여야 하고,
OpenClaw session 은 선택적 최적화로만 써야 합니다.

## North Star

최종적으로 만들고 싶은 구조는 이것입니다.

```ts
const runtime = createConversationRuntime({
  transport: openClawTransport(),
  store: prismaConversationStore(prisma),
  events: zoopibotEventSink(),
  workflows: {
    query: zoopibotQueryWorkflow(),
  },
});

const ack = await runtime.thread(sessionId).start({
  input: "이번 달 매출 추이 보여줘",
  workflow: "query",
});
```

쉬운 진입점은 그 위에 올립니다.

```ts
const text = await askAI("안녕");
```

하지만 이 함수는 핵심이 아니라 facade 입니다.

## Layered Architecture

```text
app routes / UI
  -> conversation runtime facade
    -> thread runtime
    -> workflow runtime
    -> transport adapter
    -> store adapter
    -> event sink
```

규칙:
- app은 OpenClaw를 직접 호출하지 않는다
- workflow는 DB 구현을 직접 알지 않는다
- store와 events는 adapter로 교체 가능해야 한다
- transport는 backend 교체가 가능해야 한다
- 실행 상태는 `thread`가 아니라 `run` 단위로 추적되어야 한다

## Core contracts

### 1. TransportAdapter

역할:
- 모델 호출
- provider/backend 차이 숨김
- optional session continuity

```ts
type TransportAdapter = {
  call(input: TransportRequest): Promise<TransportResponse>;
  health(): Promise<boolean>;
};

type TransportRequest = {
  prompt: string;
  systemPrompt?: string;
  threadKey?: string;
  timeoutMs?: number;
};
```

기본 구현:
- `openClawTransport()`
- `claudeCliTransport()`

주의:
- `threadKey`는 transport 최적화용이다
- 제품 상태의 source of truth 는 아니다

### 2. ConversationStore

역할:
- thread/message/state/checkpoint 저장
- product-grade 대화 내구성 제공

```ts
type ConversationStore = {
  getThread(threadId: string): Promise<ConversationThread | null>;
  ensureThread(threadId: string, meta?: ThreadMeta): Promise<ConversationThread>;
  beginRun(input: BeginRunInput): Promise<ConversationRunAck>;
  listMessages(threadId: string): Promise<ConversationMessage[]>;
  appendMessages(threadId: string, messages: ConversationMessage[]): Promise<void>;
  updateMessage(messageId: string, patch: Partial<ConversationMessage>): Promise<void>;
  getRun(runId: string): Promise<ConversationRun | null>;
  updateRun(runId: string, patch: Partial<ConversationRun>): Promise<void>;
  saveThreadState(threadId: string, state: ConversationState): Promise<void>;
  loadThreadState(threadId: string): Promise<ConversationState | null>;
  saveCheckpoint(runId: string, checkpoint: WorkflowCheckpoint): Promise<void>;
  loadLatestCheckpoint(runId: string): Promise<WorkflowCheckpoint | null>;
};
```

기본 구현:
- `memoryConversationStore()`

주피봇 구현:
- `prismaConversationStore()`

중요:
- `beginRun()`은 원자적으로 동작해야 한다
- 최소한 아래를 한 트랜잭션으로 처리해야 한다
  - run 생성
  - user message 생성
  - assistant placeholder 생성
  - thread title / updatedAt 갱신

이 계약이 없으면 부분 실패 시 orphan message 또는 orphan run 이 생긴다.

### 3. EventSink

역할:
- 진행 상태와 메시지 변경을 외부로 전파
- SSE, websocket, log sink 로 교체 가능

```ts
type ConversationEvent =
  | { type: "run.created"; threadId: string; run: ConversationRun }
  | { type: "run.started"; threadId: string; run: ConversationRun }
  | { type: "run.completed"; threadId: string; run: ConversationRun }
  | { type: "run.failed"; threadId: string; run: ConversationRun }
  | { type: "step.changed"; threadId: string; runId: string; step: WorkflowStepState }
  | { type: "message.created"; threadId: string; message: ConversationMessage }
  | { type: "message.updated"; threadId: string; message: ConversationMessage }
  | { type: "message.completed"; threadId: string; message: ConversationMessage }
  | { type: "message.failed"; threadId: string; message: ConversationMessage }
  | { type: "artifact.ready"; threadId: string; runId: string; artifact: ConversationArtifact };

type EventSink = {
  emit(event: ConversationEvent): Promise<void> | void;
};
```

주피봇 구현:
- 현재 `chat-events.ts`를 감싸는 adapter

### 4. AgentWorkflow

역할:
- 주피봇의 에이전트 단계를 모델링
- schema 탐색, SQL 생성, 검증, 보고서 생성을 단계로 실행

```ts
type AgentWorkflow = {
  name: string;
  run(ctx: WorkflowContext): Promise<WorkflowResult>;
};
```

핵심:
- workflow 는 text generation 하나가 아니다
- multi-step orchestration 이다
- workflow 는 필요한 domain capability 를 명시적으로 ctx 로 받아야 한다

### 5. WorkflowContext

역할:
- workflow 가 전역 import 없이 실행되게 함
- 주피봇 query workflow 가 요구하는 의존성을 명시

```ts
type WorkflowContext = {
  threadId: string;
  runId: string;
  userId?: string;
  workflow: string;
  input: string;
  history: ConversationMessage[];
  threadState: ConversationState | null;
  transport: TransportAdapter;
  store: ConversationStore;
  events: EventSink;
  capabilities: {
    resolveSchema?: (input: ResolveSchemaInput) => Promise<ResolveSchemaResult>;
    executeQuery?: (sql: string) => Promise<QueryExecutionResult>;
    buildPresentation?: (input: BuildPresentationInput) => Promise<ConversationArtifact>;
    logError?: (input: WorkflowErrorLogInput) => Promise<void>;
  };
  meta?: Record<string, unknown>;
};
```

중요:
- `userId`
- `history`
- `autoExecute`
- schema resolver
- query executor
- error logger

이런 값들이 모두 ctx 또는 `meta/capabilities`를 통해 들어와야 한다.
그래야 현재 주피봇 query flow 를 전역 의존성 없이 옮길 수 있다.

### 6. ThreadRuntime

역할:
- thread 단위 API 제공
- store + transport + workflow 연결

```ts
type ConversationRuntime = {
  ask(input: string, options?: AskOptions): Promise<string>;
  thread(id: string): ConversationThreadHandle;
};

type ConversationThreadHandle = {
  send(input: SendInput): Promise<ConversationRun>;
  start(input: StartRunInput): Promise<ConversationRunAck>;
  resume(runId: string): Promise<ConversationRun>;
  history(): Promise<ConversationMessage[]>;
  state(): Promise<ConversationState | null>;
  clear(): Promise<void>;
};
```

### 7. Run model

현재 주피봇은 요청을 받자마자:
- user message 생성
- assistant placeholder 생성
- 즉시 HTTP 응답
- 백그라운드에서 실제 에이전트 실행

즉, 실행 단위는 `thread`가 아니라 `run`입니다.

```ts
type ConversationRun = {
  id: string;
  threadId: string;
  workflow?: string;
  status: "queued" | "running" | "completed" | "failed";
  inputMessageId?: string;
  outputMessageId?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string | null;
  meta?: Record<string, unknown>;
};

type ConversationRunAck = {
  run: ConversationRun;
  inputMessage: ConversationMessage;
  outputMessage: ConversationMessage;
};
```

권장 규칙:
- `start()`는 placeholder 까지 만들고 즉시 ack 반환
- 실제 workflow 실행은 별도 비동기 task 로 처리
- `send()`는 편의 API 이고, 내부적으로 `start() + await completion` 이어도 된다
- UI/API route 는 기본적으로 `send()`가 아니라 `start()`를 사용한다

## Conversation data model

메시지와 workflow 상태는 분리합니다.

### ConversationMessage

```ts
type ConversationMessage = {
  id: string;
  threadId: string;
  runId?: string;
  role: "user" | "assistant" | "tool";
  content: string;
  status?: "pending" | "running" | "completed" | "failed";
  result?: ConversationResultEnvelope | null;
  error?: string | null;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
};
```

### ConversationState

```ts
type ConversationState = {
  backend?: string;
  threadKey?: string;
  lastRunId?: string;
  meta?: Record<string, unknown>;
};
```

주의:
- 현재 실행 중인 run 목록은 `ConversationRun`에서 조회해야 한다
- `ConversationState` 하나에 active run 을 단일 값으로 넣지 않는다
- 같은 thread 에 여러 run 이 겹쳐도 state 충돌이 없어야 한다

### WorkflowCheckpoint

```ts
type WorkflowCheckpoint = {
  runId: string;
  threadId: string;
  workflow: string;
  step: string;
  attempt?: number;
  status: "running" | "completed" | "failed";
  payload?: Record<string, unknown>;
  createdAt: string;
};
```

### WorkflowStepState

```ts
type WorkflowStepState = {
  runId: string;
  step: string;
  label?: string;
  status: "queued" | "running" | "completed" | "failed";
  detail?: string;
  updatedAt: string;
};
```

### ConversationArtifact

```ts
type ConversationArtifact = {
  kind: string;
  data: Record<string, unknown>;
};
```

### ConversationResultEnvelope

현재 주피봇 UI 와 저장 구조는 결과를 느슨한 `artifacts` 묶음이 아니라
구체적인 필드 집합으로 다룹니다.

그래서 공통 runtime 도 결과 envelope 를 고정합니다.

```ts
type ValidationResult = {
  validated?: boolean | null;
  mode?: string | null;
  error?: string | null;
  attempts?: number | null;
};

type ConversationResultEnvelope = {
  sql?: string | null;
  presentation?: ConversationArtifact | null;
  resultSnapshot?: ConversationArtifact | null;
  validation?: ValidationResult | null;
};
```

규칙:
- `presentation`은 렌더링 블록을 담는 artifact
- `resultSnapshot`은 실행 결과 스냅샷 artifact
- `validation`은 검증 성공/실패 메타데이터
- adapter 는 이 키 이름을 임의로 바꾸지 않는다

즉, 런타임 내부에서는 generic artifact 를 허용하더라도,
외부 계약은 `sql/presentation/resultSnapshot/validation`으로 고정한다.

## Zoopibot adapter boundary

공통 runtime 에 넣지 말아야 하는 것:
- `질문 접수 -> 스키마 탐색 -> 검증 -> 리포트`라는 문구 자체
- SQL/리포트 표현 규칙
- 특정 DB 조회 규칙
- 주피봇 UI 응답 포맷

주피봇 adapter 로 남겨야 하는 것:
- Prisma `ChatSession/ChatMessage` 매핑
- 현재 이벤트 버스와 SSE 연결
- `generateSQLWithRecovery()` 기반 query workflow
- `presentation`, `resultSnapshot`, validation metadata 직렬화
- `assistant placeholder message`와 `runId`의 연결 방식

즉, 공통 runtime 은 엔진이고,
주피봇은 그 위에 올라가는 첫 번째 agent pack 입니다.

## How current Zoopibot maps to the new runtime

현재 구조를 새 런타임에 대응시키면 이렇습니다.

- `runAI()` -> `TransportAdapter`
- `chat-events.ts` -> `EventSink adapter`
- `ChatSession` / `ChatMessage` -> `ConversationStore`
- route 의 `message create + immediate response` -> `thread.start()`
- `assistantMessageId` 중심 비동기 처리 -> `ConversationRun`
- `generateSQLWithRecovery()` -> `AgentWorkflow` 일부
- `runChatMessageGeneration()` -> runtime background run processor

이렇게 가면 현재 API shape 를 거의 유지한 채 내부 구현만 교체할 수 있습니다.

## Default usage model

### Level 1: easy text call

```ts
await askAI("안녕");
```

이 모드는:
- in-memory store
- default transport
- no workflow

### Level 2: stateful conversation

```ts
const runtime = createConversationRuntime();
await runtime.thread("abc").send({ input: "이어서 질문" });
```

이 모드는:
- thread history 유지
- message log 저장

### Level 3: zoopibot-style agent conversation

```ts
const runtime = createConversationRuntime({
  transport: openClawTransport(),
  store: prismaConversationStore(prisma),
  events: zoopibotEventSink(),
  workflows: {
    query: zoopibotQueryWorkflow(),
  },
});
```

이 모드는:
- 진행 단계
- 검증/복구
- 결과 artifact 저장
- UI 실시간 갱신
- background run 처리

## Migration plan

1. `TransportAdapter` 도입
2. `ConversationRun` / `ConversationRunAck` 모델 추가
3. `memoryConversationStore` 구현
4. `ConversationRuntime.thread(id).start()` 구현
5. `prismaConversationStore` 추가
6. `chat-events` 기반 `EventSink` 추가
7. 현재 query flow 를 `zoopibotQueryWorkflow()` 로 이동
8. 기존 route 는 `start()` 호출만 하도록 축소
9. 마지막에 `askAI()` facade 추가

순서가 중요합니다.

`askAI()` 를 먼저 만들면 다시 thin wrapper 로 흐릅니다.
반대로 thread/workflow/store 를 먼저 만들면 주피봇 기능을 잃지 않습니다.

## Success criteria

아래가 유지되면 설계가 성공한 것입니다.

1. 현재 멀티턴 대화 흐름을 유지할 수 있다
2. 현재 placeholder 생성 후 background 실행 모델을 유지할 수 있다
3. 현재 진행 상태 업데이트를 유지할 수 있다
4. 현재 SQL 검증/복구 흐름을 유지할 수 있다
5. 현재 `ChatSession` / `ChatMessage` 저장 구조를 계속 쓸 수 있다
6. OpenClaw 외 다른 transport 로도 교체 가능하다
7. 쉬운 `askAI()` 사용법도 별도 facade 로 제공할 수 있다

## Bottom line

정리하면, 공통화 대상은 `OpenClaw SDK`가 아니라
`conversation runtime` 입니다.

OpenClaw 는 그 runtime 안의 transport adapter 중 하나여야 하고,
주피봇의 핵심 에이전트 기능은 `workflow + store + events` 층에서 재현되어야 합니다.
