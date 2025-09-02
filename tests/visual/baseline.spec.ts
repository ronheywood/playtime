import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Import test helpers for highlighting activation
const TestHelpers = require('../helpers/test-helpers.js');

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
        maxDiffPixelRatio: 0.02, // Increased tolerance for CI font/rendering differences
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
        // Activate highlighting first to make confidence panel visible
        await TestHelpers.activateHighlighting(page);
        // Now click the confidence button
        await page.locator(s.id).first().click();
        await expect(page).toHaveScreenshot(`${label}-${theme}-${s.suffix}.png`, {
          maxDiffPixelRatio: 0.02, // Increased tolerance for CI font/rendering differences
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
        maxDiffPixelRatio: 0.02, // Increased tolerance for CI font/rendering differences
        animations: 'disabled',
      });
    });

    // Multipage PDF navigation state (synthetic multipage scenario)
    test(`${label} ${theme} - multipage navigation`, async ({ page }) => {
      await gotoTheme(page, theme, size);
      
      // Seed with synthetic multipage PDF data and navigation state
      await page.evaluate(() => {
        // Simulate loaded multipage PDF with navigation controls
        const viewer = document.querySelector('[data-role="pdf-viewer"]');
        if (!viewer) return;
        
        // Add page navigation controls to viewer
        const navControls = document.createElement('div');
        navControls.className = 'page-navigation';
        navControls.innerHTML = `
          <button class="nav-button nav-prev" data-role="nav-prev" disabled>Previous</button>
          <span class="page-info" data-role="page-info">Page 1 of 5</span>
          <button class="nav-button nav-next" data-role="nav-next">Next</button>
        `;
        viewer.appendChild(navControls);
        
        // Add synthetic PDF canvas
        const canvas = document.createElement('canvas');
        canvas.setAttribute('data-role', 'pdf-canvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.width = '800px';
        canvas.style.height = '600px';
        canvas.style.border = '1px solid #ccc';
        canvas.style.backgroundColor = '#fff';
        viewer.appendChild(canvas);
        
        // Simulate selected multipage score in list
        const list = document.querySelector('#scores-list');
        if (list) {
          list.innerHTML = `
            <div class="score-item selected" data-pdf-id="multipage-test" role="button" tabindex="0" aria-current="true">
              <div class="score-meta">
                <div class="score-title">Beethoven Symphony No. 9</div>
                <div class="score-filename">beethoven-symphony-9.pdf</div>
                <span class="badge badge-outline score-pages">5 pages</span>
              </div>
              <div class="score-date">8/15/2025</div>
            </div>
            <div class="score-item" data-pdf-id="single-page" role="button" tabindex="0">
              <div class="score-meta">
                <div class="score-title">Simple Melody</div>
                <div class="score-filename">simple-melody.pdf</div>
                <span class="badge badge-outline score-pages">1 page</span>
              </div>
              <div class="score-date">8/10/2025</div>
            </div>`;
        }
      });
      
      await expect(page).toHaveScreenshot(`${label}-${theme}-multipage.png`, {
        maxDiffPixelRatio: 0.02, // Increased tolerance for CI font/rendering differences
        animations: 'disabled',
      });
    });

    // Multipage PDF - middle page state
    test(`${label} ${theme} - multipage middle page`, async ({ page }) => {
      await gotoTheme(page, theme, size);
      
      // Seed with middle page navigation state 
      await page.evaluate(() => {
        const viewer = document.querySelector('[data-role="pdf-viewer"]');
        if (!viewer) return;
        
        // Navigation controls showing middle page
        const navControls = document.createElement('div');
        navControls.className = 'page-navigation';
        navControls.innerHTML = `
          <button class="nav-button nav-prev" data-role="nav-prev">Previous</button>
          <span class="page-info" data-role="page-info">Page 3 of 5</span>
          <button class="nav-button nav-next" data-role="nav-next">Next</button>
        `;
        viewer.appendChild(navControls);
        
        // Add synthetic PDF canvas
        const canvas = document.createElement('canvas');
        canvas.setAttribute('data-role', 'pdf-canvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.width = '800px';
        canvas.style.height = '600px';
        canvas.style.border = '1px solid #ccc';
        canvas.style.backgroundColor = '#fff';
        viewer.appendChild(canvas);
        
        // Selected multipage score 
        const list = document.querySelector('#scores-list');
        if (list) {
          list.innerHTML = `
            <div class="score-item selected" data-pdf-id="multipage-test" role="button" tabindex="0" aria-current="true">
              <div class="score-meta">
                <div class="score-title">Beethoven Symphony No. 9</div>
                <div class="score-filename">beethoven-symphony-9.pdf</div>
                <span class="badge badge-outline score-pages">5 pages</span>
              </div>
              <div class="score-date">8/15/2025</div>
            </div>`;
        }
      });
      
      await expect(page).toHaveScreenshot(`${label}-${theme}-multipage-middle.png`, {
        maxDiffPixelRatio: 0.02, // Increased tolerance for CI font/rendering differences
        animations: 'disabled',
      });
    });

    // Multipage PDF - last page state
    test(`${label} ${theme} - multipage last page`, async ({ page }) => {
      await gotoTheme(page, theme, size);
      
      // Seed with last page navigation state
      await page.evaluate(() => {
        const viewer = document.querySelector('[data-role="pdf-viewer"]');
        if (!viewer) return;
        
        // Navigation controls showing last page
        const navControls = document.createElement('div');
        navControls.className = 'page-navigation';
        navControls.innerHTML = `
          <button class="nav-button nav-prev" data-role="nav-prev">Previous</button>
          <span class="page-info" data-role="page-info">Page 5 of 5</span>
          <button class="nav-button nav-next" data-role="nav-next" disabled>Next</button>
        `;
        viewer.appendChild(navControls);
        
        // Add synthetic PDF canvas
        const canvas = document.createElement('canvas');
        canvas.setAttribute('data-role', 'pdf-canvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.width = '800px';
        canvas.style.height = '600px';
        canvas.style.border = '1px solid #ccc';
        canvas.style.backgroundColor = '#fff';
        viewer.appendChild(canvas);
        
        // Selected multipage score
        const list = document.querySelector('#scores-list');
        if (list) {
          list.innerHTML = `
            <div class="score-item selected" data-pdf-id="multipage-test" role="button" tabindex="0" aria-current="true">
              <div class="score-meta">
                <div class="score-title">Beethoven Symphony No. 9</div>
                <div class="score-filename">beethoven-symphony-9.pdf</div>
                <span class="badge badge-outline score-pages">5 pages</span>
              </div>
              <div class="score-date">8/15/2025</div>
            </div>`;
        }
      });
      
      await expect(page).toHaveScreenshot(`${label}-${theme}-multipage-last.png`, {
        maxDiffPixelRatio: 0.02, // Increased tolerance for CI font/rendering differences
        animations: 'disabled',
      });
    });
  }
}
