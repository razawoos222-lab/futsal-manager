// ==========================================================
// ======== 중앙 관제 시스템 vFINAL-12 (다크테마, 선수교체, 경기시작 버튼 등 UI/UX 최종) ========
// ==========================================================

const CONFIG = {
  STATS_SHEET: "선수별능력치", // 선수들의 기본 능력치 (공격, 수비, 포지션)가 기록된 시트 이름
  PLAYER_ARCHIVE_SHEET: "기록실_개인기록", // 개인별 경기 기록이 누적되는 시트 이름
  PAST_TEAMS_SHEET: "지난_팀_구성" // 과거 경기에서 팀 구성이 기록될 시트 이름
};
const CACHE = CacheService.getScriptCache(); // Apps Script 캐시 서비스 사용 (데이터 임시 저장)
const CACHE_KEY = 'FUTSAL_APP_STATE_FINAL_V12'; // 캐시 키 (앱 상태를 식별하기 위함)

// --- 웹 앱 진입점 ---
// 웹 앱이 처음 로드될 때 실행되는 함수입니다.
function doGet(e) {
  // 'index' HTML 파일을 웹 페이지로 변환하여 반환합니다.
  // 페이지 제목을 '풋살 매니저 (업그레이드)'로 설정합니다.
  return HtmlService.createHtmlOutputFromFile('index').setTitle('풋살 매니저 (업그레이드)');
}

// --- 안전 실행 래퍼 ---
// 서버 함수 호출 시 동시성 문제를 방지하고 오류를 처리하는 래퍼 함수입니다.
function safeExecute(func, ...args) {
  const lock = LockService.getScriptLock(); // 스크립트 잠금 객체를 가져옵니다.
  lock.waitLock(30000); // 다른 실행이 완료될 때까지 최대 30초 대기합니다.
  try {
    const result = func(...args); // 전달된 함수를 실행합니다.
    return { success: true, data: result }; // 성공 시 성공 상태와 결과 데이터를 반환합니다.
  } catch (e) {
    // 오류 발생 시 오류 메시지와 스택 트레이스를 기록합니다.
    Logger.log(`오류 발생: ${e.message}\n${e.stack}`);
    // 실패 시 실패 상태와 오류 메시지를 반환합니다.
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock(); // 작업이 완료되면 잠금을 해제합니다.
  }
}

// --- 데이터 소스 및 상태 관리 ---
// 앱의 초기 데이터를 가져오는 함수입니다. (웹 앱 로드 시 호출)
function getInitialData() {
  // 마스터 선수 목록, 현재 앱 상태, 선수별 누적 기록을 가져와 반환합니다.
  return safeExecute(() => ({
    masterPlayers: getMasterPlayersFromSheet(), // 선수별 능력치 시트에서 마스터 선수 목록 가져오기
    appState: getAppState(), // 캐시에서 현재 앱 상태 가져오기 (없으면 초기 상태 생성)
    playerArchiveStats: getPlayerStatsFromArchive() // 선수별 누적 기록 가져오기
  }));
}

// '선수별능력치' 시트에서 마스터 선수 목록을 가져오는 함수입니다.
function getMasterPlayersFromSheet() {
  const sheet = getSheet(CONFIG.STATS_SHEET); // '선수별능력치' 시트를 가져옵니다.
  // 시트에 데이터가 없거나 헤더만 있다면 빈 배열을 반환합니다.
  if (sheet.getLastRow() < 2) return [];
  // 2행부터 마지막 행까지, 1열부터 4열까지의 데이터를 가져옵니다. (이름, 포지션, 공격, 수비)
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  // 가져온 데이터를 {name, position, att, def} 객체 배열로 변환합니다.
  // att와 def는 숫자로 변환하며, 유효하지 않으면 기본값 5를 사용합니다.
  // 이름이 비어있는 행은 필터링하여 제외합니다.
  return data.map(row => ({ name: row[0], position: row[1], att: Number(row[2]) || 5, def: Number(row[3]) || 5 })).filter(p => p.name);
}

// Apps Script 캐시에서 앱 상태를 가져오거나 초기 상태를 생성하는 함수입니다.
function getAppState() {
  const stateString = CACHE.get(CACHE_KEY); // 캐시에서 상태 문자열을 가져옵니다.
  if (stateString) { // 캐시에 상태가 있다면
    try {
      const parsedState = JSON.parse(stateString);
      // 캐시 데이터에 새로운 필드가 없을 경우를 대비하여 기본값 설정 및 초기화
      parsedState.selectedDate = parsedState.selectedDate || Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "yyyy-MM-dd");
      parsedState.match.selectedDuration = parsedState.match.selectedDuration || 600; // 기본 10분 (600초)
      parsedState.selectedField = parsedState.selectedField || 'A 구장'; // 선택된 구장명 초기화

      // sessionStats.playerStats의 구조를 더 명확하게 초기화 (새로운 필드 추가)
      if (!parsedState.sessionStats.playerStats) parsedState.sessionStats.playerStats = {};
      parsedState.attendingPlayerNames.forEach(pName => {
        if (!parsedState.sessionStats.playerStats[pName]) {
          parsedState.sessionStats.playerStats[pName] = { goal: 0, assist: 0, defense: 0, save: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0 };
        }
      });
      // 팀별 키퍼 정보 초기화 및 기존 데이터 마이그레이션
      // 기존 teams 객체가 배열 형태일 경우 players 필드로 마이그레이션
      if (!parsedState.teams.RED.players && Array.isArray(parsedState.teams.RED)) parsedState.teams.RED = { players: parsedState.teams.RED, goalkeeper: null };
      if (!parsedState.teams.BLUE.players && Array.isArray(parsedState.teams.BLUE)) parsedState.teams.BLUE = { players: parsedState.teams.BLUE, goalkeeper: null };
      if (!parsedState.teams.YELLOW.players && Array.isArray(parsedState.teams.YELLOW)) parsedState.teams.YELLOW = { players: parsedState.teams.YELLOW, goalkeeper: null };
      
      // 오늘의 상대 전적 초기화
      parsedState.match.todayHeadToHead = parsedState.match.todayHeadToHead || {}; 
      // 세션 결과 초기화
      parsedState.sessionResults = parsedState.sessionResults || null;

      // match.nextMatchSuggestion 초기화 (오류 방지)
      parsedState.match.nextMatchSuggestion = parsedState.match.nextMatchSuggestion || null;

      return parsedState; // 파싱된 상태 반환
    } catch(e) {
      // 캐시 파싱 실패 시 (데이터 손상 등), 캐시를 삭제하고 오류를 기록합니다.
      CACHE.remove(CACHE_KEY); 
      Logger.log("손상된 캐시를 삭제하고 새 상태로 시작합니다.");
    }
  }

  // 캐시가 없거나 손상된 경우, 여기서 새로운 초기 상태를 생성하여 반환합니다.
  const teamStatTemplate = { wins: 0, draws: 0, losses: 0, consecutiveMatches: 0, goalsFor: 0, goalsAgainst: 0, matchesPlayed: 0, consecutivePlays: 0 }; // consecutivePlays 추가
  const initialState = {
    currentScreen: 'screen-attendance', // 현재 화면 (초기 화면은 참석 조사)
    selectedDate: Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "yyyy-MM-dd"), // 선택된 경기 날짜 (기본값: 오늘)
    selectedField: 'A 구장', // 선택된 구장명 (기본값: A 구장)
    attendingPlayerNames: [], // 현재 참석 중인 선수들의 이름 목록
    teams: { 
      RED: { players: [], goalkeeper: null }, // 팀별 선수 목록 및 키퍼 정보
      BLUE: { players: [], goalkeeper: null }, 
      YELLOW: { players: [], goalkeeper: null } 
    }, 
    match: { 
      count: 1, // 현재 경기 번호
      playingTeams: [], // 현재 경기 중인 두 팀 이름
      teamA: { name: '', score: 0 }, // 팀 A 정보
      teamB: { name: '', score: 0 }, // 팀 B 정보
      timeline: [], // 경기 타임라인
      seconds: 600, // 남은 경기 시간 (초)
      timerRunning: false, // 타이머 실행 여부
      selectedDuration: 600, // 선택된 경기 시간 (기본 10분)
      todayHeadToHead: {} // 오늘의 상대 전적 (예: { "RED_BLUE": { wins: 0, draws: 0, losses: 0 } })
    }, 
    sessionStats: { 
      playerStats: {}, // 세션 내 선수별 스탯 (goal, assist, defense, save, gamesPlayed, wins, draws, losses)
      teamStats: { RED: {...teamStatTemplate}, BLUE: {...teamStatTemplate}, YELLOW: {...teamStatTemplate} } // 세션 내 팀별 스탯
    },
    sessionResults: null // 세션 종료 후 MVP 등 결과 저장 (기록 수정 화면으로 전달)
  };
  // 초기 상태를 캐시에 6시간(21600초) 동안 저장합니다.
  CACHE.put(CACHE_KEY, JSON.stringify(initialState), 21600);
  return initialState;
}

