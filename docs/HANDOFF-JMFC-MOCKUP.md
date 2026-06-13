# 작업 보관 — JMFC UI 목업 (머지 안 함)

**브랜치:** `cursor/jmfc-mockup-6e09`  
**PR:** https://github.com/razawoos222-lab/futsal-manager/pull/7 (draft, **main 머지 금지** — 사용자 요청)  
**최종 목업:** v5 (라이트 · 기록 수정 · 실버 로고)  
**저장일:** 2026-05-29

---

## 목업 한 번에 보기

**전체 프로세스 (Figma Flow):**
```
https://raw.githack.com/razawoos222-lab/futsal-manager/cursor/jmfc-mockup-6e09/design-preview/jmfc-process.html?v=5
```

**화면 상세 (v5):**
```
https://raw.githack.com/razawoos222-lab/futsal-manager/cursor/jmfc-mockup-6e09/design-preview/jmfc-mockup.html?v=5
```

1. 링크 클릭 → 2. **Open the page** 클릭  
3. 상단 **v5** 배지 · STEP 10–12(결과·기록수정·저장) 확인

저장소 루트: [VIEW-MOCKUP.md](../VIEW-MOCKUP.md)

---

## 확정된 디자인 방향 (사용자 피드백)

| 항목 | 방향 |
|------|------|
| 전체 톤 | **v5: 스타디움 라이트** (`#f4f4f5`, 흰 카드, 검정 CTA) · v3 다크는 보관 |
| 기록 수정 | 결과(읽기) → **기록 수정**(입력) → 저장 · live에 `screen-record-edit` 분리됨 |
| 로고 연도 | **EST. 206** (엠블럼 SVG: `design-preview/assets/jmfc-logo.svg`) |
| `Code.gs` | **변경 없음** — UI만 `live/index.html` 스킨 예정 |
| 구장 선택 | **제거** |
| 골키퍼 지정 | **제거** |
| 경기 시간 | **7~12분** 선택 유지 (구장만 제거) |
| 경기 진행 | 탭 3개: **라인업(기록)** · **팀 순위** · **개인기록 순위** (실시간) |
| 라인업 UI | 좌 RED / 우 BLUE, 선수 **전원** 표시, 이름 탭 → 득·수·선, 득점 후 도움, 🔄 교체 |
| 결과 화면 | **세션 요약 + 오늘의 경기 결과 통합** (수상·팀순위·팀별 스탯·저장 버튼) |

---

## 주요 파일

| 경로 | 설명 |
|------|------|
| `design-preview/jmfc-mockup.html` | **v3** 단일 목업 (6블록: 참석·경기선택·경기3탭×3·결과통합) |
| `design-preview/index.html` | JMFC / A·B·C 메뉴 |
| `design-preview/abc-tabs-preview.html` | 예전 A/B/C 탭 시안 |
| `design-preview/assets/jmfc-logo.svg` | 로고 원본 |
| `VIEW-MOCKUP.md` | 브라우저 열기 안내 |
| `.github/workflows/publish-mockup-pages.yml` | Pages 배포 (main 머지 시에만 동작) |
| `live/Code.gs` / `live/index.html` | **실앱** — 목업 확정 후 스킨 적용 대상 |

---

## 목업 v3 화면 구성

1. 참석 조사  
2. 경기 선택 (7~12분, 구장 없음, RED/BLUE 선택)  
3-A. 경기 진행 — **라인업** (8+8명, 기록/도움 UI, 타임라인)  
3-B. 경기 진행 — **팀 순위** (전체 컬럼 표)  
3-C. 경기 진행 — **개인기록 순위** (MVP·득·도·수·선)  
4. 오늘의 경기 결과 (통합)

---

## 아직 안 한 것 (다음 작업)

- [ ] 목업 최종 OK 후 → `live/index.html` JMFC 스킨 적용  
- [ ] `live/index.html`에서 구장 선택 UI 제거 + GAS `field` 의존성 정리 (필요 시 `Code.gs` 최소 수정 — 사용자는 Code.gs 유지 선호했으나 구장 제거 시 확인 필요)  
- [ ] 골키퍼 UI/로직 제거 (index + Code.gs 연동 여부 검토)  
- [ ] 경기 시간 옵션 7~12분으로 live와 목업 일치 (현재 live는 6~10분 등 혼재 가능)  
- [ ] PR #7 머지 — **사용자가 명시할 때까지 하지 말 것**

---

## 배포 앱 vs 목업

- 사용자 스크린샷(골키퍼·구장·구 탭) = **GAS 배포본** `live/` 와 동일 계열  
- 목업 링크 = **GitHub 브랜치 HTML** — 앱 URL과 자동 동기화 안 됨  

배포 URL (참고):  
`https://script.google.com/macros/s/AKfycbz2BDAU9K_VU_P5L0TnZ23LP-6CFNaE0hzBU4CLbtSY5xuPvMgTVCrdatbP9tBxT7nfXg/exec`

---

## Git 복구

```bash
git fetch origin cursor/jmfc-mockup-6e09
git checkout cursor/jmfc-mockup-6e09
```

목업만 보려면 `design-preview/jmfc-mockup.html` + githack 링크 위 참고.
