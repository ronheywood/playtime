import { test, expect } from '@playwright/test';

// Extend window type for our global classes
declare global {
    interface Window {
        HighlightActionButton: any;
    }
}

test.describe('HighlightActionButton Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the application
        await page.goto('/');
        
        // Wait for the page to load
        await page.waitForLoadState('networkidle');
        
        // Wait for the main application elements to be present
        await page.waitForSelector('#pdf-canvas', { timeout: 10000 });
        
        // Clean up any existing action buttons and test highlights
        await page.evaluate(() => {
            const existingButtons = document.querySelectorAll('.highlight-action-btn');
            existingButtons.forEach(btn => btn.remove());
            
            const existingTestHighlights = document.querySelectorAll('.test-highlight, [class*="test-highlight"]');
            existingTestHighlights.forEach(highlight => highlight.remove());
        });
    });

    test('action button component can be created and styled', async ({ page }) => {
        // First, remove any existing action buttons to start clean
        await page.evaluate(() => {
            const existingButtons = document.querySelectorAll('.highlight-action-btn');
            existingButtons.forEach(btn => btn.remove());
        });

        // Create a test highlight and action button directly via JavaScript
        await page.evaluate(() => {
            // Create a mock highlight element
            const mockHighlight = document.createElement('div');
            mockHighlight.className = 'highlight test-highlight';
            mockHighlight.style.cssText = `
                position: absolute;
                top: 100px;
                left: 100px;
                width: 100px;
                height: 50px;
                background: rgba(0, 255, 0, 0.3);
                border: 2px solid green;
            `;
            mockHighlight.setAttribute('data-color', 'green');
            mockHighlight.setAttribute('data-hl-confidence', '1');
            
            // Add to the PDF viewer container
            const container = document.querySelector('.pdf-viewer-container') || document.body;
            container.appendChild(mockHighlight);
            
            // Create and show action button
            if (window.HighlightActionButton) {
                const actionButton = new window.HighlightActionButton({
                    containerId: 'pdf-canvas'
                });
                actionButton.init();
                actionButton.showForHighlight(mockHighlight);
            }
        });

        // Wait a moment for any animations
        await page.waitForTimeout(500);

        // Verify action button is visible (use first() to handle multiple buttons)
        const actionButton = page.locator('.highlight-action-btn').first();
        await expect(actionButton).toBeVisible();

        // Take screenshot
        await expect(page).toHaveScreenshot('action-button-basic.png');
    });

    test('action button with lucide icon rendering', async ({ page }) => {
        // Create test elements
        await page.evaluate(() => {
            const mockHighlight = document.createElement('div');
            mockHighlight.className = 'highlight test-highlight';
            mockHighlight.style.cssText = `
                position: absolute;
                top: 150px;
                left: 200px;
                width: 120px;
                height: 60px;
                background: rgba(255, 165, 0, 0.3);
                border: 2px solid orange;
            `;
            mockHighlight.setAttribute('data-color', 'amber');
            
            const container = document.querySelector('.pdf-viewer-container') || document.body;
            container.appendChild(mockHighlight);
            
            if (window.HighlightActionButton) {
                const actionButton = new window.HighlightActionButton({
                    containerId: 'pdf-canvas'
                });
                actionButton.init();
                actionButton.showForHighlight(mockHighlight);
            }
        });

        await page.waitForTimeout(500);

        // Check for SVG icon (use first() to handle multiple)
        const svgIcon = page.locator('.highlight-action-btn svg[data-lucide="notebook-pen"]').first();
        await expect(svgIcon).toBeVisible();

        // Take screenshot focusing on the icon
        await expect(page.locator('.highlight-action-btn').first()).toHaveScreenshot('action-button-icon-detail.png');
    });

    test('action button positioning and styling', async ({ page }) => {
        // Create multiple test highlights to test positioning
        await page.evaluate(() => {
            const positions = [
                { top: 50, left: 50, color: 'red' },
                { top: 200, left: 300, color: 'green' },
                { top: 350, left: 150, color: 'amber' }
            ];

            positions.forEach((pos, index) => {
                const mockHighlight = document.createElement('div');
                mockHighlight.className = `highlight test-highlight-${index}`;
                mockHighlight.style.cssText = `
                    position: absolute;
                    top: ${pos.top}px;
                    left: ${pos.left}px;
                    width: 80px;
                    height: 40px;
                    background: rgba(${pos.color === 'red' ? '255,0,0' : pos.color === 'green' ? '0,255,0' : '255,165,0'}, 0.3);
                    border: 2px solid ${pos.color === 'amber' ? 'orange' : pos.color};
                `;
                mockHighlight.setAttribute('data-color', pos.color);
                
                const container = document.querySelector('.pdf-viewer-container') || document.body;
                container.appendChild(mockHighlight);
            });

            // Create action button for the last highlight
            const lastHighlight = document.querySelector('.test-highlight-2');
            if (window.HighlightActionButton && lastHighlight) {
                const actionButton = new window.HighlightActionButton({
                    containerId: 'pdf-canvas'
                });
                actionButton.init();
                actionButton.showForHighlight(lastHighlight);
            }
        });

        await page.waitForTimeout(500);

        // Verify positioning and take full context screenshot
        await expect(page).toHaveScreenshot('action-button-positioning-context.png');
    });

    test('action button hover state visual', async ({ page }) => {
        // Create test highlight and action button
        await page.evaluate(() => {
            const mockHighlight = document.createElement('div');
            mockHighlight.className = 'highlight test-highlight-hover';
            mockHighlight.style.cssText = `
                position: absolute;
                top: 200px;
                left: 200px;
                width: 100px;
                height: 50px;
                background: rgba(0, 255, 0, 0.3);
                border: 2px solid green;
            `;
            
            const container = document.querySelector('.pdf-viewer-container') || document.body;
            container.appendChild(mockHighlight);
            
            if (window.HighlightActionButton) {
                const actionButton = new window.HighlightActionButton({
                    containerId: 'pdf-canvas'
                });
                actionButton.init();
                actionButton.showForHighlight(mockHighlight);
            }
        });

        const actionButton = page.locator('.highlight-action-btn').first();
        await expect(actionButton).toBeVisible();

        // Normal state
        await expect(actionButton).toHaveScreenshot('action-button-normal-state.png');

        // Hover state
        await actionButton.hover();
        await page.waitForTimeout(300);
        await expect(actionButton).toHaveScreenshot('action-button-hover-state.png');
    });
});
