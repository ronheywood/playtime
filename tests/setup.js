/**
 * Test Setup for PlayTime Acceptance Tests
 * Simple JSDOM-based setup for rapid prototyping
 */

// Polyfill CustomEvent for Node/JSDOM environments where it's missing
// Keep minimal surface: tests only assert .type and .detail
if (typeof global.CustomEvent !== 'function') {
    try {
        global.CustomEvent = function CustomEvent(event, params) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            if (typeof document !== 'undefined' && document.createEvent) {
                try {
                    const evt = document.createEvent('CustomEvent');
                    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
                    return evt;
                } catch (_) { /* fall through */ }
            }
            return { type: event, detail: params.detail, bubbles: !!params.bubbles, cancelable: !!params.cancelable };
        };
    } catch (_) { /* noop - tests will fail loudly if this breaks */ }
}

// --- Test DI provisioning -------------------------------------------------
// Provide DIContainer class and an initialized container instance to the JSDOM
// environment so application bootstrap code can discover and use it during tests.
try {
    // Attempt to load the app DI container module
    // eslint-disable-next-line global-require
    const diModule = require('../scripts/Core/Infrastructure/DIContainer');
    if (typeof global.window !== 'undefined' && diModule) {
        // Support module shapes: constructor, { DIContainer }, or instance
        try {
            if (typeof diModule === 'function') {
                global.window.DIContainer = diModule;
                try { global.window.diContainer = new diModule(); } catch(_) { /* ignore */ }
            } else if (diModule && typeof diModule.DIContainer === 'function') {
                global.window.DIContainer = diModule.DIContainer;
                try { global.window.diContainer = new diModule.DIContainer(); } catch(_) { /* ignore */ }
            } else if (diModule && typeof diModule.initialize === 'function') {
                // Already an initialized instance
                global.window.diContainer = diModule;
            }

            // Initialize instance if available
            if (global.window.diContainer && typeof global.window.diContainer.initialize === 'function') {
                try { global.window.diContainer.initialize(); } catch (_) { /* ignore */ }
            }

            // If instance exposes logger, wire it
            try {
                const instance = global.window.diContainer;
                if (instance && typeof instance.has === 'function' && instance.has('logger')) {
                    const logger = instance.get('logger');
                    if (logger) global.window.logger = logger;
                }
            } catch (_) { /* ignore */ }
        } catch (err) {
            // Ignore instantiation errors - tests continue to run in legacy mode
        }
    }
} catch (e) {
    // Non-fatal: continue without DI in test environments where module cannot be required
}

// Ensure PlayTimeConfig exists in the test window so bootstrap can read runtime flags
try {
    if (typeof global.window !== 'undefined') {
        global.window.PlayTimeConfig = global.window.PlayTimeConfig || { throwOnMissingDI: false };
    }
} catch (_) { /* ignore */ }


