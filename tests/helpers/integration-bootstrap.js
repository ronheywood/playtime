/**
 * Integration Test Bootstrap (Pure CommonJS - No Window Dependencies)
 * 
 * This provides a CommonJS-only path to bootstrap the PlayTime application
 * for integration tests, avoiding both ES6 import/export issues and window dependencies.
 */

const fs = require('fs');
const path = require('path');

/**
 * Load a module by dynamically executing it without ES6 exports
 */
function loadModuleWithoutES6(modulePath) {
    const fullPath = path.resolve(__dirname, modulePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Remove ES6 export statements that cause Jest to fail
    content = content.replace(/^export\s+\{[^}]+\};\s*$/gm, '');
    
    // Create isolated module context
    const moduleExports = {};
    const moduleObj = { exports: moduleExports };
    
    // Execute the module code in isolated context
    const moduleFunction = new Function(
        'module', 
        'exports', 
        'require', 
        '__filename', 
        '__dirname',
        'console',
        'global',
        content
    );
    
    moduleFunction(
        moduleObj,
        moduleExports,
        require,
        fullPath,
        path.dirname(fullPath),
        console,
        global
    );
    
    return moduleObj.exports;
}

/**
 * Bootstrap the application for integration tests using pure CommonJS
 * Completely eliminates window dependencies by providing the DI container factory
 */
