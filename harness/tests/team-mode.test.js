import { describe, it, expect, beforeEach } from 'vitest';
import { loadFutsalScript } from '../bootstrap.js';

describe('팀 모드 (최소 4팀)', () => {
  /** @type {ReturnType<typeof loadFutsalScript>} */
  let ctx;

  beforeEach(() => {
    ctx = loadFutsalScript();
  });

  it('getTeamNamesForMode: 2/3/4', () => {
    expect(ctx.api.getTeamNamesForMode(2)).toEqual(['RED', 'BLUE']);
    expect(ctx.api.getTeamNamesForMode(3)).toEqual(['RED', 'BLUE', 'YELLOW']);
    expect(ctx.api.getTeamNamesForMode(4)).toEqual(['RED', 'BLUE', 'YELLOW', 'BLACK']);
  });
});