// 앱 상태를 캐시에 저장하는 함수입니다.
function saveAppState(state) {
  CACHE.put(CACHE_KEY, JSON.stringify(state), 21600); // 상태를 JSON 형태로 캐시에 저장
}

// 세션을 초기화 (캐시 삭제)하고 새로운 초기 상태를 반환하는 함수입니다.
function resetSession() {
  return safeExecute(() => {
    CACHE.remove(CACHE_KEY); // 캐시에서 앱 상태를 삭제합니다.
    return getAppState(); // 새로운 초기 상태를 가져와 반환합니다.
  });
}

// 현재 화면을 변경하고 앱 상태를 저장하는 함수입니다.
function changeScreen(id) {
  return safeExecute(() => {
    const s = getAppState(); // 현재 앱 상태를 가져옵니다.
    s.currentScreen = id; // 화면 ID를 업데이트합니다.
    saveAppState(s); // 변경된 상태를 저장합니다.
    return s; // 업데이트된 상태를 반환합니다.
  });
}

// 스프레드시트에서 특정 시트를 가져오거나 없으면 새로 생성하는 함수입니다.
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // 현재 활성화된 스프레드시트를 가져옵니다.
  return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName); // 시트를 찾거나 새로 만듭니다.
}

// 참석자 목록을 앱 상태에 저장하고 선택된 날짜를 업데이트하는 함수입니다.
function setAttendingPlayersAndDate(playerNames, selectedDate) {
  return safeExecute(() => {
    const state = getAppState(); // 현재 앱 상태를 가져옵니다.
    // [오류 수정] playerNames가 유효한 배열인지 확인
    if (!Array.isArray(playerNames)) {
      Logger.log("오류: setAttendingPlayersAndDate에 유효하지 않은 playerNames가 전달되었습니다.");
      throw new Error("참석자 목록 데이터가 유효하지 않습니다.");
    }

    state.attendingPlayerNames = playerNames; // 참석자 이름을 업데이트합니다.
    state.selectedDate = selectedDate; // 선택된 날짜를 업데이트합니다.
    
    // 참석자 목록이 변경되면 playerStats의 초기화도 다시 수행 (새로운 참석자 추가 등)
    playerNames.forEach(pName => {
      if (!state.sessionStats.playerStats[pName]) {
        state.sessionStats.playerStats[pName] = { goal: 0, assist: 0, defense: 0, save: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0 };
      }
    });

    saveAppState(state); // 변경된 상태를 저장합니다.
    return state; // 업데이트된 상태를 반환합니다.
  });
}

// '지난_팀_구성' 시트에서 과거 팀 구성 데이터를 가져오는 함수입니다.
function getPastTeamCompositions() {
  const sheet = getSheet(CONFIG.PAST_TEAMS_SHEET); // '지난_팀_구성' 시트를 가져옵니다.
  if (sheet.getLastRow() < 2) return []; // 데이터가 없으면 빈 배열 반환
  
  // 첫 행이 비어있으면 헤더를 추가합니다. (혹시 모를 경우를 대비한 안전 장치)
  if (sheet.getRange(1, 1).getValue() === "") {
    sheet.appendRow(["경기일", "경기번호", "팀명", "키퍼", "선수1", "선수2", "선수3", "선수4", "선수5", "선수6", "선수7"]); // 키퍼 컬럼 추가
    SpreadsheetApp.flush(); // 변경사항 즉시 반영
  }

  // 2행부터 마지막 행까지, 1열부터 마지막 열까지의 데이터를 가져옵니다.
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  
  // 데이터를 파싱하여 [{matchDate, matchNumber, teamName, goalkeeper, players: []}] 형태로 반환합니다.
  return data.map(row => {
    const matchDate = row[0]; // 경기일
    const matchNumber = row[1]; // 경기 번호
    const teamName = row[2]; // 팀 이름
    const goalkeeper = row[3]; // 키퍼 이름 (신규)
    const players = row.slice(4).filter(p => p); // 선수 목록 (빈 값 제거, 키퍼 제외)
    return { matchDate, matchNumber, teamName, goalkeeper, players };
  });
}

// '기록실_개인기록' 시트에서 선수별 누적 데이터를 '합산'하여 가져오는 수정된 함수
function getPlayerStatsFromArchive() {
  const sheet = getSheet(CONFIG.PLAYER_ARCHIVE_SHEET);
  if (sheet.getLastRow() < 2) return {};

  if (sheet.getRange(1, 1).getValue() === "") {
    sheet.appendRow(["경기일", "선수명", "경기수", "승", "무", "패", "득점", "도움", "수비", "선방"]);
    SpreadsheetApp.flush();
  }
  
  const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 9).getValues(); 
  
  const playerStats = {};
  data.forEach(row => {
    const playerName = row[0];
    if (!playerStats[playerName]) {
      // 새로운 선수는 초기화
      playerStats[playerName] = { games: 0, wins: 0, draws: 0, losses: 0, goal: 0, assist: 0, defense: 0, save: 0 };
    }
    // 기존 데이터에 계속 합산
    playerStats[playerName].games += Number(row[1]) || 0;
    playerStats[playerName].wins += Number(row[2]) || 0;
    playerStats[playerName].draws += Number(row[3]) || 0;
    playerStats[playerName].losses += Number(row[4]) || 0;
    playerStats[playerName].goal += Number(row[5]) || 0;
    playerStats[playerName].assist += Number(row[6]) || 0;
    playerStats[playerName].defense += Number(row[7]) || 0;
    playerStats[playerName].save += Number(row[8]) || 0;
  });
  return playerStats;
}

