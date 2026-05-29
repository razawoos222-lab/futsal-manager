import { describe, it, expect, beforeEach } from 'vitest';
import { loadFutsalScript, seedMasterPlayers, resetHarnessState } from '../bootstrap.js';
import { makePlayers } from '../fixtures/players.js';

describe('팀 배분 알고리즘', () => {
  /** @type {ReturnType<typeof loadFutsalScript>} */
  let ctx;

  beforeEach(() => {
    ctx = loadFutsalScript();
    const players = makePlayers(18);
    seedMasterPlayers(ctx.store, players);
    const names = players.map((p) => p.name);
    ctx.api.setAttendingPlayersAndDate(names, '2026-05-29', 3);
  });

  it('getPlayerPower: sheet_only는 att+def 합', () => {
    const p = { att: 7, def: 3, ccp: 100 };
    expect(ctx.api.getPlayerPower(p, 'sheet_only')).toBe(10);
    expect(ctx.api.getPlayerPower(p, 'ccpBased')).toBe(100);
  });

  it('computeQuotasFor3: 18명→6-6-6, 21명→7-7-7', () => {
    expect(ctx.api.computeQuotasFor3(18)).toEqual([6, 6, 6]);
    expect(ctx.api.computeQuotasFor3(21)).toEqual([7, 7, 7]);
    const q = ctx.api.computeQuotasFor3(20);
    expect(q.reduce((a, b) => a + b, 0)).toBe(20);
    expect(Math.max(...q) - Math.min(...q)).toBeLessThanOrEqual(1);
  });

  it('performTeamAllocation(balanced): 3팀, 참석자 전원 배치', () => {
    const res = ctx.api.performTeamAllocation('balanced', false);
    expect(res.success).toBe(true);
    const state = res.data;
    const teamNames = ['RED', 'BLUE', 'YELLOW'];
    const assigned = new Set();
    teamNames.forEach((t) => {
      state.teams[t].players.forEach((n) => assigned.add(n));
    });
    expect(assigned.size).toBe(18);
    const sizes = teamNames.map((t) => state.teams[t].players.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('performTeamAllocation(4팀 모드): 4팀 모두 배치', () => {
    resetHarnessState(ctx);
    const players = makePlayers(24);
    seedMasterPlayers(ctx.store, players);
    ctx.api.setAttendingPlayersAndDate(
      players.map((p) => p.name),
      '2026-05-29',
      4
    );
    const res = ctx.api.performTeamAllocation('balanced', false);
    expect(res.success).toBe(true);
    ['RED', 'BLUE', 'YELLOW', 'BLACK'].forEach((t) => {
      expect(res.data.teams[t].players.length).toBeGreaterThan(0);
    });
    const total = ['RED', 'BLUE', 'YELLOW', 'BLACK'].reduce(
      (sum, t) => sum + res.data.teams[t].players.length,
      0
    );
    expect(total).toBe(24);
  });

  it('performTeamAllocation(2팀 모드): RED/BLUE만 사용', () => {
    resetHarnessState(ctx);
    const players = makePlayers(14);
    seedMasterPlayers(ctx.store, players);
    ctx.api.setAttendingPlayersAndDate(
      players.map((p) => p.name),
      '2026-05-29',
      2
    );
    const res = ctx.api.performTeamAllocation('balanced', false);
    expect(res.success).toBe(true);
    expect(res.data.teams.YELLOW.players).toHaveLength(0);
    expect(res.data.teams.BLACK.players).toHaveLength(0);
    const total =
      res.data.teams.RED.players.length + res.data.teams.BLUE.players.length;
    expect(total).toBe(14);
  });

  it('allocateRandom: 팀 인원 차이 ≤ 1', () => {
    const players = makePlayers(17).map((p) => ({
      ...p,
      power: p.att + p.def,
    }));
    const teams = {
      RED: { players: [] },
      BLUE: { players: [] },
      YELLOW: { players: [] },
    };
    ctx.api.allocateRandom(players, teams, ['RED', 'BLUE', 'YELLOW']);
    const sizes = ['RED', 'BLUE', 'YELLOW'].map((n) => teams[n].players.length);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(17);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });
});
