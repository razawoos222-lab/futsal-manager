# JMFC tooling setup

프로젝트에 넣은 MCP·스킬 목록과, **한 번만** 해줘야 하는 로그인 단계입니다. (슬랙 제외)

## 이미 레포에 들어간 것

### MCP — `.cursor/mcp.json`
- `playwright` — 브라우저 스모크 (`npx -y @playwright/mcp@latest`)
- `google-sheets` — Google Sheets 공식 remote MCP
- `figma` — Figma MCP

### Skills — `.cursor/skills/`
- `impeccable` — 모바일 UI 다듬기
- `walkthrough-artifacts` — 스샷/짧은 녹화
- `canvas` — 살아 있는 대시보드 목업
- `visualize` — 차트/시각화
- `jmfc-tooling` — 이 스택 사용 가이드

## 당신이 Cursor에서 할 일 (필수)

1. Cursor 열고 **Customize → MCP**
2. **google-sheets** → **Connect / Sign in** (구글 계정, JMFC 시트 권한)
3. **playwright** → 켜기 (첫 실행 시 Chromium 받을 수 있음)
4. **figma** → 이미 연결돼 있으면 패스, 아니면 Connect

Cloud Agent는 데스크톱과 **로그인 상태가 따로**입니다. 클라우드 에이전트에서 Sheets가 안 보이면 MCP의 Cloud 행에서 다시 연결하세요.

## 로컬/에이전트 Chromium (선택)

```bash
npx -y playwright install chromium
```

## 확인 문장 예시

- “시트 선수 명단 헤더랑 `live/Code.gs` 필드 맞춰줘”
- “목업 htmlpreview를 Playwright로 참석→결과까지 스모크해줘”
- “이번 압축 UI walkthrough 스샷 찍어줘”
