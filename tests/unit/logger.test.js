// Unit Tests for Logger Implementation
// Tests the centralized logging utility and its integration with main.js

const logger = require('../../scripts/logger');

describe('Logger Implementation', () => {
    let consoleSpy;

    beforeEach(() => {
        // Reset logger state
        logger.setSilent(false);
        
        // Spy on console methods
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(() => {}),
            warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
            error: jest.spyOn(console, 'error').mockImplementation(() => {})
        };
    });

    afterEach(() => {
        // Restore console methods
        consoleSpy.log.mockRestore();
        consoleSpy.warn.mockRestore();
        consoleSpy.error.mockRestore();
    });

    describe('Logger Basic Functionality', () => {
        test('should log info messages with checkmark emoji', () => {
            logger.info('Test info message');
            
            expect(consoleSpy.log).toHaveBeenCalledWith('✅', 'Test info message');
        });

        test('should log loading messages with loading emoji', () => {
            logger.loading('Loading something...');
            
            expect(consoleSpy.log).toHaveBeenCalledWith('🔄', 'Loading something...');
        });

        test('should log warning messages with X emoji', () => {
            logger.warn('Test warning message');
            
            expect(consoleSpy.warn).toHaveBeenCalledWith('❌', 'Test warning message');
        });

        test('should log error messages with X emoji', () => {
            logger.error('Test error message');
            
            expect(consoleSpy.error).toHaveBeenCalledWith('❌', 'Test error message');
        });

        test('should handle multiple arguments', () => {
            const error = new Error('Test error');
            logger.error('Database failed:', error);
            
            expect(consoleSpy.error).toHaveBeenCalledWith('❌', 'Database failed:', error);
        });
    });

    describe('Logger Silent Mode', () => {
        test('should silence all logging when setSilent(true)', () => {
            logger.setSilent(true);
            
            logger.info('This should be silent');
            logger.warn('This should be silent');
            logger.error('This should be silent');
            logger.loading('This should be silent');
            
            expect(consoleSpy.log).not.toHaveBeenCalled();
            expect(consoleSpy.warn).not.toHaveBeenCalled();
            expect(consoleSpy.error).not.toHaveBeenCalled();
        });

        test('should resume logging when setSilent(false)', () => {
            logger.setSilent(true);
            logger.info('Silent message');
            
            logger.setSilent(false);
            logger.info('Visible message');
            
            expect(consoleSpy.log).toHaveBeenCalledTimes(1);
            expect(consoleSpy.log).toHaveBeenCalledWith('✅', 'Visible message');
        });
    });

    describe('Main.js Integration', () => {
        beforeEach(() => {
            // Mock document before requiring main.js to prevent DOMContentLoaded execution
            global.document = {
                addEventListener: jest.fn(),
                querySelector: jest.fn(),
                createElement: jest.fn(() => ({
                    className: '',
                    textContent: '',
                    setAttribute: jest.fn(),
                    appendChild: jest.fn(),
                    style: {}
                })),
                body: {
                    appendChild: jest.fn()
                }
            };
            
            // Mock window objects that main.js expects
            global.window = {
                PlayTimeDB: {
                    init: jest.fn().mockResolvedValue(true)
                },
                PlayTimePDFViewer: {
                    init: jest.fn().mockResolvedValue(true)
                },
                PlayTimeHighlighting: {
                    init: jest.fn().mockResolvedValue(true)
                }
            };
            
            // Mock logger for main.js
            global.logger = logger;
        });

        afterEach(() => {
            // Clean up global mocks
            delete global.document;
            delete global.window;
            delete global.logger;
            
            // Clear require cache to ensure fresh imports
            jest.resetModules();
        });

        test('should load main.js without errors and export required functions', () => {
            const mainJs = require('../../scripts/main.js');
            
            expect(mainJs).toBeDefined();
            expect(mainJs.CONFIG).toBeDefined();
            expect(mainJs.isValidPDFFile).toBeInstanceOf(Function);
            expect(mainJs.updatePDFViewerStatus).toBeInstanceOf(Function);
            expect(mainJs.initializeFileUpload).toBeInstanceOf(Function);
            // initializePageNavigation was deprecated and removed; controls handled inside viewer
        });

        test('should have CONFIG object with all required sections', () => {
            const { CONFIG } = require('../../scripts/main.js');
            
            expect(CONFIG.SELECTORS).toBeDefined();
            expect(CONFIG.FILE_TYPES).toBeDefined();
            expect(CONFIG.MESSAGES).toBeDefined();
            expect(CONFIG.SETTINGS).toBeDefined();
            
            // Check specific selectors
            expect(CONFIG.SELECTORS.FILE_INPUT).toBe('#pdf-upload');
            expect(CONFIG.SELECTORS.PDF_VIEWER).toBe('.pdf-viewer-container');
            
            // Check file types
            expect(CONFIG.FILE_TYPES.PDF).toBe('application/pdf');
            
            // Check messages
            expect(CONFIG.MESSAGES.ERROR_INVALID_FILE).toBe('Error: Please select a PDF file');
            expect(CONFIG.MESSAGES.ERROR_ELEMENTS_NOT_FOUND).toBe('Required elements not found');
        });

        test('should validate PDF files correctly', () => {
            const { isValidPDFFile } = require('../../scripts/main.js');
            
            const validPDFFile = { type: 'application/pdf', name: 'test.pdf' };
            const invalidFile = { type: 'text/plain', name: 'test.txt' };
            const nullFile = null;
            const undefinedFile = undefined;
            
            expect(isValidPDFFile(validPDFFile)).toBe(true);
            expect(isValidPDFFile(invalidFile)).toBe(false);
            expect(isValidPDFFile(nullFile)).toBe(false);
            expect(isValidPDFFile(undefinedFile)).toBe(false);
        });
    });

    describe('Logger vs Console Comparison', () => {
        test('should demonstrate the benefit of logger over direct console calls', () => {
            // Before: Direct console calls (noisy in tests)
            console.log('✅ Direct console call - always visible');
            console.warn('❌ Direct console warn - always visible');
            
            // After: Using logger (can be silenced)
            logger.setSilent(true);
            logger.info('Logger info - can be silenced for tests');
            logger.warn('Logger warn - can be silenced for tests');
            
            // Verify direct console calls still happened
            expect(consoleSpy.log).toHaveBeenCalledWith('✅ Direct console call - always visible');
            expect(consoleSpy.warn).toHaveBeenCalledWith('❌ Direct console warn - always visible');
            
            // Verify logger calls were silenced
            expect(consoleSpy.log).not.toHaveBeenCalledWith('✅', 'Logger info - can be silenced for tests');
            expect(consoleSpy.warn).not.toHaveBeenCalledWith('❌', 'Logger warn - can be silenced for tests');
        });
    });

    describe('Test Environment Detection', () => {
        test('should detect test environment correctly', () => {
            // Logger should be silent by default in test environment
            // We can test this by checking if jest is defined
            expect(typeof jest).toBe('object');
            
            // Test that logger can be controlled in test environment
            expect(logger.setSilent).toBeInstanceOf(Function);
            
            // The logger instance might not be silent if it was already initialized
            // but we can verify it responds to setSilent calls
            const originalSilent = logger.isSilent;
            logger.setSilent(true);
            expect(logger.isSilent).toBe(true);
            logger.setSilent(false);
            expect(logger.isSilent).toBe(false);
            logger.setSilent(originalSilent); // Restore original state
        });
    });
});

