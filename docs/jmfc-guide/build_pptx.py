#!/usr/bin/env python3
"""Build JMFC Kakao-share guide PPTX + HTML."""
from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Inches, Pt

ROOT = Path(__file__).resolve().parent
SCREENS = ROOT / "screens"
OUT_PPTX = ROOT / "JMFC_조작설명서.pptx"
OUT_HTML = ROOT / "index.html"
ART = Path("/opt/cursor/artifacts/jmfc-guide")
ART.mkdir(parents=True, exist_ok=True)

# 16:9 wide for easy phone/PC viewing when shared on Kakao
W, H = Inches(13.333), Inches(7.5)

CHARCOAL = RGBColor(0x24, 0x27, 0x2B)
LIME = RGBColor(0xC6, 0xF1, 0x35)
MUTED = RGBColor(0x5B, 0x61, 0x68)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BG = RGBColor(0xE5, 0xE7, 0xE9)
CARD = RGBColor(0xF3, 0xF4, 0xF5)

SLIDES = [
    {
        "file": None,
        "title": "JMFC 경기 기록 조작 설명서",
        "body": [
            "처음부터 결과 저장까지 · 팀원 공유용",
            "목업 링크에서 그대로 눌러보며 연습하세요",
            "htmlpreview.github.io 링크로 열면 설치 없이 실행됩니다",
        ],
        "cover": True,
    },
    {
        "file": "01_attendance_empty.png",
        "title": "1. 참석 조사",
        "body": [
            "날짜를 확인합니다",
            "2팀 / 3팀 / 4팀 중 오늘 구성을 고릅니다",
            "참석 선수 칩을 탭해 선택합니다",
            "「참석 완료 →」로 다음",
        ],
    },
    {
        "file": "02_attendance_selected.png",
        "title": "1-2. 참석자 선택 팁",
        "body": [
            "지난경기 참석자 · 전체선택 · 전체해제를 쓸 수 있습니다",
            "선택 인원이 팀 수 이상이어야 다음으로 갑니다",
            "용병은 이름 옆에 용병 표시가 있습니다",
        ],
    },
    {
        "file": "03_coach.png",
        "title": "2. 감독 선택",
        "body": [
            "팀 슬롯(RED/BLUE/YELLOW…)을 탭합니다",
            "아래 선수 칩을 눌러 그 팀 감독을 지정합니다",
            "모든 팀 감독을 채운 뒤 「다음 →」",
            "감독은 드래프트·결과에서 C 표시로 유지됩니다",
        ],
    },
    {
        "file": "04_pin.png",
        "title": "3. 세션 핀번호",
        "body": [
            "첫 드래프트 입장 때 4자리 핀을 정합니다",
            "드래프트 재입장·확정·라인업 삭제에 사용합니다",
            "세션을 리셋하기 전까지 유지됩니다",
            "팀원과 공유할 핀은 구두로 전달하세요",
        ],
    },
    {
        "file": "05_draft.png",
        "title": "4. 드래프트",
        "body": [
            "스네이크 ON이면 픽 순서대로 팀이 자동 전환됩니다",
            "선수 카드를 탭해 배정 · 다시 탭하면 취소",
            "랜덤 배정 / 배정 초기화도 가능합니다",
            "팀 카드에서 드래그로 팀 이동 가능",
            "전원 배정 후 「드래프트 완료」→ 핀 확인",
        ],
    },
    {
        "file": "06_lineup.png",
        "title": "5. 라인업 확정",
        "body": [
            "드래프트 확정 후 팀별 명단이 랜덤 순서로 보입니다",
            "감독(C)은 맨 앞에 고정됩니다",
            "「라인업 공유」로 이미지를 저장·카톡 전송할 수 있습니다",
            "확인 후 경기선택으로 이동합니다",
        ],
    },
    {
        "file": "07_match_select.png",
        "title": "6. 경기 선택",
        "body": [
            "오늘 붙일 2팀을 고릅니다 (예: RED vs BLUE)",
            "경기 시간 7~12분을 설정합니다",
            "「경기시작」으로 라이브 기록 화면 진입",
            "지난 경기를 탭하면 수정 모드로 다시 열 수 있습니다",
        ],
    },
    {
        "file": "08_match_lineup.png",
        "title": "7. 경기 기록 · 라인업",
        "body": [
            "「경기시작」으로 타이머를 돌립니다",
            "선수 이름을 탭 → 득점/도움/수비/선방/자책 기록",
            "⇄ 버튼으로 교체·코트 아웃 메뉴",
            "현재 경기 종료 / 전체 세션 종료로 다음 단계",
        ],
    },
    {
        "file": "09_match_record.png",
        "title": "7-2. 스탯 입력 팝업",
        "body": [
            "선수 선택 후 원하는 스탯 버튼을 누릅니다",
            "득점이면 이어서 도움 선수를 고를 수 있습니다",
            "「스탯취소」로 마지막 기록을 되돌립니다",
            "자책골은 상대 팀에 점수가 올라갑니다",
        ],
    },
    {
        "file": "10_match_score.png",
        "title": "7-3. 팀순위 · 개인기록 탭",
        "body": [
            "팀순위 탭에서 승점·득실을 확인합니다",
            "개인기록 탭에서 선수별 누적 스탯을 봅니다",
            "타임라인을 펼치면 골 시각·도움 목록이 보입니다",
        ],
    },
    {
        "file": "11_results_top.png",
        "title": "8. 오늘의 결과",
        "body": [
            "공격/수비 MVP · 최우수 감독이 자동 집계됩니다",
            "팀 순위와 팀별 선수 스탯(MP)을 확인합니다",
            "「결과 공유」로 이미지 1장 저장 → 카톡 전송",
            "「기록 수정」에서 숫자만 고칠 수 있습니다",
        ],
    },
    {
        "file": "13_edit.png",
        "title": "9. 기록 수정",
        "body": [
            "득점·도움·수비·선방 숫자를 직접 고칩니다",
            "MP는 입력 즉시 다시 계산됩니다",
            "감독(C)은 수정해도 빠지지 않습니다",
            "「수정 완료 → 결과로」를 누르면 저장됩니다",
        ],
    },
    {
        "file": "14_menu.png",
        "title": "10. 메뉴 · 저장 · 리셋",
        "body": [
            "우측 상단 ≡ 메뉴로 화면을 바로 이동할 수 있습니다",
            "결과 화면 「기록 저장」→ 시트/로컬 보관",
            "「기록 리셋」은 새 세션 · 핀을 다시 설정합니다",
            "실전 GAS 배포본은 시트에 자동 반영됩니다",
        ],
    },
    {
        "file": None,
        "title": "빠른 체크리스트",
        "body": [
            "① 참석 → ② 감독 → ③ 핀 → ④ 드래프트 → ⑤ 라인업",
            "⑥ 2팀 선택 → ⑦ 경기 기록 → ⑧ 경기 종료",
            "⑨ 결과 확인·공유 → ⑩ 필요 시 기록 수정 → 저장",
            "연습 목업: design-preview/jmfc-play (마스터핀 없음)",
        ],
        "cover": True,
    },
]


