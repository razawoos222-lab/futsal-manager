/**
 * JMFC GAS · Code.gs
 * 목업(jmfc-session)과 동일한 클라이언트 상태 모델을 시트에 저장/아카이브합니다.
 * 붙여넣기: Apps Script의 Code.gs 전체를 이 파일로 교체하세요.
 */
const CONFIG = {
  STATS_SHEET: '선수별능력치',
  PLAYER_ARCHIVE_SHEET: '기록실_개인기록',
  COACH_ARCHIVE_SHEET: '기록실_감독기록',
  COACH_ARCHIVE_SHEET_ALT: '감독기록',
  PAST_TEAMS_SHEET: '지난_팀_구성',
  APP_STATE_SHEET: '앱_상태_저장',
  SESSION_ARCHIVE_SHEET: '세션_결과_아카이브',
  TEAM_LEADERS_SHEET: '감독_배정_2026',
  /** 감독순위 웹앱(통계대시보드) 스프레드시트 */
  STATS_SPREADSHEET_ID: '1A_rY2T1Tk1G5_tQq6SxNSxr7k330bHqD4rXCElS1BiA'
};

const TEAM_ALL = ['RED', 'BLUE', 'YELLOW', 'BLACK'];

function getTeamNamesForMode(teamMode) {
  const mode = Number(teamMode) || 3;
  if (mode === 2) return ['RED', 'BLUE'];
  if (mode === 4) return ['RED', 'BLUE', 'YELLOW', 'BLACK'];
  return ['RED', 'BLUE', 'YELLOW'];
}

function emptyTeams_() {
  return { RED: [], BLUE: [], YELLOW: [], BLACK: [] };
}

function emptyTeamStats_() {
  const o = {};
  TEAM_ALL.forEach(t => {
    o[t] = { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
  });
  return o;
}

function todayStr_() {
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
}

function buildInitialState_() {
  return {
    screen: 'attendance',
    sessionDate: todayStr_(),
    teamMode: 3,
    attending: [],
    coaches: {},
    coachPickTeam: null,
    teams: emptyTeams_(),
    playerStats: {},
    teamStats: emptyTeamStats_(),
    draftSlots: [],
    playing: [],
    duration: 600,
    secondsLeft: 600,
    timerRunning: false,
    matchTab: 'lineup',
    score: { A: 0, B: 0 },
    matchCount: 1,
    selectedPlayer: null,
    recordStack: [],
    timeline: [],
    matchHistory: [],
    editingMatchId: null,
    modal: null,
    sessionLabel: '세션 진행중',
    subCtx: null,
    addCtx: null,
    baseTeams: null,
    updatedAt: Date.now(),
    matchElapsedSec: 0,
    alerted2min: false,
    matchLive: false
  };
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('JMFC풋살 매니저')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
}

function getCoachArchiveSheet_() {
  const sheets = getCoachArchiveSheets_();
  return sheets[0];
}

/** 매니저 시트에 감독 기록 탭이 2개(기록실_감독기록 + 감독기록)면 둘 다 반환 */
function getCoachArchiveSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const names = [CONFIG.COACH_ARCHIVE_SHEET, CONFIG.COACH_ARCHIVE_SHEET_ALT];
  const found = [];
  const seen = {};
  names.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh && !seen[sh.getSheetId()]) {
      seen[sh.getSheetId()] = true;
      found.push(sh);
    }
  });
  if (!found.length) found.push(ss.insertSheet(CONFIG.COACH_ARCHIVE_SHEET));
  return found;
}

/** 시트 저장용 날짜: 2026-11-07 (하이픈, 기존 기록과 동일) */
function formatSheetDate_(v) {
  if (v == null || v === '') return todayStr_();
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  const s = String(v).trim();
  const m = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m) {
    return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  }
  return s.replace(/\./g, '-');
}

function safeExecute(func) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return { success: true, data: func() };
  } catch (e) {
    return { success: false, message: e && e.message ? e.message : String(e) };
  } finally {
    lock.releaseLock();
  }
}

