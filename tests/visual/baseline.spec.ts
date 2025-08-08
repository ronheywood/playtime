import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function gotoTheme(page, theme: 'light' | 'dark', size: {w:number; h:number}) {
  await page.setViewportSize({ width: size.w, height: size.h });
  const url = theme === 'dark' ? '/?theme=dark' : '/';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app');
  // allow lucide + theme to settle
  await page.waitForTimeout(150);
}

const sizes = {
  desktop: { w: 1440, h: 900 },
  tablet:  { w: 1024, h: 768 },
};

for (const [label, size] of Object.entries(sizes)) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${label} ${theme} - base`, async ({ page }) => {
      await gotoTheme(page, theme, size);
      await expect(page).toHaveScreenshot(`${label}-${theme}.png`, {
        maxDiffPixelRatio: 0.002,
        animations: 'disabled',
      });
    });

    // Confidence states
    for (const s of [
      { id: '#color-green', suffix: 'green' },
      { id: '#color-amber', suffix: 'amber' },
      { id: '#color-red', suffix: 'red' },
    ]) {
      test(`${label} ${theme} - ${s.suffix} pressed`, async ({ page }) => {
        await gotoTheme(page, theme, size);
        await page.locator(s.id).first().click();
        await expect(page).toHaveScreenshot(`${label}-${theme}-${s.suffix}.png`, {
          maxDiffPixelRatio: 0.002,
          animations: 'disabled',
        });
      });
    }

    // Selected score state (DOM injection for deterministic baseline)
    test(`${label} ${theme} - selected score`, async ({ page }) => {
      await gotoTheme(page, theme, size);
      await page.evaluate(() => {
        const list = document.querySelector('#scores-list');
        if (!list) return;
        list.innerHTML = `
          <div class="score-item selected" data-pdf-id="test" role="button" tabindex="0" aria-current="true">
            <div class="score-meta">
              <div class="score-title">A Whole New World</div>
              <div class="score-filename">a-whole-new-world.pdf</div>
              <span class="badge badge-outline score-pages">3 pages</span>
            </div>
            <div class="score-date">7/14/2025</div>
          </div>`;
      });
      await expect(page).toHaveScreenshot(`${label}-${theme}-selected.png`, {
        maxDiffPixelRatio: 0.002,
        animations: 'disabled',
      });
    });
  }
}
