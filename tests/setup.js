/**
 * Test Setup for PlayTime Acceptance Tests
 * Simple JSDOM-based setup for rapid prototyping
 */

// Mock IndexedDB for testing
global.indexedDB = {
    open: jest.fn(),
    deleteDatabase: jest.fn()
};

// Mock File API
global.File = class MockFile {
    constructor(content, filename, options = {}) {
        this.content = content;
        this.name = filename;
        this.type = options.type || 'application/pdf';
        this.size = content.length;
    }
};

global.FileReader = class MockFileReader {
    constructor() {
        this.result = null;
        this.onload = null;
        this.onerror = null;
    }
    
    readAsArrayBuffer(file) {
        setTimeout(() => {
            this.result = new ArrayBuffer(file.size);
            if (this.onload) this.onload();
        }, 0);
    }
};

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray([255, 255, 255, 255]) // Non-empty pixel data
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn()
}));

// Setup DOM before each test
beforeEach(() => {
    // Load the main HTML structure
    document.body.innerHTML = `
        <header>
            <h1>PlayTime</h1>
        </header>
        <main>
            <section id="upload-section">
                <input type="file" id="pdf-upload" accept="application/pdf">
                <label for="pdf-upload">Choose PDF Score</label>
            </section>
            <section id="library-section">
                <div id="scores-list"></div>
            </section>
            <section id="viewer-section">
                <div class="viewer-controls">
                    <button id="prev-page-btn">◀</button>
                    <span id="page-info">Page 1 of 1</span>
                    <button id="next-page-btn">▶</button>
                    <div class="current-score-title"></div>
                </div>
                <div class="pdf-viewer-container">
                    <canvas id="pdf-canvas"></canvas>
                    <div class="selection-overlay" style="display: none;"></div>
                </div>
                <div class="highlight-controls">
                    <button id="color-green" data-color="green">●</button>
                    <button id="color-amber" data-color="amber">●</button>
                    <button id="color-red" data-color="red">●</button>
                </div>
                <div class="practice-controls">
                    <button id="focus-section-btn" style="display: none;">Focus</button>
                    <button id="exit-focus-btn" style="display: none;">Exit</button>
                </div>
            </section>
        </main>
    `;
});

// Helper functions for testing
global.testHelpers = {
    createMockPDF: (filename = 'test.pdf') => {
        return new File(['mock pdf content'], filename, { type: 'application/pdf' });
    },
    
    simulateFileUpload: (file) => {
        const input = document.getElementById('pdf-upload');
        const event = new Event('change', { bubbles: true });
        Object.defineProperty(input, 'files', {
            value: [file],
            configurable: true
        });
        input.dispatchEvent(event);
    },
    
    createMockHighlight: (x = 100, y = 100, width = 100, height = 50, color = 'red') => {
        const highlight = document.createElement('div');
        highlight.className = 'highlight';
        highlight.setAttribute('data-color', color);
        highlight.style.left = x + 'px';
        highlight.style.top = y + 'px';
        highlight.style.width = width + 'px';
        highlight.style.height = height + 'px';
        return highlight;
    }
};