/** 읽기용: 짧은 tryLock — 잠금 실패해도 로드는 진행 (초기 화면 지연/실패 완화) */
function safeRead_(func) {
  const lock = LockService.getScriptLock();
  const got = lock.tryLock(3000);
  try {
    return { success: true, data: func() };
  } catch (e) {
    return { success: false, message: e && e.message ? e.message : String(e) };
  } finally {
    if (got) lock.releaseLock();
  }
}

/** 시트 승률 → 0~100 퍼센트 숫자 */
function normalizeWinRatePct_(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return 0;
  if (n <= 1) return Math.round(n * 1000) / 10; // 0.524 → 52.4
  if (n <= 100) return Math.round(n * 10) / 10;
  return Math.round(n) / 10;
}

function getMasterPlayersFromSheet() {
  const sheet = getSheet(CONFIG.STATS_SHEET);
  if (sheet.getLastRow() < 2) return [];
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 1, lastRow - 1, 20).getValues();
  return data.map(row => {
    const winRatePct = normalizeWinRatePct_(row[13]);
    return {
      name: row[0],
      position: row[1],
      att: Number(row[2]) || 5,
      def: Number(row[3]) || 5,
      // N열 승률 — 퍼센트(0~100)로 내려보내 0.5% 오표시 방지
      winRate: winRatePct / 100,
      winRatePct: winRatePct,
      ccp: Number(row[14]) || 0,
      mp: Number(row[18]) || 0,
      mpPerGame: Number(row[19]) || 0,
      games: 0,
      isMercenary: String(row[0] || '').indexOf('용병') === 0
    };
  }).filter(p => p.name);
}

/**
 * K열 이후 수식이 getLastRow()를 오염시켜도
 * A~J(또는 지정 폭) 데이터 열 기준으로 다음 빈 행을 찾습니다.
 * keyCol1Based: 값이 있으면 "데이터가 있는 행"으로 보는 열 (개인/감독=2 선수명·감독명)
 */
function ensureHeaderRow_(sheet, headers) {
  const a1 = sheet.getRange(1, 1).getValue();
  if (a1 === '' || a1 == null) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function nextDataRowByKey_(sheet, keyCol1Based, width, needRows) {
  const last = sheet.getLastRow();
  if (last < 1) return 2;
  const cols = Math.max(width || keyCol1Based, keyCol1Based);
  // A~width 열만 본다 (K열 이후 수식 무시)
  const values = sheet.getRange(1, 1, last, cols).getValues();
  const rowHasData = (i) => {
    for (let c = 0; c < cols; c++) {
      const v = values[i][c];
      if (v !== '' && v != null) return true;
    }
    return false;
  };
  let lastFilled = 0;
  for (let i = 0; i < values.length; i++) {
    if (rowHasData(i)) lastFilled = i;
  }
  if (lastFilled <= 0) return 2;

  const need = Math.max(1, Number(needRows) || 1);
  // 헤더 아래 빈 구간(수식만 있는 노란 영역)이 충분하면 그곳부터 채움
  let gapStart = -1;
  for (let i = 1; i <= lastFilled; i++) {
    if (!rowHasData(i)) {
      if (gapStart < 0) gapStart = i;
    } else if (gapStart >= 0) {
      const gapLen = i - gapStart;
      if (need <= gapLen) return gapStart + 1;
      gapStart = -1;
    }
  }
  return lastFilled + 2;
}

function writeRowsAt_(sheet, startRow, rows) {
  if (!rows || !rows.length) return;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

/** 같은 경기일 행을 지운 뒤 다시 쓰도록 — 중복 저장 방지 */
function clearRowsForDate_(sheet, dateCol1Based, width, dateKey) {
  const key = normalizeDateKey_(dateKey);
  if (!key) return;
  const last = sheet.getLastRow();
  if (last < 2) return;
  const cols = Math.max(width || dateCol1Based, dateCol1Based);
  const values = sheet.getRange(2, 1, last - 1, cols).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (normalizeDateKey_(values[i][dateCol1Based - 1]) === key) {
      sheet.deleteRow(i + 2);
    }
  }
}

function getAppState() {
  const sheet = getSheet(CONFIG.APP_STATE_SHEET);
  const raw = sheet.getRange('A1').getValue();
  if (!raw) {
    const init = buildInitialState_();
    saveAppState(init);
    return init;
  }
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!s || typeof s !== 'object') return buildInitialState_();
    const base = buildInitialState_();
    Object.keys(base).forEach(k => {
      if (!(k in s)) s[k] = base[k];
    });
    if (!s.teams || typeof s.teams !== 'object') s.teams = emptyTeams_();
    TEAM_ALL.forEach(t => {
      if (!Array.isArray(s.teams[t])) s.teams[t] = [];
    });
    if (!s.teamStats) s.teamStats = emptyTeamStats_();
    if (!s.playerStats) s.playerStats = {};
    if (!s.coaches) s.coaches = {};
    if (!Array.isArray(s.attending)) s.attending = [];
    if (!Array.isArray(s.matchHistory)) s.matchHistory = [];
    s.modal = null;
    s.timerRunning = false;
    return s;
  } catch (e) {
    const init = buildInitialState_();
    saveAppState(init);
    return init;
  }
}

