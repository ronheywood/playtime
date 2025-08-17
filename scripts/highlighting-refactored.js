/**
 * Refactored PlayTime Highlighting Module
 * Uses composition of focused classes instead of monolithic approach
 */

(function initRefactoredHighlightingModule(global) {
    // Load dependencies using dual-mode pattern (Node.js vs Browser)
    const HighlightElementClass = (typeof require !== 'undefined') ? 
        require('./highlighting/HighlightElement') : global.HighlightElement;
    const SelectionOverlayClass = (typeof require !== 'undefined') ? 
        require('./highlighting/SelectionOverlay') : global.SelectionOverlay;
    const CoordinateMapperClass = (typeof require !== 'undefined') ? 
        require('./highlighting/CoordinateMapper') : global.CoordinateMapper;
    const ConfidenceMapperClass = (typeof require !== 'undefined') ? 
        require('./highlighting/ConfidenceMapper') : global.ConfidenceMapper;
    const MouseSelectionHandlerClass = (typeof require !== 'undefined') ? 
        require('./highlighting/MouseSelectionHandler') : global.MouseSelectionHandler;
    const HighlightPersistenceServiceClass = (typeof require !== 'undefined') ? 
        require('./highlighting/HighlightPersistenceService') : global.HighlightPersistenceService;
    const HighlightEventCoordinatorClass = (typeof require !== 'undefined') ? 
        require('./highlighting/HighlightEventCoordinator') : global.HighlightEventCoordinator;
    
    // Dependencies will be injected via init() method
    let CONST = null;
    let CONF = null;

    // Default configuration with better organization
    const DEFAULT_CONFIG = {
        SELECTORS: {
            VIEWER: '[data-role="pdf-viewer"]',
            CANVAS: '[data-role="pdf-canvas"]',
            SELECTION_OVERLAY: '[data-role="selection-overlay"]',
            HIGHLIGHT: '[data-role="highlight"]',
            COLOR_GREEN: '[data-role="color-green"]',
            COLOR_AMBER: '[data-role="color-amber"]',
            COLOR_RED: '[data-role="color-red"]'
        },
        CSS: {
            OVERLAY_CLASS: 'selection-overlay',
            HIGHLIGHT_CLASS: 'highlight',
            COLOR_STYLES: {
                green: { border: '2px solid rgba(0,128,0,0.6)', background: 'rgba(0,128,0,0.15)' },
                amber: { border: '2px solid rgba(255,165,0,0.6)', background: 'rgba(255,165,0,0.15)' },
                red: { border: '2px solid rgba(255,0,0,0.6)', background: 'rgba(255,0,0,0.15)' }
            }
        },
        TIMING: {
            REHYDRATION_DELAY: 10,
            LAYOUT_SETTLE_DELAY: 60
        },
        SELECTION: {
            MIN_WIDTH: 2,
            MIN_HEIGHT: 2
        }
    };

    const PlayTimeHighlighting = {
        // Public configuration (legacy compatibility)
        CONFIG: DEFAULT_CONFIG,

        // Internal components
        _components: {
            ConfidenceMapperClass: null,
            SelectionOverlayClass: null,
            mouseHandler: null,
            persistenceService: null,
            eventCoordinator: null,
            CoordinateMapperClass: CoordinateMapperClass
        },

        // Internal state
        _state: {
            viewer: null,
            canvas: null,
            activeConfidence: null,
            initialized: false,
            logger: console,
            scheduler: null,
            lastCanvasSize: null,
            canvasSizeMonitor: null
        },

        // Public API Methods

        async init(config = {}, logger = console, confidenceModule = null, constantsModule = null) {
            this._state.logger = logger || console;
            
            // Merge configuration
            this.CONFIG = this._mergeConfig(config);
            
            // Initialize components with injected dependencies
            this._initializeComponents(confidenceModule, constantsModule);
            
            // Discover DOM elements
            if (!this._discoverDOMElements()) {
                this._state.logger.warn && this._state.logger.warn('Required DOM elements not found');
                return;
            }

            // Setup all components
            await this._setupComponents();
            
            this._state.initialized = true;
            return Promise.resolve();
        },

        setActiveConfidenceFromColor(color) {
            const level = this._components.ConfidenceMapperClass.colorToConfidence(color);
            this._state.activeConfidence = level;
        },

        setScheduler(scheduler) {
            this._state.scheduler = scheduler;
        },

        getHighlights() {
            if (!this._state.viewer) return [];
            const selector = this.CONFIG.SELECTORS.HIGHLIGHT;
            return Array.from(this._state.viewer.querySelectorAll(selector));
        },

        repositionAll() {
            if (!this._state.viewer || !this._state.canvas) return;
            
            // Get current canvas size for logging and monitoring
            const canvasRect = this._components.CoordinateMapperClass.safeBoundingRect(this._state.canvas);
            const canvasSize = canvasRect ? `${canvasRect.width}x${canvasRect.height}` : '0x0';
            const highlightCount = this.getHighlights().length;
            
            // Log repositioning for debugging
            this._state.logger.info && this._state.logger.info('🔄 repositionAll called', {
                canvasSize,
                highlightCount,
                timestamp: Date.now()
            });
            
            this.getHighlights().forEach((el) => {
                this._repositionHighlightElement(el);
            });
            
            // Update tracked canvas size
            this._state.lastCanvasSize = canvasSize;
        },

        addSections(sections = []) {
            if (!this._state.viewer || !this._state.canvas || !Array.isArray(sections)) return;

            // Get current page for visibility
            let currentPage = null;
            try {
                if (window.PlayTimePDFViewer && typeof window.PlayTimePDFViewer.getCurrentPage === 'function') {
                    currentPage = Number(window.PlayTimePDFViewer.getCurrentPage());
                }
            } catch (_) {}

            sections.forEach(section => {
                if (this._isValidSection(section)) {
                    const highlightElement = HighlightElementClass.fromDatabaseRecord(section);
                    this._createHighlightFromElement(highlightElement, currentPage);
                }
            });
        },

        focusOnSection() { 
            return Promise.resolve(); 
        },

        /**
         * Enter focus mode for a specific highlight (User Story 4.3)
         * @param {string|HTMLElement} target - Highlight ID or DOM element
         * @param {Object} options - Focus options (zoom, crop, etc.)
         */
        focusOnHighlight(target, options = {}) {
            const { mode = 'zoom', padding = 20 } = options;
            // Locate highlight element
            let highlightEl = null;
            if (typeof target === 'string') {
                highlightEl = this._state.viewer.querySelector(`[data-hl-id="${target}"]`);
            } else if (target && target.dataset && target.dataset.role === 'highlight') {
                highlightEl = target;
            }
            if (!highlightEl) {
                this._state.logger.warn?.('Highlight not found for focus mode');
                return;
            }
            const xPct = parseFloat(highlightEl.dataset.hlXPct);
            const yPct = parseFloat(highlightEl.dataset.hlYPct);
            const wPct = parseFloat(highlightEl.dataset.hlWPct);
            const hPct = parseFloat(highlightEl.dataset.hlHPct);
            if (!Number.isFinite(xPct) || !Number.isFinite(yPct) || !Number.isFinite(wPct) || !Number.isFinite(hPct)) {
                this._state.logger.warn?.('Invalid highlight coordinates for focus mode');
                return;
            }
            // NEW: Dispatch layout command instead of directly applying CSS transform.
            try {
                if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.changeLayout === 'function') {
                    window.PlayTimeLayoutCommands.changeLayout('focus-mode', {
                        action: 'enter',
                        highlight: { xPct, yPct, wPct, hPct },
                        padding,
                        mode
                    });
                    // Immediate zoom/center attempt (handler also does this) for responsiveness
                    if (window.PlayTimePDFViewer && typeof window.PlayTimePDFViewer.focusOnRectPercent === 'function') {
                        window.PlayTimePDFViewer.focusOnRectPercent({ xPct, yPct, wPct, hPct }, { paddingPx: padding }).catch(()=>{});
                    }
                    // NOTE: Removed legacy CSS transform duplication when command path active to prevent double scaling/UI mismatch
                } else {
                    // Fallback to legacy transform approach (deprecated) to maintain backward compatibility
                    const canvasRect = this._components.CoordinateMapperClass.safeBoundingRect(this._state.canvas);
                    const containerRect = this._components.CoordinateMapperClass.safeBoundingRect(this._state.viewer);
                    if (canvasRect && containerRect) {
                        const highlightRect = this._components.CoordinateMapperClass.fromPercentages({ xPct, yPct, wPct, hPct }, canvasRect, { left:0, top:0 });
                        if (mode === 'zoom') {
                            this._applyZoomFocus(highlightRect, containerRect, padding);
                        }
                    }
                }
            } catch (e) {
                this._state.logger.warn?.('Focus mode command dispatch failed; using fallback', e);
            }
            // Fire focus event (legacy contract retained)
            this._dispatchFocusEvent(highlightEl, { mode, padding });
        },

        /**
         * Exit focus mode and return to normal view
         */
        exitFocusMode() {
            // Preferred path: delegate to layout command handler
            let delegated = false;
            try {
                if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.changeLayout === 'function') {
                    window.PlayTimeLayoutCommands.changeLayout('focus-mode', { action: 'exit' });
                    delegated = true;
                }
            } catch(_) {}
            if (!delegated) {
                // Legacy direct DOM cleanup (deprecated)
                if (this._state.canvas) {
                    this._state.canvas.style.transform = '';
                }
                if (this._state.viewer) {
                    this._state.viewer.classList.remove('focus-mode');
                }
            }
            this._dispatchFocusExitEvent();
        },

        enableSelection() { 
            // Selection enabled by default after init
        },

        disableSelection() { 
            if (this._components.mouseHandler) {
                this._components.mouseHandler.destroy();
            }
        },

        // Legacy compatibility methods
        highlightSection() { 
            // Created automatically on mouse selection
        },

        // Private Implementation Methods

        _mergeConfig(userConfig) {
            return {
                ...DEFAULT_CONFIG,
                SELECTORS: { ...DEFAULT_CONFIG.SELECTORS, ...(userConfig.SELECTORS || {}) },
                CSS: { ...DEFAULT_CONFIG.CSS, ...(userConfig.CSS || {}) },
                TIMING: { ...DEFAULT_CONFIG.TIMING, ...(userConfig.TIMING || {}) },
                SELECTION: { ...DEFAULT_CONFIG.SELECTION, ...(userConfig.SELECTION || {}) }
            };
        },

        _initializeComponents(confidenceModule = null, constantsModule = null) {
            // Ensure confidence module is available
            if (!confidenceModule) {
                throw new Error('Confidence module must be injected via init() method');
            }
            
            // Ensure constants module is available
            if (!constantsModule) {
                throw new Error('Constants module must be injected via init() method');
            }
            
            // Store dependencies for use by other methods
            CONF = confidenceModule;
            CONST = constantsModule;
            
            this._components.ConfidenceMapperClass = new ConfidenceMapperClass(confidenceModule);
            
            this._components.SelectionOverlayClass = new SelectionOverlayClass({
                overlayClass: this.CONFIG.CSS.OVERLAY_CLASS
            });

            this._components.mouseHandler = new MouseSelectionHandlerClass({
                minSelectionSize: this.CONFIG.SELECTION
            });

            this._components.persistenceService = new HighlightPersistenceServiceClass();

            this._components.eventCoordinator = new HighlightEventCoordinatorClass({
                events: CONST.EVENTS,
                rehydrationDelay: this.CONFIG.TIMING.REHYDRATION_DELAY
            });

            // Setup scheduler
            this._state.scheduler = this._state.scheduler || this._createDefaultScheduler();
        },

        _discoverDOMElements() {
            const cfg = this.CONFIG.SELECTORS;
            
            this._state.viewer = document.querySelector(cfg.VIEWER) || 
                                  document.querySelector('.pdf-viewer-container');
            this._state.canvas = document.querySelector(cfg.CANVAS) || 
                                 document.getElementById('pdf-canvas');

            return !!(this._state.viewer && this._state.canvas);
        },

        async _setupComponents() {
            // Initialize selection overlay
            this._components.SelectionOverlayClass.init(this._state.viewer);

            // Initialize mouse handler
            this._components.mouseHandler
                .init(
                    this._state.viewer, 
                    this._state.canvas, 
                    this._components.SelectionOverlayClass,
                    this._components.CoordinateMapperClass
                )
                .onComplete((selection) => this._handleSelectionComplete(selection));

            // Setup persistence service
            try {
                if (window.PlayTimeDB) {
                    this._components.persistenceService.setDatabase(window.PlayTimeDB);
                }
            } catch (_) {}

            // Initialize event coordinator
            this._components.eventCoordinator
                .init()
                .onConfidenceChanged(({ color }) => this.setActiveConfidenceFromColor(color))
                .onScoreSelected(({ pdfId }) => this._handleScoreSelected(pdfId))
                .onPageChanged(({ page }) => this._handlePageChanged(page))
                .onLayoutChanged(() => this.repositionAll());

            // Initialize active confidence from DOM
            this._ensureActiveConfidenceFromDOM();
        },

        _handleSelectionComplete(selection) {
            if (this._state.activeConfidence == null) {
                this._state.logger.warn && this._state.logger.warn('No active confidence set for highlighting');
                return;
            }

            // Get current page
            let pageNum = null;
            try {
                if (window.PlayTimePDFViewer && window.PlayTimePDFViewer.getCurrentPage) {
                    pageNum = window.PlayTimePDFViewer.getCurrentPage();
                }
            } catch (_) {}

            // Create highlight element
            const canvasRect = this._components.CoordinateMapperClass.safeBoundingRect(this._state.canvas);
            const canvasOffset = this._components.CoordinateMapperClass.getCanvasOffset(this._state.viewer, this._state.canvas);
            
            if (!canvasRect) return;

            const normalizedRect = this._components.CoordinateMapperClass.normalizeToCanvas(
                selection.rect, 
                canvasRect, 
                canvasOffset
            );

            const color = this._components.ConfidenceMapperClass.confidenceToColor(this._state.activeConfidence);
            const highlightElement = HighlightElementClass.fromRect(
                normalizedRect,
                canvasRect,
                color,
                this._state.activeConfidence,
                pageNum
            );

            // Create DOM element
            const domElement = this._createHighlightFromElement(highlightElement);

            // Persist to database
            this._persistHighlight(highlightElement);
        },

        async _handleScoreSelected(pdfId) {
            this._state.logger.info && this._state.logger.info('🎯 Score selected, starting rehydration', { pdfId });
            
            // Clear existing highlights
            this._clearHighlights();

            // Load and rehydrate highlights
            try {
                const sections = await this._components.persistenceService.loadHighlights(pdfId);
                if (sections && sections.length > 0) {
                    this._state.logger.info && this._state.logger.info('📊 Loaded highlights from database', { 
                        count: sections.length,
                        sampleData: sections[0] ? {
                            xPct: sections[0].xPct,
                            yPct: sections[0].yPct,
                            wPct: sections[0].wPct,
                            hPct: sections[0].hPct
                        } : null
                    });
                    
                    this.addSections(sections);
                    this._scheduleLayoutAdjustments();
                    
                    // Start monitoring canvas size changes
                    this._startCanvasSizeMonitoring();
                }
            } catch (error) {
                this._state.logger.warn && this._state.logger.warn('Failed to load highlights:', error);
            }
        },

        _handlePageChanged(page) {
            if (!Number.isFinite(page)) return;
            
            // Update highlight visibility
            this.getHighlights().forEach(el => {
                if (el.dataset.page) {
                    el.style.display = (Number(el.dataset.page) === page) ? 'block' : 'none';
                }
            });
        },

        _createHighlightFromElement(HighlightElementClass, currentPage = null) {
            const canvasRect = this._components.CoordinateMapperClass.safeBoundingRect(this._state.canvas);
            const canvasOffset = this._components.CoordinateMapperClass.getCanvasOffset(this._state.viewer, this._state.canvas);
            
            if (!canvasRect) return null;

            const domElement = HighlightElementClass.createDOMElement(
                canvasRect, 
                canvasOffset.left, 
                canvasOffset.top,
                {
                    highlightClass: this.CONFIG.CSS.HIGHLIGHT_CLASS,
                    colorStyles: this.CONFIG.CSS.COLOR_STYLES,
                    enableFocus: true  // Enable focus mode interactions
                }
            );

            // Add click handler for focus mode (User Story 4.3)
            domElement.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.focusOnHighlight(domElement);
            });

            // Add keyboard handler for accessibility
            domElement.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    this.focusOnHighlight(domElement);
                }
            });

            this._state.viewer.appendChild(domElement);

            // Set visibility based on current page
            if (currentPage !== null && HighlightElementClass.page !== null) {
                domElement.style.display = (HighlightElementClass.page === currentPage) ? 'block' : 'none';
            }

            return domElement;
        },

        async _persistHighlight(HighlightElementClass) {
            try {
                const pdfId = this._getCurrentPdfId();
                if (pdfId != null && this._components.persistenceService.isAvailable()) {
                    await this._components.persistenceService.saveHighlight(HighlightElementClass, pdfId);
                }
            } catch (error) {
                this._state.logger.warn && this._state.logger.warn('Failed to persist highlight:', error);
            }
        },

        _getCurrentPdfId() {
            return (global && global.PlayTimeCurrentScoreId) || 
                   (window && window.PlayTimeCurrentScoreId) || 
                   null;
        },

        _clearHighlights() {
            this.getHighlights().forEach(highlight => {
                try {
                    highlight.remove();
                } catch (_) {
                    try {
                        if (highlight.parentNode) {
                            highlight.parentNode.removeChild(highlight);
                        }
                    } catch (_) {}
                }
            });
        },

        _repositionHighlightElement(domElement) {
            const xPct = parseFloat(domElement.dataset.hlXPct);
            const yPct = parseFloat(domElement.dataset.hlYPct);
            const wPct = parseFloat(domElement.dataset.hlWPct);
            const hPct = parseFloat(domElement.dataset.hlHPct);

            if (!Number.isFinite(xPct) || !Number.isFinite(yPct) || 
                !Number.isFinite(wPct) || !Number.isFinite(hPct)) {
                return;
            }

            const canvasRect = this._components.CoordinateMapperClass.safeBoundingRect(this._state.canvas);
            const canvasOffset = this._components.CoordinateMapperClass.getCanvasOffset(this._state.viewer, this._state.canvas);
            
            if (!canvasRect) return;

            const rect = this._components.CoordinateMapperClass.fromPercentages(
                { xPct, yPct, wPct, hPct },
                canvasRect,
                canvasOffset
            );

            domElement.style.left = rect.left + 'px';
            domElement.style.top = rect.top + 'px';
            domElement.style.width = rect.width + 'px';
            domElement.style.height = rect.height + 'px';
        },

        _ensureActiveConfidenceFromDOM() {
            if (this._state.activeConfidence != null) return;

            try {
                const doc = (this._state.viewer && this._state.viewer.ownerDocument) || document;
                const btn = doc.querySelector('[data-role^="color-"][aria-pressed="true"], [data-role^="color-"].selected');
                if (btn) {
                    const color = btn.getAttribute('data-color');
                    if (color) {
                        this.setActiveConfidenceFromColor(color);
                    }
                }
            } catch (_) {}
        },

        _isValidSection(section) {
            return section && 
                   typeof section.xPct === 'number' &&
                   typeof section.yPct === 'number' &&
                   typeof section.wPct === 'number' &&
                   typeof section.hPct === 'number' &&
                   typeof section.confidence === 'number';
        },

        /**
         * Apply zoom-based focus mode using CSS transforms
         */
        _applyZoomFocus(highlightRect, containerRect, padding) {
            const transform = this._components.CoordinateMapperClass.calculateFocusTransform(
                highlightRect, 
                containerRect, 
                padding
            );

            if (this._state.canvas) {
                this._state.canvas.style.transformOrigin = 'top left';
                this._state.canvas.style.transform = 
                    `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`;
                this._state.canvas.style.transition = 'transform 0.3s ease-out';
            }

            if (this._state.viewer) {
                this._state.viewer.classList.add('focus-mode');
            }
        },

        /**
         * Apply crop-based focus mode (for future implementation)
         */
        _applyCropFocus(highlightPercentages, padding) {
            const cropArea = this._components.CoordinateMapperClass.calculateCropArea(
                highlightPercentages, 
                padding
            );

            // This would integrate with PDF.js to render only the cropped area
            // Implementation depends on PDF viewer integration
            this._state.logger.debug?.('Crop focus mode requested:', cropArea);
            
            if (this._state.viewer) {
                this._state.viewer.classList.add('focus-mode', 'crop-mode');
            }
        },

        /**
         * Dispatch highlight focus event
         */
        _dispatchFocusEvent(HighlightElementClass, options) {
            try {
                const event = new CustomEvent('playtime:highlight-focus-requested', {
                    detail: {
                        highlight: HighlightElementClass,
                        highlightId: HighlightElementClass.dataset.hlId,
                        color: HighlightElementClass.dataset.hlColor,
                        confidence: parseInt(HighlightElementClass.dataset.hlConfidence),
                        page: HighlightElementClass.dataset.page ? parseInt(HighlightElementClass.dataset.page) : null,
                        options
                    }
                });
                
                (this._state.viewer || document).dispatchEvent(event);
            } catch (_) {}
        },

        /**
         * Dispatch highlight focus exit event
         */
        _dispatchFocusExitEvent() {
            try {
                const event = new CustomEvent('playtime:highlight-focus-exited', {
                    detail: { timestamp: Date.now() }
                });
                
                (this._state.viewer || document).dispatchEvent(event);
            } catch (_) {}
        },

        _scheduleLayoutAdjustments() {
            try {
                const reposition = () => this.repositionAll();
                requestAnimationFrame(() => requestAnimationFrame(reposition));
                setTimeout(reposition, this.CONFIG.TIMING.LAYOUT_SETTLE_DELAY);
            } catch (_) {}
        },

        _createDefaultScheduler() {
            return {
                schedule: (callback) => {
                    const raf = (cb) => (typeof window.requestAnimationFrame === 'function' ? 
                        window.requestAnimationFrame(cb) : setTimeout(cb, 0));
                    return setTimeout(() => raf(() => raf(callback)), 0);
                }
            };
        },

        /**
         * Monitor canvas size changes after rehydration
         * Automatically repositions highlights when canvas grows significantly
         */
        _startCanvasSizeMonitoring() {
            // Clear any existing monitor
            this._stopCanvasSizeMonitoring();
            
            let checkCount = 0;
            const maxChecks = 20; // Check for up to 4 seconds (20 * 200ms)
            const checkInterval = 200; // Check every 200ms
            
            this._state.canvasSizeMonitor = setInterval(() => {
                checkCount++;
                
                const canvasRect = this._components.CoordinateMapperClass.safeBoundingRect(this._state.canvas);
                if (!canvasRect) {
                    if (checkCount >= maxChecks) {
                        this._stopCanvasSizeMonitoring();
                    }
                    return;
                }
                
                const currentSize = `${canvasRect.width}x${canvasRect.height}`;
                const currentArea = canvasRect.width * canvasRect.height;
                
                // Check if canvas has grown significantly since last reposition
                if (this._state.lastCanvasSize) {
                    const [lastWidth, lastHeight] = this._state.lastCanvasSize.split('x').map(Number);
                    const lastArea = lastWidth * lastHeight;
                    
                    // If canvas area has grown by more than 50%, reposition highlights
                    if (currentArea > lastArea * 1.5) {
                        this._state.logger.info && this._state.logger.info('📏 Canvas size grew significantly, repositioning highlights', {
                            from: this._state.lastCanvasSize,
                            to: currentSize,
                            areaGrowth: Math.round((currentArea / lastArea) * 100) + '%'
                        });
                        
                        this.repositionAll();
                        this._stopCanvasSizeMonitoring();
                        return;
                    }
                }
                
                // Stop monitoring after max checks or if canvas seems stable
                if (checkCount >= maxChecks) {
                    this._state.logger.info && this._state.logger.info('⏱️ Canvas size monitoring completed', {
                        finalSize: currentSize,
                        checksPerformed: checkCount
                    });
                    this._stopCanvasSizeMonitoring();
                }
            }, checkInterval);
        },

        /**
         * Stop canvas size monitoring
         */
        _stopCanvasSizeMonitoring() {
            if (this._state.canvasSizeMonitor) {
                clearInterval(this._state.canvasSizeMonitor);
                this._state.canvasSizeMonitor = null;
            }
        }
    };

    // Export for global use
    global.PlayTimeHighlighting = PlayTimeHighlighting;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PlayTimeHighlighting;
    }

})(typeof window !== 'undefined' ? window : globalThis);
