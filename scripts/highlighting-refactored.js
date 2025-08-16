/**
 * Refactored PlayTime Highlighting Module
 * Uses composition of focused classes instead of monolithic approach
 */

const HighlightElement = require('./highlighting/HighlightElement');
const SelectionOverlay = require('./highlighting/SelectionOverlay');
const CoordinateMapper = require('./highlighting/CoordinateMapper');
const ConfidenceMapper = require('./highlighting/ConfidenceMapper');
const MouseSelectionHandler = require('./highlighting/MouseSelectionHandler');
const HighlightPersistenceService = require('./highlighting/HighlightPersistenceService');
const HighlightEventCoordinator = require('./highlighting/HighlightEventCoordinator');

(function initRefactoredHighlightingModule(global) {
    // Legacy compatibility: try to import constants and confidence modules
    const CONST = (global && global.PlayTimeConstants) ? global.PlayTimeConstants : 
        (function(){ try { return require('./constants'); } catch(_) { 
            return { 
                EVENTS: { CONFIDENCE_CHANGED: 'playtime:confidence-changed' }, 
                SELECTORS: {} 
            }; 
        }})();
    
    const CONF = (global && global.PlayTimeConfidence) ? global.PlayTimeConfidence : 
        (function(){ try { return require('./confidence'); } catch(_) { 
            return { 
                ConfidenceLevel: { RED:0, AMBER:1, GREEN:2 }, 
                confidenceToColor:(c)=>'red' 
            }; 
        }})();

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
            confidenceMapper: null,
            selectionOverlay: null,
            mouseHandler: null,
            persistenceService: null,
            eventCoordinator: null,
            coordinateMapper: CoordinateMapper
        },

        // Internal state
        _state: {
            viewer: null,
            canvas: null,
            activeConfidence: null,
            initialized: false,
            logger: console,
            scheduler: null
        },

        // Public API Methods

        async init(config = {}, logger = console, confidenceModule = null) {
            this._state.logger = logger || console;
            
            // Merge configuration
            this.CONFIG = this._mergeConfig(config);
            
            // Initialize components with optional confidence module injection
            this._initializeComponents(confidenceModule);
            
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
            const level = this._components.confidenceMapper.colorToConfidence(color);
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
            
            this.getHighlights().forEach((el) => {
                this._repositionHighlightElement(el);
            });
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
                    const highlightElement = HighlightElement.fromDatabaseRecord(section);
                    this._createHighlightFromElement(highlightElement, currentPage);
                }
            });
        },

        focusOnSection() { 
            return Promise.resolve(); 
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

        _initializeComponents(confidenceModule = null) {
            // Use injected confidence module or fall back to global resolution
            const confidence = confidenceModule || CONF;
            this._components.confidenceMapper = new ConfidenceMapper(confidence);
            
            this._components.selectionOverlay = new SelectionOverlay({
                overlayClass: this.CONFIG.CSS.OVERLAY_CLASS
            });

            this._components.mouseHandler = new MouseSelectionHandler({
                minSelectionSize: this.CONFIG.SELECTION
            });

            this._components.persistenceService = new HighlightPersistenceService();

            this._components.eventCoordinator = new HighlightEventCoordinator({
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
            this._components.selectionOverlay.init(this._state.viewer);

            // Initialize mouse handler
            this._components.mouseHandler
                .init(
                    this._state.viewer, 
                    this._state.canvas, 
                    this._components.selectionOverlay,
                    this._components.coordinateMapper
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
            const canvasRect = this._components.coordinateMapper.safeBoundingRect(this._state.canvas);
            const canvasOffset = this._components.coordinateMapper.getCanvasOffset(this._state.viewer, this._state.canvas);
            
            if (!canvasRect) return;

            const normalizedRect = this._components.coordinateMapper.normalizeToCanvas(
                selection.rect, 
                canvasRect, 
                canvasOffset
            );

            const color = this._components.confidenceMapper.confidenceToColor(this._state.activeConfidence);
            const highlightElement = HighlightElement.fromRect(
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
            // Clear existing highlights
            this._clearHighlights();

            // Load and rehydrate highlights
            try {
                const sections = await this._components.persistenceService.loadHighlights(pdfId);
                if (sections && sections.length > 0) {
                    this.addSections(sections);
                    this._scheduleLayoutAdjustments();
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

        _createHighlightFromElement(highlightElement, currentPage = null) {
            const canvasRect = this._components.coordinateMapper.safeBoundingRect(this._state.canvas);
            const canvasOffset = this._components.coordinateMapper.getCanvasOffset(this._state.viewer, this._state.canvas);
            
            if (!canvasRect) return null;

            const domElement = highlightElement.createDOMElement(
                canvasRect, 
                canvasOffset.left, 
                canvasOffset.top,
                {
                    highlightClass: this.CONFIG.CSS.HIGHLIGHT_CLASS,
                    colorStyles: this.CONFIG.CSS.COLOR_STYLES
                }
            );

            this._state.viewer.appendChild(domElement);

            // Set visibility based on current page
            if (currentPage !== null && highlightElement.page !== null) {
                domElement.style.display = (highlightElement.page === currentPage) ? 'block' : 'none';
            }

            return domElement;
        },

        async _persistHighlight(highlightElement) {
            try {
                const pdfId = this._getCurrentPdfId();
                if (pdfId != null && this._components.persistenceService.isAvailable()) {
                    await this._components.persistenceService.saveHighlight(highlightElement, pdfId);
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

            const canvasRect = this._components.coordinateMapper.safeBoundingRect(this._state.canvas);
            const canvasOffset = this._components.coordinateMapper.getCanvasOffset(this._state.viewer, this._state.canvas);
            
            if (!canvasRect) return;

            const rect = this._components.coordinateMapper.fromPercentages(
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
        }
    };

    // Export for global use
    global.PlayTimeHighlighting = PlayTimeHighlighting;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PlayTimeHighlighting;
    }

})(typeof window !== 'undefined' ? window : globalThis);
