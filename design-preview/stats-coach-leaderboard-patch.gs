/**
 * JMFC Stats 앱(Apps Script)에 붙이는 감독 순위 패치
 *
 * 구조
 * - 원본(매니저) 시트: 1leKbnUoUy2gCO-0O-xWAa07mE7q68aXnflnhbaL2tBk
 * - Stats 시트:       1A_rY2T1Tk1G5_tQq6SxNSxr7k330bHqD4rXCElS1BiA  ← 이 웹앱이 읽는 쪽
 *
 * 시트에만 데이터를 넣으면 HTML에는 자동 반영되지 않습니다.
 * 아래 함수를 Stats 프로젝트 Code.gs에 추가하고,
 * index.html 순위표에 감독 카드를 넣은 뒤 "새 버전 배포"가 필요합니다.
 *
 * 전제: Stats 시트에 '기록실_감독기록' 탭이 있고
 * 헤더 = 경기일,감독명,팀명,경기수,승,무,패,득점,실점
 */

var COACH_ARCHIVE_SHEET = '기록실_감독기록';

function quarterKey_(d) {
  var dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.getFullYear() + '-Q' + (Math.floor(dt.getMonth() / 3) + 1);
}

function getCoachArchiveRows_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(COACH_ARCHIVE_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
}

/**
 * period: 'all' | '2026-Q1' ...
 * 반환: { winrate:[{name,winRate,wins,losses,games}], points:[...], gd:[...], goals:[...] }
 * Stats Leaderboards.renderLeaderboards 가 기대하는 카테고리 키에 맞춤
 */
function getCoachLeaderboardsData(period) {
  period = period || 'all';
  var rows = getCoachArchiveRows_();
  var by = {};

  rows.forEach(function (row) {
    var name = row[1];
    if (!name) return;
    var q = quarterKey_(row[0]);
    if (period !== 'all' && q !== period) return;
    if (!by[name]) {
      by[name] = { name: String(name), sessions: 0, games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
    }
    var s = by[name];
    s.sessions += 1;
    s.games += Number(row[3]) || 0;
    s.wins += Number(row[4]) || 0;
    s.draws += Number(row[5]) || 0;
    s.losses += Number(row[6]) || 0;
    s.goalsFor += Number(row[7]) || 0;
    s.goalsAgainst += Number(row[8]) || 0;
  });

  var list = Object.keys(by).map(function (k) {
    var s = by[k];
    var decided = s.wins + s.losses;
    s.gd = s.goalsFor - s.goalsAgainst;
    s.points = s.wins * 3 + s.draws;
    s.winRate = decided > 0 ? (s.wins / decided) : 0; // Stats 선수 승률과 같이 0~1
    s.goals = s.goalsFor;
    return s;
  });

  function top(sorted) {
    return sorted.slice(0, 10).map(function (s) {
      return {
        name: s.name,
        winRate: s.winRate,
        points: s.points,
        goals: s.goals,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        gd: s.gd,
        games: s.games,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        sessions: s.sessions,
        value: null
      };
    });
  }

  return {
    // 기존 선수 카테고리와 충돌 피하려고 coach 접두 키 사용 권장
    coachWinrate: top(list.slice().sort(function (a, b) { return (b.winRate - a.winRate) || (b.points - a.points); })),
    coachPoints: top(list.slice().sort(function (a, b) { return (b.points - a.points) || (b.gd - a.gd); })),
    coachGd: top(list.slice().sort(function (a, b) { return (b.gd - a.gd) || (b.points - a.points); })),
    coachGoals: top(list.slice().sort(function (a, b) { return (b.goalsFor - a.goalsFor) || (b.points - a.points); })),
    // 필요하면 기존 getLeaderboardsData 결과에 Object.assign 으로 합치세요.
  };
}

/**
 * 기존 getLeaderboardsData(period) 를 이미 쓰고 있다면, 아래처럼 합치면 됩니다.
 *
 * function getLeaderboardsData(period) {
 *   var playerBoards = getPlayerLeaderboardsData_(period); // 기존 로직
 *   var coachBoards = getCoachLeaderboardsData(period);
 *   return Object.assign({}, playerBoards, coachBoards);
 * }
 */