// Mock IndexedDB for testing
global.indexedDB = {
    open: jest.fn(() => {
        const mockRequest = {
            onsuccess: null,
            onerror: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        // Simulate async success callback
        setTimeout(() => {
            if (mockRequest.onsuccess) {
                const mockEvent = {
                    target: {
                        result: {
                            transaction: jest.fn(() => ({
                                objectStore: jest.fn(() => ({
                                    getAll: jest.fn(() => ({
                                        onsuccess: null,
                                        // Return empty array for now - tests will fail as expected
                                        result: []
                                    }))
                                }))
                            }))
                        }
                    }
                };
                mockRequest.onsuccess(mockEvent);
            }
        }, 0);
        return mockRequest;
    }),
    deleteDatabase: jest.fn(() => {
        const mockRequest = {
            onsuccess: null,
            onerror: null,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        // Simulate async success callback
        setTimeout(() => {
            if (mockRequest.onsuccess) mockRequest.onsuccess();
        }, 0);
        return mockRequest;
    })
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

// Mock Canvas API - Define HTMLCanvasElement first for JSDOM environment
global.HTMLCanvasElement = global.HTMLCanvasElement || class HTMLCanvasElement {};

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

// Mock matchMedia API for testing media queries
global.matchMedia = jest.fn((query) => ({
    matches: false, // Default to desktop behavior in tests
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
}));

// Mock navigator API for touch device detection
if (!global.navigator) {
    global.navigator = {
        maxTouchPoints: 0, // Default to desktop behavior
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
}

// Setup DOM before each test
beforeEach(() => {
    // Only set up DOM if document is available (i.e., in JSDOM environment)
    if (typeof document !== 'undefined') {
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
                <aside class="sidebar" data-role="sidebar"></aside>
                <div class="viewer-controls" data-role="viewer-toolbar">
                    <button id="prev-page-btn">◀</button>
                    <span id="page-info" data-role="page-info">Page 1 of 1</span>
                    <button id="next-page-btn">▶</button>
                    <button data-role="zoom-in">+</button>
                    <button data-role="zoom-out">-</button>
                    <span data-role="zoom-display"></span>
                    <button data-role="setup-practice-plan">Setup practice plan</button>
                    <button data-role="toggle-focus-mode" aria-pressed="false"></button>
                    <div data-role="current-score-title" class="current-score-title"></div>
                    <div data-role="practice-session-timer" style="display: none;">
                        <span data-role="timer-display">05:00</span>
                        <button data-role="timer-pause">⏸</button>
                        <button data-role="timer-next">Next</button>
                        <button data-role="timer-stop">Stop</button>
                    </div>
                </div>
                <div class="pdf-viewer-container" data-role="pdf-viewer">
                    <canvas id="pdf-canvas" data-role="pdf-canvas"></canvas>
                    <div class="selection-overlay" data-role="selection-overlay" style="display: none;"></div>
                </div>
                <div data-role="practice-planner" style="display: none;">
                    <button data-role="exit-practice-planning">Exit practice planning</button>
                    <div data-role="no-highlights-message">
                        <p>No highlighted sections yet</p>
                        <button data-role="return-to-highlighting">Return to highlighting</button>
                    </div>
                    <div data-role="practice-plan-content" style="display: none;">
                        <div class="space-y-6">
                            <!-- Session Configuration -->
                            <div class="space-y-4">
                                <h4 class="text-lg font-semibold text-foreground">Session Configuration</h4>
                                
                                <!-- Session Name -->
                                <div>
                                    <label for="session-name" class="block text-sm font-medium text-foreground mb-2">
                                        Session Name
                                    </label>
                                    <input 
                                        type="text" 
                                        id="session-name" 
                                        data-role="session-name"
                                        class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Enter session name (e.g., Morning Practice)"
                                    />
                                </div>

                                <!-- Session Duration & Focus -->
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label for="session-duration" class="block text-sm font-medium text-foreground mb-2">
                                            Target Duration (minutes)
                                        </label>
                                        <input 
                                            type="number" 
                                            id="session-duration" 
                                            data-role="session-duration"
                                            class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="30"
                                            min="5"
                                            max="180"
                                        />
                                    </div>
                                    <div>
                                        <label for="session-focus" class="block text-sm font-medium text-foreground mb-2">
                                            Session Focus
                                        </label>
                                        <select 
                                            id="session-focus" 
                                            data-role="session-focus"
                                            class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="accuracy">Accuracy</option>
                                            <option value="tempo">Tempo Building</option>
                                            <option value="expression">Expression</option>
                                            <option value="technique">Technique</option>
                                            <option value="memorization">Memorization</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Practice Sections -->
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <h4 class="text-lg font-semibold text-foreground">Practice Sections</h4>
                                    <span class="text-sm text-muted-foreground" data-role="section-count">0 sections</span>
                                </div>
                                
                                <!-- Sections List -->
                                <div data-role="practice-sections-list" class="space-y-3">
                                    <!-- Dynamic content: practice sections will be inserted here -->
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex gap-3 pt-4 border-t border-border">
                                <button data-role="start-practice-session" class="btn btn-default flex-1">
                                    <i data-lucide="play" class="w-4 h-4 mr-2"></i>
                                    Start Practice Session
                                </button>
                                <button data-role="save-practice-plan" class="btn btn-outline">
                                    <i data-lucide="save" class="w-4 h-4 mr-2"></i>
                                    Save Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Highlighting Toggle -->
                <div class="flex items-center justify-center mb-2">
                    <button data-role="toggle-highlighting" id="highlighting-toggle" class="btn btn-outline w-full text-xs" aria-pressed="false">
                        <i data-lucide="pen-tool" class="w-4 h-4 mr-1"></i>
                        <span>Highlight Sections</span>
                    </button>
                </div>
                
                <!-- Confidence Panel (hidden by default) -->
                <div id="confidence-panel" class="p-4 border-b border-border" style="display: none;">
                    <div class="text-sm font-medium mb-3 text-foreground">Mark Section Confidence:</div>
                    <div class="flex flex-col gap-2" id="confidence-controls">
                        <button id="color-green" data-role="color-green" data-color="green" class="confidence-btn btn btn-outline w-full flex items-center gap-3 justify-start" aria-pressed="false">
                            <div class="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>Confident</span>
                        </button>
                        <button id="color-amber" data-role="color-amber" data-color="amber" class="confidence-btn btn btn-outline w-full flex items-center gap-3 justify-start" aria-pressed="false">
                            <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                            <span>Unsure</span>
                        </button>
                        <button id="color-red" data-role="color-red" data-color="red" class="confidence-btn btn btn-outline w-full flex items-center gap-3 justify-start" aria-pressed="false">
                            <div class="w-3 h-3 rounded-full bg-red-500"></div>
                            <span>Needs Work</span>
                        </button>
                    </div>
                </div>
                
                <div class="highlight-controls" style="display: none;">
                    <!-- Legacy confidence buttons for backward compatibility -->
                    <button id="color-green" data-role="color-green" data-color="green">●</button>
                    <button id="color-amber" data-role="color-amber" data-color="amber">●</button>
                    <button id="color-red" data-role="color-red" data-color="red">●</button>
                </div>
                <div class="practice-controls">
                    <button id="focus-section-btn" style="display: none;">Focus</button>
                    <button id="exit-focus-btn" style="display: none;">Exit</button>
                </div>
            </section>
        </main>
    `;
    }
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
