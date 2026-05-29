import { SpreadsheetStore, MockSheet } from './spreadsheet-store.js';

/**
 * @param {SpreadsheetStore} store
 */
export function installGasMocks(store) {
  const spreadsheet = {
    getSpreadsheetTimeZone: () => 'Asia/Seoul',
    getSheetByName: (name) => {
      store.ensureSheet(name);
      return new MockSheet(store, name);
    },
    insertSheet: (name) => {
      store.ensureSheet(name);
      return new MockSheet(store, name);
    },
  };

  const getSpreadsheet = () => spreadsheet;

  globalThis.SpreadsheetApp = {
    getActiveSpreadsheet: getSpreadsheet,
    getActive: getSpreadsheet,
    flush: () => {},
  };

  globalThis.LockService = {
    getScriptLock: () => ({
      waitLock: () => {},
      releaseLock: () => {},
    }),
  };

  globalThis.Utilities = {
    formatDate: (date, _tz, pattern) => {
      const d = date instanceof Date ? date : new Date(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      if (pattern === 'yyyy-MM-dd') return `${y}-${m}-${day}`;
      return d.toISOString();
    },
  };

  globalThis.HtmlService = {
    createHtmlOutputFromFile: (name) => ({
      setTitle: (title) => ({ file: name, title }),
    }),
  };

  globalThis.console = globalThis.console || {
    log: () => {},
    warn: () => {},
    error: () => {},
  };
}

export function resetGasMocks() {
  delete globalThis.SpreadsheetApp;
  delete globalThis.LockService;
  delete globalThis.Utilities;
  delete globalThis.HtmlService;
}
