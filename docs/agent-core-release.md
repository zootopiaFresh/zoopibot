# Agent Core Release

`@zootopiafresh/agent-core`는 GitHub Packages와 Changesets 기반으로 릴리즈합니다.

## 준비

- Node 20+
- GitHub Packages 인증
- OpenClaw 관련 회귀 테스트가 도는 로컬 환경

로컬 publish 시에는 GitHub 공식 문서 기준으로 `write:packages` 권한이 있는 토큰이 필요합니다. private repository 패키지를 다룰 경우 `repo` 권한도 필요할 수 있습니다.

권장 환경변수:

```bash
export NODE_AUTH_TOKEN=ghp_xxx
```

## 권장 순서

1. 전체 검증

```bash
yarn agent-core:release:check
```

2. 변경셋 추가

```bash
yarn agent-core:changeset
```

3. 버전 반영

```bash
yarn agent-core:version
```

4. 커밋/푸시 후 배포

```bash
yarn agent-core:publish
```

또는 GitHub Actions에서 [/Users/donghwan/zoopibot/.github/workflows/publish-agent-core.yml](/Users/donghwan/zoopibot/.github/workflows/publish-agent-core.yml) 을 수동 실행할 수 있습니다. 이 경로는 `GITHUB_TOKEN`으로 GitHub Packages에 publish 합니다.

## 참고

- tarball 설치 검증만 다시 보고 싶으면 `yarn agent-core:smoke`
- tarball과 임시 소비 프로젝트를 남겨두고 싶으면 `yarn agent-core:pack`
- 이 저장소 루트에는 GitHub Packages용 [.npmrc](/Users/donghwan/zoopibot/.npmrc)가 들어 있습니다.
