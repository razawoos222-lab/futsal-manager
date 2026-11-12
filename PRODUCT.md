# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is the single session recorder operating on a phone at the pitch during a JMFC futsal session. They run attendance through save while the match is live. Coaches and players are audience to outcomes (standings, personal stats, coach archive), not co-operators of the recording UI.

## Product Purpose

JMFC 풋살 매니저 runs one club session end-to-end: attendance → coach selection → player assignment → match recording → results → archive. Success means the recorder can capture goals, defense, and saves quickly and without mistakes mid-match, and that post-session team/coach/player records are trustworthy enough to stand as the club’s official session log.

## Positioning

Unlike the earlier GAS flow that auto-allocated players by algorithm (team-power style distribution), this product assigns players through a **coach draft**: selected coaches pick attendees into teams manually. Live scoring, standings, and archive write-back remain part of the same session tool, not a separate stats product.

## Operating Context

- Club: JMFC (Korean-language UI).
- Runtime: mobile web hosted as a Google Apps Script web app (`live/index.html` + `live/Code.gs`) backed by Google Sheets (선수별능력치, 기록실_개인기록, 기록실_감독기록, 지난_팀_구성, app state).
- Session ritual: attendance chips → team count (2/3/4) → coaches → draft picks → lineup → match select → live match (lineup / standings / personal stats) → results → optional record edit → save / new session.
- Design previews and playable mocks live under `design-preview/` (not the deployed app until skinned onto `live/`).
- Typical use: one sweaty phone, outdoor/indoor pitch lighting, one-handed taps during play.

## Capabilities and Constraints

**Confirmed**
- Draft-based team building replaces algorithm allocation for the product direction the mockup is driving toward.
- Match ops: timer, lineup tap-to-record (goal / defense / save), undo, sub/add, own-goal, end match / end session.
- Results: session summary, MVP-style highlights, team standings, per-team player stats; records accumulate into coach and player archive sheets.
- Team labels and colors: RED, BLUE, YELLOW, BLACK (order and naming are product vocabulary).
- Field (구장) selection and dedicated GK assignment are being removed from the UI direction; match length selection (about 7–12 minutes) stays.
- Deployed app remains GAS + Sheets; mockups must remain faithful to what can ship onto `live/index.html` without inventing a separate stack.

**Open / undecided**
- Exact cutover plan for removing remaining allocation-algorithm UI/logic from live GAS while draft is the source of truth.
- Whether `Code.gs` changes stay minimal (UI-led) vs. draft API surface needs broader server updates for production.
- Accessibility standard beyond mobile touch targets and high-contrast team labels is not specified.

## Brand Commitments

- Product name: **JMFC 풋살 매니저** / JMFC FOOTBALL.
- Emblem assets: `design-preview/assets/jmfc-logo.svg` (and PNG variants); mark includes EST. 206.
- Voice: operational Korean for actions and errors; Cinzel used for the JMFC wordmark only where already established.
- No external marketing claims; this is an internal club operations tool.

## Evidence on Hand

- Live app: `live/index.html`, `live/Code.gs`.
- Session mockup (current design authority for the new flow): `design-preview/jmfc-session/index.html`, gallery `design-preview/jmfc-mockup.html`.
- Coach archive / ranking previews: `design-preview/JMFC_2026_coach_ranking.html`, backfill CSV under `design-preview/`.
- Handoff notes: `docs/HANDOFF-JMFC-MOCKUP.md`, `VIEW-MOCKUP.md`.
- Do not fabricate testimonials, external customers, or deployment metrics.

## Product Principles

1. **Recorder-first:** every screen optimizes one-handed, mid-match capture on a phone.
2. **Draft is the allocation truth:** coaches pick players; do not reintroduce silent algorithm fills as the primary path.
3. **Trust the archive:** session save must produce coach/player records the club can rely on later.
4. **Ship onto GAS:** design evolves UI without pretending the host is a new platform.
5. **Same words everywhere:** attendance, coach, draft, lineup, match, results, and team color names stay consistent across mock and live.

## Accessibility & Inclusion

Mobile-first touch targets (~48px), large action labels, and team-color text that stays legible on white surfaces are required for outdoor pitch use. No formal WCAG level was committed; treat WCAG AA contrast for body/control text as the working bar until otherwise decided.
