/**
 * JMFC 감독기록 백필 도우미
 * 1) 스프레드시트에 이 스크립트를 붙이거나 기존 매니저 Code.gs에 추가
 * 2) coach_archive_backfill.csv 내용을 COACH_ROWS 에 붙여넣거나,
 *    Drive에 올린 CSV 파일 ID로 importCoachArchiveFromCsvFile_(fileId) 실행
 * 3) 시트 이름: 기록실_감독기록
 * 4) Stats 순위표에 감독 탭을 넣으려면 getCoachLeaderboard(period) 를 호출하세요.
 */

var COACH_ARCHIVE_SHEET_NAME = '기록실_감독기록';

function ensureCoachArchiveSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(COACH_ARCHIVE_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(COACH_ARCHIVE_SHEET_NAME);
  if (sheet.getLastRow() < 1 || sheet.getRange(1, 1).getValue() === '') {
    sheet.clear();
    sheet.appendRow(['경기일', '감독명', '팀명', '경기수', '승', '무', '패', '득점', '실점']);
  }
  return sheet;
}

/** CSV 텍스트(헤더 포함)를 기록실_감독기록에 덮어쓰기 */
function importCoachArchiveFromCsvText(csvText) {
  var sheet = ensureCoachArchiveSheet_();
  var rows = Utilities.parseCsv(csvText);
  if (!rows || rows.length < 2) throw new Error('CSV 데이터가 비어 있습니다.');
  sheet.clear();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  SpreadsheetApp.flush();
  return { success: true, rows: rows.length - 1 };
}

/**
 * period: 'all' | '2026-Q1' | '2026-Q2' | '2026-Q3' | '2026-Q4'
 * Stats 순위표에서 google.script.run.getCoachLeaderboard(period) 로 사용
 */
function getCoachLeaderboard(period) {
  period = period || 'all';
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(COACH_ARCHIVE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var by = {};
  values.forEach(function (row) {
    var d = row[0];
    if (!d) return;
    if (Object.prototype.toString.call(d) === '[object Date]') {
      // ok
    } else {
      d = new Date(d);
    }
    if (isNaN(d.getTime())) return;
    var q = d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1);
    if (period !== 'all' && q !== period) return;

    var name = row[1];
    if (!name) return;
    if (!by[name]) by[name] = { name: name, sessions: 0, games: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 };
    var s = by[name];
    s.sessions += 1;
    s.games += Number(row[3]) || 0;
    s.wins += Number(row[4]) || 0;
    s.draws += Number(row[5]) || 0;
    s.losses += Number(row[6]) || 0;
    s.gf += Number(row[7]) || 0;
    s.ga += Number(row[8]) || 0;
  });

  return Object.keys(by).map(function (k) {
    var s = by[k];
    var decided = s.wins + s.losses;
    s.gd = s.gf - s.ga;
    s.pts = s.wins * 3 + s.draws;
    s.wr = decided > 0 ? Math.round((s.wins / decided) * 1000) / 10 : null;
    return s;
  }).sort(function (a, b) {
    return (b.pts - a.pts) || (b.gd - a.gd) || ((b.wr || 0) - (a.wr || 0)) || String(a.name).localeCompare(String(b.name), 'ko');
  });
}
