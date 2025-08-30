/**
 * Focus Mode Command Integration Factory
 * Creates command-driven focus mode initialization 
 * This replaces the procedural approach in main.js with a clean command/event architecture
 */

function createPlayTimeFocusModeCommands() {
    // Get dependencies from global scope (browser) or require (Node.js/testing)
    const layoutCommands = (typeof window !== 'undefined' && window.PlayTimeLayoutCommands) 
        ? window.PlayTimeLayoutCommands 
        : require('.layout-commands');
    const FocusModeHandler = (typeof window !== 'undefined' && window.PlayTimeFocusModeHandler)
        ? window.PlayTimeFocusModeHandler
        : require('./focus-mode-handler');
    
    const { changeLayout, registerHandler } = layoutCommands;

    // Store event listeners for cleanup
    let eventListeners = [];
    let keydownHandler = null;

    /**
     * Initialize focus mode with command-driven architecture
     * Sets up buttons to dispatch commands and handler to respond to commands
     */
    function initializeFocusModeCommands() {
        // Clean up existing listeners first
        cleanupFocusModeCommands();

        // Get DOM elements
        const elements = {
            focusBtn: document.getElementById('focus-section-btn'),
            exitBtn: document.getElementById('exit-focus-btn'),
            toggleBtn: document.querySelector('[data-role="toggle-focus-mode"]'),
            viewerContainer: document.querySelector('.pdf-viewer-container'),
            canvas: document.getElementById('pdf-canvas'),
            sidebar: document.querySelector('.sidebar')
        };

        // Verify required elements exist
        if (!elements.focusBtn || !elements.exitBtn || !elements.viewerContainer || !elements.canvas) {
            return; // Gracefully handle missing elements (test environment)
        }

        // Create focus mode handler
        const focusModeHandler = new FocusModeHandler(elements);

        // Register command handler - this responds to layout commands
        registerHandler('focus-mode', (type, options) => {
            switch (options.action) {
                case 'enter':
                    focusModeHandler.enterFocusMode(options);
                    break;
                case 'exit':
                    focusModeHandler.exitFocusMode(options);
                    break;
                case 'toggle':
                    focusModeHandler.toggleFocusMode(options);
                    break;
            }
        });

        // Create event handlers
        const focusClickHandler = () => changeLayout('focus-mode', { action: 'enter' });
        const exitClickHandler = () => changeLayout('focus-mode', { action: 'exit' });
        const toggleClickHandler = () => changeLayout('focus-mode', { action: 'toggle' });
        
        keydownHandler = (event) => {
            if (event.key === 'Escape') {
                const isInFocusMode = elements.canvas.getAttribute('data-focus-mode') === 'active';
                if (isInFocusMode) {
                    changeLayout('focus-mode', { action: 'exit' });
                }
            }
        };

        // Wire buttons to dispatch commands instead of direct manipulation
        elements.focusBtn.addEventListener('click', focusClickHandler);
        elements.exitBtn.addEventListener('click', exitClickHandler);
        
        if (elements.toggleBtn) {
            elements.toggleBtn.addEventListener('click', toggleClickHandler);
        }

        // Handle ESC key for accessibility
        document.addEventListener('keydown', keydownHandler);

        // Store listeners for cleanup
        eventListeners = [
            { element: elements.focusBtn, event: 'click', handler: focusClickHandler },
            { element: elements.exitBtn, event: 'click', handler: exitClickHandler },
            { element: document, event: 'keydown', handler: keydownHandler }
        ];
        
        if (elements.toggleBtn) {
            eventListeners.push({ element: elements.toggleBtn, event: 'click', handler: toggleClickHandler });
        }

        // Initialize button visibility
        if (elements.focusBtn.style.display === '') {
            elements.focusBtn.style.display = '';
        }
        elements.exitBtn.style.display = 'none';
        if (elements.toggleBtn) {
            elements.toggleBtn.setAttribute('aria-pressed', 'false');
            elements.toggleBtn.classList.remove('active');
        }
    }

    /**
     * Clean up focus mode command event listeners
     * Should be called before re-initialization or in test cleanup
     */
    function cleanupFocusModeCommands() {
        // Remove all stored event listeners
        eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
        eventListeners = [];
        
        // Clean up keydown handler specifically
        if (keydownHandler && document.removeEventListener) {
            document.removeEventListener('keydown', keydownHandler);
        }
        keydownHandler = null;
    }

    return {
        initializeFocusModeCommands,
        cleanupFocusModeCommands
    };
}

// Export factory function for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createPlayTimeFocusModeCommands;
}

// Also expose factory globally for browser usage
if (typeof window !== 'undefined') {
    window.createPlayTimeFocusModeCommands = createPlayTimeFocusModeCommands;
}