async function bootstrapApplicationForTests() {
    try {
        console.log('🧪 Bootstrapping PlayTime Application for Integration Tests (No Window Dependencies)...');

        // Ensure we have DOM globals available
        if (!global.document || !global.window) {
            throw new Error('DOM environment not available - ensure Jest is using jsdom');
        }

        // Load core infrastructure using pure CommonJS
        const ServiceContainer = require('../../scripts/Core/Infrastructure/ServiceContainer.js');
        const AppState = require('../../scripts/Core/Infrastructure/AppState.js');
        const StateManager = require('../../scripts/Core/Infrastructure/StateManager.js');
        
        // Create a factory function that returns a properly configured DIContainer
        function createTestDiContainer() {
            // Create service container directly
            const serviceContainer = new ServiceContainer();
            
            // Create a DIContainer that uses our service container directly
            class TestDIContainer {
                constructor() {
                    this.container = serviceContainer;
                    this.initialized = false;
                    this.databaseInstance = null; // Will be set during initialization
                }
                
                // Delegate all methods to the service container
                register(name, factory, options = {}) {
                    return this.container.register(name, factory, options);
                }
                
                get(name) {
                    return this.container.get(name);
                }
                
                has(name) {
                    return this.container.has(name);
                }
                
                initialize() {
                    if (this.initialized) return;
                    
                    // Load MemoryDatabase for tests
                    const MemoryDatabase = require('../../scripts/db/MemoryDatabase.js');
                    
                    // Create shared database instance
                    this.databaseInstance = new MemoryDatabase();
                    
                    // Register core services directly without window dependencies
                    this.register('appState', () => new AppState(), { singleton: true });
                    this.register('stateManager', () => new StateManager(), { singleton: true });
                    
                    // Register in-memory database for tests
                    this.register('database', () => this.databaseInstance, { singleton: true });
                    
                    // Register logger
                    this.register('logger', () => ({
                        info: jest.fn(),
                        warn: jest.fn(),
                        error: jest.fn(),
                        debug: jest.fn()
                    }), { singleton: true });
                    
                    // Register mock UI services for tests
                    this.register('playTimePDFViewer', () => {
                        let currentPage = 1;
                        const totalPages = 3;
                        
                        const dispatchPageChanged = () => {
                            try {
                                const evName = 'playtime:page-changed';
                                const ev = new CustomEvent(evName, { detail: { page: currentPage } });
                                window.dispatchEvent(ev);
                            } catch (e) {
                                // Silent fail for test environment
                            }
                        };
                        
                        const mockViewer = {
                            init: jest.fn().mockResolvedValue(),
                            attachUIControls: jest.fn(),
                            loadPDF: jest.fn().mockImplementation(async (file) => {
                                // Simulate PDF loading by updating DOM with validation
                                const pdfViewer = document.querySelector('.pdf-viewer-container');
                                if (pdfViewer) {
                                    // Create or get status message element  
                                    let statusElement = pdfViewer.querySelector('.status-message');
                                    if (!statusElement) {
                                        statusElement = document.createElement('div');
                                        statusElement.className = 'status-message';
                                        pdfViewer.appendChild(statusElement);
                                    }
                                    
                                    // Validate file type (like real implementation)
                                    if (!file.type.includes('pdf')) {
                                        statusElement.textContent = 'Error: Please select a PDF file';
                                        statusElement.setAttribute('data-status', 'error');
                                        pdfViewer.textContent = 'Error: Please select a PDF file';
                                        throw new Error('Invalid file type');
                                    } else {
                                        statusElement.textContent = `Selected: ${file.name}`;
                                        statusElement.setAttribute('data-status', 'success');
                                    }
                                }
                                return Promise.resolve();
                            }),
                            renderPage: jest.fn().mockImplementation(async (page) => {
                                currentPage = page;
                                dispatchPageChanged();
                                return Promise.resolve();
                            }),
                            getCurrentPage: jest.fn().mockImplementation(() => currentPage),
                            getTotalPages: jest.fn().mockReturnValue(totalPages),
                            nextPage: jest.fn().mockImplementation(async () => {
                                if (currentPage < totalPages) {
                                    currentPage += 1;
                                    dispatchPageChanged();
                                }
                            }),
                            prevPage: jest.fn().mockImplementation(async () => {
                                if (currentPage > 1) {
                                    currentPage -= 1;
                                    dispatchPageChanged();
                                }
                            }),
                            setZoom: jest.fn(),
                            getZoom: jest.fn().mockReturnValue(1)
                        };
                        // Make the mock viewer available globally for some tests that expect it
                        global.window.PlayTimePDFViewer = mockViewer;
                        return mockViewer;
                    }, { singleton: true });
                    
                    this.register('playTimeScoreList', () => ({
                        init: jest.fn().mockResolvedValue(),
                        refresh: jest.fn().mockResolvedValue(),
                        selectScore: jest.fn(),
                        getCurrentScore: jest.fn().mockReturnValue(null)
                    }), { singleton: true });
                    
                    this.register('playTimeHighlighting', () => {
                        const mockHighlights = [];
                        let isSelecting = false;
                        let startPoint = null;
                        let activeColor = 'green';
                        let currentPage = 1;
                        
                        const updateHighlightVisibility = () => {
                            mockHighlights.forEach(highlight => {
                                const highlightPage = parseInt(highlight.dataset.page);
                                if (highlightPage === currentPage) {
                                    highlight.style.display = '';
                                } else {
                                    highlight.style.display = 'none';
                                }
                            });
                        };
                        
                        const createHighlight = (rect, color = activeColor, page = currentPage) => {
                            const element = document.createElement('div');
                            element.setAttribute('data-role', 'highlight');
                            element.setAttribute('data-color', color);
                            element.dataset.confidence = String(color === 'red' ? 0 : color === 'amber' ? 1 : 2);
                            element.dataset.page = String(page);
                            element.style.position = 'absolute';
                            element.style.left = rect.left + 'px';
                            element.style.top = rect.top + 'px';
                            element.style.width = rect.width + 'px';
                            element.style.height = rect.height + 'px';
                            element.style.background = `rgba(${color === 'red' ? '255,0,0' : color === 'amber' ? '255,193,7' : '0,255,0'}, 0.3)`;
                            element.style.border = `2px solid ${color === 'red' ? 'red' : color === 'amber' ? '#ffa000' : 'green'}`;
                            
                            // Initially visible if on current page
                            element.style.display = (page === currentPage) ? '' : 'none';
                            
                            mockHighlights.push(element);
                            const viewer = document.querySelector('[data-role="pdf-viewer"]');
                            if (viewer) {
                                viewer.appendChild(element);
                            }
                            
                            return element;
                        };
                        
                        return {
                            init: jest.fn().mockImplementation(async () => {
                                // Set up mouse event listeners on canvas to simulate highlighting
                                const canvas = document.querySelector('[data-role="pdf-canvas"]');
                                if (canvas) {
                                    canvas.addEventListener('mousedown', (e) => {
                                        isSelecting = true;
                                        startPoint = { x: e.clientX, y: e.clientY };
                                    });
                                    
                                    canvas.addEventListener('mouseup', (e) => {
                                        if (isSelecting && startPoint) {
                                            const endPoint = { x: e.clientX, y: e.clientY };
                                            const rect = {
                                                left: Math.min(startPoint.x, endPoint.x),
                                                top: Math.min(startPoint.y, endPoint.y),
                                                width: Math.abs(endPoint.x - startPoint.x),
                                                height: Math.abs(endPoint.y - startPoint.y)
                                            };
                                            
                                            // Only create highlight if drag is significant
                                            if (rect.width > 5 && rect.height > 5) {
                                                createHighlight(rect, activeColor, currentPage);
                                            }
                                        }
                                        isSelecting = false;
                                        startPoint = null;
                                    });
                                }
                                
                                // Listen for page change events to update highlight visibility
                                window.addEventListener('playtime:page-changed', (e) => {
                                    currentPage = e.detail.page;
                                    updateHighlightVisibility();
                                });
                                
                                return true;
                            }),
                            disableSelection: jest.fn(),
                            enableSelection: jest.fn(),
                            getHighlights: jest.fn().mockReturnValue(mockHighlights),
                            setActiveConfidenceFromColor: jest.fn().mockImplementation((color) => {
                                activeColor = color;
                            }),
                            addHighlight: jest.fn().mockImplementation((highlightData) => {
                                return createHighlight({
                                    left: 100, top: 100, width: 100, height: 50
                                }, highlightData?.color, highlightData?.page || currentPage);
                            }),
                            removeHighlight: jest.fn(),
                            _state: {
                                activeConfidence: 2
                            }
                        };
                    }, { singleton: true });
                    
                    // Register mock persistence service
                    this.register('highlightPersistenceService', () => ({
                        save: jest.fn().mockResolvedValue(),
                        load: jest.fn().mockResolvedValue([]),
                        delete: jest.fn().mockResolvedValue()
                    }), { singleton: true });
                    
                    this.initialized = true;
                }
            }
            
            return new TestDIContainer();
        }
        
        // Provide the DI container factory to the global window for PlayTimeApplication to use
        global.window.createDiContainer = createTestDiContainer;

        // Load PlayTimeApplication without ES6 exports
        const { PlayTimeApplication } = loadModuleWithoutES6('../../scripts/Core/PlayTimeApplication.js');
        
        if (!PlayTimeApplication) {
            throw new Error('PlayTimeApplication class not found in module exports');
        }

        // Create application instance (no parameters - it creates its own DIContainer)
        const app = new PlayTimeApplication();

        // Initialize the application (it will call window.createDiContainer internally)
        await app.initialize();
        
        // Now that the DI container is initialized, get the database instance for global access
        const databaseInstance = app.diContainer.databaseInstance;
        
        // Set up mock PlayTimeDB for file upload tests using the same database instance
        global.window.PlayTimeDB = {
            async getAll() {
                return await databaseInstance.getAll();
            },
            async save(file, metadata = {}) {
                return await databaseInstance.save(file, metadata);
            },
            async get(id) {
                return await databaseInstance.get(id);
            }
        };

        // Enable development mode for tests
        if (typeof app.enableDevMode === 'function') {
            app.enableDevMode();
        }

        console.log('✅ PlayTime Application bootstrapped successfully (No Window Dependencies)');
        
        // Store app instance for tests that need to access DI container
        global.testApp = app;
        
        return app;

    } catch (error) {
        console.error('❌ Failed to bootstrap PlayTime Application:', error);
        throw error;
    }
}

/**
 * Trigger DOM content loaded and bootstrap - for compatibility with existing test patterns
 */
async function triggerDOMContentLoaded() {
    const app = await bootstrapApplicationForTests();
    
    // Dispatch DOMContentLoaded event if not already done
    if (global.document && global.document.readyState !== 'loading') {
        global.document.dispatchEvent(new Event('DOMContentLoaded'));
    }
    
    return app;
}

module.exports = {
    bootstrapApplicationForTests,
    triggerDOMContentLoaded
};
