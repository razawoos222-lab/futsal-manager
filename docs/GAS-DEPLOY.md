# JMFC GAS 배포 가이드

## 휴대폰에서 (추천)

큰 `index.html`을 폰에 붙여넣을 필요 없습니다. Apps Script가 GitHub의 `live/index.html`을 불러오도록 **한 번만** 설정합니다.

1. 폰 브라우저로 배포 도우미 열기: 저장소의 `deploy-mobile/index.html` (또는 이 에이전트가 퍼블리시한 앱 링크)
2. **패치 복사** → [script.google.com](https://script.google.com) 의 `Code.gs`에 붙여넣기
3. 실행 메뉴에서 `useGithubUiPrBranch`(머지 전) 또는 `useGithubUiMain`(머지 후) 실행 · 권한 허용
4. **배포 → 새 버전**
5. 이후 UI 변경은 GitHub에 코드만 올라가면 웹앱 **새로고침**으로 반영

`Code.gs` 서버 로직이 바뀐 경우에만 4번(새 버전)을 다시 하면 됩니다.

선택: GitHub Actions `Deploy GAS (clasp)` — Secrets `CLASPRC_JSON` + `SCRIPT_ID`를 한 번 넣으면 폰에서 Actions → Run workflow 로 push 가능.

---

## PC에서 clasp

`live/index.html` + `live/Code.gs` 를 Google Apps Script 웹앱으로 올리는 방법입니다.

`live/index.html` + `live/Code.gs` 를 Google Apps Script 웹앱으로 올리는 방법입니다.

## 1) 준비물
- 배포 대상 스프레드시트에 연결된 Apps Script 프로젝트
- 로컬: Node.js + [clasp](https://github.com/google/clasp)

```bash
npm i -g @google/clasp
clasp login
```

## 2) 프로젝트 연결
Apps Script 편집기 URL의 `/projects/<SCRIPT_ID>/` 에서 ID를 복사한 뒤:

```bash
cd live
# 최초 1회
echo '{ "scriptId": "YOUR_SCRIPT_ID", "rootDir": "." }' > .clasp.json
# 또는 상위 live 폴더를 root로
```

저장소 루트에 `.clasp.json`을 둘 경우 예:

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "live"
}
```

`appsscript.json`이 없으면 clasp가 만들거나, 기존 프로젝트에서 `clasp pull` 한 번 받으세요.

## 3) 푸시
```bash
clasp push
```

파일 매핑:
- `live/index.html` → Apps Script 파일 `index` (HTML)
- `live/Code.gs` → `Code.gs`

## 4) 웹앱 배포
Apps Script UI:
1. **배포** → **새 배포** (또는 기존 배포 수정)
2. 유형: **웹 앱**
3. 실행 계정: **나**
4. 액세스: 클럽 운영에 맞게 (보통 조직/링크 있는 모든 사용자)
5. **배포** 후 URL 공유

기존 배포를 쓰는 경우: **배포 관리** → 연필 → 버전 **새 버전** → 배포.

## 5) 확인
- 웹앱 URL을 폰 사파리/크롬으로 연다
- 참석 → 감독 → 드래프트(핀 설정) → 라인업 → 경기 → 결과
- `기록 저장 & NEW` 시 시트 아카이브 탭이 갱신되는지 확인

## 자동 배포
이 Cloud Agent 환경에는 Google clasp 로그인이 없습니다.  
로컬/`clasp login` 된 CI에 `clasp push`를 넣으면 PR 머지 후 자동 푸시가 가능합니다. 웹앱 **새 버전 배포**는 보통 UI에서 한 번 더 하거나 `clasp deploy`로 처리합니다.

## 목업과의 관계
- 디자인/조작 기준: `design-preview/jmfc-compact/index.html`
- 실서비스: `live/` (목업을 GAS용으로 이식한 본문)
