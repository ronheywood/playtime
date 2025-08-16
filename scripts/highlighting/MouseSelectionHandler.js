/**
 * Mouse interaction handler for highlight selection
 * Manages mouse events and coordinates with overlay for visual feedback
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
            currentPoint: null
        };
        
        this.selectionOverlay = null;
        this.coordinateMapper = null;
        this.onSelectionComplete = null;
        
        // Bound methods for event cleanup
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
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

    /**
     * Clean up event listeners and state
     */
    destroy() {
        this.removeDocumentListeners();
        if (this.canvas && this.canvas.removeEventListener) {
            this.canvas.removeEventListener('mousedown', this.handleMouseDown);
            this.canvas.removeEventListener('mousemove', this.handleCanvasMouseMove);
            this.canvas.removeEventListener('mouseup', this.handleMouseUp);
            this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
        }
        this.reset();
    }

    /**
     * Reset selection state
     */
    reset() {
        this.state.isSelecting = false;
        this.state.startPoint = null;
        this.state.currentPoint = null;
        if (this.selectionOverlay) {
            this.selectionOverlay.hide();
        }
    }

    // Private methods

    setupEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
    }

    handleMouseDown(event) {
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
        
        this.state.isSelecting = false;
        this.removeDocumentListeners();
        
        const finalPoint = this.coordinateMapper.getRelativePoint(
            this.container,
            event.clientX,
            event.clientY
        );

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

    addDocumentListeners() {
        document.addEventListener('mousemove', this.handleMouseMove, true);
        document.addEventListener('mouseup', this.handleMouseUp, true);
    }

    removeDocumentListeners() {
        document.removeEventListener('mousemove', this.handleMouseMove, true);
        document.removeEventListener('mouseup', this.handleMouseUp, true);
    }
}

module.exports = MouseSelectionHandler;
