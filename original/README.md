# 수정 전 완전 원본 (GAS 배포용)

이 폴더는 **4팀/BLACK 등 수정이 들어가기 전** 스냅샷입니다.

| GAS 파일 | 이 저장소 경로 | 줄 수(대략) |
|----------|----------------|-------------|
| `Code.gs` | `original/Code.gs` (= 루트 `3팀버전_code`) | 1765 |
| `index.html` | `original/index.html` (= 루트 `3팀버전_index`) | 1562 |

## 특징 (원본 상태)

- 팀 모드: **2팀 / 3팀**만 선택 가능 (4팀 옵션 없음)
- 팀 색: **RED, BLUE, YELLOW** (BLACK 없음)
- `performTeamAllocation`: 출석 인원 수로 2/3팀 자동 결정 (UI `teamMode`와 불일치 가능)
- HTML: **단일 문서**, `<script>` 하나로 끝남 (Part 1/2 분할 붙여넣기 불필요)

## Apps Script에 복원하는 방법

1. GAS 편집기에서 `Code.gs` 내용을 **전부 삭제** 후 `original/Code.gs` 전체 붙여넣기
2. `index.html`도 동일하게 `original/index.html` 전체 붙여넣기
3. 저장 후 **새 버전으로 배포**

동일 내용은 저장소 루트의 `3팀버전_code`, `3팀버전_index`와 바이트 동일합니다.
