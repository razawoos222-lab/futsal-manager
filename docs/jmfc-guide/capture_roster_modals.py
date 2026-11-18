#!/usr/bin/env python3
"""Capture add / sub / remove / player-sheet modals for the guide."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "design-preview/jmfc-play/index.html"
OUT = Path(__file__).resolve().parent / "screens"
ART = Path("/opt/cursor/artifacts/jmfc-guide")
OUT.mkdir(parents=True, exist_ok=True)
ART.mkdir(parents=True, exist_ok=True)

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
  state.playing = ['RED','BLUE'];
  state.duration = 600;
  state.secondsLeft = 480;
  state.matchElapsedSec = 120;
  state.matchLive = true;
  state.score = {A:1, B:0};
  state.matchCount = 1;
  state.matchTab = 'lineup';
  state.timeline = [];
  state.recordStack = [];
  state.playerStats = {};
  attending.forEach(n => { state.playerStats[n] = {goal:0,assist:0,defense:0,save:0,wins:0,draws:0,losses:0,homeTeam:null}; });
  state.modal = null;
  state.drawerOpen = false;
  state.screen = 'match';
  if (typeof ensureCoachesInTeams === 'function') ensureCoachesInTeams();
})()
"""


def shot(page, name):
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    (ART / f"{name}.png").write_bytes(path.read_bytes())
    print("shot", name)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(viewport={"width": 430, "height": 860}, device_scale_factor=2, is_mobile=True, has_touch=True).new_page()
        page.goto(HTML.as_uri(), wait_until="domcontentloaded")
        page.wait_for_timeout(700)

        page.evaluate(SEED + "; render._jumpTop=true; render();")
        page.wait_for_timeout(300)

        # player sheet (교체 메뉴 진입)
        page.evaluate("""() => {
          state.modal = {type:'player-sheet', name:'김남현', team:'RED'};
          render();
        }""")
        page.wait_for_timeout(250)
        shot(page, "15_player_sheet")

        # substitute
        page.evaluate("""() => {
          state.modal = {type:'sub', team:'RED', out:'김남현', lockedOut:true};
          render();
        }""")
        page.wait_for_timeout(250)
        shot(page, "16_sub")

        # add player
        page.evaluate("""() => {
          state.modal = {type:'add', targetTeam:'RED'};
          render();
        }""")
        page.wait_for_timeout(250)
        shot(page, "17_add")

        # remove player
        page.evaluate("""() => {
          state.modal = {type:'remove', team:'RED'};
          render();
        }""")
        page.wait_for_timeout(250)
        shot(page, "18_remove")

        browser.close()


if __name__ == "__main__":
    main()
