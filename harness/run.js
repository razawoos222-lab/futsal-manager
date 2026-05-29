#!/usr/bin/env node
/**
 * npm run harness — 스모크 테스트 (Vitest 없이 빠른 확인)
 */
import { loadFutsalScript, seedMasterPlayers, unloadFutsalScript } from './bootstrap.js';
import { makePlayers } from './fixtures/players.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function main() {
  console.log('풋살 매니저 하네스 스모크 테스트...\n');
  const ctx = loadFutsalScript();
  const { api, codePath } = ctx;
  console.log(`로드: ${codePath}`);

  seedMasterPlayers(ctx.store, makePlayers(18));
  const names = makePlayers(18).map((p) => p.name);
  const attend = api.setAttendingPlayersAndDate(names, '2026-05-29', 3);
  assert(attend.success, '참석 저장 실패');

  const alloc = api.performTeamAllocation('balanced', false);
  assert(alloc.success, `팀 배분 실패: ${alloc.message}`);
  const sizes = ['RED', 'BLUE', 'YELLOW'].map((t) => alloc.data.teams[t].players.length);
  assert(sizes.reduce((a, b) => a + b, 0) === 18, '18명 미배치');

  const match = api.startMatch(['RED', 'BLUE'], 480, 'A 구장');
  assert(match.success, '경기 시작 실패');

  const state = api.getAppState();
  state.match.timerRunning = true;
  api.saveAppState(state);
  const goal = api.recordEvent(
    { player: alloc.data.teams.RED.players[0], stat: 'goal', teamName: 'RED' },
    400
  );
  assert(goal.success, `득점 기록 실패: ${goal.message}`);

  const end = api.endMatch();
  assert(end.success, '경기 종료 실패');
  assert(end.data.currentScreen === 'screen-match-select', '종료 후 화면 오류');

  unloadFutsalScript();
  console.log('\n✅ 스모크 테스트 통과');
}

try {
  main();
} catch (e) {
  console.error('\n❌', e.message);
  process.exit(1);
}