function saveAppState(state) {
  if (!state || typeof state !== 'object') throw new Error('invalid state');
  const sheet = getSheet(CONFIG.APP_STATE_SHEET);
  const copy = JSON.parse(JSON.stringify(state));
  copy.modal = null;
  copy.timerRunning = false;
  sheet.getRange('A1').setValue(JSON.stringify(copy));
  sheet.getRange('B1').setValue(new Date().toLocaleString('ko-KR'));
  return copy;
}

function resetSession() {
  return safeExecute(() => {
    const sheet = getSheet(CONFIG.APP_STATE_SHEET);
    sheet.clear();
    const init = buildInitialState_();
    saveAppState(init);
    return init;
  });
}

function getInitialData() {
  // 부팅 경로에서는 무거운 감독기록 동기화를 하지 않음 (타임아웃·초기화 실패 방지)
  // 동기화는 세션 저장 시 + 클라이언트 boot 후 syncCoachArchiveNow()로 백그라운드 실행
  return safeRead_(() => {
    const pastSessions = listPastSessions_();
    return {
      masterPlayers: getMasterPlayersFromSheet(),
      appState: getAppState(),
      pastSessions: pastSessions
    };
  });
}

function listPastSessions_() {
  const sheet = getSheet(CONFIG.SESSION_ARCHIVE_SHEET);
  if (sheet.getLastRow() < 2) return [];
  if (sheet.getRange(1, 1).getValue() === '') {
    sheet.appendRow(['sessionDate', 'savedAt', 'teamMode', 'json']);
  }
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const values = sheet.getRange(2, 1, last - 1, 4).getValues();
  const out = [];
  values.forEach(row => {
    const sessionDate = row[0];
    if (!sessionDate) return;
    let payload = null;
    try {
      payload = JSON.parse(row[3] || '{}');
    } catch (_) {
      payload = {};
    }
    payload.sessionDate = payload.sessionDate || String(sessionDate);
    payload.teamMode = payload.teamMode || row[2] || 3;
    payload.savedAt = payload.savedAt || row[1];
    out.push(payload);
  });
  return out.sort((a, b) => String(b.sessionDate).localeCompare(String(a.sessionDate)));
}

function upsertSessionArchive_(payload) {
  const sheet = getSheet(CONFIG.SESSION_ARCHIVE_SHEET);
  if (sheet.getRange(1, 1).getValue() === '') {
    sheet.appendRow(['sessionDate', 'savedAt', 'teamMode', 'json']);
  }
  const date = payload.sessionDate || todayStr_();
  const last = sheet.getLastRow();
  let foundRow = -1;
  if (last >= 2) {
    const dates = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < dates.length; i++) {
      if (String(dates[i][0]) === String(date)) {
        foundRow = i + 2;
        break;
      }
    }
  }
  const savedAt = payload.savedAt || new Date().toISOString();
  const teamMode = payload.teamMode || 3;
  const json = JSON.stringify(payload);
  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, 4).setValues([[date, savedAt, teamMode, json]]);
  } else {
    sheet.appendRow([date, savedAt, teamMode, json]);
  }
}

