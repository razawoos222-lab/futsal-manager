/**
 * Google Spreadsheet in-memory mock for harness tests.
 */
export class SpreadsheetStore {
  constructor() {
    /** @type {Map<string, string[][]>} */
    this.sheets = new Map();
  }

  ensureSheet(name) {
    if (!this.sheets.has(name)) {
      this.sheets.set(name, [['']]);
    }
    return this.sheets.get(name);
  }

  clearSheet(name) {
    this.sheets.set(name, [['']]);
  }

  getSheetData(name) {
    return this.ensureSheet(name);
  }
}

function colToIndex(col) {
  let n = 0;
  for (let i = 0; i < col.length; i++) {
    n = n * 26 + (col.charCodeAt(i) - 64);
  }
  return n - 1;
}

function parseA1(a1) {
  const m = String(a1).match(/^([A-Z]+)(\d+)$/i);
  if (!m) throw new Error(`Invalid A1: ${a1}`);
  return { row: parseInt(m[2], 10) - 1, col: colToIndex(m[1].toUpperCase()) };
}

function growGrid(grid, minRows, minCols) {
  while (grid.length < minRows) grid.push([]);
  for (const row of grid) {
    while (row.length < minCols) row.push('');
  }
}

export class MockRange {
  constructor(store, sheetName, startRow, startCol, numRows, numCols) {
    this.store = store;
    this.sheetName = sheetName;
    this.startRow = startRow;
    this.startCol = startCol;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  _grid() {
    return this.store.ensureSheet(this.sheetName);
  }

  getValue() {
    const grid = this._grid();
    return grid[this.startRow]?.[this.startCol] ?? '';
  }

  setValue(v) {
    const grid = this._grid();
    growGrid(grid, this.startRow + 1, this.startCol + 1);
    grid[this.startRow][this.startCol] = v;
  }

  getValues() {
    const grid = this._grid();
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const row = [];
      for (let c = 0; c < this.numCols; c++) {
        row.push(grid[this.startRow + r]?.[this.startCol + c] ?? '');
      }
      out.push(row);
    }
    return out;
  }

  setValues(values) {
    const grid = this._grid();
    const endRow = this.startRow + values.length;
    const endCol = this.startCol + (values[0]?.length ?? 0);
    growGrid(grid, endRow, endCol);
    values.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        grid[this.startRow + ri][this.startCol + ci] = cell;
      });
    });
  }
}

export class MockSheet {
  constructor(store, name) {
    this.store = store;
    this.name = name;
  }

  getName() {
    return this.name;
  }

  getLastRow() {
    const grid = this.store.ensureSheet(this.name);
    for (let i = grid.length - 1; i >= 0; i--) {
      if (grid[i].some((c) => c !== '' && c != null)) return i + 1;
    }
    return 0;
  }

  getLastColumn() {
    const grid = this.store.ensureSheet(this.name);
    let max = 0;
    for (const row of grid) {
      for (let c = row.length - 1; c >= 0; c--) {
        if (row[c] !== '' && row[c] != null) {
          max = Math.max(max, c + 1);
          break;
        }
      }
    }
    return max;
  }

  getRange(a, b, c, d) {
    if (typeof a === 'string') {
      const { row, col } = parseA1(a);
      return new MockRange(this.store, this.name, row, col, 1, 1);
    }
    const startRow = a - 1;
    const startCol = b - 1;
    const numRows = c;
    const numCols = d;
    return new MockRange(this.store, this.name, startRow, startCol, numRows, numCols);
  }

  clear() {
    this.store.clearSheet(this.name);
  }

  appendRow(row) {
    const grid = this.store.ensureSheet(this.name);
    const last = this.getLastRow();
    const startRow = last === 0 ? 0 : last;
    growGrid(grid, startRow + 1, row.length);
    row.forEach((cell, i) => {
      grid[startRow][i] = cell;
    });
  }
}
