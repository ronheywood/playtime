/**
 * Mouse and touch interaction handler for highlight selection
 * Manages mouse/touch events and coordinates with overlay for visual feedback
 */
class MouseSelectionHandler {
    constructor(config = {}) {
        this.config = {
            minSelectionSize: { width: 2, height: 2 },
            ...config
        };
        
        this.state = {
            isSelecting: false,
            startPoint: null,
            currentPoint: null,
            activePointerId: null // Track active touch/pointer
        };
        
        this.disabled = false; // Track disabled state for practice mode
        this.selectionOverlay = null;
        this.coordinateMapper = null;
        // Event handlers
        this.onSelectionComplete = null;
        this.onSelectionStart = null;
        this.onSelectionEnd = null;
        
        // Bound methods for event cleanup
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }

    /**
     * Initialize handler with required dependencies
     */
    init(container, canvas, selectionOverlay, coordinateMapper) {
        this.container = container;
        this.canvas = canvas;
        this.selectionOverlay = selectionOverlay;
        this.coordinateMapper = coordinateMapper;
        
        this.setupEventListeners();
        return this;
    }

    /**
     * Set callback for when selection is completed
     */
    onComplete(callback) {
        this.onSelectionComplete = callback;
        return this;
    }

    onStart(callback) {
        this.onSelectionStart = callback;
        return this;
    }

    onEnd(callback) {
        this.onSelectionEnd = callback;
        return this;
    }

    /**
     * Disable selection temporarily (for practice mode)
     */
    disable() {
        this.removeEventListeners();
        this.reset();
        this.disabled = true;
    }

    /**
     * Re-enable selection after being disabled
     */
    enable() {
        this.disabled = false;
        this.setupEventListeners();
    }

    /**
     * Clean up event listeners and state
     */
    destroy() {
        this.removeDocumentListeners();
        this.removeEventListeners();
        this.reset();
    }

    /**
     * Remove canvas event listeners
     */
    removeEventListeners() {
        if (this.canvas && this.canvas.removeEventListener) {
            // Remove mouse events
            this.canvas.removeEventListener('mousedown', this.handleMouseDown);
            this.canvas.removeEventListener('mousemove', this.handleCanvasMouseMove);
            this.canvas.removeEventListener('mouseup', this.handleMouseUp);
            this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
            
            // Remove touch events
            this.canvas.removeEventListener('touchstart', this.handleTouchStart);
            this.canvas.removeEventListener('touchmove', this.handleTouchMove);
            this.canvas.removeEventListener('touchend', this.handleTouchEnd);
            this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
        }
    }

    /**
     * Reset selection state
     */
    reset() {
        this.state.isSelecting = false;
        this.state.startPoint = null;
        this.state.currentPoint = null;
        this.state.activePointerId = null;
        if (this.selectionOverlay) {
            this.selectionOverlay.hide();
        }
    }

    // Private methods

    setupEventListeners() {
        if (!this.canvas) return;

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        
        // Touch events for mobile/tablet support
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }

    handleMouseDown(event) {
        if (this.disabled) return; // Skip if selection is disabled
        
        this.state.isSelecting = true;
        this.state.startPoint = this.coordinateMapper.getRelativePoint(
            this.container, 
            event.clientX, 
            event.clientY
        );
        this.state.currentPoint = this.state.startPoint;

        // Show minimal overlay for immediate feedback
        this.selectionOverlay.show(
            this.state.startPoint.x, 
            this.state.startPoint.y, 
            1, 
            1
        );

        // Listen on document for reliable dragging
        this.addDocumentListeners();
    }

    handleCanvasMouseMove(event) {
        if (!this.state.isSelecting) return;
        this.updateSelection(event.clientX, event.clientY);
    }

    handleMouseMove(event) {
        if (!this.state.isSelecting) return;
        this.updateSelection(event.clientX, event.clientY);
    }

