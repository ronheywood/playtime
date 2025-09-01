/**
 * Practice Session Tim    dispatchEvent: jest.fn(),
}));

const { PracticeSessionTimer } = require('../../scripts/practice/practice-session-timer.js');it Tests
 * Tests the timer component in isolation
 */

const { JSDOM } = require('jsdom');

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock navigator API for touch device detection
global.navigator = {
    maxTouchPoints: 0, // Default to desktop behavior
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ...dom.window.navigator
};

// Mock matchMedia API for testing
global.window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false, // Default to desktop behavior in tests
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
}));
global.window = dom.window;

const PracticeSessionTimer = require('../../scripts/practice/practice-session-timer');

describe('PracticeSessionTimer', () => {
    let timer;
    let mockLogger;
    let onTimerComplete;
    let onTimerTick;
    let onPauseToggle;
    let onManualNext;
    let onExit;

    beforeEach(() => {
        // Mock logger
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

        // Mock callbacks
        onTimerComplete = jest.fn();
        onTimerTick = jest.fn();
        onPauseToggle = jest.fn();
        onManualNext = jest.fn();
        onExit = jest.fn();

        // Set up DOM elements that the timer expects
        document.body.innerHTML = `
            <div data-role="main-toolbar">
                <div id="practice-session-timer" data-role="practice-session-timer" style="display: none;">
                    <div data-role="time-remaining">05:00</div>
                    <button data-role="pause-timer">
                        <i data-lucide="pause"></i>
                    </button>
                    <button data-role="next-section">Next</button>
                    <button data-role="exit-practice-session">Exit</button>
                </div>
            </div>
        `;

        // Mock window.lucide for icon updates
        global.window.lucide = {
            createIcons: jest.fn()
        };

        // Create timer instance
        timer = new PracticeSessionTimer({
            logger: mockLogger,
            onTimerComplete,
            onTimerTick,
            onPauseToggle,
            onManualNext,
            onExit
        });
    });

    afterEach(() => {
        // Clean up any running timers
        if (timer) {
            timer.destroy();
        }
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    describe('Constructor', () => {
        test('should initialize with default options', () => {
            const basicTimer = new PracticeSessionTimer();
            
            expect(basicTimer.isRunning).toBe(false);
            expect(basicTimer.isPaused).toBe(false);
            expect(basicTimer.timeLeftSeconds).toBe(0);
            expect(basicTimer.timerId).toBeNull();
            expect(basicTimer.listenersAttached).toBe(false);
        });

        test('should initialize with provided options', () => {
            expect(timer.logger).toBe(mockLogger);
            expect(timer.onTimerComplete).toBe(onTimerComplete);
            expect(timer.onTimerTick).toBe(onTimerTick);
            expect(timer.onPauseToggle).toBe(onPauseToggle);
            expect(timer.onManualNext).toBe(onManualNext);
            expect(timer.onExit).toBe(onExit);
        });

        test('should set up proper selectors', () => {
            expect(timer.selectors.timerContainer).toBe('[data-role="practice-session-timer"]');
            expect(timer.selectors.mainToolbar).toBe('[data-role="main-toolbar"]');
            expect(timer.selectors.timeRemaining).toBe('[data-role="time-remaining"]');
            expect(timer.selectors.pauseButton).toBe('[data-role="pause-timer"]');
            expect(timer.selectors.nextButton).toBe('[data-role="next-section"]');
            expect(timer.selectors.exitButton).toBe('[data-role="exit-practice-session"]');
        });
    });

    describe('Timer Lifecycle', () => {
        test('should start timer correctly', () => {
            jest.useFakeTimers();
            
            timer.startTimer(2); // 2 minutes
            
            expect(timer.isRunning).toBe(true);
            expect(timer.isPaused).toBe(false);
            expect(timer.timeLeftSeconds).toBe(120); // 2 * 60
            expect(timer.targetTimeMinutes).toBe(2);
            expect(timer.timerId).toBeTruthy();
            
            // Should show timer UI
            const timerElement = document.querySelector('[data-role="practice-session-timer"]');
            expect(timerElement.style.display).toBe('block');
            
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Session Timer: Timer started', {
                targetTimeMinutes: 2,
                timeLeftSeconds: 120
            });
        });

        test('should handle zero time correctly', async () => {
            const completeTimerSpy = jest.spyOn(timer, 'completeTimer');
            
            timer.startTimer(0);
            
            // Should complete immediately for zero time
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(completeTimerSpy).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Timer: Timer started with 0 or negative time, completing immediately'
            );
        });

        test('should tick correctly', () => {
            jest.useFakeTimers();
            
            timer.startTimer(1); // 1 minute
            
            // Advance by 1 second
            jest.advanceTimersByTime(1000);
            
            expect(timer.timeLeftSeconds).toBe(59);
            expect(onTimerTick).toHaveBeenCalledWith(59);
            
            // Advance by another second
            jest.advanceTimersByTime(1000);
            
            expect(timer.timeLeftSeconds).toBe(58);
            expect(onTimerTick).toHaveBeenCalledWith(58);
        });

        test('should complete when time reaches zero', () => {
            jest.useFakeTimers();
            const completeTimerSpy = jest.spyOn(timer, 'completeTimer');
            
            timer.startTimer(1/60); // 1 second
            
            // Advance by 1 second to complete
            jest.advanceTimersByTime(1000);
            
            expect(completeTimerSpy).toHaveBeenCalled();
            expect(timer.isRunning).toBe(false);
            expect(timer.timerId).toBeNull();
        });

        test('should call onTimerComplete', () => {
            timer.completeTimer();
            
            expect(onTimerComplete).toHaveBeenCalledWith();
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Practice Session Timer: Timer completed, calling callback'
            );
        });
    });

    describe('Pause/Resume Functionality', () => {
        test('should pause and resume correctly', () => {
            jest.useFakeTimers();
            
            timer.startTimer(2);
            expect(timer.isPaused).toBe(false);
            
            // Pause
            timer.togglePause();
            expect(timer.isPaused).toBe(true);
            expect(onPauseToggle).toHaveBeenCalledWith(true);
            
            // Resume
            timer.togglePause();
            expect(timer.isPaused).toBe(false);
            expect(onPauseToggle).toHaveBeenCalledWith(false);
        });

        test('should not tick when paused', () => {
            jest.useFakeTimers();
            
            timer.startTimer(2);
            const initialTime = timer.timeLeftSeconds;
            
            timer.togglePause();
            jest.advanceTimersByTime(2000);
            
            // Time should not have changed
            expect(timer.timeLeftSeconds).toBe(initialTime);
        });

        test('should not pause when not running', () => {
            timer.togglePause();
            
            expect(timer.isPaused).toBe(false);
            expect(onPauseToggle).not.toHaveBeenCalled();
        });

        test('should update pause button icon', () => {
            timer.startTimer(1);
            
            const pauseButton = document.querySelector('[data-role="pause-timer"]');
            const icon = pauseButton.querySelector('i');
            
            // Initially should show pause icon
            timer.updateDisplay();
            expect(icon.getAttribute('data-lucide')).toBe('pause');
            expect(pauseButton.title).toBe('Pause timer');
            
            // After pausing should show play icon
            timer.togglePause();
            expect(icon.getAttribute('data-lucide')).toBe('play');
            expect(pauseButton.title).toBe('Resume timer');
        });
    });

    describe('Manual Controls', () => {
        test('should handle manual next', () => {
            timer.startTimer(2);
            timer.manualNext();
            
            expect(timer.isRunning).toBe(false);
            expect(timer.timerId).toBeNull();
            expect(onManualNext).toHaveBeenCalledWith();
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Session Timer: Manual advance triggered');
        });

        test('should handle stop/exit', () => {
            timer.startTimer(2);
            timer.stop();
            
            expect(timer.isRunning).toBe(false);
            expect(timer.timerId).toBeNull();
            expect(onExit).toHaveBeenCalledWith();
            
            // Should hide timer UI
            const timerElement = document.querySelector('[data-role="practice-session-timer"]');
            expect(timerElement.style.display).toBe('none');
        });

        test('should not handle manual controls when not running', () => {
            timer.manualNext();
            timer.stop();
            
            expect(onManualNext).not.toHaveBeenCalled();
        });
    });

    describe('Display Updates', () => {
        test('should format time correctly', () => {
            timer.startTimer(5); // 5 minutes = 300 seconds
            
            const timeElement = document.querySelector('[data-role="time-remaining"]');
            expect(timeElement.textContent).toBe('05:00');
            
            timer.timeLeftSeconds = 125; // 2:05
            timer.updateDisplay();
            expect(timeElement.textContent).toBe('02:05');
            
            timer.timeLeftSeconds = 5; // 0:05
            timer.updateDisplay();
            expect(timeElement.textContent).toBe('00:05');
        });

        test('should add warning and critical classes', () => {
            const timeElement = document.querySelector('[data-role="time-remaining"]');
            
            // Normal time - no classes
            timer.timeLeftSeconds = 120;
            timer.updateDisplay();
            expect(timeElement.classList.contains('warning')).toBe(false);
            expect(timeElement.classList.contains('critical')).toBe(false);
            
            // Warning time (≤ 60 seconds)
            timer.timeLeftSeconds = 45;
            timer.updateDisplay();
            expect(timeElement.classList.contains('warning')).toBe(true);
            expect(timeElement.classList.contains('critical')).toBe(false);
            
            // Critical time (≤ 30 seconds)
            timer.timeLeftSeconds = 15;
            timer.updateDisplay();
            expect(timeElement.classList.contains('warning')).toBe(false);
            expect(timeElement.classList.contains('critical')).toBe(true);
        });
    });

    describe('Event Listeners', () => {
        test('should attach event listeners only once', () => {
            const pauseButton = document.querySelector('[data-role="pause-timer"]');
            const nextButton = document.querySelector('[data-role="next-section"]');
            const exitButton = document.querySelector('[data-role="exit-practice-session"]');
            
            const addEventListenerSpy = jest.spyOn(pauseButton, 'addEventListener');
            
            timer.attachEventListeners();
            timer.attachEventListeners(); // Call again
            
            // Should only be called once due to listenersAttached flag
            expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
            expect(timer.listenersAttached).toBe(true);
        });

        test('should handle button clicks', () => {
            timer.startTimer(1);
            timer.attachEventListeners();
            
            const togglePauseSpy = jest.spyOn(timer, 'togglePause');
            const manualNextSpy = jest.spyOn(timer, 'manualNext');
            const stopSpy = jest.spyOn(timer, 'stop');
            
            // Test pause button
            const pauseButton = document.querySelector('[data-role="pause-timer"]');
            pauseButton.click();
            expect(togglePauseSpy).toHaveBeenCalled();
            
            // Test next button
            const nextButton = document.querySelector('[data-role="next-section"]');
            nextButton.click();
            expect(manualNextSpy).toHaveBeenCalled();
            
            // Test exit button
            const exitButton = document.querySelector('[data-role="exit-practice-session"]');
            exitButton.click();
            expect(stopSpy).toHaveBeenCalled();
        });
    });

    describe('UI Show/Hide', () => {
        test('should show timer UI', () => {
            const timerElement = document.querySelector('[data-role="practice-session-timer"]');
            timerElement.style.display = 'none';
            
            timer.show();
            expect(timerElement.style.display).toBe('block');
        });

        test('should hide timer UI', () => {
            const timerElement = document.querySelector('[data-role="practice-session-timer"]');
            timerElement.style.display = 'block';
            
            timer.hide();
            expect(timerElement.style.display).toBe('none');
        });

        test('should handle missing timer element gracefully', () => {
            const timerElement = document.querySelector('[data-role="practice-session-timer"]');
            timerElement.remove();
            
            // Should not throw errors
            expect(() => {
                timer.show();
                timer.hide();
            }).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        test('should destroy properly', () => {
            timer.startTimer(1);
            const timerId = timer.timerId;
            
            timer.destroy();
            
            expect(timer.isRunning).toBe(false);
            expect(timer.timerId).toBeNull();
            expect(timer.listenersAttached).toBe(false);
            
            // Should hide UI
            const timerElement = document.querySelector('[data-role="practice-session-timer"]');
            expect(timerElement.style.display).toBe('none');
            
            expect(mockLogger.info).toHaveBeenCalledWith('Practice Session Timer: Component destroyed');
        });

        test('should clear existing timer when starting new one', () => {
            jest.useFakeTimers();
            
            timer.startTimer(1);
            const firstTimerId = timer.timerId;
            
            timer.startTimer(2);
            const secondTimerId = timer.timerId;
            
            expect(firstTimerId).not.toBe(secondTimerId);
            expect(timer.timeLeftSeconds).toBe(120); // 2 minutes
        });
    });

    describe('Edge Cases', () => {
        test('should handle negative time values', async () => {
            const completeTimerSpy = jest.spyOn(timer, 'completeTimer');
            
            timer.startTimer(-1);
            
            // Should complete immediately for negative time
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(completeTimerSpy).toHaveBeenCalled();
        });

        test('should handle fractional minutes correctly', () => {
            timer.startTimer(1.5); // 1.5 minutes
            expect(timer.timeLeftSeconds).toBe(90); // 1.5 * 60, rounded
        });

        test('should handle very small time values', () => {
            timer.startTimer(0.01); // 0.01 minutes = 0.6 seconds
            expect(timer.timeLeftSeconds).toBe(1); // Rounded to 1 second
        });
    });
});
