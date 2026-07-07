import { describe, it, expect, beforeEach } from 'vitest';
import { loadFutsalScript, seedMasterPlayers } from '../bootstrap.js';
import { makePlayers } from '../fixtures/players.js';

describe('감독 기록', () => {
  /** @type {ReturnType<typeof loadFutsalScript>} */
  let ctx;

  beforeEach(() => {
    ctx = loadFutsalScript();
    seedMasterPlayers(ctx.store, makePlayers(12));
  });

  function setupThreeTeamSession() {
    const names = Array.from({ length: 9 }, (_, i) => `선수${i + 1}`);
    ctx.api.setAttendingPlayersAndDate(names, '2026-05-29', 3);
    ctx.api.performTeamAllocation('balanced', false);
    ctx.api.setCoaches(['선수1', '선수2', '선수3']);
  }

  it('setCoaches: 팀별 감독 배정 및 선수 목록에서 제외', () => {
    setupThreeTeamSession();
    const state = ctx.api.getAppState();
    expect(state.teams.RED.coach).toBe('선수1');
    expect(state.teams.BLUE.coach).toBe('선수2');
    expect(state.teams.YELLOW.coach).toBe('선수3');
    expect(state.teams.RED.players).not.toContain('선수1');
    expect(state.sessionStats.coachStats['선수1']).toBeDefined();
  });

  it('endMatch: 감독 승무패 세션 스탯 갱신', () => {
    setupThreeTeamSession();
    ctx.api.changeScreen('screen-match-select');
    ctx.api.startMatch(['RED', 'BLUE'], 600, 'A 구장');
    let s = ctx.api.getAppState();
    s.match.teamA.score = 2;
    s.match.teamB.score = 1;
    ctx.api.saveAppState(s);
    ctx.api.endMatch();
    s = ctx.api.getAppState();
    expect(s.sessionStats.coachStats['선수1'].wins).toBe(1);
    expect(s.sessionStats.coachStats['선수1'].games).toBe(1);
    expect(s.sessionStats.coachStats['선수2'].losses).toBe(1);
  });

  it('updateAndArchiveSession: 기록실_감독기록 시트에 append', () => {
    setupThreeTeamSession();
    ctx.api.changeScreen('screen-match-select');
    ctx.api.startMatch(['RED', 'BLUE'], 600, 'A 구장');
    let s = ctx.api.getAppState();
    s.match.teamA.score = 1;
    s.match.teamB.score = 1;
    ctx.api.saveAppState(s);
    ctx.api.endMatch();
    ctx.api.updateAndArchiveSession();
    const grid = ctx.store.getSheetData('기록실_감독기록');
    const coachRows = grid.filter((row, i) => i > 0 && row[1]);
    expect(coachRows.length).toBeGreaterThanOrEqual(2);
    expect(coachRows.some((r) => r[1] === '선수1' && Number(r[3]) >= 1)).toBe(true);
  });

  it('getCoachStatsFromArchive: 누적 합산', () => {
    const sheet = ctx.store.ensureSheet('기록실_감독기록');
    sheet.push(['2026-01-01', '선수1', 'RED', 2, 1, 1, 0]);
    sheet.push(['2026-02-01', '선수1', 'RED', 1, 1, 0, 0]);
    const stats = ctx.api.getCoachStatsFromArchive();
    expect(stats['선수1'].games).toBe(3);
    expect(stats['선수1'].wins).toBe(2);
    expect(stats['선수1'].winRate).toBeCloseTo(100, 0);
  });
});
