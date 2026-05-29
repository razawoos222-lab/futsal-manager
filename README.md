# futsal-manager
풋살 경기 관리 및 통계 프로그램

## 팀 모드

- **2팀**: RED vs BLUE
- **3팀**: RED / BLUE / YELLOW 순환
- **4팀**: RED / BLUE / YELLOW / BLACK 순환

참석 화면에서 팀 구성 방식을 선택하면 서버 `teamMode`와 배분·경기 선택 UI가 함께 맞춰집니다.

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
