# Agent Core App Integration

이 문서는 `@zootopiafresh/agent-core`의 공개 API만으로 실제 앱 채팅 UI를 붙일 때 무엇이 충분했고, 무엇을 앱이 직접 메워야 했는지 정리합니다.

## 결론

공개 API만으로도 서버 중심 AI 채팅은 충분히 구현할 수 있습니다.

핵심 조합:

- `createConversationRuntime`
- `StaticAgentRegistry`
- `createSpecResolver`
- `createMemoryConversationStore`
- `createOpenClawTransport`
- `ConversationEventHub`
- `createConversationEventSink`

이 조합으로 가능한 것:

- thread별 run 실행
- `thread.start()` ack 기반 비동기 처리
- `thread.send()` 기반 동기 helper
- `thread.history()` 기반 메시지 복원
- requirement override
- `run.*`, `message.*`, `step.changed`, `artifact.ready` 이벤트 수집

## 앱이 직접 구현해야 하는 것

코어는 intentionally thin 합니다. 아래는 앱에서 직접 가져가야 합니다.

- thread 목록 API
- thread title / preview / updatedAt 같은 목록용 메타데이터
- SSE payload 직렬화 규약
- 클라이언트 상태관리
- REST/App Router route shape
- DB 영속화가 필요할 경우 custom store

특히 중요한 점:

- `ConversationStore` 공개 계약에는 `listThreads()`가 없습니다.
- 따라서 memory store를 그대로 쓸 때는 thread index를 별도 Map으로 유지하거나, store wrapper를 한 겹 두는 편이 현실적입니다.

## 실시간 UI를 붙일 때 권장 흐름

### 메시지 전송

실시간 UI에는 `thread.start()`가 더 잘 맞습니다.

이유:

- 즉시 ack를 돌려줍니다.
- ack 안에 `run`, `inputMessage`, `outputMessage`가 들어 있습니다.
- 이후 실제 진행 상태는 event sink로 받으면 됩니다.

전형적인 흐름:

1. `thread.start()` 호출
2. ack의 `inputMessage`, `outputMessage`를 바로 UI에 반영
3. `ConversationEventHub`를 통해 후속 `message.updated`, `message.completed`, `run.completed` 등을 수신
4. 필요하면 `/events` SSE route에서 앱 전용 DTO로 다시 직렬화

### 메시지 복원

thread reopen 시에는 아래로 충분합니다.

```ts
const messages = await runtime.thread(threadId).history();
```

## 이벤트 모델

실전에서는 아래 이벤트만으로도 채팅 UI가 충분히 돌아갑니다.

- `run.created`
- `run.started`
- `run.completed`
- `run.failed`
- `message.created`
- `message.updated`
- `message.completed`
- `message.failed`
- `step.changed`
- `artifact.ready`

전형적인 발생 순서 예시:

1. `run.created`
2. `message.created` (user)
3. `message.created` (assistant placeholder)
4. `run.started`
5. `step.changed` ...
6. `message.updated` 또는 `message.completed`
7. `run.completed` 또는 `run.failed`

즉, 앱에서는 아래 전략이 잘 맞습니다.

- thread 목록은 별도 메타데이터 Map으로 관리
- 현재 열려 있는 thread만 SSE 구독
- 이벤트마다 message/run/thread summary를 갱신

## 스트리밍에 대한 기대치

코어는 실시간 상태 전파에는 충분하지만, 토큰 단위 증분 스트리밍까지 직접 약속하지는 않습니다.

정확히는:

- `message.updated` 이벤트를 흘려보낼 수 있는 구조는 있습니다.
- 그러나 실제로 얼마나 자주 content가 갱신되는지는 transport 구현에 달려 있습니다.
- 따라서 SDK 문서에서는 “real-time update”와 “token streaming”을 구분해서 설명하는 편이 안전합니다.

권장 표현:

- 가능: run/message status 기반 실시간 갱신
- 별도 보장 아님: 토큰 단위 incrementally streamed text

## Runner 재사용 정책

`@zootopiafresh/agent-core@0.1.4`의 OpenClaw runner는 기존 gateway 재사용 판단을 아래처럼 합니다.

- 포트만 열려 있다고 재사용하지 않음
- 현재 `OPENCLAW_GATEWAY_TOKEN`으로 probe 성공 시에만 재사용
- probe 실패 시 현재 프로젝트 설정 기준으로 gateway를 다시 시작

즉, “port-open check only”에 의존하지 않아도 됩니다.

## 문서에 남겨두면 좋은 문장

SDK 사용자에게는 아래 문장을 명시하는 것이 좋습니다.

- 공개 API만으로도 서버 중심 AI 채팅을 붙일 수 있다.
- 다만 thread 목록, SSE payload, frontend store는 앱 책임이다.
- memory store는 빠른 시작용이고, 실제 앱 목록 메타데이터는 별도로 다루는 편이 현실적이다.
- `thread.start()` + event hub 조합이 실시간 채팅 UI에 적합하다.
- token streaming은 transport가 제공하는 경우에만 기대해야 한다.
