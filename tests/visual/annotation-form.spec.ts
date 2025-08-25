// Visual test to verify annotation form functionality
const { test, expect } = require('@playwright/test');

test.describe('Highlight Annotation Form', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        
        // Wait for page to load
        await page.waitForSelector('#pdf-canvas');
        
        // Clean up any existing highlights or forms
        await page.evaluate(() => {
            // Remove any existing test highlights
            document.querySelectorAll('[data-test-highlight]').forEach(el => el.remove());
            
            // Hide any existing annotation forms
            const forms = document.querySelectorAll('.highlight-annotation-overlay');
            forms.forEach(form => form.style.display = 'none');
        });
    });

    test('annotation form appears when action button is clicked', async ({ page }) => {
        // Create a mock highlight and show action button
        await page.evaluate(() => {
            const canvas = document.getElementById('pdf-canvas');
            const container = canvas.parentElement;
            
            // Create mock highlight
            const highlight = document.createElement('div');
            highlight.setAttribute('data-test-highlight', 'true');
            highlight.setAttribute('data-hl-id', 'test-highlight-1');
            highlight.setAttribute('data-color', 'green');
            highlight.setAttribute('data-confidence', '2');  // Green is confidence level 2 (zero-indexed)
            highlight.setAttribute('data-page', '1');
            highlight.setAttribute('data-hl-x-pct', '20');
            highlight.setAttribute('data-hl-y-pct', '30');
            highlight.setAttribute('data-hl-w-pct', '40');
            highlight.setAttribute('data-hl-h-pct', '5');
            highlight.style.cssText = `
                position: absolute;
                left: 20%;
                top: 30%;
                width: 40%;
                height: 5%;
                background: rgba(0, 255, 0, 0.3);
                border: 2px solid green;
                z-index: 100;
            `;
            container.appendChild(highlight);
            
            // Show action button for this highlight
            if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._components.actionButton) {
                window.PlayTimeHighlighting._components.actionButton.showForHighlight(highlight);
            }
        });

        // Wait for action button to appear
        await page.waitForSelector('.highlight-action-btn', { state: 'visible' });

        // Click the action button
        await page.click('.highlight-action-btn');

        // Wait for annotation form to appear
        await page.waitForSelector('.highlight-annotation-overlay', { state: 'visible' });

        // Verify form elements are present
        await expect(page.locator('[data-field="title"]')).toBeVisible();
        await expect(page.locator('[data-field="notes"]')).toBeVisible();
        await expect(page.locator('[data-action="save"]')).toBeVisible();
        await expect(page.locator('[data-action="cancel"]')).toBeVisible();

        // Verify highlight info is displayed
        await expect(page.locator('[data-highlight-info]')).toContainText('green highlight on page 1');

        // Take screenshot of the form
        await page.screenshot({ path: 'test-results/annotation-form-visible.png' });
    });

    test('annotation form saves data correctly', async ({ page }) => {
        // Create mock highlight and trigger annotation form
        await page.evaluate(() => {
            const canvas = document.getElementById('pdf-canvas');
            const container = canvas.parentElement;
            
            const highlight = document.createElement('div');
            highlight.setAttribute('data-test-highlight', 'true');
            highlight.setAttribute('data-hl-id', 'test-highlight-2');
            highlight.setAttribute('data-color', 'amber');
            highlight.setAttribute('data-confidence', '1');  // Amber is confidence level 1 (zero-indexed)
            highlight.setAttribute('data-page', '2');
            highlight.style.cssText = `
                position: absolute;
                left: 30%;
                top: 40%;
                width: 30%;
                height: 4%;
                background: rgba(255, 193, 7, 0.3);
                border: 2px solid orange;
                z-index: 100;
            `;
            container.appendChild(highlight);
            
            // Show action button and click it programmatically
            if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._components.actionButton) {
                window.PlayTimeHighlighting._components.actionButton.showForHighlight(highlight);
                window.PlayTimeHighlighting._handleActionButtonClick(highlight);
            }
        });

        // Wait for form to appear
        await page.waitForSelector('.highlight-annotation-overlay', { state: 'visible' });

        // Fill in the form
        await page.fill('[data-field="title"]', 'Test Annotation Title');
        await page.fill('[data-field="notes"]', 'This is a test annotation with some detailed notes about the highlight.');

        // Verify character counts update
        await expect(page.locator('[data-title-count]')).toContainText('21');
        await expect(page.locator('[data-notes-count]')).toContainText('71');

        // Save the annotation
        await page.click('[data-action="save"]');

        // Wait for form to close
        await page.waitForSelector('.highlight-annotation-overlay', { state: 'hidden' });

        // Verify the highlight now has annotation data
        const annotationData = await page.evaluate(() => {
            const highlight = document.querySelector('[data-test-highlight][data-hl-id="test-highlight-2"]');
            return {
                title: highlight.getAttribute('data-hl-title'),
                notes: highlight.getAttribute('data-hl-notes'),
                annotated: highlight.getAttribute('data-hl-annotated')
            };
        });

        expect(annotationData.title).toBe('Test Annotation Title');
        expect(annotationData.notes).toBe('This is a test annotation with some detailed notes about the highlight.');
        expect(annotationData.annotated).toBe('true');
    });

    test('annotation form cancels correctly', async ({ page }) => {
        // Create mock highlight and trigger annotation form
        await page.evaluate(() => {
            const canvas = document.getElementById('pdf-canvas');
            const container = canvas.parentElement;
            
            const highlight = document.createElement('div');
            highlight.setAttribute('data-test-highlight', 'true');
            highlight.setAttribute('data-hl-id', 'test-highlight-3');
            highlight.setAttribute('data-color', 'red');
            highlight.setAttribute('data-confidence', '0');  // Red is confidence level 0 (zero-indexed)
            highlight.setAttribute('data-page', '1');
            highlight.style.cssText = `
                position: absolute;
                left: 40%;
                top: 50%;
                width: 25%;
                height: 3%;
                background: rgba(255, 0, 0, 0.3);
                border: 2px solid red;
                z-index: 100;
            `;
            container.appendChild(highlight);
            
            // Show form directly
            if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._components.annotationForm) {
                window.PlayTimeHighlighting._components.annotationForm.showForHighlight({
                    highlightId: 'test-highlight-3',
                    color: 'red',
                    confidence: 0,
                    page: 1,
                    element: highlight
                });
            }
        });

        // Wait for form to appear
        await page.waitForSelector('.highlight-annotation-overlay', { state: 'visible' });

        // Fill in some data
        await page.fill('[data-field="title"]', 'This should be cancelled');
        await page.fill('[data-field="notes"]', 'This data should not be saved');

        // Cancel the form
        await page.click('[data-action="cancel"]');

        // Wait for form to close
        await page.waitForSelector('.highlight-annotation-overlay', { state: 'hidden' });

        // Verify no annotation data was saved
        const hasAnnotation = await page.evaluate(() => {
            const highlight = document.querySelector('[data-test-highlight][data-hl-id="test-highlight-3"]');
            return highlight.hasAttribute('data-hl-annotated');
        });

        expect(hasAnnotation).toBe(false);
    });

    test('annotation form closes with ESC key', async ({ page }) => {
        // Create mock highlight and show form
        await page.evaluate(() => {
            const canvas = document.getElementById('pdf-canvas');
            const container = canvas.parentElement;
            
            const highlight = document.createElement('div');
            highlight.setAttribute('data-test-highlight', 'true');
            highlight.setAttribute('data-hl-id', 'test-highlight-4');
            highlight.setAttribute('data-hl-color', 'green');
            highlight.style.cssText = `
                position: absolute;
                left: 50%;
                top: 60%;
                width: 20%;
                height: 4%;
                background: rgba(0, 255, 0, 0.3);
                border: 2px solid green;
                z-index: 100;
            `;
            container.appendChild(highlight);
            
            // Show form
            if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._components.annotationForm) {
                window.PlayTimeHighlighting._components.annotationForm.showForHighlight({
                    highlightId: 'test-highlight-4',
                    color: 'green',
                    element: highlight
                });
            }
        });

        // Wait for form to appear
        await page.waitForSelector('.highlight-annotation-overlay', { state: 'visible' });

        // Press ESC key
        await page.keyboard.press('Escape');

        // Wait for form to close
        await page.waitForSelector('.highlight-annotation-overlay', { state: 'hidden' });

        // Verify form is hidden
        await expect(page.locator('.highlight-annotation-overlay')).toBeHidden();
    });

    test('annotation form loads existing annotation data for editing', async ({ page }) => {
        // Create mock highlight with existing annotation data
        await page.evaluate(() => {
            const canvas = document.getElementById('pdf-canvas');
            const container = canvas.parentElement;
            
            const highlight = document.createElement('div');
            highlight.setAttribute('data-test-highlight', 'true');
            highlight.setAttribute('data-hl-id', 'test-highlight-existing');
            highlight.setAttribute('data-color', 'amber');
            highlight.setAttribute('data-confidence', '1');
            highlight.setAttribute('data-page', '2');
            // Add existing annotation data
            highlight.setAttribute('data-hl-title', 'Existing Title');
            highlight.setAttribute('data-hl-notes', 'These are existing notes that should be loaded for editing.');
            highlight.setAttribute('data-hl-annotated', 'true');
            highlight.setAttribute('data-hl-annotation-timestamp', '1640995200000');
            
            highlight.style.cssText = `
                position: absolute;
                left: 30%;
                top: 40%;
                width: 35%;
                height: 5%;
                background: rgba(255, 191, 0, 0.3);
                border: 2px solid orange;
                z-index: 100;
            `;
            container.appendChild(highlight);
            
            // Show annotation form (this should load existing data)
            if (window.PlayTimeHighlighting && window.PlayTimeHighlighting._components.annotationForm) {
                const highlightData = window.PlayTimeHighlighting._prepareHighlightDataForAnnotation(highlight);
                window.PlayTimeHighlighting._components.annotationForm.showForHighlight(highlightData);
            }
        });

        // Wait for form to appear
        await page.waitForSelector('.highlight-annotation-overlay', { state: 'visible' });

        // Verify the form title shows "Edit Annotation"
        await expect(page.locator('.annotation-form-header h3')).toContainText('Edit Annotation');

        // Verify the info text shows "Editing annotation"
        await expect(page.locator('[data-highlight-info]')).toContainText('Editing annotation for amber highlight on page 2');

        // Verify existing data is loaded in the form fields
        await expect(page.locator('[data-field="title"]')).toHaveValue('Existing Title');
        await expect(page.locator('[data-field="notes"]')).toHaveValue('These are existing notes that should be loaded for editing.');

        // Verify character counts are updated
        await expect(page.locator('[data-title-count]')).toContainText('14'); // Length of "Existing Title"
        await expect(page.locator('[data-notes-count]')).toContainText('59'); // Length of the notes

        // Edit the annotation
        await page.fill('[data-field="title"]', 'Updated Title');
        await page.fill('[data-field="notes"]', 'Updated notes after editing.');

        // Save the updated annotation
        await page.click('[data-action="save"]');

        // Wait for form to close
        await page.waitForSelector('.highlight-annotation-overlay', { state: 'hidden' });

        // Verify the highlight now has updated annotation data
        const updatedData = await page.evaluate(() => {
            const highlight = document.querySelector('[data-test-highlight][data-hl-id="test-highlight-existing"]');
            return {
                title: highlight.getAttribute('data-hl-title'),
                notes: highlight.getAttribute('data-hl-notes'),
                annotated: highlight.getAttribute('data-hl-annotated')
            };
        });

        expect(updatedData.title).toBe('Updated Title');
        expect(updatedData.notes).toBe('Updated notes after editing.');
        expect(updatedData.annotated).toBe('true');
    });
});
