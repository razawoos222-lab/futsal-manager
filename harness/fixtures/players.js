/** @typedef {{ name: string, position: string, att: number, def: number, ccp?: number }} HarnessPlayer */

/** @returns {HarnessPlayer[]} */
export function makePlayers(count, prefix = '선수') {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix}${i + 1}`,
    position: 'MF',
    att: 5 + (i % 5),
    def: 4 + (i % 4),
    ccp: 50 + i,
    winRate: 0,
    mp: 0,
    mpPerGame: 0,
  }));
}

/**
 * 선수별능력치 시트 행 (A~T, 20열) — getMasterPlayersFromSheet 형식
 * @param {HarnessPlayer[]} players
 */
export function toMasterSheetRows(players) {
  return players.map((p) => {
    const row = new Array(20).fill('');
    row[0] = p.name;
    row[1] = p.position;
    row[2] = p.att;
    row[3] = p.def;
    row[13] = p.winRate ?? 0;
    row[14] = p.ccp ?? 0;
    row[18] = p.mp ?? 0;
    row[19] = p.mpPerGame ?? 0;
    return row;
  });
}
