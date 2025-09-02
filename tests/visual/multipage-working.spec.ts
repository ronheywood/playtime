import { test, expect } from '@playwright/test';

// Import the fixture data and test helpers
const { multipagePdfFixture } = require('../fixtures/multipage-pdf-fixture.js');

/**
 * Working Multipage PDF Visual Tests
 * 
 * These tests focus on the functionality that we've verified works correctly:
 * - File upload and PDF loading
 * - Basic page navigation
 * - Highlight creation with drag gestures
 * - Visual regression testing
 */

/**
 * Sets up the test environment by uploading a PDF file through the application's upload feature.
 */
async function setupMultipagePDFTest(page) {
  // Navigate to the application
  await page.goto('/?theme=light', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app');
  
  // Wait for the application to initialize
  await page.waitForFunction(() => {
    return window.PlayTimePDFViewer && window.PlayTimeScoreList;
  }, { timeout: 10000 });
  
  // Create a PDF file from base64 data and upload it
  await page.evaluate(() => {
    const base64Data = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUiA0IDAgUiA1IDAgUiA2IDAgUiA3IDAgUl0KL0NvdW50IDUKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgOCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgOSAwIFIKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgMTAgMCBSCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDExIDAgUgo+PgplbmRvYmoKNyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyAxMiAwIFIKPj4KZW5kb2JqCjggMCBvYmoKPDwKL0xlbmd0aCAyMgo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFBhZ2UgMSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago5IDAgb2JqCjw8Ci9MZW5ndGggMjIKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihQYWdlIDIpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMTAgMCBvYmoKPDwKL0xlbmd0aCAyMgo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFBhZ2UgMykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoxMSAwIG9iago8PAovTGVuZ3RoIDIyCj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMTAwIDcwMCBUZAooUGFnZSA0KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjEyIDAgb2JqCjw8Ci9MZW5ndGggMjIKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihQYWdlIDUpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDEzCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMjcgMDAwMDAgbiAKMDAwMDAwMDIwNCAwMDAwMCBuIAowMDAwMDAwMjgxIDAwMDAwIG4gCjAwMDAwMDAzNTggMDAwMDAgbiAKMDAwMDAwMDQzNSAwMDAwMCBuIAowMDAwMDAwNTEyIDAwMDAwIG4gCjAwMDAwMDA1ODQgMDAwMDAgbiAKMDAwMDAwMDY1NyAwMDAwMCBuIAowMDAwMDAwNzMwIDAwMDAwIG4gCjAwMDAwMDA4MDMgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSAxMwovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKODc2CiUlRU9GCg==';
    
    function b64toBlob(b64Data, contentType = 'application/pdf') {
      const sliceSize = 512;
      const byteCharacters = atob(b64Data);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      return new Blob(byteArrays, { type: contentType });
    }
    
    const pdfBlob = b64toBlob(base64Data);
    const file = new File([pdfBlob], 'Test Multipage PDF.pdf', { type: 'application/pdf' });
    
    const fileInput = document.querySelector('#pdf-upload');
    if (fileInput) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
    }
  });
  
  // Wait for the PDF to be processed and loaded
  await page.waitForSelector('#scores-list .score-item', { timeout: 15000 });
  
  // Click on the uploaded PDF to load it
  await page.click('#scores-list .score-item');
  
  // Wait for the PDF to load and render
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#pdf-canvas');
    return canvas && canvas.width > 0 && canvas.height > 0;
  }, { timeout: 10000 });
}

