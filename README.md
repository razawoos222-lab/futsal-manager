# futsal-manager
풋살 경기 관리 및 통계 프로그램

## 팀 모드 (최소 4팀 지원)

기존 2·3팀 UI/흐름은 `INDEX_2팀선택추가`와 동일하고, 참석 화면에 **4팀(BLACK)** 옵션만 추가했습니다.

- **2팀 / 3팀**: 이전과 동일
- **4팀**: RED·BLUE·YELLOW·BLACK 배분 후, 경기 종료 시 2팀처럼 **경기 선택 화면**에서 다음 대진을 고름 (3팀 자동 순환 없음)

## 로컬 테스트 하네스

```bash
npm install
npm test
npm run harness
```

자세한 내용은 [harness/README.md](harness/README.md)를 참고하세요.

## 로컬 테스트 하네스

Google Apps Script 없이 Node.js로 서버 로직을 검증할 수 있습니다.

```bash
npm install
npm test          # Vitest 전체
npm run harness   # 스모크 1회
```

자세한 내용은 [harness/README.md](harness/README.md)를 참고하세요.
