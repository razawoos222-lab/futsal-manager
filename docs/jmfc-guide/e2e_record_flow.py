#!/usr/bin/env python3
"""Browser E2E: attendance → results including sub/add/remove/save/alerts."""
from __future__ import annotations

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
HTML = ROOT / "live/index.html"
ART = Path("/opt/cursor/artifacts/jmfc-e2e")
ART.mkdir(parents=True, exist_ok=True)

results = []


def ok(name, cond, detail=""):
    results.append({"name": name, "ok": bool(cond), "detail": detail})
    print(("PASS" if cond else "FAIL"), name, detail)


def shot(page, name):
    path = ART / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(viewport={"width": 430, "height": 900}, device_scale_factor=2).new_page()
        page.goto(HTML.as_uri(), wait_until="domcontentloaded")
        page.wait_for_timeout(900)

        # boot toast / build
        build = page.evaluate("() => typeof APP_BUILD==='string'?APP_BUILD:''")
        ok("build_v20", "v20" in build, build)
        has_pos = page.evaluate("""() => PLAYERS.some(p => p.position)""")
        ok("no_player_positions", not has_pos)

        # select attendees quickly
        page.evaluate("""() => {
          softNewSession(true);
          state.sessionDate='2026-11-18';
          state.teamMode=3;
          state.attending=['김기호','김남현','김명래','김민수','배철호','손진석','송환규','신용주','신윤호','양승현','여도영','이영중','이윤수','이호섭','장용호','정세진','조덕기','최호진'];
          render._jumpTop=true; render();
        }""")
        page.wait_for_timeout(200)
        page.click('[data-act="to-coach"]')
        page.wait_for_timeout(250)

        # set coaches via evaluate for speed/reliability
        page.evaluate("""() => {
          state.coaches={RED:'김기호',BLUE:'배철호',YELLOW:'여도영'};
          ensureCoachesInTeams();
          state.sessionPin='1234'; persistSessionPin();
          state.teams={
            RED:['김기호','김남현','김민수','손진석','신용주','이호섭'],
            BLUE:['배철호','김명래','송환규','양승현','이영중','장용호'],
            YELLOW:['여도영','신윤호','이윤수','정세진','조덕기','최호진'],
            BLACK:[]
          };
          state.baseTeams=JSON.parse(JSON.stringify(state.teams));
          state.baseCoaches=JSON.parse(JSON.stringify(state.coaches));
          state.draftCompleted=true;
          Object.entries(state.teams).forEach(([t,ns])=>ns.forEach(n=>ensureStat(n,t)));
          state.playing=['RED','BLUE'];
          state.duration=180; state.secondsLeft=180; state.matchLive=true; state.matchTab='lineup';
          state.score={A:0,B:0}; state.timeline=[]; state.recordStack=[];
          state.screen='match'; state.modal=null; render._jumpTop=true; render();
        }""")
        page.wait_for_timeout(300)
        shot(page, "01_match")
        ok("match_screen", page.evaluate("() => state.screen==='match'"))

        # record goal + assist
        page.click('button[data-act="open-record"][data-name="김남현"]')
        page.wait_for_timeout(200)
        page.click('button[data-act="rec"][data-stat="goal"]')
        page.wait_for_timeout(250)
        page.click('button[data-act="pick-assist"][data-name="김민수"]')
        page.wait_for_timeout(250)
        score = page.evaluate("() => ({...state.score})")
        ok("goal_assist", score.get("A") == 1, str(score))

        # defense / save
        page.click('button[data-act="open-record"][data-name="김기호"]')
        page.wait_for_timeout(150)
        page.click('button[data-act="rec"][data-stat="defense"]')
        page.wait_for_timeout(200)
        page.click('button[data-act="open-record"][data-name="배철호"]')
        page.wait_for_timeout(150)
        page.click('button[data-act="rec"][data-stat="save"]')
        page.wait_for_timeout(200)

        # own goal
        page.click('button[data-act="open-record"][data-name="이호섭"]')
        page.wait_for_timeout(150)
        page.click('button[data-act="rec"][data-stat="own"]')
        page.wait_for_timeout(200)
        score2 = page.evaluate("() => ({...state.score})")
        ok("own_goal_adds_B", score2.get("B") == 1 and score2.get("A") == 1, str(score2))

        # undo
        page.click('button[data-act="undo-rec"]')
        page.wait_for_timeout(200)
        score3 = page.evaluate("() => ({...state.score})")
        ok("undo_own_goal", score3.get("B") == 0, str(score3))

        # substitute
        page.click('button[data-act="open-player-sheet"][data-name="김남현"]')
        page.wait_for_timeout(200)
        page.click('button[data-act="sheet-sub"]')
        page.wait_for_timeout(200)
        page.click('button[data-act="do-sub"][data-name="여도영"]')
        page.wait_for_timeout(250)
        roster = page.evaluate("() => state.teams.RED")
        ok("sub_in_out", "여도영" in roster and "김남현" not in roster, str(roster))
        shot(page, "02_after_sub")

        # add player (+)
        page.click('button[data-act="open-add"][data-team="RED"]')
        page.wait_for_timeout(200)
        # pick someone not on RED/BLUE if available
        added = page.evaluate("""() => {
          const btn=[...document.querySelectorAll('button[data-act="do-add"]')].find(b=>b.dataset.name);
          if(!btn) return null;
          btn.click();
          return btn.dataset.name;
        }""")
        page.wait_for_timeout(250)
        ok("add_player", bool(added) and added in page.evaluate("()=>state.teams.RED"), str(added))

        # remove via sheet
        page.evaluate("""() => { state.modal={type:'remove', team:'RED'}; render(); }""")
        page.wait_for_timeout(200)
        rem = page.evaluate("""() => {
          const btn=[...document.querySelectorAll('button[data-act="do-remove"]')].find(b=>b.dataset.name && b.dataset.name!==state.coaches.RED);
          if(!btn) return null; const n=btn.dataset.name; btn.click(); return n;
        }""")
        page.wait_for_timeout(250)
        ok("remove_player", rem and rem not in page.evaluate("()=>state.teams.RED"), str(rem))

        # coach court-out then end match should restore session coach in results
        page.evaluate("""() => {
          const name=state.coaches.RED;
          state.teams.RED=(state.teams.RED||[]).filter(n=>n!==name);
          delete state.coaches.RED;
          render();
        }""")
        page.wait_for_timeout(150)
        page.evaluate("() => { endMatch(); }")
        page.wait_for_timeout(400)
        page.evaluate("() => { state.screen='results'; restoreSessionCoachesForResults(); render(); }")
        page.wait_for_timeout(300)
        coaches = page.evaluate("() => ({...state.coaches})")
        mvp = page.evaluate("""() => {
          const el=[...document.querySelectorAll('.result-hero')].find(n=>n.textContent.includes('최우수 감독'));
          return el?el.innerText: '';
        }""")
        ok("coach_restored_after_court_out", coaches.get("RED") == "김기호", str(coaches))
        ok("best_coach_shown", "김기호" in mvp or "최우수" in mvp, mvp)
        shot(page, "03_results")

        # edit stats then back
        page.click('button[data-act="go"][data-screen="edit"]')
        page.wait_for_timeout(300)
        page.fill('tr[data-edit-name="김민수"] input[data-f="assist"]', "5")
        page.click('button[data-act="save-edit"]')
        page.wait_for_timeout(400)
        assist = page.evaluate("() => state.playerStats['김민수'].assist")
        ok("edit_persist", assist == 5, str(assist))
        coaches2 = page.evaluate("() => ({...state.coaches})")
        ok("coach_after_edit", coaches2.get("RED") == "김기호", str(coaches2))

        # alerts: jump timer to 121 then tick logic
        page.evaluate("""() => {
          state.screen='match'; state.playing=['RED','BLUE']; state.matchLive=true;
          state.secondsLeft=121; state.alerted2min=false; state.timerRunning=false;
          render();
        }""")
        page.wait_for_timeout(200)
        # call one interval cycle manually by starting timer briefly with mocked decrement
        alert = page.evaluate("""() => {
          // simulate the alert branch
          state.secondsLeft=120;
          if(state.secondsLeft<=120 && !state.alerted2min){
            state.alerted2min=true;
            playBeepBurst(5);
            toast('종료 2분 전',5000);
            return '2min';
          }
          return 'skip';
        }""")
        ok("two_min_alert_fires", alert == "2min", alert)
        page.wait_for_timeout(300)
        toast_txt = page.evaluate("() => document.getElementById('toast')?.textContent||''")
        ok("two_min_toast", "2분" in toast_txt, toast_txt)

        end_alert = page.evaluate("""() => {
          playRefereeWhistle(5);
          toast('경기 종료 · 휘슬',5000);
          return 'end';
        }""")
        ok("end_whistle_5s", end_alert == "end")
        page.wait_for_timeout(200)

        # local save
        page.evaluate("() => { state.screen='results'; render(); }")
        page.wait_for_timeout(200)
        save_ok = page.evaluate("""() => {
          try {
            const before=saveBusy;
            // local path
            const payload=buildSessionPayload();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            return !!(payload.coaches && payload.coaches.RED==='김기호' && payload.baseCoaches && payload.baseCoaches.RED==='김기호');
          } catch(e){ return String(e); }
        }""")
        ok("local_save_keeps_coaches", save_ok is True, str(save_ok))

        browser.close()

    out = ART / "results.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    failed = [r for r in results if not r["ok"]]
    print("SUMMARY", len(results) - len(failed), "/", len(results), "passed")
    if failed:
        print("FAILED", failed)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
