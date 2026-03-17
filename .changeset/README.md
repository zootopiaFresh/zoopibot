# Changesets

`@zootopiafresh/agent-core` 배포 버전 관리는 Changesets로 진행합니다.

기본 흐름:

1. `yarn agent-core:release:check`
2. `yarn agent-core:changeset`
3. `yarn agent-core:version`
4. 커밋/푸시
5. `yarn agent-core:publish`

초기 0.1.0 배포는 현재 패키지 버전을 그대로 사용하고, 이후 변경부터 changeset 파일을 추가하면 됩니다.