// 선수의 공격/수비 능력치 및 과거 기록에 따라 전술적 역할을 분류하는 헬퍼 함수입니다. (고도화)
function getPlayerRoleClassification(player, playerArchiveStats) {
  // [오류 수정] player 객체가 유효한지 확인
  if (!player || typeof player.name === 'undefined') {
    Logger.log("오류: getPlayerRoleClassification에 유효하지 않은 player 객체가 전달되었습니다.");
    return '올라운더형'; // 기본값 반환 또는 오류 처리
  }
  const stats = playerArchiveStats[player.name] || {games: 0, goal: 0, assist: 0, defense: 0, save: 0};

  // 1. 골키퍼 분류 (가장 높은 우선순위)
  // 시트의 포지션이 'GK' 또는 '골키퍼'이거나, 과거 선방 기록이 월등히 높으면 골키퍼로 분류
  if (player.position && (player.position.toUpperCase() === 'GK' || player.position === '골키퍼')) return '골키퍼';
  // 경기당 평균 선방 횟수가 0.5회 이상 (조절 가능)
  if (stats.games > 0 && (stats.save / stats.games) >= 0.5) return '골키퍼'; 

  // 2. 수비형 분류 (수비력 높거나 과거 수비/선방 기록이 많으면)
  if (player.def >= 7 && player.att <= 5) return '수비형'; // 기본 수비 능력치 기준
  // 경기당 평균 수비 횟수가 0.5회 이상 또는 경기당 평균 선방 횟수가 0.2회 이상
  if (stats.games > 0 && ((stats.defense / stats.games) >= 0.5 || (stats.save / stats.games) >= 0.2)) return '수비형'; 

  // 3. 공격형 분류 (공격력 높거나 과거 득점/도움 기록이 많으면)
  if (player.att >= 7 && player.def <= 5) return '공격형'; // 기본 공격 능력치 기준
  // 경기당 평균 득점 횟수가 0.3회 이상 또는 경기당 평균 도움 횟수가 0.3회 이상
  if (stats.games > 0 && ((stats.goal / stats.games) >= 0.3 || (stats.assist / stats.games) >= 0.3)) return '공격형'; 

  // 4. 올라운더형 (공수 밸런스 또는 특별한 강점 없음)
  // 공격/수비 능력치 차이가 2 이내이거나, 특정 역할에 치우치지 않는 기록을 보일 경우
  if (Math.abs(player.att - player.def) <= 2) return '올라운더형';
  // 모든 조건에 해당하지 않으면 기본 올라운더형
  return '올라운더형';
}

// --- 핵심 로직 (팀 배분 알고리즘 확장) ---
function performTeamAllocation(algorithm) {
  return safeExecute(() => {
    const state = getAppState(); // 현재 앱 상태를 가져옵니다.
    const masterPlayers = getMasterPlayersFromSheet(); // 마스터 선수 목록 (능력치 포함)
    const playerArchiveStats = getPlayerStatsFromArchive(); // 선수별 과거 기록 통계 (신규)

    // 참석 중인 선수들만 필터링하고 전체 선수 정보 (능력치 포함)를 유지합니다.
    const attendingPlayers = masterPlayers.filter(p => state.attendingPlayerNames.includes(p.name));
    
    let teams = { 
      RED: { players: [], goalkeeper: null }, 
      BLUE: { players: [], goalkeeper: null }, 
      YELLOW: { players: [], goalkeeper: null } 
    }; // 배분될 팀 객체 (키퍼 정보 포함)
    const teamNames = Object.keys(teams); // 팀 이름 배열

    // 할당할 선수 목록 (섞기 전 원본)
    let playersToAllocate = [...attendingPlayers]; 

    // 각 알고리즘별 로직 분기
    switch (algorithm) {
      case 'balanced':
        Logger.log("팀 배분 알고리즘: 밸런스");
        const getPower = (p) => (p.att || 0) + (p.def || 0); // 선수의 총 능력치 계산
        playersToAllocate.sort((a, b) => getPower(b) - getPower(a)); // 능력치 높은 순으로 정렬

        playersToAllocate.forEach(player => {
          // 각 팀의 현재 총 능력치와 선수 수를 계산합니다.
          const teamTotals = teamNames.map(name => ({
            name,
            totalPower: teams[name].players.reduce((sum, p) => sum + getPower(masterPlayers.find(mp => mp.name === p.name) || {att:0, def:0}), 0),
            playerCount: teams[name].players.length
          }));
          // 총 능력치가 가장 낮고, 그 다음으로 선수 수가 적은 팀에 우선 배정합니다.
          teamTotals.sort((a, b) => a.totalPower - b.totalPower || a.playerCount - b.playerCount);
          teams[teamTotals[0].name].players.push(player); // 가장 약한 팀에 선수 추가
        });
        break;

      case 'antiReunion': // 재회 방지 알고리즘
        Logger.log("팀 배분 알고리즘: 재회 방지");
        const pastTeamCompositions = getPastTeamCompositions(); // 과거 팀 구성 데이터 가져오기

        // 각 선수가 최근 몇 경기 동안 누구와 같은 팀에 있었는지 추적
        const playerCohesionScores = {}; // {playerName: {partnerName: cohesionScore}}
        pastTeamCompositions.forEach(record => {
          record.players.forEach(p1Name => {
            if (!playerCohesionScores[p1Name]) playerCohesionScores[p1Name] = {};
            record.players.forEach(p2Name => {
              if (p1Name !== p2Name) {
                playerCohesionScores[p1Name][p2Name] = (playerCohesionScores[p1Name][p2Name] || 0) + 1;
              }
            });
          });
        });

        playersToAllocate.sort(() => 0.5 - Math.random()); // 일단 무작위로 섞음 (초기 분산)

        // 선수들을 재회 지수(Reunion Score)가 가장 낮은 팀에 배정
        playersToAllocate.forEach(player => {
          let minReunionScore = Infinity;
          let bestTeam = '';

          teamNames.forEach(teamName => {
            let currentReunionScore = 0;
            // 현재 팀에 이미 배정된 선수들과의 재회 지수 계산
            teams[teamName].players.forEach(assignedPlayer => {
              // 현재 배정하려는 선수와 이미 배정된 선수의 과거 함께 뛴 횟수를 합산
              currentReunionScore += (playerCohesionScores[player.name]?.[assignedPlayer.name] || 0);
            });

            // 현재 배정하려는 선수가 과거 이 팀에 많이 속했다면 가중치 부여 (선택적)
            // 이는 getPastTeamCompositions에서 팀명도 기록하므로 활용 가능
            const playerOwnTeamHistory = pastTeamCompositions.filter(rec => rec.teamName === teamName && rec.players.includes(player.name)).length;
            currentReunionScore += playerOwnTeamHistory * 0.5; // 과거 자기 팀에 속한 횟수 가중치

            if (currentReunionScore < minReunionScore) {
              minReunionScore = currentReunionScore;
              bestTeam = teamName;
            } else if (currentReunionScore === minReunionScore) {
              // 재회 지수가 같다면 팀의 현재 선수 수로 균형 맞추기
              if (teams[teamName].players.length < teams[bestTeam].players.length) {
                bestTeam = teamName;
              }
            }
          });
          teams[bestTeam].players.push(player); // 가장 낮은 재회 지수를 가진 팀에 선수 추가
        });
        break;

      case 'tacticalRole': // 전술 역할 기반 알고리즘
        Logger.log("팀 배분 알고리즘: 전술 역할 기반");
        // 선수들을 역할(골키퍼, 공격형, 수비형, 올라운더형)별로 분류
        const rolePlayers = { '골키퍼': [], '공격형': [], '수비형': [], '올라운더형': [] };
        attendingPlayers.forEach(p => {
          rolePlayers[getPlayerRoleClassification(p, playerArchiveStats)].push(p);
        });

        // 각 역할별 선수들을 능력치 높은 순으로 정렬 (더 강한 역할 선수를 먼저 배정)
        Object.values(rolePlayers).forEach(list => list.sort((a, b) => ((b.att || 0) + (b.def || 0)) - ((a.att || 0) + (a.def || 0))));

        // 1. 골키퍼 먼저 배정 (각 팀에 1명씩)
        teamNames.forEach(teamName => {
          if (rolePlayers['골키퍼'].length > 0) {
            const gk = rolePlayers['골키퍼'].shift();
            teams[teamName].players.push(gk);
            teams[teamName].goalkeeper = gk.name; // 팀에 골키퍼 지정
          }
        });

        // 2. 나머지 선수들을 역할별 우선순위에 따라 배정
        // 우선순위: 수비형 -> 공격형 -> 올라운더형 (전술적 중요도에 따라 조절 가능)
        ['수비형', '공격형', '올라운더형'].forEach(role => {
          rolePlayers[role].forEach(player => {
            let minDeficit = -Infinity; // 역할 부족 정도 (높을수록 더 필요)
            let bestTeam = '';

            teamNames.forEach(teamName => {
              const currentTeamRoles = { '공격형': 0, '수비형': 0, '올라운더형': 0 };
              teams[teamName].players.forEach(p => {
                // 현재 팀의 선수들이 어떤 역할로 분류되는지 계산
                const pRole = getPlayerRoleClassification(p, playerArchiveStats);
                if (currentTeamRoles[pRole] !== undefined) { // 골키퍼는 이미 배정되었으므로 제외
                  currentTeamRoles[pRole]++;
                }
              });
              
              // 현재 팀이 특정 역할이 얼마나 부족한지 계산 (이상적인 목표 - 현재 인원)
              // 여기서는 일단 각 역할의 선수들이 고르게 분배되도록 함 (평균 인원 - 현재 역할 인원)
              const deficit = (playersToAllocate.length / teamNames.length) - currentTeamRoles[role]; 

              // 가장 많이 부족한 팀, 혹은 비슷한 부족도라면 능력치 합이 낮은 팀
              if (deficit > minDeficit) { // 해당 역할이 더 많이 부족한 팀 우선
                minDeficit = deficit;
                bestTeam = teamName;
              } else if (deficit === minDeficit) { // 부족도가 같다면 밸런스 알고리즘 보조 사용
                const getTeamPower = (t) => teams[t].players.reduce((sum, p) => sum + ((masterPlayers.find(mp => mp.name === p.name) || {att:0, def:0}).att + (masterPlayers.find(mp => mp.name === p.name) || {att:0, def:0}).def), 0);
                if (getTeamPower(teamName) < getTeamPower(bestTeam)) {
                    bestTeam = teamName;
                }
              }
            });
            teams[bestTeam].players.push(player); // 가장 필요한 팀에 선수 추가
          });
        });
        break;

      case 'winLossBalance': // 승패 균형 조정 알고리즘
        Logger.log("팀 배분 알고리즘: 승패 균형 조정");
        const playerWinLossStats = getPlayerStatsFromArchive(); // 선수별 과거 승패 기록 가져오기

        // 선수들을 승률이 낮은 (패배가 많은) 순서대로 정렬
        playersToAllocate.sort((a, b) => {
          const statsA = playerWinLossStats[a.name] || {games: 0, wins: 0, losses: 0};
          const statsB = playerWinLossStats[b.name] || {games: 0, wins: 0, losses: 0};
          
          const winRateA = statsA.games > 0 ? statsA.wins / statsA.games : 0;
          const winRateB = statsB.games > 0 ? statsB.wins / statsB.games : 0;

          // 승률이 낮은 선수를 먼저 배정하여 강한 팀에 배치될 기회를 줍니다.
          return winRateA - winRateB;
        });

        // 밸런스 알고리즘과 유사하게 배정하되, 승률이 낮은 선수에게 더 유리한 팀을 찾아주는 방식
        playersToAllocate.forEach(player => {
          let minTeamPower = Infinity;
          let bestTeam = '';

          teamNames.forEach(teamName => {
            const currentTeamPower = teams[teamName].players.reduce((sum, p) => sum + ((masterPlayers.find(mp => mp.name === p.name) || {att:0, def:0}).att + (masterPlayers.find(mp => mp.name === p.name) || {att:0, def:0}).def), 0);
            const currentTeamPlayerCount = teams[teamName].players.length;

            if (currentTeamPower < minTeamPower) { // 팀 파워가 가장 낮은 팀에 우선 배정
              minTeamPower = currentTeamPower;
              bestTeam = teamName;
            } else if (currentTeamPower === minTeamPower && currentTeamPlayerCount < teams[bestTeam].players.length) {
              bestTeam = teamName; // 파워가 같으면 선수 수가 적은 팀
            }
          });
          teams[bestTeam].players.push(player);
        });
        break;

      default: // random (기본값)
        Logger.log("팀 배분 알고리즘: 랜덤");
        playersToAllocate.sort(() => 0.5 - Math.random()); // 무작위로 섞음
        playersToAllocate.forEach((player, i) => teams[teamNames[i % teamNames.length]].players.push(player)); // 순서대로 배정
        break;
    }

    // 최종적으로 팀 객체에는 선수 이름만 저장되도록 매핑합니다. (UI 로직 호환성)
    // players 배열과 goalkeeper 필드를 유지합니다.
    state.teams = { 
      RED: { players: teams.RED.players.map(p => p.name), goalkeeper: teams.RED.goalkeeper }, 
      BLUE: { players: teams.BLUE.players.map(p => p.name), goalkeeper: teams.BLUE.goalkeeper }, 
      YELLOW: { players: teams.YELLOW.players.map(p => p.name), goalkeeper: teams.YELLOW.goalkeeper } 
    }; 
    state.currentScreen = 'screen-team-allocation'; // 팀 배분 화면으로 전환
    saveAppState(state); // 변경된 상태를 캐시에 저장
    return state; // 최종 상태를 반환합니다.
  });
}