function updateAndArchiveSession(payload) {
  return safeExecute(() => {
    if (!payload || typeof payload !== 'object') throw new Error('저장할 세션 데이터가 없습니다.');

    const date = formatSheetDate_(payload.sessionDateLabel || payload.sessionDate || todayStr_());
    const playerStats = payload.playerStats || {};
    const coaches = payload.coaches || {};
    const teams = payload.teams || payload.baseTeams || {};
    const matchHistory = payload.matchHistory || [];
    const teamStats = payload.teamStats || {};

    // 1) 개인 기록실 — A~J만 보고 다음 행 (K열 이후 수식 무시)
    const archiveSheet = getSheet(CONFIG.PLAYER_ARCHIVE_SHEET);
    ensureHeaderRow_(archiveSheet, ['경기일', '선수명', '경기수', '승', '무', '패', '득점', '도움', '수비', '선방']);
    const rowsToAdd = Object.keys(playerStats)
      .map(name => {
        const s = playerStats[name] || {};
        const games = (Number(s.wins) || 0) + (Number(s.draws) || 0) + (Number(s.losses) || 0);
        if (games <= 0 && !(s.goal || s.assist || s.defense || s.save)) return null;
        return [
          date,
          name,
          games || Number(s.gamesPlayed) || 0,
          Number(s.wins) || 0,
          Number(s.draws) || 0,
          Number(s.losses) || 0,
          Number(s.goal) || 0,
          Number(s.assist) || 0,
          Number(s.defense) || 0,
          Number(s.save) || 0
        ];
      })
      .filter(Boolean);
    if (rowsToAdd.length) {
      clearRowsForDate_(archiveSheet, 1, 10, date);
      writeRowsAt_(archiveSheet, nextDataRowByKey_(archiveSheet, 2, 10, rowsToAdd.length), rowsToAdd);
    }

    // 2) 감독 기록실 — 기록실_감독기록 / 감독기록 둘 다 있으면 모두 갱신
    const coachSheets = getCoachArchiveSheets_();
    const coachRows = [];
    const coachSeen = {};
    Object.keys(coaches).forEach(team => {
      const coachName = coaches[team];
      if (!coachName) return;
      const key = String(coachName) + '|' + String(team);
      if (coachSeen[key]) return;
      coachSeen[key] = true;
      const ts = teamStats[team] || {};
      let matchesPlayed = Number(ts.matchesPlayed) || 0;
      let wins = Number(ts.wins) || 0;
      let draws = Number(ts.draws) || 0;
      let losses = Number(ts.losses) || 0;
      let gf = Number(ts.goalsFor) || 0;
      let ga = Number(ts.goalsAgainst) || 0;
      if (!matchesPlayed && matchHistory.length) {
        matchHistory.forEach(h => {
          if (!h || !h.a || !h.b) return;
          if (h.a !== team && h.b !== team) return;
          matchesPlayed++;
          const my = h.a === team ? Number(h.scoreA) || 0 : Number(h.scoreB) || 0;
          const opp = h.a === team ? Number(h.scoreB) || 0 : Number(h.scoreA) || 0;
          gf += my;
          ga += opp;
          if (my > opp) wins++;
          else if (my < opp) losses++;
          else draws++;
        });
      }
      coachRows.push([date, coachName, team, matchesPlayed, wins, draws, losses, gf, ga]);
    });
    if (!coachRows.length) {
      const winning = payload.winningCoaches || [];
      winning.forEach(w => {
        if (!w || !w.coachName) return;
        const team = w.winnerTeam || '';
        const key = String(w.coachName) + '|' + String(team);
        if (coachSeen[key]) return;
        coachSeen[key] = true;
        coachRows.push([date, w.coachName, team, 1, 1, 0, 0, Number(w.scoreA) || 0, Number(w.scoreB) || 0]);
      });
      if (!coachRows.length && payload.bestCoach && payload.bestCoach.name) {
        const bc = payload.bestCoach;
        coachRows.push([date, bc.name, bc.team || '', 0, 0, 0, 0, 0, 0]);
      }
    }
    if (coachRows.length) {
      coachSheets.forEach(coachSheet => {
        ensureHeaderRow_(coachSheet, ['경기일', '감독명', '팀', '경기수', '승', '무', '패', '득점', '실점']);
        clearRowsForDate_(coachSheet, 1, 9, date);
        writeRowsAt_(coachSheet, nextDataRowByKey_(coachSheet, 2, 9, coachRows.length), coachRows);
      });
    }

    // 3) 지난 팀 구성
    const pastTeamsSheet = getSheet(CONFIG.PAST_TEAMS_SHEET);
    ensureHeaderRow_(pastTeamsSheet, ['경기일', '경기번호', '팀명', '키퍼', '선수1', '선수2', '선수3', '선수4', '선수5', '선수6', '선수7', '경기결과', '감독']);
    const teamRows = [];
    matchHistory.forEach(h => {
      if (h.a && h.b) {
        const pushTeam = (teamName, roster, score, oppScore) => {
          const players = (roster || teams[teamName] || []).slice(0, 7);
          while (players.length < 7) players.push('');
          teamRows.push([
            date,
            h.num || h.matchNumber || '',
            teamName,
            '',
            ...players,
            `${score}:${oppScore}`,
            (coaches && coaches[teamName]) || ''
          ]);
        };
        pushTeam(h.a, h.rosterA, h.scoreA, h.scoreB);
        pushTeam(h.b, h.rosterB, h.scoreB, h.scoreA);
      } else if (h.teamName) {
        const players = (h.players || []).slice(0, 7);
        while (players.length < 7) players.push('');
        teamRows.push([
          date,
          h.matchNumber || '',
          h.teamName,
          h.goalkeeper || '',
          ...players,
          h.score != null ? String(h.score) : '',
          h.coach || ''
        ]);
      }
    });
    if (teamRows.length) {
      clearRowsForDate_(pastTeamsSheet, 1, 13, date);
      writeRowsAt_(pastTeamsSheet, nextDataRowByKey_(pastTeamsSheet, 3, 13, teamRows.length), teamRows);
    }

    // 4) 세션 아카이브 (지난 경기 결과 불러오기용)
    upsertSessionArchive_(payload);

    // 저장 후 감독기록도 배정표·지난팀구성 기준으로 재동기화
    try { syncCoachArchiveFromAssignments_(); } catch (e) { console.error('coach sync', e); }

    // 5) 앱 상태 초기화
    SpreadsheetApp.flush();
    const stateSheet = getSheet(CONFIG.APP_STATE_SHEET);
    stateSheet.clear();
    const init = buildInitialState_();
    saveAppState(init);
    return init;
  });
}


