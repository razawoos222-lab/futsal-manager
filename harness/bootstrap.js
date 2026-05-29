import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { SpreadsheetStore } from './mocks/spreadsheet-store.js';
import { installGasMocks, resetGasMocks } from './mocks/gas.js';
import { toMasterSheetRows } from './fixtures/players.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CONFIG = {
  STATS_SHEET: '선수별능력치',
  PLAYER_ARCHIVE_SHEET: '기록실_개인기록',
  PAST_TEAMS_SHEET: '지난_팀_구성',
  APP_STATE_SHEET: '앱_상태_저장',
};

const CODE_CANDIDATES = [
  path.join(ROOT, '3팀버전_code'),
  path.join(ROOT, 'src', 'Code.gs'),
];

/**
 * @param {{ codePath?: string, version?: string }} [options]
 */
export function loadFutsalScript(options = {}) {
  const codePath =
    options.codePath ||
    (options.version === '2팀' && path.join(ROOT, 'Code_2팀선택추가')) ||
    CODE_CANDIDATES.find((p) => fs.existsSync(p));

  if (!codePath || !fs.existsSync(codePath)) {
    throw new Error(
      `서버 코드 파일을 찾을 수 없습니다. 3팀버전_code 또는 src/Code.gs 가 필요합니다.`
    );
  }

  const store = new SpreadsheetStore();
  installGasMocks(store);

  const code = fs.readFileSync(codePath, 'utf8');
  const sandbox = {
    console: globalThis.console,
    SpreadsheetApp: globalThis.SpreadsheetApp,
    LockService: globalThis.LockService,
    Utilities: globalThis.Utilities,
    HtmlService: globalThis.HtmlService,
    Date: Date,
    JSON: JSON,
    Math: Math,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    Set: Set,
    Error: Error,
    parseInt: parseInt,
    isNaN: isNaN,
    batchSaveTimer: null,
    lastBatchSave: 0,
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: path.basename(codePath) });

  return {
    store,
    codePath,
    api: /** @type {Record<string, Function>} */ (sandbox),
    CONFIG,
  };
}

/**
 * @param {SpreadsheetStore} store
 * @param {import('./fixtures/players.js').HarnessPlayer[]} players
 */
export function seedMasterPlayers(store, players) {
  const rows = toMasterSheetRows(players);
  const grid = [['이름', '포지션', '공격', '수비']];
  rows.forEach((r) => grid.push(r));
  store.sheets.set(CONFIG.STATS_SHEET, grid);
}

/**
 * @param {ReturnType<typeof loadFutsalScript>} ctx
 */
export function resetHarnessState(ctx) {
  ctx.store.sheets.clear();
  installGasMocks(ctx.store);
}

export function unloadFutsalScript() {
  resetGasMocks();
}
