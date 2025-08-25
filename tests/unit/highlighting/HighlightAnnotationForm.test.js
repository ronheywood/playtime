/** @jest-environment jsdom */

const HighlightAnnotationForm = require('../../../scripts/highlighting/HighlightAnnotationForm');

describe('HighlightAnnotationForm', () => {
    let form;
    let mockContainer;

    beforeEach(() => {
        // Create a mock DOM environment
        document.body.innerHTML = '';
        
        // Create mock container
        mockContainer = document.createElement('div');
        mockContainer.id = 'pdf-canvas';
        document.body.appendChild(mockContainer);
        
        form = new HighlightAnnotationForm({
            containerId: 'pdf-canvas',
            maxTitleLength: 50,
            maxNotesLength: 200
        });
    });

    afterEach(() => {
        if (form) {
            form.destroy();
        }
        document.body.innerHTML = '';
    });

    test('creates form with correct configuration', () => {
        expect(form.config.containerId).toBe('pdf-canvas');
        expect(form.config.maxTitleLength).toBe(50);
        expect(form.config.maxNotesLength).toBe(200);
        expect(form.visible).toBe(false);
    });

    test('initializes and creates form elements', () => {
        form.init();
        
        expect(form.overlay).toBeTruthy();
        expect(form.form).toBeTruthy();
        expect(form.overlay.style.display).toBe('none');
        
        // Check for form elements
        const titleInput = form.form.querySelector('[data-field="title"]');
        const notesInput = form.form.querySelector('[data-field="notes"]');
        const saveButton = form.form.querySelector('[data-action="save"]');
        const cancelButton = form.form.querySelector('[data-action="cancel"]');
        
        expect(titleInput).toBeTruthy();
        expect(notesInput).toBeTruthy();
        expect(saveButton).toBeTruthy();
        expect(cancelButton).toBeTruthy();
    });

    test('shows form for highlight data', () => {
        form.init();
        
        const highlightData = {
            highlightId: 'test-id',
            color: 'green',
            page: 1,
            confidence: 3
        };
        
        form.showForHighlight(highlightData);
        
        expect(form.visible).toBe(true);
        expect(form.overlay.style.display).toBe('flex');
        expect(form.currentHighlight).toEqual(highlightData);
        
        // Check info text is updated
        const infoElement = form.form.querySelector('[data-highlight-info]');
        expect(infoElement.textContent).toContain('green highlight on page 1');
    });

    test('hides form and clears data', () => {
        form.init();
        
        const highlightData = { highlightId: 'test-id', color: 'red' };
        form.showForHighlight(highlightData);
        
        form.hide();
        
        expect(form.visible).toBe(false);
        expect(form.overlay.style.display).toBe('none');
        expect(form.currentHighlight).toBe(null);
        
        // Check form is cleared
        const titleInput = form.form.querySelector('[data-field="title"]');
        const notesInput = form.form.querySelector('[data-field="notes"]');
        expect(titleInput.value).toBe('');
        expect(notesInput.value).toBe('');
    });

    test('calls save callback with annotation data', () => {
        form.init();
        
        const saveCallback = jest.fn();
        form.onSave(saveCallback);
        
        const highlightData = { highlightId: 'test-id', color: 'amber' };
        form.showForHighlight(highlightData);
        
        // Fill form
        const titleInput = form.form.querySelector('[data-field="title"]');
        const notesInput = form.form.querySelector('[data-field="notes"]');
        titleInput.value = 'Test Title';
        notesInput.value = 'Test Notes';
        
        // Click save
        const saveButton = form.form.querySelector('[data-action="save"]');
        saveButton.click();
        
        expect(saveCallback).toHaveBeenCalledWith({
            title: 'Test Title',
            notes: 'Test Notes',
            timestamp: expect.any(Number),
            highlightData: highlightData
        });
        
        expect(form.visible).toBe(false);
    });

    test('calls cancel callback when cancelled', () => {
        form.init();
        
        const cancelCallback = jest.fn();
        form.onCancel(cancelCallback);
        
        const highlightData = { highlightId: 'test-id' };
        form.showForHighlight(highlightData);
        
        // Click cancel
        const cancelButton = form.form.querySelector('[data-action="cancel"]');
        cancelButton.click();
        
        expect(cancelCallback).toHaveBeenCalledWith(highlightData);
        expect(form.visible).toBe(false);
    });

    test('updates character counts correctly', () => {
        form.init();
        
        const highlightData = { highlightId: 'test-id' };
        form.showForHighlight(highlightData);
        
        const titleInput = form.form.querySelector('[data-field="title"]');
        const titleCounter = form.form.querySelector('[data-title-count]');
        
        titleInput.value = 'Hello';
        titleInput.dispatchEvent(new Event('input'));
        
        expect(titleCounter.textContent).toBe('5');
    });

    test('handles escape key to cancel', () => {
        form.init();
        
        const cancelCallback = jest.fn();
        form.onCancel(cancelCallback);
        
        const highlightData = { highlightId: 'test-id' };
        form.showForHighlight(highlightData);
        
        // Simulate escape key
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(escapeEvent);
        
        expect(cancelCallback).toHaveBeenCalledWith(highlightData);
        expect(form.visible).toBe(false);
    });

    test('handles canvas container by using parent element', () => {
        // Create canvas element as container
        const canvas = document.createElement('canvas');
        canvas.id = 'canvas-container';
        const canvasParent = document.createElement('div');
        canvasParent.appendChild(canvas);
        document.body.appendChild(canvasParent);
        
        const canvasForm = new HighlightAnnotationForm({
            containerId: 'canvas-container'
        });
        
        canvasForm.init();
        
        // Should use canvas parent, not canvas itself
        expect(canvasForm.overlay.parentElement).toBe(canvasParent);
        
        canvasForm.destroy();
    });

    test('respects maxLength constraints', () => {
        form.init();
        
        const titleInput = form.form.querySelector('[data-field="title"]');
        const notesInput = form.form.querySelector('[data-field="notes"]');
        
        expect(titleInput.maxLength).toBe(50);
        expect(notesInput.maxLength).toBe(200);
    });
});