// 경기 시작 함수 (경기 시간 설정 기능 및 구장명 추가)
function startMatch(teamNames, selectedDuration, selectedField) {
  return safeExecute(() => {
    const s = getAppState(); // 현재 앱 상태를 가져옵니다.
    // [오류 수정] teamNames가 유효한 배열인지 확인
    if (!Array.isArray(teamNames) || teamNames.length < 2) {
      Logger.log("오류: startMatch에 유효하지 않은 teamNames가 전달되었습니다.");
      throw new Error("경기 시작을 위한 팀 선택이 올바르지 않습니다.");
    }

    s.currentScreen = 'screen-match-controller'; // 경기 컨트롤러 화면으로 전환합니다.
    // 경기 정보를 초기화하고 설정합니다. (선택된 경기 시간 및 구장명 반영)
    s.match = { 
      count: s.match.count, 
      playingTeams: teamNames, 
      teamA: { name: '', score: 0 }, // 팀 이름은 아래에서 설정
      teamB: { name: '', score: 0 }, // 팀 이름은 아래에서 설정
      timeline: [], 
      seconds: selectedDuration, // 선택된 경기 시간으로 설정
      timerRunning: false, // 타이머 초기에는 정지 상태
      selectedDuration: selectedDuration, // 선택된 경기 시간 저장
      todayHeadToHead: s.match.todayHeadToHead || {}, // 오늘의 상대 전적 초기화 (기존 값 유지)
      field: selectedField // 선택된 구장명 저장
    };
    // 현재 경기 팀A, 팀B 이름 설정
    s.match.teamA.name = teamNames[0];
    s.match.teamB.name = teamNames[1];

    // 현재 참석자 중 세션 통계에 없는 플레이어의 초기 스탯을 설정합니다.
    s.attendingPlayerNames.forEach(pName => {
      if (!s.sessionStats.playerStats[pName]) {
        s.sessionStats.playerStats[pName] = { goal: 0, assist: 0, defense: 0, save: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0 };
      }
    });
    saveAppState(s); // 변경된 상태를 저장합니다.
    return s; // 업데이트된 상태를 반환합니다.
  });
}