describe('Real-world Usage Scenarios', () => {
    beforeEach(() => {
        // Mock DOM elements that main.js functions expect
        global.document = {
            addEventListener: jest.fn(),
            querySelector: jest.fn(),
            createElement: jest.fn(() => ({
                className: '',
                textContent: '',
                setAttribute: jest.fn(),
                appendChild: jest.fn(),
                style: {}
            })),
            body: {
                appendChild: jest.fn()
            }
        };
        
        // Mock window objects
        global.window = {
            PlayTimeDB: {
                init: jest.fn().mockResolvedValue(true)
            },
            PlayTimePDFViewer: {
                init: jest.fn().mockResolvedValue(true)
            },
            PlayTimeHighlighting: {
                init: jest.fn().mockResolvedValue(true)
            }
        };
        
        // Mock global logger for main.js
        global.logger = logger;
        jest.spyOn(logger, 'warn').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});
        jest.spyOn(logger, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.document;
        delete global.window;
        delete global.logger;
        jest.resetModules();
    });

    test('should handle missing DOM elements gracefully with logger', () => {
        const { initializeFileUpload } = require('../../scripts/main.js');
        
        // Mock querySelector to return null (missing elements)
        global.document.querySelector.mockReturnValue(null);
        
        // This should log a warning instead of throwing
        initializeFileUpload();
        
        expect(logger.warn).toHaveBeenCalledWith('Required elements not found');
    });

    // Removed test for deprecated initializePageNavigation wrapper.
});
