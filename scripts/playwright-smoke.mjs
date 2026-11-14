#!/usr/bin/env node
/**
 * MCP 없이 쓰는 JMFC 목업 스모크 (에이전트/로컬 공용).
 * Usage: node scripts/playwright-smoke.mjs [url]
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const CANDIDATES = [
  'design-preview/jmfc-compact/index.html',
  'design-preview/jmfc-session/index.html',
  'design-preview/jmfc-mockup.html',
  'live/index.html',
];
const MOCK = CANDIDATES.map((p) => join(process.cwd(), p)).find((p) => existsSync(p));
const argUrl = process.argv[2];

function contentType(p) {
  return ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' })[extname(p)] || 'application/octet-stream';
}

async function serveLocalMock() {
  if (!MOCK) throw new Error('no mock html found under design-preview/ or live/');
  const html = readFileSync(MOCK);
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': contentType('.html') });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}/` };
}

const local = argUrl ? null : await serveLocalMock();
const url = argUrl || local.url;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(800);
const title = await page.title();
const hasMock = await page.locator('text=MOCK').count().catch(() => 0);
const hasHamburger = await page.locator('.hamburger, [data-act="toggle-drawer"]').count().catch(() => 0);
const toast = await page.locator('#toast').innerText().catch(() => '');

console.log(JSON.stringify({
  ok: errors.length === 0,
  url,
  title,
  hasMock: !!hasMock,
  hasHamburger: !!hasHamburger,
  toast: (toast || '').slice(0, 120),
  pageErrors: errors.slice(0, 5),
}, null, 2));

await browser.close();
if (local) local.server.close();
process.exit(errors.length ? 1 : 0);
