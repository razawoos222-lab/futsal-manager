/**
 * JMFC GAS · Code.gs
 * 목업(jmfc-session)과 동일한 클라이언트 상태 모델을 시트에 저장/아카이브합니다.
 * 붙여넣기: Apps Script의 Code.gs 전체를 이 파일로 교체하세요.
 */
const CONFIG = {
  STATS_SHEET: '선수별능력치',
  PLAYER_ARCHIVE_SHEET: '기록실_개인기록',
  COACH_ARCHIVE_SHEET: '기록실_감독기록',
  PAST_TEAMS_SHEET: '지난_팀_구성',
  APP_STATE_SHEET: '앱_상태_저장',
  SESSION_ARCHIVE_SHEET: '세션_결과_아카이브'
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
    baseTeams: null
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

/** 시트 승률(0.524 비율 / 52.4 퍼센트) → 클라이언트용 비율(0~1) */
function normalizeWinRateRatio_(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return 0;
  if (n <= 1) return n;
  if (n <= 100) return n / 100;
  return n / 1000;
}

function getMasterPlayersFromSheet() {
  const sheet = getSheet(CONFIG.STATS_SHEET);
  if (sheet.getLastRow() < 2) return [];
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 1, lastRow - 1, 20).getValues();
  return data.map(row => ({
    name: row[0],
    position: row[1],
    att: Number(row[2]) || 5,
    def: Number(row[3]) || 5,
    // N열: 승률 — 비율로 통일(클라이언트에서 ×100 표시)
    winRate: normalizeWinRateRatio_(row[13]),
    ccp: Number(row[14]) || 0,
    mp: Number(row[18]) || 0,
    mpPerGame: Number(row[19]) || 0,
    games: 0,
    isMercenary: String(row[0] || '').indexOf('용병') === 0
  })).filter(p => p.name);
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
  const values = sheet.getRange(1, 1, last, cols).getValues();
  let lastFilled = 0; // 0-based; 헤더=0
  for (let i = 0; i < values.length; i++) {
    const v = values[i][keyCol1Based - 1];
    if (v !== '' && v != null) lastFilled = i;
  }
  // 헤더만 있으면 2행(노란색 빈 구간)부터
  if (lastFilled <= 0) return 2;

  const need = Math.max(1, Number(needRows) || 1);
  // 헤더 아래·기존 데이터 위 빈 구간(노란 영역)이 충분하면 그곳부터
  let firstEmpty = -1;
  for (let i = 1; i < values.length; i++) {
    const v = values[i][keyCol1Based - 1];
    if (v === '' || v == null) {
      firstEmpty = i;
      break;
    }
  }
  if (firstEmpty >= 0 && firstEmpty < lastFilled) {
    let end = firstEmpty;
    while (
      end + 1 < values.length &&
      (values[end + 1][keyCol1Based - 1] === '' || values[end + 1][keyCol1Based - 1] == null)
    ) {
      end++;
    }
    if (need <= end - firstEmpty + 1) return firstEmpty + 1;
  }
  return lastFilled + 2; // 1-based: 실제 데이터 다음
}

function writeRowsAt_(sheet, startRow, rows) {
  if (!rows || !rows.length) return;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
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
  return safeExecute(() => {
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

    const date = payload.sessionDate || todayStr_();
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
      writeRowsAt_(archiveSheet, nextDataRowByKey_(archiveSheet, 2, 10, rowsToAdd.length), rowsToAdd);
    }

    // 2) 감독 기록실
    const coachSheet = getSheet(CONFIG.COACH_ARCHIVE_SHEET);
    ensureHeaderRow_(coachSheet, ['경기일', '감독명', '팀', '경기수', '승', '무', '패', '득점', '실점']);
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
      // teamStats가 비어 있으면 matchHistory에서 집계
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
    // coaches 객체가 비어도 winningCoaches / bestCoach 로 최소 기록
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
      writeRowsAt_(coachSheet, nextDataRowByKey_(coachSheet, 2, 9, coachRows.length), coachRows);
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
      writeRowsAt_(pastTeamsSheet, nextDataRowByKey_(pastTeamsSheet, 3, 13, teamRows.length), teamRows);
    }

    // 4) 세션 아카이브 (지난 경기 결과 불러오기용)
    upsertSessionArchive_(payload);

    // 5) 앱 상태 초기화
    SpreadsheetApp.flush();
    const stateSheet = getSheet(CONFIG.APP_STATE_SHEET);
    stateSheet.clear();
    const init = buildInitialState_();
    saveAppState(init);
    return init;
  });
}
