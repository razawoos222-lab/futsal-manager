import { describe, it, expect, beforeEach } from 'vitest';
import { loadFutsalScript, seedMasterPlayers } from '../bootstrap.js';
import { makePlayers } from '../fixtures/players.js';

function setupMatch(ctx) {
  const players = makePlayers(12);
  seedMasterPlayers(ctx.store, players);
  const names = players.map((p) => p.name);
  ctx.api.setAttendingPlayersAndDate(names, '2026-05-29', 3);
  ctx.api.performTeamAllocation('balanced', false);
  ctx.api.startMatch(['RED', 'BLUE'], 480, 'A 구장');
  const state = ctx.api.getAppState();
  state.match.timerRunning = true;
  ctx.api.saveAppState(state);
  return ctx.api.getAppState();
}

describe('경기 기록 (recordEvent / undoLastEvent)', () => {
  /** @type {ReturnType<typeof loadFutsalScript>} */
  let ctx;

  beforeEach(() => {
    ctx = loadFutsalScript();
    setupMatch(ctx);
  });

  it('득점 기록 시 스코어·선수·팀 득실 반영', () => {
    const scorer = ctx.api.getAppState().teams.RED.players[0];
    const res = ctx.api.recordEvent(
      { player: scorer, stat: 'goal', teamName: 'RED' },
      400
    );
    expect(res.success).toBe(true);
    const s = res.data;
    expect(s.match.teamA.score + s.match.teamB.score).toBeGreaterThanOrEqual(1);
    expect(s.sessionStats.playerStats[scorer].goal).toBe(1);
    const redStats = s.sessionStats.teamStats.RED;
    expect(redStats.goalsFor).toBe(1);
  });

  it('undoLastEvent: 마지막 득점 취소', () => {
    const state = ctx.api.getAppState();
    const teamA = state.match.teamA.name;
    const scorer = state.teams[teamA].players[0];
    ctx.api.recordEvent({ player: scorer, stat: 'goal', teamName: teamA }, 300);
    const afterGoal = ctx.api.getAppState();
    const scoreBefore = afterGoal.match.teamA.score + afterGoal.match.teamB.score;

    const undo = ctx.api.undoLastEvent();
    expect(undo.success).toBe(true);
    const afterUndo = undo.data;
    expect(afterUndo.match.timeline).toHaveLength(0);
    expect(afterUndo.sessionStats.playerStats[scorer].goal).toBe(0);
    const scoreAfter = afterUndo.match.teamA.score + afterUndo.match.teamB.score;
    expect(scoreAfter).toBeLessThan(scoreBefore);
  });

  it('타이머 미시작·경기 중이 아니면 기록 거부', () => {
    const s = ctx.api.getAppState();
    s.match.timerRunning = false;
    s.match.seconds = 400;
    ctx.api.saveAppState(s);
    const res = ctx.api.recordEvent(
      { player: '선수1', stat: 'goal', teamName: 'RED' },
      400
    );
    expect(res.success).toBe(false);
  });
});

describe('경기 종료 (endMatch)', () => {
  /** @type {ReturnType<typeof loadFutsalScript>} */
  let ctx;

  beforeEach(() => {
    ctx = loadFutsalScript();
    setupMatch(ctx);
  });

  it('endMatch 후 팀 선택 화면·경기 번호 증가', () => {
    const s = ctx.api.getAppState();
    const teamA = s.match.teamA.name;
    const scorer = s.teams[teamA].players[0];
    ctx.api.recordEvent({ player: scorer, stat: 'goal', teamName: teamA }, 0);
    const end = ctx.api.endMatch();
    expect(end.success).toBe(true);
    expect(end.data.currentScreen).toBe('screen-match-select');
    expect(end.data.match.count).toBe(2);
    expect(end.data.match.playingTeams).toEqual([]);
  });
});