    handleMouseUp(event) {
        if (!this.state.isSelecting) return;
        
        this.removeDocumentListeners();
        
        const finalPoint = this.coordinateMapper.getRelativePoint(
            this.container,
            event.clientX,
            event.clientY
        );

        this.completeSelectionWithEndPoint(finalPoint);
    }

    handleMouseLeave(event) {
        if (this.state.isSelecting) {
            this.handleMouseUp(event);
        }
    }

    updateSelection(clientX, clientY) {
        this.state.currentPoint = this.coordinateMapper.getRelativePoint(
            this.container,
            clientX,
            clientY
        );

        this.selectionOverlay.updateFromPoints(
            this.state.startPoint,
            this.state.currentPoint
        );
    }

    // Touch event handlers for mobile/tablet support
    
    handleTouchStart(event) {
        if (this.disabled) return; // Skip if selection is disabled
        
        // Prevent scrolling and other default behaviors during selection
        event.preventDefault();
        
        // Only handle single touch for selection
        if (event.touches.length !== 1) return;
        
        const touch = event.touches[0];
        this.state.activePointerId = touch.identifier;
        this.state.isSelecting = true;
        
        this.state.startPoint = this.coordinateMapper.getRelativePoint(
            this.container,
            touch.clientX,
            touch.clientY
        );
        this.state.currentPoint = this.state.startPoint;

        // Show minimal overlay for immediate feedback
        this.selectionOverlay.show(
            this.state.startPoint.x,
            this.state.startPoint.y,
            1,
            1
        );

        // Add document touch listeners for drag outside canvas
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false, capture: true });
        document.addEventListener('touchend', this.handleTouchEnd, { passive: false, capture: true });
        document.addEventListener('touchcancel', this.handleTouchEnd, { passive: false, capture: true });
    }

    handleTouchMove(event) {
        if (!this.state.isSelecting) return;
        
        // Prevent scrolling during selection
        event.preventDefault();
        
        // Find the touch we're tracking
        let activeTouch = null;
        for (let touch of event.touches) {
            if (touch.identifier === this.state.activePointerId) {
                activeTouch = touch;
                break;
            }
        }
        
        if (!activeTouch) return;
        
        this.updateSelection(activeTouch.clientX, activeTouch.clientY);
    }

    handleTouchEnd(event) {
        if (!this.state.isSelecting) return;
        
        // Prevent default behaviors
        event.preventDefault();
        
        // Remove document touch listeners
        document.removeEventListener('touchmove', this.handleTouchMove, true);
        document.removeEventListener('touchend', this.handleTouchEnd, true);
        document.removeEventListener('touchcancel', this.handleTouchEnd, true);
        
        // Use current point as final point (updated during touch move)
        this.completeSelectionWithEndPoint(this.state.currentPoint);
    }

    // Shared completion logic
    
    completeSelectionWithEndPoint(finalPoint) {
        this.state.isSelecting = false;
        
        const selectionRect = this.coordinateMapper.rectFromPoints(
            this.state.startPoint,
            finalPoint
        );

        // Check if selection is significant enough
        if (this.coordinateMapper.isSignificantSize(
            selectionRect, 
            this.config.minSelectionSize.width,
            this.config.minSelectionSize.height
        )) {
            // Notify completion with selection details
            if (this.onSelectionComplete) {
                this.onSelectionComplete({
                    rect: selectionRect,
                    startPoint: this.state.startPoint,
                    endPoint: finalPoint
                });
            }
        }

        this.selectionOverlay.hide();
        this.reset();
    }

    addDocumentListeners() {
        document.addEventListener('mousemove', this.handleMouseMove, true);
        document.addEventListener('mouseup', this.handleMouseUp, true);
    }

    removeDocumentListeners() {
        document.removeEventListener('mousemove', this.handleMouseMove, true);
        document.removeEventListener('mouseup', this.handleMouseUp, true);
    }
}

// Dual-mode export for Node.js and browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MouseSelectionHandler;
}
if (typeof window !== 'undefined') {
    window.MouseSelectionHandler = MouseSelectionHandler;
}
