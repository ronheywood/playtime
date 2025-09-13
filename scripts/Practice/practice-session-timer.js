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
            timerContainer: '[data-role="practice-session-timer"]',
            mainToolbar: '[data-role="main-toolbar"]',
            timeRemaining: '[data-role="time-remaining"]',
            pauseButton: '[data-role="pause-timer"]',
            nextButton: '[data-role="next-section"]',
            exitButton: '[data-role="exit-practice-session"]'
        };
        
        // Mobile state tracking
        this.originalParent = null;
        this.isMovedToFixed = false;
        
        // Pinch-zoom detection for iPad/mobile
        this.visualViewportSupported = 'visualViewport' in window;
        this.initialViewportScale = 1;
        this.currentViewportScale = 1;
        this.isPinchZoomed = false;
        this.viewportChangeHandler = null;
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
        
        // Start viewport monitoring for pinch-zoom detection
        this._startViewportMonitoring();
        
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
            setTimeout(() => this.completeTimer(), 0).unref?.();
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
        
        // Add unref to prevent timer from keeping process alive in tests
        this.timerId.unref?.();
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
        
        // Stop viewport monitoring
        this._stopViewportMonitoring();
        
        this.isRunning = false;
        
        this.logger.info('Practice Session Timer: Timer completed, calling callback');
        
        // Reset pinch-zoom before showing completion feedback
        this.resetPinchZoom();
        
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
        
        // Stop viewport monitoring
        this._stopViewportMonitoring();
        
        this.isRunning = false;
        
        // Reset pinch-zoom before moving to next section
        this.resetPinchZoom();
        
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
        
        // Stop viewport monitoring
        this._stopViewportMonitoring();
        
        this.isRunning = false;
        
        // Reset pinch-zoom when exiting practice session
        this.resetPinchZoom();
        
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
            
            // Apply mobile-specific positioning if on touch device
            this._applyMobilePositioning(timerContainer);
        }
    }
    
    /**
     * Apply mobile-specific positioning for better iPad/mobile experience
     * @private
     */
    _applyMobilePositioning(timerContainer) {
        // Detect touch device
        const isTouchDevice = 'ontouchstart' in window || 
                             navigator.maxTouchPoints > 0 ||
                             window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        
        if (isTouchDevice) {
            // On mobile/tablet, ensure the timer is properly positioned
            // The CSS media query handles most styling, but we need to ensure proper z-index and positioning context
            timerContainer.style.position = 'fixed';
            timerContainer.style.zIndex = '9999'; // Match the CSS z-index
            timerContainer.style.pointerEvents = 'auto'; // Ensure touch events work
            
            // Move timer to body to avoid any container positioning issues
            if (timerContainer.parentElement && timerContainer.parentElement !== document.body) {
                // Store original parent using data role if available, otherwise fallback to ID
                const parentElement = timerContainer.parentElement;
                const parentDataRole = parentElement.getAttribute('data-role');
                const parentId = parentElement.id;
                
                timerContainer.dataset.originalParent = parentDataRole || parentId || 'unknown';
                document.body.appendChild(timerContainer);
                
                // Ensure all buttons within timer have proper touch handling
                const buttons = timerContainer.querySelectorAll('button');
                buttons.forEach(button => {
                    button.style.pointerEvents = 'auto';
                    button.style.touchAction = 'manipulation';
                    // Add visual touch feedback
                    button.addEventListener('touchstart', function() {
                        this.style.opacity = '0.7';
                    }, { passive: true });
                    button.addEventListener('touchend', function() {
                        this.style.opacity = '1';
                    }, { passive: true });
                });
                
                this.logger.info('Practice Session Timer: Moved to body for mobile positioning', {
                    originalParent: timerContainer.dataset.originalParent,
                    buttonsConfigured: buttons.length
                });
            }
        }
    }
    
    /**
     * Hide the timer UI
     */
    hide() {
        const timerContainer = document.querySelector(this.selectors.timerContainer);
        if (timerContainer) {
            timerContainer.style.display = 'none';
            
            // Restore original positioning if it was moved for mobile
            this._restoreOriginalPositioning(timerContainer);
        }
    }
    
    /**
     * Restore timer to its original position
     * @private
     */
    _restoreOriginalPositioning(timerContainer) {
        if (timerContainer.dataset.originalParent && timerContainer.parentElement === document.body) {
            // Try to restore to original parent using data role
            const originalParent = timerContainer.dataset.originalParent === 'main-toolbar' 
                ? document.querySelector('[data-role="main-toolbar"]')
                : document.getElementById(timerContainer.dataset.originalParent);
                
            if (originalParent) {
                originalParent.appendChild(timerContainer);
                delete timerContainer.dataset.originalParent;
                
                // Clear mobile-specific styles
                timerContainer.style.position = '';
                timerContainer.style.zIndex = '';
                
                this.logger.info('Practice Session Timer: Restored to original position');
            }
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
     * Start monitoring viewport changes for pinch-zoom detection
     * @private
     */
    _startViewportMonitoring() {
        if (!this.visualViewportSupported) {
            this.logger.debug?.('Practice Session Timer: Visual Viewport API not supported');
            return;
        }
        
        // Store initial viewport scale
        this.initialViewportScale = window.visualViewport.scale;
        this.currentViewportScale = this.initialViewportScale;
        this.isPinchZoomed = false;
        
        // Create viewport change handler
        this.viewportChangeHandler = () => {
            const newScale = window.visualViewport.scale;
            const scaleThreshold = 1.1; // Consider 10% zoom as "pinch-zoomed"
            
            this.currentViewportScale = newScale;
            const wasZoomed = this.isPinchZoomed;
            this.isPinchZoomed = newScale > this.initialViewportScale * scaleThreshold;
            
            // If zoom state changed, update timer positioning
            if (wasZoomed !== this.isPinchZoomed) {
                this.logger.debug?.('Practice Session Timer: Pinch-zoom state changed', {
                    isPinchZoomed: this.isPinchZoomed,
                    scale: newScale,
                    initialScale: this.initialViewportScale
                });
                
                this._updateTimerPositionForZoom();
            } else if (this.isPinchZoomed) {
                // If still zoomed but viewport scrolled/moved, update position
                const timerContainer = document.querySelector(this.selectors.timerContainer);
                if (timerContainer && timerContainer.classList.contains('pinch-zoom-fixed')) {
                    this._calculateOptimalTimerPosition(timerContainer);
                }
            }
        };
        
        // Attach viewport listener
        window.visualViewport.addEventListener('resize', this.viewportChangeHandler);
        window.visualViewport.addEventListener('scroll', this.viewportChangeHandler);
        
        this.logger.info('Practice Session Timer: Viewport monitoring started');
    }
    
    /**
     * Stop monitoring viewport changes
     * @private
     */
    _stopViewportMonitoring() {
        if (this.viewportChangeHandler && this.visualViewportSupported) {
            window.visualViewport.removeEventListener('resize', this.viewportChangeHandler);
            window.visualViewport.removeEventListener('scroll', this.viewportChangeHandler);
            this.viewportChangeHandler = null;
            
            this.logger.info('Practice Session Timer: Viewport monitoring stopped');
        }
    }
    
    /**
     * Update timer positioning based on pinch-zoom state
     * @private
     */
    _updateTimerPositionForZoom() {
        const timerContainer = document.querySelector(this.selectors.timerContainer);
        if (!timerContainer) return;
        
        if (this.isPinchZoomed) {
            // Ensure timer is in body (may already be there from mobile positioning)
            if (timerContainer.parentElement !== document.body) {
                // Store original parent for later restoration
                const parentElement = timerContainer.parentElement;
                const parentDataRole = parentElement.getAttribute('data-role');
                const parentId = parentElement.id;
                
                timerContainer.dataset.originalParent = parentDataRole || parentId || 'unknown';
                document.body.appendChild(timerContainer);
                this.logger.debug?.('Practice Session Timer: Moved timer to body for pinch-zoom');
            }
            
            // Calculate optimal position based on current viewport
            this._calculateOptimalTimerPosition(timerContainer);
            
            // Apply enhanced fixed positioning for pinch-zoom
            timerContainer.classList.add('pinch-zoom-fixed');
            this.logger.debug?.('Practice Session Timer: Applied pinch-zoom positioning');
        } else {
            // Remove enhanced positioning
            timerContainer.classList.remove('pinch-zoom-fixed');
            
            // Clear any custom positioning - reset both left and right
            timerContainer.style.top = '';
            timerContainer.style.right = '';
            timerContainer.style.left = '';
            
            this.logger.debug?.('Practice Session Timer: Removed pinch-zoom positioning');
            
            // Note: Don't restore position here automatically - let normal mobile positioning handle it
            // The timer may still need to stay in body for normal mobile operation
        }
    }
    
    /**
     * Calculate optimal timer position based on current viewport and zoom state
     * @private
     */
    _calculateOptimalTimerPosition(timerContainer) {
        try {
            let topPosition = 8; // Default fallback
            let leftPosition = null; // Will use right positioning by default
            let rightPosition = 8; // Default fallback
            
            if (this.visualViewportSupported && window.visualViewport) {
                const viewport = window.visualViewport;
                
                // Get current viewport dimensions and offset
                const offsetTop = viewport.offsetTop || 0;
                const offsetLeft = viewport.offsetLeft || 0;
                const viewportWidth = viewport.width;
                const viewportHeight = viewport.height;
                
                // Calculate vertical position relative to the visible area
                topPosition = Math.max(8, offsetTop + 8);
                
                // Calculate horizontal position to ensure timer stays in visible area
                const timerWidth = timerContainer.offsetWidth || 280; // Use actual width or fallback
                const margin = 8;
                
                // Check if we're scrolled horizontally
                if (offsetLeft > 0) {
                    // We're zoomed and scrolled - position relative to visible viewport
                    // Try to place on the right side of visible area
                    const rightEdgePosition = offsetLeft + viewportWidth - timerWidth - margin;
                    
                    if (rightEdgePosition >= offsetLeft + margin) {
                        // Timer fits on the right side of visible area
                        leftPosition = rightEdgePosition;
                        rightPosition = null; // Don't use right positioning
                    } else {
                        // Timer doesn't fit on right, place on left side of visible area
                        leftPosition = offsetLeft + margin;
                        rightPosition = null;
                    }
                } else {
                    // Not scrolled horizontally much, use normal right positioning
                    rightPosition = margin;
                    leftPosition = null;
                }
                
                this.logger.debug?.('Practice Session Timer: Calculated position', {
                    topPosition,
                    leftPosition,
                    rightPosition,
                    viewportOffsetTop: offsetTop,
                    viewportOffsetLeft: offsetLeft,
                    viewportWidth,
                    timerWidth,
                    viewportScale: viewport.scale
                });
            }
            
            // Apply the calculated position using inline styles for immediate effect
            timerContainer.style.top = `${topPosition}px`;
            
            if (leftPosition !== null) {
                timerContainer.style.left = `${leftPosition}px`;
                timerContainer.style.right = 'auto';
            } else {
                timerContainer.style.right = `${rightPosition}px`;
                timerContainer.style.left = 'auto';
            }
            
        } catch (error) {
            this.logger.warn('Practice Session Timer: Error calculating optimal position', {
                error: error.message
            });
            
            // Fallback to default positioning
            timerContainer.style.top = '8px';
            timerContainer.style.right = '8px';
            timerContainer.style.left = 'auto';
        }
    }
    
    /**
     * Reset pinch-zoom state to normal view
     */
    resetPinchZoom() {
        try {
            // Always remove zoom-specific classes first
            const timerContainer = document.querySelector(this.selectors.timerContainer);
            if (timerContainer) {
                timerContainer.classList.remove('pinch-zoom-fixed');
                this.logger.debug?.('Practice Session Timer: Removed pinch-zoom class during reset');
            }
            
            // Reset internal state
            this.isPinchZoomed = false;
            this.currentViewportScale = this.initialViewportScale;
            
            // Multiple approaches to encourage zoom reset
            // 1. Smooth scroll to top
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
            
            // 2. Try to trigger a viewport reset by manipulating the scroll briefly
            setTimeout(() => {
                window.scrollTo(0, 1);
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 50);
            }, 100);
            
            // 3. Try to encourage zoom reset by briefly changing viewport meta tag
            // (This can sometimes help on mobile browsers)
            const viewportMeta = document.querySelector('meta[name="viewport"]');
            if (viewportMeta) {
                const originalContent = viewportMeta.content;
                viewportMeta.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
                
                setTimeout(() => {
                    viewportMeta.content = originalContent;
                }, 200);
            }
            
            this.logger.info('Practice Session Timer: Pinch-zoom reset attempted');
            
        } catch (error) {
            this.logger.warn('Practice Session Timer: Error resetting pinch-zoom', { 
                error: error.message 
            });
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        
        // Stop viewport monitoring
        this._stopViewportMonitoring();
        
        // Remove pinch-zoom styling if present
        const timerContainer = document.querySelector(this.selectors.timerContainer);
        if (timerContainer) {
            timerContainer.classList.remove('pinch-zoom-fixed');
        }
        
        this.isRunning = false;
        this.listenersAttached = false;
        this.hide(); // This will use the existing _restoreOriginalPositioning logic
        
        this.logger.info('Practice Session Timer: Component destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracticeSessionTimer;
} else {
    window.PracticeSessionTimer = PracticeSessionTimer;
}