test.describe('Working Multipage PDF Visual Tests', () => {
  
  test('loads 5-page PDF and displays page 1', async ({ page }) => {
    await setupMultipagePDFTest(page);
    
    // Verify we're on page 1 (use specific sidebar element to avoid duplicates)
    const pageInfo = page.locator('#page-info');
    await expect(pageInfo).toHaveText('Page 1 of 5');
    
    // Verify the canvas is visible and has content
    const canvas = page.locator('#pdf-canvas');
    await expect(canvas).toBeVisible();
    
    await expect(page).toHaveScreenshot('multipage-pdf-loaded.png', {
      maxDiffPixelRatio: 0.08, // Increased tolerance for PDF rendering differences in CI
      animations: 'disabled',
    });
  });

  test('creates highlight with drag gesture on page 1', async ({ page }) => {
    await setupMultipagePDFTest(page);
    
    // Activate highlighting mode first
    await page.click('#highlighting-toggle');
    await page.waitForSelector('#confidence-panel', { state: 'visible' });
    
    // Select green confidence color
    await page.click('[data-role="color-green"]');
    
    // Create a highlight by dragging a region on the PDF canvas
    const canvas = page.locator('#pdf-canvas');
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await page.mouse.move(300, 300);
    await page.mouse.up();
    
    // Wait for highlight to be created and annotation dialog to appear
    await page.waitForTimeout(1000);
    
    // Cancel the annotation dialog to proceed with the test
    const cancelButton = page.locator('[data-action="cancel"]');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
    
    // Verify highlight was created (check for highlight elements)
    const highlights = page.locator('[data-role="highlight"]');
    const highlightCount = await highlights.count();
    expect(highlightCount).toBeGreaterThan(0);
    
    await expect(page).toHaveScreenshot('multipage-with-highlight.png', {
      maxDiffPixelRatio: 0.08, // Increased tolerance for PDF rendering differences in CI
      animations: 'disabled',
    });
  });

  test('navigates to page 2 using next button', async ({ page }) => {
    await setupMultipagePDFTest(page);
    
    // Click next page button
    await page.click('#next-page-btn');
    
    // Wait for page change (use sidebar page info)
    await page.waitForFunction(() => {
      const pageInfo = document.querySelector('#page-info');
      return pageInfo && pageInfo.textContent?.includes('Page 2 of');
    });
    
    // Verify we're on page 2
    await expect(page.locator('#page-info')).toHaveText('Page 2 of 5');
    
    await expect(page).toHaveScreenshot('multipage-page2.png', {
      maxDiffPixelRatio: 0.08, // Increased tolerance for PDF rendering differences in CI
      animations: 'disabled',
    });
  });

  test('creates multiple highlights with different colors', async ({ page }) => {
    await setupMultipagePDFTest(page);
    
    // Activate highlighting mode first
    await page.click('#highlighting-toggle');
    await page.waitForSelector('#confidence-panel', { state: 'visible' });
    
    const canvas = page.locator('#pdf-canvas');
    
    // Create green highlight
    await page.click('[data-role="color-green"]');
    await canvas.hover({ position: { x: 150, y: 150 } });
    await page.mouse.down();
    await page.mouse.move(200, 200);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Cancel the annotation dialog for the green highlight
    const cancelButton1 = page.locator('[data-action="cancel"]');
    if (await cancelButton1.isVisible()) {
      await cancelButton1.click();
      await page.waitForTimeout(300);
    }
    
    // Create amber highlight
    await page.click('[data-role="color-amber"]');
    await canvas.hover({ position: { x: 250, y: 250 } });
    await page.mouse.down();
    await page.mouse.move(300, 300);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Cancel the annotation dialog for the amber highlight
    const cancelButton2 = page.locator('[data-action="cancel"]');
    if (await cancelButton2.isVisible()) {
      await cancelButton2.click();
      await page.waitForTimeout(300);
    }
    
    // Create red highlight
    await page.click('[data-role="color-red"]');
    await canvas.hover({ position: { x: 350, y: 350 } });
    await page.mouse.down();
    await page.mouse.move(400, 400);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Cancel the annotation dialog for the red highlight
    const cancelButton3 = page.locator('[data-action="cancel"]');
    if (await cancelButton3.isVisible()) {
      await cancelButton3.click();
      await page.waitForTimeout(300);
    }
    
    // Verify multiple highlights were created
    const highlights = page.locator('[data-role="highlight"]');
    const highlightCount = await highlights.count();
    expect(highlightCount).toBeGreaterThanOrEqual(3);
    
    await expect(page).toHaveScreenshot('multipage-multiple-highlights.png', {
      maxDiffPixelRatio: 0.08, // Increased tolerance for PDF rendering differences in CI
      animations: 'disabled',
    });
  });

  test('basic navigation workflow works', async ({ page }) => {
    await setupMultipagePDFTest(page);
    
    // Start on page 1
    await expect(page.locator('#page-info')).toHaveText('Page 1 of 5');
    
    // Go to page 2
    await page.click('#next-page-btn');
    await page.waitForFunction(() => {
      const pageInfo = document.querySelector('#page-info');
      return pageInfo && pageInfo.textContent?.includes('Page 2 of');
    });
    
    // Go back to page 1
    await page.click('#prev-page-btn');
    await page.waitForFunction(() => {
      const pageInfo = document.querySelector('#page-info');
      return pageInfo && pageInfo.textContent?.includes('Page 1 of');
    });
    
    // Verify we're back on page 1
    await expect(page.locator('#page-info')).toHaveText('Page 1 of 5');
    
    await expect(page).toHaveScreenshot('multipage-navigation-test.png', {
      maxDiffPixelRatio: 0.08, // Increased tolerance for PDF rendering differences in CI
      animations: 'disabled',
    });
  });

});