/**
 * 감독_배정_2026 + 지난_팀_구성 → 기록실_감독기록 자동 집계
 * - 앱 로드/세션 저장 시 자동 호출
 * - 통계대시보드(STATS_SPREADSHEET_ID)에도 동일 시트를 복사
 * Apps Script에서 syncCoachArchiveFromAssignments_ 또는 syncCoachArchiveNow() 실행 가능
 */
function syncCoachArchiveNow() {
  return safeExecute(() => syncCoachArchiveFromAssignments_());
}

function findSheetByPrefix_(ss, exactName, prefix) {
  let sh = ss.getSheetByName(exactName);
  if (sh) return sh;
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const n = sheets[i].getName();
    if (n === exactName || (prefix && n.indexOf(prefix) === 0)) return sheets[i];
  }
  return null;
}

function normalizeDateKey_(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return Utilities.formatDate(v, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(v).trim();
  const m = s.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return s.replace(/\./g, '-');
}

function parseScorePair_(s) {
  if (s == null || s === '') return null;
  const m = String(s).match(/(-?\d+)\s*:\s*(-?\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function buildCoachArchiveRowsFromAssignments_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leadSheet = findSheetByPrefix_(ss, CONFIG.TEAM_LEADERS_SHEET, '감독_배정_2026');
  const pastSheet = ss.getSheetByName(CONFIG.PAST_TEAMS_SHEET);
  if (!leadSheet || leadSheet.getLastRow() < 2) {
    return { rows: [], reason: 'no-leaders' };
  }
  if (!pastSheet || pastSheet.getLastRow() < 2) {
    return { rows: [], reason: 'no-past-teams' };
  }

  const leadVals = leadSheet.getRange(2, 1, leadSheet.getLastRow() - 1, 2).getValues();
  const coachesByDate = {};
  leadVals.forEach(r => {
    const d = normalizeDateKey_(r[0]);
    const name = r[1] ? String(r[1]).trim() : '';
    if (!d || !name || name === '합계') return;
    if (!coachesByDate[d]) coachesByDate[d] = [];
    if (coachesByDate[d].indexOf(name) < 0) coachesByDate[d].push(name);
  });

  const pastLast = pastSheet.getLastRow();
  const pastWidth = Math.max(12, pastSheet.getLastColumn());
  const pastVals = pastSheet.getRange(2, 1, pastLast - 1, pastWidth).getValues();
  const matchesByDate = {};
  pastVals.forEach(r => {
    const d = normalizeDateKey_(r[0]);
    if (!d || !coachesByDate[d]) return;
    const team = r[2] ? String(r[2]).trim() : '';
    if (!team) return;
    const players = [];
    for (let c = 3; c <= 10 && c < r.length; c++) {
      if (r[c] != null && String(r[c]).trim() !== '') players.push(String(r[c]).trim());
    }
    // 감독 열이 있으면(13열) 포함
    if (r.length >= 13 && r[12] != null && String(r[12]).trim() !== '') {
      players.push(String(r[12]).trim());
    }
    const scoreRaw = r[11];
    if (!matchesByDate[d]) matchesByDate[d] = [];
    matchesByDate[d].push({
      num: r[1] != null ? String(r[1]) : '',
      team: team,
      players: players,
      score: scoreRaw
    });
  });

  const out = [];
  Object.keys(coachesByDate).sort().forEach(d => {
    const coaches = coachesByDate[d];
    const rows = matchesByDate[d] || [];
    if (!rows.length) return;

    const counts = {};
    coaches.forEach(c => { counts[c] = {}; });
    rows.forEach(r => {
      coaches.forEach(c => {
        if (r.players.indexOf(c) >= 0) {
          counts[c][r.team] = (counts[c][r.team] || 0) + 1;
        }
      });
    });
    const coachTeam = {};
    coaches.forEach(c => {
      let best = null;
      let bestN = -1;
      Object.keys(counts[c]).forEach(t => {
        if (counts[c][t] > bestN) {
          bestN = counts[c][t];
          best = t;
        }
      });
      if (best) coachTeam[c] = best;
    });

    const byNum = {};
    rows.forEach(r => {
      if (!byNum[r.num]) byNum[r.num] = {};
      byNum[r.num][r.team] = r;
    });

    const stats = {};
    Object.keys(coachTeam).forEach(c => {
      stats[c] = { team: coachTeam[c], games: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    });

    Object.keys(byNum).forEach(num => {
      const teams = byNum[num];
      Object.keys(teams).forEach(t => {
        const sc = parseScorePair_(teams[t].score);
        if (!sc) return;
        const gf = sc[0];
        const ga = sc[1];
        Object.keys(stats).forEach(c => {
          if (stats[c].team !== t) return;
          stats[c].games++;
          stats[c].gf += gf;
          stats[c].ga += ga;
          if (gf > ga) stats[c].w++;
          else if (gf < ga) stats[c].l++;
          else stats[c].d++;
        });
      });
    });

    Object.keys(stats).forEach(c => {
      const s = stats[c];
      out.push([d, c, s.team, s.games, s.w, s.d, s.l, s.gf, s.ga]);
    });
  });

  return { rows: out, dates: Object.keys(coachesByDate) };
}

function writeCoachArchiveSheet_(sheet, builtRows, replaceDates) {
  ensureHeaderRow_(sheet, ['경기일', '감독명', '팀', '경기수', '승', '무', '패', '득점', '실점']);
  const last = sheet.getLastRow();
  let keep = [];
  if (last >= 2) {
    const vals = sheet.getRange(2, 1, last - 1, 9).getValues();
    const replaceSet = {};
    (replaceDates || []).forEach(d => { replaceSet[d] = true; });
    vals.forEach(r => {
      const d = normalizeDateKey_(r[0]);
      if (!d) return;
      if (replaceSet[d]) return; // 배정표 날짜는 재계산분으로 교체
      keep.push([
        d,
        r[1],
        r[2],
        Number(r[3]) || 0,
        Number(r[4]) || 0,
        Number(r[5]) || 0,
        Number(r[6]) || 0,
        Number(r[7]) || 0,
        Number(r[8]) || 0
      ]);
    });
  }
  const all = keep.concat(builtRows || []);
  // clear data body
  if (last >= 2) sheet.getRange(2, 1, last - 1, 9).clearContent();
  if (all.length) {
    sheet.getRange(1, 1, 1, 9).setValues([['경기일', '감독명', '팀', '경기수', '승', '무', '패', '득점', '실점']]);
    sheet.getRange(2, 1, all.length, 9).setValues(all);
  }
  return all.length;
}

function syncCoachArchiveFromAssignments_() {
  const built = buildCoachArchiveRowsFromAssignments_();
  const locals = getCoachArchiveSheets_();
  let n = 0;
  locals.forEach(local => {
    n = writeCoachArchiveSheet_(local, built.rows || [], built.dates || []);
  });

  let remote = 0;
  try {
    if (CONFIG.STATS_SPREADSHEET_ID) {
      const statsSs = SpreadsheetApp.openById(CONFIG.STATS_SPREADSHEET_ID);
      // 통계 시트도 동일 이름 탭이 있으면 모두 맞춤
      const remoteNames = [CONFIG.COACH_ARCHIVE_SHEET, CONFIG.COACH_ARCHIVE_SHEET_ALT];
      const remoteSheets = [];
      remoteNames.forEach(name => {
        let sh = statsSs.getSheetByName(name);
        if (!sh && name === CONFIG.COACH_ARCHIVE_SHEET) sh = statsSs.insertSheet(name);
        if (sh) remoteSheets.push(sh);
      });
      if (!remoteSheets.length) remoteSheets.push(statsSs.insertSheet(CONFIG.COACH_ARCHIVE_SHEET));
      remoteSheets.forEach(remoteSheet => {
        remoteSheet.clear();
        remoteSheet.getRange(1, 1, 1, 9).setValues([['경기일', '감독명', '팀', '경기수', '승', '무', '패', '득점', '실점']]);
        if (built.rows && built.rows.length) {
          remoteSheet.getRange(2, 1, built.rows.length, 9).setValues(built.rows);
        }
      });
      remote = built.rows ? built.rows.length : 0;
    }
  } catch (e) {
    console.error('stats coach sync failed', e);
  }

  SpreadsheetApp.flush();
  return {
    success: true,
    localSheets: locals.map(s => s.getName()),
    localRows: n,
    builtRows: (built.rows || []).length,
    remoteRows: remote,
    reason: built.reason || null
  };
}

/** 팀장 배정표가 없을 때만 시트를 만들고, 바로 감독기록까지 동기화 */
function importTeamLeaders2026() {
  const sheetName = CONFIG.TEAM_LEADERS_SHEET;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = findSheetByPrefix_(ss, sheetName, '감독_배정_2026');
  if (!sheet) sheet = ss.insertSheet(sheetName);
  // 시트가 비어 있으면 안내만 (데이터는 이미 Drive/복붙으로 있을 수 있음)
  if (sheet.getLastRow() < 2) {
    sheet.getRange(1, 1, 1, 2).setValues([['경기일', '감독명']]);
  }
  return syncCoachArchiveFromAssignments_();
}
