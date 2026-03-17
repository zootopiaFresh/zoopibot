# OpenClaw Modularization TODO

현재 상태:
- [x] HTTP client 공통화
- [x] Gateway runner 공통화
- [x] 셸 공통 함수 추출
- [x] Provider 메타데이터 공통화

남은 작업:
- [x] Zoopibot 전용 스킬/환경 키 결합 제거
- [x] 공통 모듈 공개 계약 정리
- [x] 다른 프로젝트용 최소 예제 추가
- [x] 실제 gateway smoke test 추가
- [x] 재사용 가이드 문서화
- [x] 내부 패키지/템플릿 포장 방식 결정

현재 턴 작업 계획:
1. 공통 셸 라이브러리에서 `zoopibot-query`와 `ZOOPIBOT_*` 하드코딩 제거
2. Zoopibot 스크립트는 프로젝트 어댑터 값만 주입하도록 변경
3. 테스트를 generic 동작 기준으로 확장

이번 턴 완료:
- [x] 공통 셸 라이브러리 generic skill/env adapter 적용
- [x] Zoopibot setup/bootstrap 스크립트에서 adapter 변수 사용
- [x] 테스트 16개, `bash -n`, `tsc --noEmit` 통과

추가 완료:
- [x] 공개 entrypoint와 공개 계약 문서 추가
- [x] 최소 예제 추가
- [x] opt-in live smoke test 추가
- [x] 현재는 repo-internal public contract 유지, package 승격은 후속 소비 프로젝트 등장 시점으로 결정
