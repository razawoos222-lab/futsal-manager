#!/usr/bin/env python3
"""Capture JMFC mock screens for the Kakao/PPTX guide."""
from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "design-preview/jmfc-share/index.html"
OUT = Path(__file__).resolve().parent / "screens"
OUT.mkdir(parents=True, exist_ok=True)
ART = Path("/opt/cursor/artifacts/jmfc-guide")
ART.mkdir(parents=True, exist_ok=True)

PHONE = {"width": 430, "height": 860}


def shot(page, name: str):
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    art = ART / f"{name}.png"
    art.write_bytes(path.read_bytes())
    print("shot", name, path.stat().st_size)


SEED = """
(() => {
  const attending = ['김기호','김남현','김명래','김민수','배철호','손진석','송환규','신용주','신윤호','양승현','여도영','이영중','이윤수','이호섭','장용호','정세진','조덕기','최호진'];
  state.sessionDate = '2026-11-18';
  state.teamMode = 3;
  state.attending = attending.slice();
  state.coaches = {RED:'김기호', BLUE:'배철호', YELLOW:'여도영'};
  state.baseCoaches = JSON.parse(JSON.stringify(state.coaches));
  state.teams = {
    RED:['김기호','김남현','김민수','손진석','신용주','이호섭'],
    BLUE:['배철호','김명래','송환규','양승현','이영중','장용호'],
    YELLOW:['여도영','신윤호','이윤수','정세진','조덕기','최호진'],
    BLACK:[]
  };
  state.baseTeams = JSON.parse(JSON.stringify(state.teams));
  state.draftCompleted = true;
  state.sessionPin = '1234';
  state.snakeMode = true;
  state.draftSlots = [];
  state.playing = ['RED','BLUE'];
  state.duration = 600;
  state.secondsLeft = 420;
  state.matchElapsedSec = 180;
  state.matchLive = false;
  state.score = {A:2, B:1};
  state.matchCount = 2;
  state.matchTab = 'lineup';
  state.timeline = [
    {time:'1:20', player:'김남현', team:'RED', stat:'goal', assist:'김민수'},
    {time:'3:05', player:'송환규', team:'BLUE', stat:'goal'},
    {time:'5:40', player:'손진석', team:'RED', stat:'goal', assist:'김기호'}
  ];
  state.recordStack = [];
  state.matchHistory = [{
    id: 1, num: 1, a:'RED', b:'YELLOW', scoreA:3, scoreB:2,
    timeline:[], rosterA:state.teams.RED.slice(), rosterB:state.teams.YELLOW.slice()
  }];
  state.playerStats = {};
  attending.forEach(n => { state.playerStats[n] = {goal:0,assist:0,defense:0,save:0,wins:0,draws:0,losses:0,homeTeam:null}; });
  state.playerStats['김남현'].goal = 2; state.playerStats['김남현'].assist = 1;
  state.playerStats['김민수'].assist = 2; state.playerStats['김민수'].defense = 1;
  state.playerStats['송환규'].goal = 1; state.playerStats['배철호'].save = 2;
  state.playerStats['여도영'].goal = 1; state.playerStats['김기호'].assist = 1; state.playerStats['김기호'].defense = 2;
  state.playerStats['손진석'].goal = 1;
  Object.keys(state.teams).forEach(t => (state.teams[t]||[]).forEach(n => { if(state.playerStats[n] && !state.playerStats[n].homeTeam) state.playerStats[n].homeTeam = t; }));
  state.teamStats = {
    RED:{matchesPlayed:1,wins:1,draws:0,losses:0,goalsFor:3,goalsAgainst:2},
    BLUE:{matchesPlayed:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0},
    YELLOW:{matchesPlayed:1,wins:0,draws:0,losses:1,goalsFor:2,goalsAgainst:3},
    BLACK:{matchesPlayed:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0}
  };
  state.modal = null;
  state.drawerOpen = false;
  state.histOpen = true;
  try { persistSessionPin(); } catch (_) {}
})()
"""


def goto_screen(page, screen: str, extra: str = ""):
    page.evaluate(
        f"""() => {{
      {SEED}
      state.screen = '{screen}';
      {extra}
      if (typeof ensureCoachesInTeams === 'function') ensureCoachesInTeams();
      if (typeof render === 'function') {{ render._jumpTop = true; render(); }}
    }}"""
    )
    page.wait_for_timeout(350)


def main():
    url = HTML.as_uri()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport=PHONE,
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        page = context.new_page()
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_timeout(800)

        # 00 cover / fresh attendance
        page.evaluate(
            """() => {
          softNewSession(true);
          state.sessionDate = '2026-11-18';
          render._jumpTop = true; render();
        }"""
        )
        page.wait_for_timeout(400)
        shot(page, "01_attendance_empty")

        # select some attendees visually
        page.evaluate(
            """() => {
          state.attending = ['김기호','김남현','김명래','김민수','배철호','손진석','송환규','신용주','신윤호','양승현','여도영','이영중','이윤수','이호섭','장용호','정세진','조덕기','최호진'];
          state.teamMode = 3;
          render._jumpTop = true; render();
        }"""
        )
        page.wait_for_timeout(300)
        shot(page, "02_attendance_selected")

        goto_screen(page, "coach")
        shot(page, "03_coach")

        # PIN modal
        page.evaluate(
            """() => {
          state.modal = {type:'pin', purpose:'set-pin', title:'핀번호 설정', message:'이번 세션 핀번호 4자리를 정하세요<br>세션 리셋 전까지 유지', digits:'', error:''};
          render();
        }"""
        )
        page.wait_for_timeout(250)
        shot(page, "04_pin")

        goto_screen(page, "draft", "state.snakeMode=true; syncDraftSlotsFromTeams(); state.draftPickTeam='RED';")
        shot(page, "05_draft")

        goto_screen(page, "lineup")
        shot(page, "06_lineup")

        goto_screen(page, "matchSelect", "state.matchLive=false; state.playing=['RED','BLUE'];")
        shot(page, "07_match_select")

        goto_screen(
            page,
            "match",
            "state.matchLive=true; state.matchTab='lineup'; state.secondsLeft=420; state.score={A:2,B:1};",
        )
        shot(page, "08_match_lineup")

        page.evaluate(
            """() => {
          state.modal = {type:'record', name:'김남현', team:'RED'};
          state.selectedPlayer = '김남현';
          render();
        }"""
        )
        page.wait_for_timeout(250)
        shot(page, "09_match_record")

        page.evaluate(
            """() => {
              state.modal = null;
              state.matchTab = 'score';
              render();
            }"""
        )
        page.wait_for_timeout(250)
        shot(page, "10_match_score")

        goto_screen(page, "results", "state.matchLive=false;")
        shot(page, "11_results_top")
        # scroll to team stats if possible
        page.evaluate(
            """() => {
          const main = document.getElementById('main');
          if (main) main.scrollTop = main.scrollHeight;
        }"""
        )
        page.wait_for_timeout(200)
        shot(page, "12_results_stats")

        goto_screen(page, "edit", "state.matchLive=false;")
        shot(page, "13_edit")

        # menu drawer
        goto_screen(page, "matchSelect", "state.drawerOpen=true;")
        shot(page, "14_menu")

        browser.close()
    print(json.dumps({"out": str(OUT), "count": len(list(OUT.glob('*.png')))}))


if __name__ == "__main__":
    main()
