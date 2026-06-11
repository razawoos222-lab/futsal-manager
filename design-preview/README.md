# 디자인 시안 미리보기 (HTML)

## ▶ JMFC 목업 — 한 번에 보기 (제일 쉬움)

**[JMFC 목업 열기](https://raw.githack.com/razawoos222-lab/futsal-manager/cursor/jmfc-mockup-6e09/design-preview/jmfc-mockup.html)**

1. 링크 클릭 → 2. **「Open the page」** 한 번 클릭 → 끝.

저장소 루트 **[VIEW-MOCKUP.md](../VIEW-MOCKUP.md)** 에도 같은 링크가 있습니다.

---

| 파일 | 설명 |
|------|------|
| **`jmfc-mockup.html`** | JMFC 로고(**EST. 206**) · 6화면 다크 프리미엄 목업 (로고 HTML 내장) |
| `index.html` | 위 목업으로 자동 이동 |
| `assets/jmfc-logo.png` | 로고 PNG (헤더·아이콘) |
| `assets/jmfc-logo-hero.png` | 로고 PNG (카본 배경 포함) |

`live/Code.gs`는 변경하지 않습니다. 목업 확정 후 `live/index.html` 스킨만 적용합니다.

## A/B/C 비교 (`index.html` 옆 `../design-preview`의 상위 `index.html` 아님)

`design-preview` 폴더의 **`index.html`(A/B/C 탭)** 은 별도 파일이 없고, 저장소 루트가 아닌 **이 폴더에는 `jmfc-mockup.html`만 단일 목업**입니다. A/B/C는 예전 `index.html` 탭 시안 — GitHub에서 `design-preview/index.html`이 JMFC로 리다이렉트됩니다.

A/B/C 3탭 시안은 Git 히스토리의 `design-preview/index.html` (구버전) 또는 브랜치 이전 커밋을 참고하세요. 필요 시 `design-preview/abc-index.html`로 복구할 수 있습니다.

---

## GitHub Pages (선택)

`main`에 머지 후 저장소 **Settings → Pages → Branch: gh-pages / (root)** 로 두면:

`https://razawoos222-lab.github.io/futsal-manager/jmfc-mockup.html`

워크플로: `.github/workflows/publish-mockup-pages.yml`