def set_run(run, size=18, bold=False, color=CHARCOAL):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = "Arial"


def add_bg(slide, color=BG):
    shape = slide.shapes.add_shape(1, 0, 0, W, H)  # rectangle
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    # send to back
    spTree = slide.shapes._spTree
    sp = shape._element
    spTree.remove(sp)
    spTree.insert(2, sp)


def add_text_box(slide, left, top, width, height, lines, title=False):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.alignment = PP_ALIGN.LEFT
        set_run(p.runs[0], size=28 if title and i == 0 else (16 if not title else 18), bold=(title and i == 0) or (i == 0 and not title), color=CHARCOAL if not (title and i == 0) else CHARCOAL)
        if title and i == 0:
            set_run(p.runs[0], size=32, bold=True, color=CHARCOAL)
        p.space_after = Pt(8)
    return box


def build_pptx():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H
    blank = prs.slide_layouts[6]

    for i, s in enumerate(SLIDES):
        slide = prs.slides.add_slide(blank)
        add_bg(slide, BG)

        # header bar
        bar = slide.shapes.add_shape(1, 0, 0, W, Inches(0.7))
        bar.fill.solid()
        bar.fill.fore_color.rgb = CHARCOAL
        bar.line.fill.background()
        hb = slide.shapes.add_textbox(Inches(0.4), Inches(0.15), Inches(10), Inches(0.45))
        p = hb.text_frame.paragraphs[0]
        p.text = "JMFC FOOTBALL · 조작 설명서"
        set_run(p.runs[0], size=16, bold=True, color=LIME)

        page = slide.shapes.add_textbox(Inches(11.6), Inches(0.18), Inches(1.4), Inches(0.4))
        pp = page.text_frame.paragraphs[0]
        pp.text = f"{i+1}/{len(SLIDES)}"
        pp.alignment = PP_ALIGN.RIGHT
        set_run(pp.runs[0], size=14, bold=False, color=LIME)

        title_box = slide.shapes.add_textbox(Inches(0.45), Inches(0.9), Inches(12.4), Inches(0.6))
        tp = title_box.text_frame.paragraphs[0]
        tp.text = s["title"]
        set_run(tp.runs[0], size=28, bold=True, color=CHARCOAL)

        if s.get("cover") or not s["file"]:
            card = slide.shapes.add_shape(1, Inches(0.45), Inches(1.7), Inches(12.4), Inches(5.2))
            card.fill.solid()
            card.fill.fore_color.rgb = WHITE
            card.line.fill.background()
            body = slide.shapes.add_textbox(Inches(0.9), Inches(2.1), Inches(11.5), Inches(4.5))
            tf = body.text_frame
            tf.word_wrap = True
            for j, line in enumerate(s["body"]):
                p = tf.paragraphs[0] if j == 0 else tf.add_paragraph()
                p.text = ("• " if not s.get("cover") or j > 0 else "") + line if j > 0 or not line.startswith("①") else line
                if s.get("cover") and j == 0 and i == 0:
                    p.text = line
                set_run(p.runs[0], size=22, bold=(j == 0), color=CHARCOAL)
                p.space_after = Pt(14)
        else:
            img_path = SCREENS / s["file"]
            # phone screenshot on left
            slide.shapes.add_picture(str(img_path), Inches(0.4), Inches(1.65), height=Inches(5.5))
            # steps card on right
            card = slide.shapes.add_shape(1, Inches(5.1), Inches(1.65), Inches(7.7), Inches(5.5))
            card.fill.solid()
            card.fill.fore_color.rgb = WHITE
            card.line.fill.background()
            body = slide.shapes.add_textbox(Inches(5.5), Inches(2.0), Inches(7.0), Inches(4.8))
            tf = body.text_frame
            tf.word_wrap = True
            head = tf.paragraphs[0]
            head.text = "이렇게 하세요"
            set_run(head.runs[0], size=18, bold=True, color=MUTED)
            head.space_after = Pt(16)
            for j, line in enumerate(s["body"]):
                p = tf.add_paragraph()
                p.text = f"{j+1}. {line}"
                set_run(p.runs[0], size=18, bold=False, color=CHARCOAL)
                p.space_after = Pt(12)

    prs.save(str(OUT_PPTX))
    (ART / OUT_PPTX.name).write_bytes(OUT_PPTX.read_bytes())
    print("pptx", OUT_PPTX, OUT_PPTX.stat().st_size)


