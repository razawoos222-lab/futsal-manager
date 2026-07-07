import { describe, it, expect, beforeEach } from 'vitest';
import { loadFutsalScript, seedMasterPlayers } from '../bootstrap.js';
import { makePlayers } from '../fixtures/players.js';

describe('앱 상태 (getAppState)', () => {
  /** @type {ReturnType<typeof loadFutsalScript>} */
  let ctx;

  beforeEach(() => {
    ctx = loadFutsalScript();
    seedMasterPlayers(ctx.store, makePlayers(6));
  });

  it('저장값 없을 때 초기 화면·팀 구조 생성', () => {
    const state = ctx.api.getAppState();
    expect(state.currentScreen).toBe('screen-attendance');
    expect(state.teams.RED).toBeDefined();
    expect(state.teams.BLACK).toBeDefined();
    expect(state.match.timeline).toEqual([]);
    expect(state.sessionStats.teamStats.RED.goalsFor).toBe(0);
  });

  it('깨진 JSON이면 초기 상태로 복구', () => {
    const sheet = ctx.store.ensureSheet('앱_상태_저장');
    sheet[0][0] = '{ broken json';
    const state = ctx.api.getAppState();
    expect(state.currentScreen).toBe('screen-attendance');
    expect(Array.isArray(state.attendingPlayerNames)).toBe(true);
  });

  it('부분 깨진 상태 필드 복원', () => {
    const broken = {
      attendingPlayerNames: ['선수1', '선수2'],
      teams: { RED: ['선수1'] },
      match: {},
    };
    const sheet = ctx.store.ensureSheet('앱_상태_저장');
    sheet[0][0] = JSON.stringify(broken);
    const state = ctx.api.getAppState();
    expect(state.teams.RED.players).toEqual(['선수1']);
    expect(state.sessionStats.playerStats['선수1']).toBeDefined();
    expect(state.sessionStats.playerStats['선수2']).toBeDefined();
  });

  it('resetSession: 시트 비우고 초기화', () => {
    ctx.api.setAttendingPlayersAndDate(['선수1'], '2026-01-01', 3);
    const res = ctx.api.resetSession();
    expect(res.success).toBe(true);
    expect(res.data.attendingPlayerNames).toEqual([]);
  });
});