// [수정 완료] 이벤트 기록 시 '남은 시간(seconds)'도 함께 받도록 수정된 함수
function recordEvent(eventData, seconds) { // <-- seconds 인자 추가
  return safeExecute(() => {
    const s = getAppState();

    if (!s.match.timerRunning && s.match.seconds > 0) {
      throw new Error("경기가 시작되지 않았거나 일시정지 상태에서는 기록할 수 없습니다. 타이머를 시작해주세요.");
    }
    
    // *** 핵심 수정사항 ***
    // 클라이언트에서 보낸 현재 남은 시간을 서버 상태에 즉시 반영
    if (typeof seconds === 'number' && !isNaN(seconds)) {
        s.match.seconds = seconds;
    }

    const time = new Date().toLocaleTimeString('en-GB');
    s.match.timeline.unshift({ ...eventData, time });

    const { player, stat, teamName, assistPlayer } = eventData;

    if (s.sessionStats.playerStats[player]) {
      if (stat !== 'ownGoal') {
        s.sessionStats.playerStats[player][stat]++;
      }
    }
    if (stat === 'goal' && assistPlayer && s.sessionStats.playerStats[assistPlayer]) {
      s.sessionStats.playerStats[assistPlayer].assist++;
    }
    
    if (stat === 'goal') {
      const [teamToScore, teamToConcede] = teamName === s.match.teamA.name ? [s.match.teamA, s.match.teamB] : [s.match.teamB, s.match.teamA];
      teamToScore.score++;
      s.sessionStats.teamStats[teamToScore.name].goalsFor++;
      s.sessionStats.teamStats[teamToConcede.name].goalsAgainst++;
    } else if (stat === 'ownGoal') {
      const [scoringTeam, concedingTeam] = teamName === s.match.teamA.name ? [s.match.teamB, s.match.teamA] : [s.match.teamA, s.match.teamB];
      scoringTeam.score++;
      s.sessionStats.teamStats[scoringTeam.name].goalsFor++;
      s.sessionStats.teamStats[concedingTeam.name].goalsAgainst++;
    }

    saveAppState(s);
    return s;
  });
}

// 마지막 기록을 되돌리는 함수입니다. (도움, 자살골 되돌리기 포함)
function undoLastEvent() {
  return safeExecute(() => {
    const s = getAppState(); // 현재 앱 상태를 가져옵니다.
    if (s.match.timeline.length === 0) return s; // 타임라인이 비어있으면 변경 없이 반환

    const lastEvent = s.match.timeline.shift(); // 가장 최근 기록을 제거하고 가져옵니다.
    const { player, stat, teamName, assistPlayer } = lastEvent;

    // 선수 개인 스탯 되돌리기
    if (s.sessionStats.playerStats[player]) {
      if (stat === 'ownGoal') {
        // 자살골은 스탯 변경 없었으므로 되돌릴 것도 없음
      } else {
        s.sessionStats.playerStats[player][stat]--;
      }
    }
    // 도움 선수 스탯 되돌리기
    if (stat === 'goal' && assistPlayer && s.sessionStats.playerStats[assistPlayer]) {
      s.sessionStats.playerStats[assistPlayer].assist--;
    }
    
    // 득점일 경우 팀 점수 및 팀 통계 되돌리기
    if (stat === 'goal') {
      const [teamToUndo, teamToRestore] = teamName === s.match.teamA.name ? [s.match.teamA, s.match.teamB] : [s.match.teamB, s.match.teamA];
      teamToUndo.score--; // 점수 감소
      s.sessionStats.teamStats[teamToUndo.name].goalsFor--; // 득점 감소
      s.sessionStats.teamStats[teamToRestore.name].goalsAgainst--; // 실점 감소
    } else if (stat === 'ownGoal') { // 자살골일 경우
      const [scoringTeam, concedingTeam] = teamName === s.match.teamA.name ? [s.match.teamB, s.match.teamA] : [s.match.teamA, s.match.teamB];
      scoringTeam.score--; // 상대 팀 점수 감소
      s.sessionStats.teamStats[scoringTeam.name].goalsFor--; // 상대 팀 득점 감소
      s.sessionStats.teamStats[concedingTeam.name].goalsAgainst--; // 자살골 팀 실점 감소
    }
    saveAppState(s); // 변경된 상태를 저장합니다.
    return s; // 업데이트된 상태를 반환합니다.
  });
}

