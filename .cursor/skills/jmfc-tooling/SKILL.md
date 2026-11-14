---
name: jmfc-tooling
description: JMFC 풋살매니저에 쓸 MCP·스킬 우선순위와 인증/검증 루틴. 시트·UI·목업·브라우저 스모크에 사용.
---

# JMFC tooling

슬랙은 쓰지 않는다.

## Always-on stack

| Priority | Tool | Role |
| --- | --- | --- |
| 1 | **Google Sheets MCP** (`google-sheets`) | 선수능력치·기록실·감독기록 스키마 검증 / 읽기 |
| 2 | **Figma MCP** + **impeccable** skill | 모바일 UI 설계·다듬기 |
| 3 | **walkthrough-artifacts** skill | 아이폰용 스샷·짧은 녹화 증거 |
| 4 | **Playwright MCP** (`playwright`) | htmlpreview / GAS 웹앱 탭 플로우 스모크 |
| — | **canvas** / **visualize** skills | 감독순위·비교·통계 목업을 살아 있는 화면으로 |

Project MCP config: `.cursor/mcp.json`  
Project skills: `.cursor/skills/{impeccable,walkthrough-artifacts,canvas,visualize,jmfc-tooling}`

## Auth the user must finish once

1. Cursor → **Customize / MCP**
2. **google-sheets** → Connect / Sign in (Google OAuth)
3. **playwright** → Enable (stdio; Chromium already installable via `npx playwright install chromium`)
4. **figma** → already connected for this account if previously authorized

Cloud Agents keep separate MCP sign-ins from the desktop app. If Sheets tools are missing in a cloud run, reconnect on the Cloud row.

## Verification recipes

### Sheets
- Read roster / archive sheet headers and compare to `live/Code.gs` field names.
- Never invent sheet columns; confirm against live spreadsheet.

### UI (Figma + impeccable)
- Phone-first, one-handed recorder flow.
- Prefer mock under `design-preview/` before patching `live/`.

### Walkthrough
- Capture lineup / match / results after UI changes.
- Store under `/opt/cursor/artifacts/` when attaching to PR notes.

### Playwright smoke
- Open mockup htmlpreview or local static server.
- Tap: attendance → coach → draft → lineup → match → results.
- Assert no empty roster toast and drawer navigation works.

## Do not install here
- Slack MCP
- Analytics / SEO / Ads MCPs
- Extra DBs while Sheets remains source of truth