def build_html():
    mock_link = "https://htmlpreview.github.io/?https://github.com/razawoos222-lab/futsal-manager/blob/cursor/fix-coach-disappear-7fc5/design-preview/jmfc-play/index.html"
    cards = []
    for i, s in enumerate(SLIDES):
        if s.get("cover") and not s["file"]:
            lis = "".join(f"<li>{line}</li>" for line in s["body"])
            cards.append(
                f'<section class="card cover"><h2>{s["title"]}</h2><ol>{lis}</ol></section>'
            )
            continue
        if not s["file"]:
            continue
        lis = "".join(f"<li>{line}</li>" for line in s["body"])
        cards.append(
            f'''<section class="card">
  <div class="meta">STEP {i}</div>
  <h2>{s["title"]}</h2>
  <img src="screens/{s["file"]}" alt="{s["title"]}" loading="lazy" />
  <ol>{lis}</ol>
</section>'''
        )
    html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>JMFC 조작 설명서</title>
  <style>
    :root {{ --c:#24272B; --g:#E5E7E9; --l:#C6F135; --m:#5B6168; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif; background:var(--g); color:var(--c); }}
    header {{ position:sticky; top:0; z-index:5; background:var(--c); color:var(--l); padding:14px 16px; }}
    header h1 {{ margin:0; font-size:1.05rem; }}
    header a {{ color:var(--l); font-size:0.82rem; }}
    main {{ max-width:520px; margin:0 auto; padding:14px 12px 40px; }}
    .card {{ background:#fff; border-radius:18px; padding:14px; margin:0 0 14px; box-shadow:0 8px 24px rgba(15,23,42,.08); }}
    .card.cover {{ background:var(--c); color:#fff; }}
    .card.cover h2 {{ color:var(--l); }}
    .meta {{ font-size:0.72rem; font-weight:800; color:var(--m); letter-spacing:.04em; }}
    h2 {{ margin:4px 0 10px; font-size:1.15rem; }}
    img {{ width:100%; height:auto; border-radius:14px; border:1px solid #d4d4d8; background:#f8fafc; display:block; }}
    ol {{ margin:12px 0 0; padding-left:1.2rem; line-height:1.55; font-size:0.95rem; }}
    li {{ margin:0 0 8px; }}
    .cta {{ display:block; text-align:center; background:var(--c); color:var(--l); text-decoration:none; font-weight:800; padding:14px; border-radius:14px; margin:8px 0 18px; }}
  </style>
</head>
<body>
  <header>
    <h1>JMFC 조작 설명서</h1>
    <div>카톡 전달용 · 화면 + 순서 가이드</div>
  </header>
  <main>
    <a class="cta" href="{mock_link}" target="_blank" rel="noopener">목업 바로 열어보기</a>
    {''.join(cards)}
    <p style="text-align:center;color:#5B6168;font-size:0.8rem">파일: JMFC_조작설명서.pptx 도 같은 폴더에 있습니다</p>
  </main>
</body>
</html>
"""
    OUT_HTML.write_text(html, encoding="utf-8")
    (ART / "guide_index.html").write_text(html, encoding="utf-8")
    print("html", OUT_HTML)


if __name__ == "__main__":
    build_pptx()
    build_html()
