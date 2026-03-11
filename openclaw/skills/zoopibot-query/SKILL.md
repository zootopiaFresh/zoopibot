---
name: zoopibot-query
description: |
  Zoopibot SQL 도구. 사용자의 자연어 질문을 SQL로 변환하고,
  실행하고, 결과를 해석합니다. 데이터베이스 관련 모든 질문에 사용하세요.
version: 1.0.0
metadata:
  openclaw:
    requires:
      env:
        - ZOOPIBOT_URL
        - ZOOPIBOT_SERVICE_TOKEN
      bins:
        - curl
        - jq
    primaryEnv: ZOOPIBOT_SERVICE_TOKEN
    emoji: "🔍"
---

## 언제 사용하나

사용자가 다음과 같은 요청을 하면 이 스킬을 사용하세요:
- 데이터 조회/분석 요청 ("회원 수 알려줘", "매출 보여줘", "주문 현황")
- SQL 관련 질문 ("쿼리 만들어줘", "SQL 작성해줘")
- 이전 쿼리 결과에 대한 후속 질문 ("거기서 VIP만 필터해줘")
- "실행해줘" / "결과 보여줘" 등의 실행 요청
- "분석해줘" / "해석해줘" 등의 해석 요청

## 계정 연결 확인

**모든 요청 전에** 먼저 사용자의 Zoopibot 계정 연결 상태를 확인하세요:

```bash
curl -s "${ZOOPIBOT_URL}/api/v2/users/by-slack/${SLACK_USER_ID}" \
  -H "Authorization: Bearer ${ZOOPIBOT_SERVICE_TOKEN}" | jq .
```

연결되지 않은 경우 사용자에게 안내하세요:
"Zoopibot 계정을 연결해주세요: `/연결 your@email.com`"

## 계정 연결

사용자가 `/연결 이메일주소` 형태로 요청하면:

```bash
curl -s -X POST "${ZOOPIBOT_URL}/api/v2/users/link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ZOOPIBOT_SERVICE_TOKEN}" \
  -d '{
    "slackUserId": "${SLACK_USER_ID}",
    "email": "<이메일주소>"
  }' | jq .
```

## SQL 생성 + 실행

사용자의 자연어 질문을 SQL로 변환하고 실행합니다.

```bash
curl -s -X POST "${ZOOPIBOT_URL}/api/v2/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ZOOPIBOT_SERVICE_TOKEN}" \
  -d '{
    "question": "<사용자 질문>",
    "userId": "<조회된 사용자 ID>",
    "sessionId": "<이전 세션 ID 또는 null>",
    "execute": true,
    "interpret": false
  }' | jq .
```

**중요**: 연속 대화를 위해 응답의 `sessionId`를 기억해두고 다음 요청에 재사용하세요.

## SQL만 실행 (이미 SQL이 있을 때)

```bash
curl -s -X POST "${ZOOPIBOT_URL}/api/v2/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ZOOPIBOT_SERVICE_TOKEN}" \
  -d '{
    "sql": "<SQL 쿼리>",
    "userId": "<사용자 ID>"
  }' | jq .
```

## 결과 해석

쿼리 결과를 비즈니스 관점에서 한국어로 해석합니다.

```bash
curl -s -X POST "${ZOOPIBOT_URL}/api/v2/interpret" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ZOOPIBOT_SERVICE_TOKEN}" \
  -d '{
    "question": "<사용자의 해석 요청>",
    "sql": "<원본 SQL>",
    "data": <쿼리 결과 JSON 배열>,
    "userId": "<사용자 ID>"
  }' | jq .
```

## 응답 포맷팅 규칙

1. **SQL은 항상 코드 블록**으로 표시 (```sql ... ```)
2. **설명은 한국어**로 간결하게
3. **데이터 결과**:
   - 10행 이하: 전체 표시 (테이블 형태)
   - 10행 초과: 상위 10행 + "외 N건" 표시
4. **에러 발생 시**: 친절한 한국어 안내 메시지
5. **연속 대화**: 이전 sessionId를 반드시 재사용

## 에러 처리

| HTTP 상태 | 의미 | 사용자 안내 |
|-----------|------|-----------|
| 401 | 인증 실패 | 시스템 관리자에게 문의하세요 |
| 403 | 읽기 전용 위반 | SELECT 쿼리만 실행 가능합니다 |
| 404 | 계정 미연결 | `/연결` 명령으로 계정을 연결해주세요 |
| 500 | 서버 오류 | 잠시 후 다시 시도해주세요 |
