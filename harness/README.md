# 풋살 매니저 테스트 하네스

Google Apps Script(GAS) 환경 없이 **Node.js**에서 서버 코드(`3팀버전_code` 등)를 로드해 팀 배분·앱 상태·경기 기록 로직을 검증합니다.

## 요구 사항

- Node.js 18+

## 설치

```bash
npm install
```

## 실행

| 명령 | 설명 |
|------|------|
| `npm test` | Vitest 전체 테스트 |
| `npm run test:watch` | 변경 감지 모드 |
| `npm run harness` | 스모크 테스트 (빠른 1회 검증) |

## 구조

```
harness/
  bootstrap.js          # GAS 코드 vm 로드 + 시트 시드
  mocks/
    gas.js                # SpreadsheetApp, LockService, Utilities
    spreadsheet-store.js  # 인메모리 시트
  fixtures/
    players.js            # 테스트용 선수 데이터
  tests/
    allocation.test.js    # 팀 배분
    app-state.test.js     # getAppState 복구
    match-events.test.js  # 득점/취소/경기종료
    safe-execute.test.js  # safeExecute 래퍼
```

## 다른 버전 테스트

`bootstrap.js`의 `loadFutsalScript`에 경로를 넘깁니다.

```js
loadFutsalScript({ codePath: '/workspace/Code_2팀선택추가' });
```

## 한계

- `HtmlService` / 클라이언트 UI는 검증하지 않습니다.
- `setCoaches` 등 중첩 선언된 함수는 GAS 배포본과 동일하게 전역에 노출되지 않을 수 있습니다. 하네스는 전역 함수 위주로 테스트합니다.
