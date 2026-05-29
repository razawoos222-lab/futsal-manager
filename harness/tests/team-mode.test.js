import { describe, it, expect, beforeEach } from 'vitest';
import { loadFutsalScript, seedMasterPlayers } from '../bootstrap.js';
import { makePlayers } from '../fixtures/players.js';

describe('팀 모드 헬퍼 (getTeamNamesForMode)', () => {
  /** @type {ReturnType<typeof loadFutsalScript>} */
  let ctx;

  beforeEach(() => {
    ctx = loadFutsalScript();
    seedMasterPlayers(ctx.store, makePlayers(8));
  });

  it('2/3/4팀 이름 목록', () => {
    expect(ctx.api.getTeamNamesForMode(2)).toEqual(['RED', 'BLUE']);
    expect(ctx.api.getTeamNamesForMode(3)).toEqual(['RED', 'BLUE', 'YELLOW']);
    expect(ctx.api.getTeamNamesForMode(4)).toEqual(['RED', 'BLUE', 'YELLOW', 'BLACK']);
    expect(ctx.api.getTeamNamesForMode(99)).toEqual(['RED', 'BLUE', 'YELLOW']);
  });

  it('setCoaches는 전역 함수로 호출 가능', () => {
    const names = makePlayers(4).map((p) => p.name);
    ctx.api.setAttendingPlayersAndDate(names, '2026-05-29', 4);
    const res = ctx.api.setCoaches(names);
    expect(res.success).toBe(true);
    expect(res.data.coaches).toEqual(names);
    expect(res.data.teams.BLACK.coach).toBe(names[3]);
  });
});
