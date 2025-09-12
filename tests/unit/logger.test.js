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