// 경기 종료 함수입니다. (지난 팀 구성 기록, 클린시트 보너스, 오늘의 상대 전적, 팀별 경기수 업데이트, 다음 경기 자동 설정)
function endMatch() {
  return safeExecute(() => {
    const s = getAppState(); // 현재 앱 상태를 가져옵니다.
    const { teamA, teamB, count } = s.match;
    const teamStats = s.sessionStats.teamStats; // 세션 팀 통계
    const playerStats = s.sessionStats.playerStats; // 세션 선수 통계

    // [오류 수정] teamA.name과 teamB.name이 유효한지 확인
    if (!teamA || !teamA.name || !teamB || !teamB.name) {
      Logger.log("오류: endMatch 함수에 유효하지 않은 팀 정보가 있습니다.");
      throw new Error("경기 종료 처리를 위한 팀 정보가 부족합니다.");
    }

    // 승패 처리
    if (teamA.score === teamB.score) { // 무승부
      teamStats[teamA.name].draws++;
      teamStats[teamB.name].draws++; 
    } else { // 승패 결정
      const winner = teamA.score > teamB.score ? teamA.name : teamB.name;
      const loser = winner === teamA.name ? teamB.name : teamA.name;
      teamStats[winner].wins++; 
      teamStats[loser].losses++;
    }
    
    // [신규] 오늘의 상대 전적 업데이트
    const teamA_name = teamA.name;
    const teamB_name = teamB.name;
    const headToHeadKey = [teamA_name, teamB_name].sort().join('_'); // RED_BLUE, BLUE_YELLOW 등 정렬된 키
    if (!s.match.todayHeadToHead[headToHeadKey]) {
      s.match.todayHeadToHead[headToHeadKey] = { [teamA_name]: { wins: 0, draws: 0, losses: 0 }, [teamB_name]: { wins: 0, draws: 0, losses: 0 } };
    }
    
    // 상대 전적 업데이트
    if (teamA.score === teamB.score) {
      s.match.todayHeadToHead[headToHeadKey][teamA_name].draws++;
      s.match.todayHeadToHead[headToHeadKey][teamB_name].draws++;
    } else {
      const winner = teamA.score > teamB.score ? teamA_name : teamB_name;
      const loser = winner === teamA.name ? teamB.name : teamA.name;
      s.match.todayHeadToHead[headToHeadKey][winner].wins++;
      s.match.todayHeadToHead[headToHeadKey][loser].losses++;
    }

    // [신규] 클린시트 보너스 강화 (1:0, 2:0 승리 시)
    const masterPlayers = getMasterPlayersFromSheet(); // 선수 능력치 가져옴
    const playerArchiveStats = getPlayerStatsFromArchive(); // 선수 과거 기록 가져옴

    if (teamA.score > teamB.score && teamB.score === 0 && (teamA.score === 1 || teamA.score === 2)) { // 팀 A가 1:0 또는 2:0으로 클린시트 승리
      Logger.log(`${teamA.name} 팀 클린시트 보너스 적용 (1:0 또는 2:0 승리)`);
      // 키퍼에게 수비 점수 1점 부여
      const winnerGoalkeeper = s.teams[teamA.name].goalkeeper;
      if (winnerGoalkeeper && playerStats[winnerGoalkeeper]) {
        playerStats[winnerGoalkeeper].defense++;
        Logger.log(`${winnerGoalkeeper} (키퍼) 수비 점수 +1`);
      }
      // 수비형/올라운더형 선수에게 수비 점수 1점 부여
      s.teams[teamA.name].players.forEach(pName => {
        const player = masterPlayers.find(mp => mp.name === pName);
        if (player) {
          const role = getPlayerRoleClassification(player, playerArchiveStats);
          if (role === '수비형' || role === '올라운더형') {
            if (playerStats[pName]) playerStats[pName].defense++;
            Logger.log(`${pName} (${role}) 수비 점수 +1`);
          }
        }
      });
    } else if (teamB.score > teamA.score && teamA.score === 0 && (teamB.score === 1 || teamB.score === 2)) { // 팀 B가 1:0 또는 2:0으로 클린시트 승리
      Logger.log(`${teamB.name} 팀 클린시트 보너스 적용 (1:0 또는 2:0 승리)`);
      // 키퍼에게 수비 점수 1점 부여
      const winnerGoalkeeper = s.teams[teamB.name].goalkeeper;
      if (winnerGoalkeeper && playerStats[winnerGoalkeeper]) {
        playerStats[winnerGoalkeeper].defense++;
        Logger.log(`${winnerGoalkeeper} (키퍼) 수비 점수 +1`);
      }
      // 수비형/올라운더형 선수에게 수비 점수 1점 부여
      s.teams[teamB.name].players.forEach(pName => {
        const player = masterPlayers.find(mp => mp.name === pName);
        if (player) {
          const role = getPlayerRoleClassification(player, playerArchiveStats);
          if (role === '수비형' || role === '올라운더형') {
            if (playerStats[pName]) playerStats[pName].defense++;
            Logger.log(`${pName} (${role}) 수비 점수 +1`);
          }
        }
      });
    }

    // [신규] 세션 내 선수별 경기 수 및 승무패 업데이트 (세션 통계 초기화 명확화)
    const allPlayersInMatch = [...s.teams[teamA.name].players, ...s.teams[teamB.name].players];
    const allGoalkeepersInMatch = [s.teams[teamA.name].goalkeeper, s.teams[teamB.name].goalkeeper].filter(Boolean); // null 제거
    const uniquePlayersInMatch = new Set([...allPlayersInMatch, ...allGoalkeepersInMatch]); // 중복 제거

    uniquePlayersInMatch.forEach(pName => {
      if (!playerStats[pName]) { // 용병 키퍼처럼 처음 등장한 선수일 경우 초기화
        playerStats[pName] = { goal: 0, assist: 0, defense: 0, save: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0 };
      }
      playerStats[pName].gamesPlayed++;
      if (teamA.score === teamB.score) { // 무승부
        if (s.teams[teamA.name].players.includes(pName) || s.teams[teamA.name].goalkeeper === pName) {
          playerStats[pName].draws++;
        } else if (s.teams[teamB.name].players.includes(pName) || s.teams[teamB.name].goalkeeper === pName) {
          playerStats[pName].draws++;
        }
      } else { // 승패 결정
        const winner = teamA.score > teamB.score ? teamA.name : teamB.name;
        const loser = winner === teamA.name ? teamB.name : teamA.name;
        if ((s.teams[winner].players.includes(pName) || s.teams[winner].goalkeeper === pName)) {
          playerStats[pName].wins++;
        } else if ((s.teams[loser].players.includes(pName) || s.teams[loser].goalkeeper === pName)) {
          playerStats[pName].losses++;
        }
      }
    });

    // [신규] 팀별 경기 수 및 연속 경기 수 업데이트
    // 모든 팀의 consecutivePlays를 초기화하고, 현재 경기 팀만 업데이트
    const allTeamNames = ['RED', 'BLUE', 'YELLOW'];
    allTeamNames.forEach(name => {
      if (name === teamA_name || name === teamB_name) {
        teamStats[name].matchesPlayed++;
        teamStats[name].consecutivePlays++; // 현재 경기 팀은 연속 경기 수 증가
      } else {
        teamStats[name].consecutivePlays = 0; // 대기 팀은 연속 경기 수 초기화
      }
    });

    s.match.timerRunning = false; // 타이머 정지 상태로 변경
    s.match.count++; // 다음 경기를 위해 경기 수 증가
    
    // [신규] 현재 경기 팀 구성을 '지난_팀_구성' 시트에 기록합니다.
    const pastTeamsSheet = getSheet(CONFIG.PAST_TEAMS_SHEET);
    const date = Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "yyyy-MM-dd");
    
    // 헤더가 없으면 추가합니다.
    if(pastTeamsSheet.getRange(1,1).getValue() === "") {
      pastTeamsSheet.appendRow(["경기일", "경기번호", "팀명", "키퍼", "선수1", "선수2", "선수3", "선수4", "선수5", "선수6", "선수7"]); // 키퍼 컬럼 추가
      Logger.log("헤더 추가: 지난_팀_구성 시트");
    }

    // 경기 참여 팀들 (teamA, teamB)의 선수 목록을 기록합니다.
    [s.match.teamA.name, s.match.teamB.name].forEach(teamName => {
      const playersInTeam = s.teams[teamName].players; // 해당 팀의 선수 목록 (이름만)
      const goalkeeperInTeam = s.teams[teamName].goalkeeper; // 해당 팀의 키퍼 (이름만)
      if (playersInTeam.length > 0 || goalkeeperInTeam) { // 선수가 있거나 키퍼가 지정되어 있으면 기록
        pastTeamsSheet.appendRow([date, count - 1, teamName, goalkeeperInTeam || '', ...playersInTeam]); // 키퍼 정보 포함
        Logger.log(`지난_팀_구성 기록 완료: ${teamName} - 경기 #${count - 1}`);
      }
    });

    // --- 다음 경기 자동 설정 로직 ---
    const currentPlayingTeams = [teamA_name, teamB_name];
    const waitingTeam = allTeamNames.find(name => !currentPlayingTeams.includes(name)); // 대기 중인 팀

    // 1. 3경기 연속 경기 체크
    let consecutivePlayedTeam = null;
    if (teamStats[teamA_name].consecutivePlays >= 3) {
      consecutivePlayedTeam = teamA_name;
    } else if (teamStats[teamB_name].consecutivePlays >= 3) {
      consecutivePlayedTeam = teamB_name;
    }

    if (consecutivePlayedTeam) {
      // 3경기 연속 경기 모달을 띄우도록 상태 변경
      s.currentScreen = 'screen-match-controller'; // 일단 현재 화면 유지
      s.match.nextMatchSuggestion = {
        type: 'consecutive',
        team: consecutivePlayedTeam,
        suggestedTeams: allTeamNames.filter(t => t !== consecutivePlayedTeam) // 3연속 뛴 팀을 제외한 나머지 두 팀
      };
      Logger.log(`3경기 연속 경기 알림: ${consecutivePlayedTeam} 팀`);
    } else if (teamA.score === teamB.score) { // 2. 무승부일 경우
      // 무승부 시 다음 경기 팀 선택 모달을 띄우도록 상태 변경
      s.currentScreen = 'screen-match-controller'; // 일단 현재 화면 유지
      s.match.nextMatchSuggestion = {
        type: 'draw',
        drawingTeams: [teamA_name, teamB_name],
        waitingTeam: waitingTeam
      };
      Logger.log(`무승부: 다음 경기 팀 선택 필요`);
    } else { // 3. 승패가 결정되었을 경우 (자동 다음 경기)
      const winner = teamA.score > teamB.score ? teamA_name : teamB_name;
      const nextPlayingTeams = [winner, waitingTeam].filter(Boolean); // 승리 팀과 대기 팀

      // 다음 경기를 진행할 팀이 2팀 미만이면 경기 선택 화면으로 이동
      if (nextPlayingTeams.length < 2) {
        s.currentScreen = 'screen-match-select';
        Logger.log("다음 경기 진행할 팀이 부족하여 경기 선택 화면으로 이동.");
      } else {
        s.match.playingTeams = nextPlayingTeams;
        s.match.teamA = { name: nextPlayingTeams[0], score: 0 };
        s.match.teamB = { name: nextPlayingTeams[1], score: 0 };
        s.match.timeline = []; // 타임라인 초기화
        s.match.seconds = s.match.selectedDuration; // 시간 초기화
        s.match.timerRunning = false; // 타이머 정지
        s.currentScreen = 'screen-match-controller';
        Logger.log(`다음 경기 자동 설정: ${nextPlayingTeams[0]} vs ${nextPlayingTeams[1]}`);
      }
    }
    
    saveAppState(s); // 변경된 상태를 저장합니다.
    return s; // 업데이트된 상태를 반환합니다.
  });
}

