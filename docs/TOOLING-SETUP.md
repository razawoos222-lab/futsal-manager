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

## Playwright MCP 설치 (목록에 없을 때)

레포 `.cursor/mcp.json`만으로는 **Cloud Agent MCP 목록에 자동 등록되지 않습니다.**  
아래 중 하나로 **한 번** 추가해야 목록에 뜹니다.

### A. 원클릭 (데스크톱 Cursor)
https://cursor.com/en/install-mcp?name=Playwright&config=eyJjb21tYW5kIjoibnB4IEBwbGF5d3JpZ2h0L21jcEBsYXRlc3QifQ%3D%3D

설치 후 Cursor 재시작 → Settings/Customize → MCP에서 **playwright** 토글 On.

### B. Cloud Agent용
1. https://cursor.com/agents 열기  
2. 상단/설정 **MCP** 드롭다운  
3. **Add custom MCP** (stdio)  
4. Name: `playwright`  
5. Command: `npx`  
6. Args: `-y` `@playwright/mcp@latest`  
7. Save → Enable

팀 공용이면 Dashboard → **Plugins & MCPs**에 같은 설정 추가.

### MCP 없이 당장 스모크
```bash
npm i
npx playwright install chromium
npm run smoke:mockup
```

## 당신이 Cursor에서 할 일 (필수)

1. 위 Playwright 설치(A 또는 B)
2. **google-sheets** → Connect / Sign in
3. **figma** → 이미 연결돼 있으면 패스

Cloud Agent는 데스크톱과 **로그인 상태가 따로**입니다.

## 로컬/에이전트 Chromium (선택)

```bash
npx -y playwright install chromium
```

## 확인 문장 예시

- “시트 선수 명단 헤더랑 `live/Code.gs` 필드 맞춰줘”
- “목업 htmlpreview를 Playwright로 참석→결과까지 스모크해줘”
- “이번 압축 UI walkthrough 스샷 찍어줘”
