#!/usr/bin/env node
/*
  PlayTime - Visual Baseline Screenshot Helper (Playwright)
  - Starts a local server if needed (http-server on port 3000)
  - Captures baseline screenshots for desktop/tablet in light/dark
  - Also captures confidence state variants (green/amber/red)

  Usage:
    npm run screenshots

  Env:
    PLAYTIME_BASE_URL=http://localhost:3000  (optional)
*/

import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import http from 'node:http';
import { chromium } from 'playwright';

const OUT_DIR = 'docs/screenshots';
const PORT = 3000;
const BASE_URL = process.env.PLAYTIME_BASE_URL || `http://localhost:${PORT}`;
const SERVER_CMD = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let serverProc = null;

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function isServerUp(url) {
  return new Promise(resolve => {
    const req = http.get(url, res => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function startServerIfNeeded() {
  const up = await isServerUp(BASE_URL);
  if (up) return false;
  serverProc = spawn(SERVER_CMD, ['http-server', '.', '-p', String(PORT)], {
    stdio: 'ignore',
    shell: false,
  });
  // wait for port to open
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (await isServerUp(BASE_URL)) return true;
    await wait(300);
  }
  throw new Error('Failed to start dev server for screenshots');
}

async function stopServerIfStarted() {
  if (serverProc) {
    try { serverProc.kill(); } catch (_) {}
  }
}

async function capture() {
  ensureDir(OUT_DIR);
  const startedByScript = await startServerIfNeeded();

  const combos = [
    { name: 'desktop-light', width: 1440, height: 900, theme: 'light' },
    { name: 'desktop-dark',  width: 1440, height: 900, theme: 'dark'  },
    { name: 'tablet-light',  width: 1024, height: 768, theme: 'light' },
    { name: 'tablet-dark',   width: 1024, height: 768, theme: 'dark'  },
  ];

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 1 });

  for (const c of combos) {
    const page = await context.newPage();
    await page.setViewportSize({ width: c.width, height: c.height });
    const url = c.theme === 'dark' ? `${BASE_URL}/?theme=dark` : `${BASE_URL}/`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for app to render core UI
    await page.waitForSelector('#app');
    // allow theme + icons to settle
    await wait(200);

    // Base screenshot
    await page.screenshot({ path: `${OUT_DIR}/${c.name}.png` });

    // Confidence states (best-effort; skip if controls missing)
    const states = [
      { id: '#color-green',  suffix: 'green' },
      { id: '#color-amber',  suffix: 'amber' },
      { id: '#color-red',    suffix: 'red' },
    ];
    for (const s of states) {
      try {
        await page.click(s.id, { timeout: 1000 });
        await wait(100);
        await page.screenshot({ path: `${OUT_DIR}/${c.name}-${s.suffix}.png` });
      } catch (_) { /* controls may not exist yet; ignore */ }
    }

    await page.close();
  }

  await context.close();
  await browser.close();
  await stopServerIfStarted();
}

capture().catch(async (err) => {
  console.error('Screenshot capture failed:', err.message);
  await stopServerIfStarted();
  process.exit(1);
});