// 타이머 상태를 저장하는 함수입니다. (남은 시간 업데이트 기능 추가)
function toggleTimerState(running, seconds) { // 👈 1. seconds 파라미터가 추가되었습니다.
  return safeExecute(() => {
    const state = getAppState(); // 현재 앱 상태를 가져옵니다.
    state.match.timerRunning = running; // 타이머 실행 상태 업데이트
    
    // 👇 2. 이 if 문이 새로 추가되었습니다.
    // seconds 값이 유효한 숫자로 전달된 경우에만 업데이트합니다.
    if (typeof seconds === 'number' && !isNaN(seconds)) {
        state.match.seconds = seconds;
    }

    saveAppState(state); // 변경된 상태 저장
    return state; // 업데이트된 상태를 반환합니다.
  });
}
// [신규] 특정 팀의 골키퍼를 지정하는 함수입니다.
// teamName: 키퍼를 지정할 팀의 이름 (RED, BLUE, YELLOW)
// goalkeeperName: 키퍼로 지정할 선수의 이름 (어떤 팀 소속이든 가능)
function setGoalkeeper(teamName, goalkeeperName) {
  return safeExecute(() => {
    const state = getAppState(); // 현재 앱 상태를 가져옵니다.
    
    // [오류 수정] teamName이 유효한지 확인
    if (!state.teams[teamName]) {
      Logger.log(`오류: 존재하지 않는 팀 이름입니다: ${teamName}`);
      throw new Error(`존재하지 않는 팀 이름입니다: ${teamName}`);
    }

    // 지정할 선수가 참석자 목록에 있는지 확인 (필수는 아니지만, 에러 방지)
    if (goalkeeperName && !state.attendingPlayerNames.includes(goalkeeperName)) {
      Logger.log(`경고: ${goalkeeperName} 선수는 참석자 목록에 없습니다. 키퍼로 지정합니다.`);
      // 참석자 목록에 없어도 키퍼로 지정은 가능하게 하되, 경고 로그 남김
      // 필요시 throw new Error("참석자 목록에 없는 선수는 키퍼로 지정할 수 없습니다.") 로 변경 가능
    }

    // 해당 팀의 골키퍼를 지정합니다.
    state.teams[teamName].goalkeeper = goalkeeperName;
    Logger.log(`${teamName} 팀의 키퍼가 ${goalkeeperName || '미지정'} (으)로 지정되었습니다.`);

    saveAppState(state); // 변경된 상태를 저장합니다.
    return state; // 업데이트된 상태를 반환합니다.
  });
}

// [수정된 substitutePlayer 함수]
function substitutePlayer(teamName, playerOutName, playerInName) {
    return safeExecute(() => {
        const state = getAppState();
        const teamPlayers = state.teams[teamName].players;
        const playerOutIndex = teamPlayers.indexOf(playerOutName);
        if (playerOutIndex === -1) {
            Logger.log(`오류: ${playerOutName} 선수는 ${teamName} 팀의 필드 플레이어에 없습니다.`);
            throw new Error(`${playerOutName} 선수는 ${teamName} 팀의 필드 플레이어에 없습니다.`);
        }

        if (playerInName) {
            // 교체 투입할 선수가 다른 팀에 있는지 확인
            const allTeamNames = ['RED', 'BLUE', 'YELLOW'];
            let otherTeamName = null;
            let otherTeamPlayerIndex = -1;
            let isGoalkeeper = false;

            allTeamNames.forEach(tName => {
                if (tName !== teamName) {
                    // 필드 플레이어에서 찾기
                    const index = state.teams[tName].players.indexOf(playerInName);
                    if (index !== -1) {
                        otherTeamName = tName;
                        otherTeamPlayerIndex = index;
                    }
                    // 골키퍼에서 찾기
                    if (state.teams[tName].goalkeeper === playerInName) {
                        otherTeamName = tName;
                        isGoalkeeper = true;
                    }
                }
            });

            // 교체 투입할 선수가 다른 팀에 있다면,
            if (otherTeamName) {
                // 기존 선수와 교체
                if (isGoalkeeper) {
                    // 교체 투입 선수가 키퍼일 경우
                    state.teams[otherTeamName].goalkeeper = playerOutName;
                } else {
                    // 교체 투입 선수가 필드 플레이어일 경우
                    state.teams[otherTeamName].players[otherTeamPlayerIndex] = playerOutName;
                }
                Logger.log(`${otherTeamName} 팀의 ${playerInName} 선수가 ${playerOutName} 선수로 교체되었습니다.`);
            } else {
                // 교체 투입 선수가 대기 중인 선수일 경우
                const waitingPlayerIndex = state.attendingPlayerNames.indexOf(playerInName);
                if (waitingPlayerIndex !== -1) {
                    state.attendingPlayerNames.splice(waitingPlayerIndex, 1);
                }
                state.attendingPlayerNames.push(playerOutName);
                Logger.log(`${playerInName} 선수가 대기 선수에서 ${teamName} 팀으로 이동했습니다.`);
            }

            // 기존 팀 선수 교체
            teamPlayers[playerOutIndex] = playerInName;

            Logger.log(`${teamName} 팀에서 ${playerOutName} 선수가 ${playerInName} 선수로 교체되었습니다.`);
        } else {
            // 들어올 선수가 null인 경우 (단순히 선수 제거)
            teamPlayers.splice(playerOutIndex, 1);
            Logger.log(`${teamName} 팀에서 ${playerOutName} 선수가 제거되었습니다.`);
        }

        saveAppState(state);
        return state;
    });
}

// [신규] 무승부 시 다음 경기를 진행할 팀을 선택하는 함수
function selectNextPlayingTeam(selectedTeamName) {
  return safeExecute(() => {
    const s = getAppState();
    const { teamA, teamB } = s.match;
    const allTeamNames = ['RED', 'BLUE', 'YELLOW'];
    const waitingTeam = allTeamNames.find(name => name !== teamA.name && name !== teamB.name);

    // [오류 수정] selectedTeamName이 유효한지 확인
    if (!allTeamNames.includes(selectedTeamName)) {
      Logger.log(`오류: 유효하지 않은 팀 이름입니다: ${selectedTeamName}`);
      throw new Error("유효하지 않은 팀 이름입니다.");
    }
    
    const nextPlayingTeams = [selectedTeamName, waitingTeam].filter(Boolean);

    if (nextPlayingTeams.length < 2) {
      s.currentScreen = 'screen-match-select'; // 팀이 부족하면 경기 선택 화면으로
      Logger.log("다음 경기 진행할 팀이 부족하여 경기 선택 화면으로 이동.");
    } else {
      s.match.playingTeams = nextPlayingTeams;
      s.match.teamA = { name: nextPlayingTeams[0], score: 0 };
      s.match.teamB = { name: nextPlayingTeams[1], score: 0 };
      s.match.timeline = []; // 타임라인 초기화
      s.match.seconds = s.match.selectedDuration; // 시간 초기화
      s.match.timerRunning = false; // 타이머 정지
      s.currentScreen = 'screen-match-controller';
      Logger.log(`무승부 후 다음 경기 설정: ${nextPlayingTeams[0]} vs ${nextPlayingTeams[1]}`);
    }
    s.match.nextMatchSuggestion = null; // 제안 초기화
    saveAppState(s);
    return s;
  });
}

