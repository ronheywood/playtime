/**
 * Practice Session Timer Component
 * 
 * Handles countdown timer functionality including:
 * - Timer display and countdown
 * - Pause/resume functionality
 * - Visual warning states
 * - Event emission for timer completion
 * - UI controls for timer
 */
class PracticeSessionTimer {
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.timerId = null;
        this.isRunning = false;
        this.isPaused = false;
        this.timeLeftSeconds = 0;
        this.targetTimeMinutes = 0;
        this.listenersAttached = false;
        
        // Callbacks for timer events
        this.onTimerComplete = options.onTimerComplete || (() => {});
        this.onTimerTick = options.onTimerTick || (() => {});
        this.onPauseToggle = options.onPauseToggle || (() => {});
        this.onManualNext = options.onManualNext || (() => {});
        this.onExit = options.onExit || (() => {});
        this.onNotesChange = options.onNotesChange || (() => {});
        
        // DOM selectors
        this.selectors = {
            timerContainer: '#practice-session-timer',
            timeRemaining: '[data-role="time-remaining"]',
            pauseButton: '[data-role="pause-timer"]',
            nextButton: '[data-role="next-section"]',
            exitButton: '[data-role="exit-practice-session"]'
        };
    }
    
    /**
     * Start timer for a specific duration
     */
    startTimer(targetTimeMinutes) {
        this.targetTimeMinutes = targetTimeMinutes;
        this.timeLeftSeconds = Math.round(targetTimeMinutes * 60); // Convert minutes to seconds, round to handle decimals
        this.isPaused = false;
        this.isRunning = true;
        
        // Clear any existing timer
        if (this.timerId) {
            clearInterval(this.timerId);
        }
        
        this.show();
        this.attachEventListeners();
        
        // Update display immediately
        this.updateDisplay();
        
        this.logger.info('Practice Session Timer: Timer started', {
            targetTimeMinutes,
            timeLeftSeconds: this.timeLeftSeconds
        });
        
        // If timer is already at 0 or negative, complete immediately
        if (this.timeLeftSeconds <= 0) {
            this.logger.info('Practice Session Timer: Timer started with 0 or negative time, completing immediately');
            // Use setTimeout to complete asynchronously
            setTimeout(() => this.completeTimer(), 0);
            return;
        }
        
        // Start countdown
        this.timerId = setInterval(() => {
            if (!this.isPaused && this.isRunning) {
                this.timeLeftSeconds--;
                this.updateDisplay();
                
                // Emit tick event
                this.onTimerTick(this.timeLeftSeconds);
                
                this.logger.debug?.('Practice Session Timer: Tick', { 
                    timeLeftSeconds: this.timeLeftSeconds,
                    isRunning: this.isRunning,
                    isPaused: this.isPaused
                });
                
                if (this.timeLeftSeconds <= 0) {
                    this.logger.info('Practice Session Timer: Timer reached zero, completing');
                    this.completeTimer();
                }
            }
        }, 1000);
    }
    
    /**
     * Complete the timer and emit completion event
     */
    completeTimer() {
        // Clear the timer
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        
        this.isRunning = false;
        
        this.logger.info('Practice Session Timer: Timer completed, calling callback');
        
        // Emit completion event
        this.onTimerComplete();
        
        this.logger.info('Practice Session Timer: Timer completed');
    }
    
    /**
     * Toggle pause/resume
     */
    togglePause() {
        if (!this.isRunning) return;
        
        this.isPaused = !this.isPaused;
        this.updateDisplay();
        
        // Emit pause toggle event
        this.onPauseToggle(this.isPaused);
        
        this.logger.debug?.('Practice Session Timer: Pause toggled', { 
            isPaused: this.isPaused 
        });
    }
    
    /**
     * Manually advance to next (triggered by next button)
     */
    manualNext() {
        if (!this.isRunning) return;
        
        // Stop current timer
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        
        this.isRunning = false;
        
        // Emit manual next event
        this.onManualNext();
        
        this.logger.info('Practice Session Timer: Manual advance triggered');
    }
    
    /**
     * Stop the timer and exit
     */
    stop() {
        // Clear timer
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        
        this.isRunning = false;
        this.hide();
        
        // Emit exit event
        this.onExit();
        
        this.logger.info('Practice Session Timer: Timer stopped');
    }
    
    /**
     * Update the timer display
     */
    updateDisplay() {
        const timeRemainingElement = document.querySelector(this.selectors.timeRemaining);
        const pauseButton = document.querySelector(this.selectors.pauseButton);
        
        // Update time display
        if (timeRemainingElement) {
            const minutes = Math.floor(this.timeLeftSeconds / 60);
            const seconds = this.timeLeftSeconds % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timeRemainingElement.textContent = timeString;
            
            // Add warning/critical classes
            timeRemainingElement.classList.remove('warning', 'critical');
            if (this.timeLeftSeconds <= 30) {
                timeRemainingElement.classList.add('critical');
            } else if (this.timeLeftSeconds <= 60) {
                timeRemainingElement.classList.add('warning');
            }
        }
        
        // Update pause button icon
        if (pauseButton) {
            const icon = pauseButton.querySelector('i');
            if (icon) {
                if (this.isPaused) {
                    icon.setAttribute('data-lucide', 'play');
                    pauseButton.title = 'Resume timer';
                } else {
                    icon.setAttribute('data-lucide', 'pause');
                    pauseButton.title = 'Pause timer';
                }
                // Refresh lucide icons
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        }
    }
    
    /**
     * Show the timer UI
     */
    show() {
        const timerContainer = document.querySelector(this.selectors.timerContainer);
        if (timerContainer) {
            timerContainer.style.display = 'block';
        }
    }
    
    /**
     * Hide the timer UI
     */
    hide() {
        const timerContainer = document.querySelector(this.selectors.timerContainer);
        if (timerContainer) {
            timerContainer.style.display = 'none';
        }
    }
    
    /**
     * Get current notes from textarea
    /**
     * Attach event listeners to timer controls
     */
    attachEventListeners() {
        if (this.listenersAttached) return;
        
        const pauseButton = document.querySelector(this.selectors.pauseButton);
        const nextButton = document.querySelector(this.selectors.nextButton);
        const exitButton = document.querySelector(this.selectors.exitButton);
        
        if (pauseButton) {
            pauseButton.addEventListener('click', () => this.togglePause());
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => this.manualNext());
        }
        
        if (exitButton) {
            exitButton.addEventListener('click', () => this.stop());
        }
        
        this.listenersAttached = true;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        
        this.isRunning = false;
        this.listenersAttached = false;
        this.hide();
        
        this.logger.info('Practice Session Timer: Component destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeSessionTimer;
} else {
    window.PracticeSessionTimer = PracticeSessionTimer;
}