// [신규] 3경기 연속 경기 후 다음 경기 진행 여부 확인 함수
function confirmNextMatch(confirmProceed) {
  return safeExecute(() => {
    const s = getAppState();
    // [오류 수정] s.match.nextMatchSuggestion이 유효한지 확인
    if (!s.match.nextMatchSuggestion || !s.match.nextMatchSuggestion.team) {
      Logger.log("오류: confirmNextMatch 함수 호출 시 다음 경기 제안 정보가 유효하지 않습니다.");
      throw new Error("다음 경기 제안 정보를 찾을 수 없습니다.");
    }

    const allTeamNames = ['RED', 'BLUE', 'YELLOW'];
    const consecutivePlayedTeam = s.match.nextMatchSuggestion.team; // 3연속 뛴 팀
    
    // 3연속 뛴 팀을 제외한 나머지 두 팀을 찾음
    const suggestedNextTeams = allTeamNames.filter(name => name !== consecutivePlayedTeam);

    if (confirmProceed) { // '예'를 선택한 경우 (나머지 두 팀이 경기)
      if (suggestedNextTeams.length < 2) { // 혹시 모를 경우 (팀이 2개 이하일 때)
        s.currentScreen = 'screen-match-select';
        Logger.log("3연속 경기 후 강제 설정할 팀이 부족하여 경기 선택 화면으로 이동.");
      } else {
        s.match.playingTeams = suggestedNextTeams;
        s.match.teamA = { name: suggestedNextTeams[0], score: 0 };
        s.match.teamB = { name: suggestedNextTeams[1], score: 0 };
        s.match.timeline = []; // 타임라인 초기화
        s.match.seconds = s.match.selectedDuration; // 시간 초기화
        s.match.timerRunning = false; // 타이머 정지
        s.currentScreen = 'screen-match-controller';
        Logger.log(`3연속 경기 후 다음 경기 강제 설정: ${suggestedNextTeams[0]} vs ${suggestedNextTeams[1]}`);
      }
    } else { // '아니오'를 선택한 경우 (경기 선택 화면으로 이동)
      s.currentScreen = 'screen-match-select';
      Logger.log("3연속 경기 후 사용자 선택에 따라 경기 선택 화면으로 이동.");
    }
    s.match.nextMatchSuggestion = null; // 제안 초기화
    saveAppState(s);
    return s;
  });
}

// [신규] 세션 종료 시 최종 결과 계산 및 요약 화면으로 이동하는 함수
function finishSessionToSummary() {
  return safeExecute(() => {
    const s = getAppState();
    const playerStats = s.sessionStats.playerStats;
    const masterPlayers = getMasterPlayersFromSheet(); // 선수 능력치 가져옴
    const playerArchiveStats = getPlayerStatsFromArchive(); // 선수 과거 기록 가져옴

    // MVP, 최우수 수비수, 최우수 골키퍼 선정
    let mvp = null;
    let maxMvPScore = -1;
    let bestDefender = null;
    let maxDefense = -1;
    let bestGoalkeeper = null;
    let maxSave = -1;

    Object.keys(playerStats).forEach(pName => {
      const stats = playerStats[pName];
      const mvpScore = (stats.goal * 3) + (stats.assist * 3) + (stats.defense * 1) + (stats.save * 1);
      
      // MVP
      if (mvpScore > maxMvPScore) {
        maxMvPScore = mvpScore;
        mvp = pName;
      }

      // 최우수 수비수 (수비형/올라운더형 중 수비 기록이 가장 높은 선수)
      const playerInfo = masterPlayers.find(mp => mp.name === pName);
      if (playerInfo) {
        const role = getPlayerRoleClassification(playerInfo, playerArchiveStats);
        if ((role === '수비형' || role === '올라운더형') && stats.defense > maxDefense) {
          maxDefense = stats.defense;
          bestDefender = pName;
        }
      }
      
      // 최우수 골키퍼 (골키퍼 포지션 또는 선방 기록이 가장 높은 선수)
      if (stats.save > maxSave) {
        maxSave = stats.save;
        bestGoalkeeper = pName;
      }
    });

    // MVP, 최우수 수비수, 최우수 골키퍼는 유의미한 기록이 있을 때만 선정
    if (maxMvPScore === 0) mvp = null;
    if (maxDefense === 0) bestDefender = null;
    if (maxSave === 0) bestGoalkeeper = null;


    s.sessionResults = {
      mvp: mvp,
      bestDefender: bestDefender,
      bestGoalkeeper: bestGoalkeeper
    };
    s.currentScreen = 'screen-session-summary';
    saveAppState(s);
    return s;
  });
}

// [수정 완료] 세션 기록을 개인 기록 시트에 '추가'하고 새 세션을 시작하는 함수
function updateAndArchiveSession() {
  return safeExecute(() => {
    const state = getAppState();
    const archiveSheet = getSheet(CONFIG.PLAYER_ARCHIVE_SHEET);
    const date = Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), "yyyy-MM-dd");
    
    // 오늘 경기를 뛴 선수들의 기록만 추출해서 '추가'할 배열을 만듭니다.
    const rowsToAdd = Object.keys(state.sessionStats.playerStats)
      .filter(pName => state.sessionStats.playerStats[pName].gamesPlayed > 0) // 경기를 뛴 선수만 저장
      .map(pName => {
        const stat = state.sessionStats.playerStats[pName];
        // 시트 헤더 순서: 경기일, 선수명, 경기수, 승, 무, 패, 득점, 도움, 수비, 선방
        return [
          date,
          pName,
          stat.gamesPlayed,
          stat.wins,
          stat.draws,
          stat.losses,
          stat.goal,
          stat.assist,
          stat.defense,
          stat.save
        ];
      });
      
    // 추가할 기록이 있을 경우에만 시트 마지막에 한 번에 추가합니다.
    if(rowsToAdd.length > 0) {
      archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
      SpreadsheetApp.flush(); // 변경사항 즉시 반영
      Logger.log(`${rowsToAdd.length}명의 선수 기록을 시트에 추가했습니다.`);
    }
    
    // 기록 저장 후 세션을 초기화하고 새로운 초기 상태를 반환합니다.
    CACHE.remove(CACHE_KEY);
    return getAppState();
  });
}

// [신규] 세션 내 선수 개인 스탯을 업데이트하는 함수 (기록 수정 화면에서 사용)
function updateSessionPlayerStats(playerName, statType, newValue) {
  return safeExecute(() => {
    const s = getAppState();
    if (s.sessionStats.playerStats[playerName]) {
      const oldValue = s.sessionStats.playerStats[playerName][statType];
      s.sessionStats.playerStats[playerName][statType] = Number(newValue) || 0;

      // 득점/실점 연동 로직
      if (statType === 'goal') {
        const diff = (Number(newValue) || 0) - oldValue;
        // 이 로직은 해당 선수가 특정 팀에 속했다는 가정이 필요 (현재는 이 정보가 세션 스탯에 직접 없음)
        // 가장 최근의 경기에서 해당 선수가 속했던 팀의 득실차를 추적해야 하지만,
        // 여기서는 해당 선수가 어느 팀에 속했었는지 직접적인 연결이 없으므로,
        // 세션 내 팀별 득실점은 '경기 종료' 시점에만 업데이트하는 것이 현실적입니다.
        // 따라서 기록 수정 화면에서 '골' 스탯을 직접 수정하는 경우, 팀의 득실점은 자동 업데이트되지 않습니다.
        // 이는 UI/UX 설계 시 사용자가 이해하도록 안내해야 할 부분입니다.
        // (현재는 updateSessionPlayerStats에서 teamNameForGoalUpdate를 받지 않으므로 연동 로직은 비활성화)
      }
      
    }
    saveAppState(s);
    return s;
  });
}
