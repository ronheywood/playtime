/**
 * Refactored PlayTime Highlighting Module
 * Uses composition of focused classes instead of monolithic approach
 */

(function init(global) {
    // Load dependencies using dual-mode pattern (Node.js vs Browser)
    const HighlightElementClass = (typeof require !== 'undefined') ? 
        require('./HighlightElement') : global.HighlightElement;
    const SelectionOverlayClass = (typeof require !== 'undefined') ? 
        require('./SelectionOverlay') : global.SelectionOverlay;
    const CoordinateMapperClass = (typeof require !== 'undefined') ? 
        require('./CoordinateMapper') : global.CoordinateMapper;
    const ConfidenceMapperClass = (typeof require !== 'undefined') ? 
        require('./ConfidenceMapper') : global.ConfidenceMapper;
    const MouseSelectionHandlerClass = (typeof require !== 'undefined') ? 
        require('./MouseSelectionHandler') : global.MouseSelectionHandler;
    const HighlightPersistenceServiceClass = (typeof require !== 'undefined') ? 
        require('./HighlightPersistenceService') : global.HighlightPersistenceService;
    const HighlightEventCoordinatorClass = (typeof require !== 'undefined') ? 
        require('./HighlightEventCoordinator') : global.HighlightEventCoordinator;
    const HighlightActionButtonClass = (typeof require !== 'undefined') ? 
        require('./HighlightActionButton').HighlightActionButton : window.HighlightActionButton;
    const HighlightAnnotationFormClass = (typeof require !== 'undefined') ? 
        require('./HighlightAnnotationForm') : window.HighlightAnnotationForm;
    
    // Dependencies will be injected via init() method
    let CONST = null;

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

        /**
         * Handler for focus-mode layout commands
         */
        handleFocusModeLayoutCommand: function(type, options) {
            if (type !== 'focus-mode') return;
            const { action, highlight, padding = 20, mode = 'zoom' } = options;
            
            PlayTimeHighlighting._state.logger.info?.('Focus mode layout command received', { action, mode, highlight });
            
            if (action === 'enter' && highlight) {
                _enterFocusMode(mode, highlight, padding);
            } else if (action === 'exit') {
                _exitFocusMode();
            }
        },
        _enterFocusMode: function(mode, highlight, padding) {
            // Calculate pixel rect from percentages
            const canvasRect = PlayTimeHighlighting._components.CoordinateMapperClass.safeBoundingRect(PlayTimeHighlighting._state.canvas);
            const containerRect = PlayTimeHighlighting._components.CoordinateMapperClass.safeBoundingRect(PlayTimeHighlighting._state.viewer);
            
            if (canvasRect && containerRect) {
                const highlightRect = PlayTimeHighlighting._components.CoordinateMapperClass.fromPercentages(highlight, canvasRect, { left:0, top:0 });
                if (mode === 'zoom') {
                    PlayTimeHighlighting._applyZoomFocus(highlightRect, containerRect, padding);
                } else if (mode === 'crop') {
                    PlayTimeHighlighting._applyCropFocus(highlight, padding);
                }
            }
        },
        _exitFocusMode: function(){
            // Clear transform and remove focus-mode class
            if (PlayTimeHighlighting._state.canvas) {
                PlayTimeHighlighting._state.canvas.style.transform = '';
                PlayTimeHighlighting._state.canvas.style.transition = '';
            }

            if (PlayTimeHighlighting._state.viewer) {
                PlayTimeHighlighting._state.viewer.classList.remove('focus-mode');
            }
        },
        // Internal components
        _components: {
            ConfidenceMapperClass: null,
            SelectionOverlayClass: null,
            mouseHandler: null,
            persistenceService: null,
            eventCoordinator: null,
            actionButton: null,
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

    async init(config = {}, logger = console, confidenceModule = null, constantsModule = null, deps = null) {
            this._state.logger = logger || console;
            
            // Merge configuration
            this.CONFIG = this._mergeConfig(config);
            
            // Initialize components with injected dependencies (deps is required)
            this._initializeComponents(confidenceModule, constantsModule, deps);
            
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
                    const domElement = this._createHighlightFromElement(highlightElement, currentPage);
                    
                    // Apply annotation data from database record to DOM element
                    if (domElement && section) {
                        if (section.title) {
                            domElement.dataset.hlTitle = section.title;
                        }
                        if (section.notes) {
                            domElement.dataset.hlNotes = section.notes;
                        }
                        if (section.annotated) {
                            domElement.dataset.hlAnnotated = 'true';
                        }
                        if (section.annotationTimestamp) {
                            domElement.dataset.hlAnnotationTimestamp = section.annotationTimestamp.toString();
                        }
                    }
                }
            });
        },

        _getHighlightDimensions: function(highlightDataset){ 
            let dimensions = { 
                xPct: parseFloat(highlightDataset.hlXPct),
                yPct : parseFloat(highlightDataset.hlYPct),
                wPct : parseFloat(highlightDataset.hlWPct),
                hPct : parseFloat(highlightDataset.hlHPct)
            };

            if (!Number.isFinite(dimensions.xPct) || !Number.isFinite(dimensions.yPct) || !Number.isFinite(dimensions.wPct) || !Number.isFinite(dimensions.hPct)) {
                this._state.logger.warn?.('Invalid highlight coordinates for focus mode');
                return false;
            }

            return dimensions;
        },
        /**
         * Enter focus mode for a specific highlight (User Story 4.3)
         * @param {HTMLElement} target - Highlight ID or DOM element
         * @param {Object} options - Focus options (zoom, crop, etc.)
         */
        focusOnHighlight(highlightEl, options = {}) {
            const { mode = 'zoom', padding = 20 } = options;
            
            if (!highlightEl || highlightEl.dataset?.role !== 'highlight') {
                this._state.logger.warn?.('Highlight not found for focus mode');
                return;
            }
            
            let dimensions = this._getHighlightDimensions(highlightEl.dataset);
            if(!dimensions) return;

            const { xPct, yPct, wPct, hPct } = dimensions;

            // Dispatch layout command
            try {
                if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.changeLayout === 'function') {
                    this._state.logger.info?.('Dispatching focus-mode layout command', { xPct, yPct, wPct, hPct, mode, padding });
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
                    
                    // Ensure highlight is scrolled into view after layout changes complete
                    this._scheduleScrollAfterLayout(highlightEl, { xPct, yPct, wPct, hPct });
                    
                    // NOTE: Removed legacy CSS transform duplication when command path active to prevent double scaling/UI mismatch
                } else {
                    this._state.logger.warn?.('PlayTimeLayoutCommands not available, using fallback transform approach');
                    // Fallback to legacy transform approach (deprecated) to maintain backward compatibility
                    const canvasRect = this._components.CoordinateMapperClass.safeBoundingRect(this._state.canvas);
                    const containerRect = this._components.CoordinateMapperClass.safeBoundingRect(this._state.viewer);
                    if (canvasRect && containerRect) {
                        const highlightRect = this._components.CoordinateMapperClass.fromPercentages({ xPct, yPct, wPct, hPct }, canvasRect, { left:0, top:0 });
                        if (mode === 'zoom') {
                            this._applyZoomFocus(highlightRect, containerRect, padding);
                        }
                        // Also ensure scrolling for legacy mode after layout changes complete
                        this._scheduleScrollAfterLayout(highlightEl, { xPct, yPct, wPct, hPct });
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
            // Hide action button when exiting focus mode
            this.hideActionButton();
            
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

        disableSelection() { 
            if (this._components.mouseHandler) {
                this._components.mouseHandler.disable();
                this._state.logger.info?.('Highlighting: Selection disabled for practice mode');
            }
        },

        enableSelection() {
            if (this._components.mouseHandler) {
                this._components.mouseHandler.enable();
                this._state.logger.info?.('Highlighting: Selection re-enabled after practice mode');
            }
        },

        async updateHighlightConfidence(highlightId, newConfidenceColor) {
            try {
                this._state.logger.info?.('Highlighting: Updating highlight confidence', {
                    highlightId,
                    newConfidenceColor
                });

                // Convert color to confidence enum
                const confidenceEnum = this._components.ConfidenceMapperClass.colorToConfidence(newConfidenceColor);
                if (confidenceEnum === null) {
                    this._state.logger.warn?.('Highlighting: Invalid confidence color', { color: newConfidenceColor });
                    return;
                }

                // Find the highlight element
                const highlightElement = this._state.viewer?.querySelector(`[data-role="highlight"][data-hl-id="${highlightId}"]`);
                if (!highlightElement) {
                    this._state.logger.warn?.('Highlighting: Highlight element not found', { highlightId });
                    return;
                }

                // Update DOM element
                highlightElement.dataset.confidence = confidenceEnum.toString();
                
                // Update visual styling
                highlightElement.classList.remove('confidence-red', 'confidence-amber', 'confidence-green');
                highlightElement.classList.add(`confidence-${newConfidenceColor}`);

                // Update in database through persistence service
                if (this._components.persistenceService && typeof this._components.persistenceService.updateHighlight === 'function') {
                    try {
                        await this._components.persistenceService.updateHighlight(
                            parseInt(highlightId, 10), 
                            { 
                                confidence: confidenceEnum,
                                color: newConfidenceColor  // Also update the color field
                            }
                        );
                        this._state.logger.info?.('Highlighting: Database updated successfully', {
                            highlightId,
                            confidenceEnum,
                            color: newConfidenceColor
                        });
                    } catch (dbError) {
                        this._state.logger.error?.('Highlighting: Failed to update database', {
                            highlightId,
                            confidenceEnum,
                            color: newConfidenceColor,
                            error: dbError
                        });
                    }
                }

                this._state.logger.info?.('Highlighting: Confidence updated successfully');
                
            } catch (error) {
                this._state.logger.error?.('Highlighting: Error updating highlight confidence', {
                    highlightId,
                    newConfidenceColor,
                    error
                });
            }
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

    _initializeComponents(confidenceModule = null, constantsModule = null, deps = null) {
            // Ensure confidence module is available
            if (!confidenceModule) {
                throw new Error('Confidence module must be injected via init() method');
            }
            
            // Ensure constants module is available
            if (!constantsModule) {
                throw new Error('Constants module must be injected via init() method');
            }
            
            // Store dependencies for use by other methods
            CONST = constantsModule;
            
            this._components.ConfidenceMapperClass = new ConfidenceMapperClass(confidenceModule);
            
            this._components.SelectionOverlayClass = new SelectionOverlayClass({
                overlayClass: this.CONFIG.CSS.OVERLAY_CLASS
            });

            this._components.mouseHandler = new MouseSelectionHandlerClass({
                minSelectionSize: this.CONFIG.SELECTION
            });

            // Persistence service must be constructed with a database provided by deps
            if (!deps || !deps.database) {
                throw new Error('Dependencies object (deps) with a `database` property must be provided to init()');
            }

            this._components.persistenceService = new HighlightPersistenceServiceClass(deps.database, this._state.logger, {
                // pass any persistence-specific configuration here in future
            });

            this._components.eventCoordinator = new HighlightEventCoordinatorClass({
                events: CONST.EVENTS,
                rehydrationDelay: this.CONFIG.TIMING.REHYDRATION_DELAY
            });

            // Initialize action button
            this._components.actionButton = new HighlightActionButtonClass({
                containerId: 'pdf-canvas',
                position: 'bottom-right'
            });

            // Initialize annotation form
            this._components.annotationForm = new HighlightAnnotationFormClass(this.logger,{
                containerId: 'pdf-canvas',
                maxTitleLength: 100,
                maxNotesLength: 1000
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

            // Persistence service is already constructed with the database via deps

            // Initialize event coordinator
            this._components.eventCoordinator
                .init()
                .onConfidenceChanged(({ color }) => this.setActiveConfidenceFromColor(color))
                .onScoreSelected(({ pdfId }) => this._handleScoreSelected(pdfId))
                .onPageChanged(({ page }) => this._handlePageChanged(page))
                .onLayoutChanged(() => this.repositionAll())
                .onHighlightAnnotationRequested((data) => this._handleAnnotationRequested(data))
                .onHighlightAnnotationSaved((data) => this._handleAnnotationSavedEvent(data))
                .onHighlightAnnotationCancelled((data) => this._handleAnnotationCancelledEvent(data));

            // Initialize action button
            this._components.actionButton
                .init()
                .onClick((highlightElement) => this._handleActionButtonClick(highlightElement))
                .onDelete((highlightElement) => this._handleDeleteButtonClick(highlightElement));

            // Initialize annotation form
            this._components.annotationForm
                .init()
                .onSave((annotationData) => this._handleAnnotationSaved(annotationData))
                .onCancel((highlightData) => this._handleAnnotationCancelled(highlightData));

            // Register focus-mode layout command handler
            if (window.PlayTimeLayoutCommands && typeof window.PlayTimeLayoutCommands.registerHandler === 'function') {
                window.PlayTimeLayoutCommands.registerHandler('focus-mode', this.handleFocusModeLayoutCommand);
                this._state.logger.info?.('Focus mode layout command handler registered');
            } else {
                this._state.logger.warn?.('PlayTimeLayoutCommands not available for handler registration');
            }

            // Initialize active confidence from DOM
            this._ensureActiveConfidenceFromDOM();
        },

        async _handleSelectionComplete(selection) {
            if (this._state.activeConfidence == null) {
                this._state.logger.warn?.('No active confidence set for highlighting');
                return;
            }

            // Get current page
            let pageNum = null;
            if (window.PlayTimePDFViewer && window.PlayTimePDFViewer.getCurrentPage) {
                pageNum = window.PlayTimePDFViewer.getCurrentPage();
            }

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

            const domElement = this._createHighlightFromElement(highlightElement);

            await this._persistHighlight(highlightElement, domElement);

            // Automatically show annotation form for newly created highlight
            this._showAnnotationFormForNewHighlight(domElement);
        },

        async _handleScoreSelected(pdfId) {
            this._state.logger.info?.('🎯 Score selected, starting rehydration', { pdfId });

            // Hide action button when score changes
            this.hideActionButton();
            
            // Clear existing highlights
            this._clearHighlights();

            // Load and rehydrate highlights
            try {
                const sections = await this._components.persistenceService.loadHighlights(pdfId);
                if (sections && sections.length > 0) {
                    this._state.logger.info?.('📊 Loaded highlights from database', { 
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
                this._state.logger.warn?.('Failed to load highlights:', error);
            }
        },

        _handlePageChanged(page) {
            if (!Number.isFinite(page)) return;
            
            this.hideActionButton();
            
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

            // Add click handler to show action button
            domElement.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this._showActionButtonForHighlight(domElement);
            });

            // Add double-click handler for focus mode
            domElement.addEventListener('dblclick', (event) => {
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
                } else if (event.key === 'a' || event.key === 'A') {
                    // 'A' key for annotation
                    event.preventDefault();
                    event.stopPropagation();
                    this._showActionButtonForHighlight(domElement);
                }
            });

            this._state.viewer.appendChild(domElement);

            // Set visibility based on current page
            if (currentPage !== null && HighlightElementClass.page !== null) {
                domElement.style.display = (HighlightElementClass.page === currentPage) ? 'block' : 'none';
            }

            return domElement;
        },

        async _persistHighlight(HighlightElementClass, domElement) {
            try {
                const pdfId = this._getCurrentPdfId();
                if (pdfId != null && this._components.persistenceService.isAvailable()) {
                    const highlightId = await this._components.persistenceService.saveHighlight(HighlightElementClass, pdfId);
                    
                    // Update DOM element with the database-generated ID
                    if (domElement && highlightId) {
                        domElement.dataset.hlId = highlightId.toString();
                        this._state.logger.info?.('Highlight saved to database with ID:', highlightId);
                    }
                    
                    return highlightId;
                }
            } catch (error) {
                this._state.logger.warn?.('Failed to persist highlight:', error);
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
            var dimensions = this._getHighlightDimensions(domElement.dataset);
            if (!dimensions) {
                this._state.logger.warn?.('Failed to get highlight dimensions');
                return;
            }

            const { xPct, yPct, wPct, hPct } = dimensions;
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
                        this._state.logger.info?.('📏 Canvas size grew significantly, repositioning highlights', {
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
                    this._state.logger.info?.('⏱️ Canvas size monitoring completed', {
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
        },

        /**
         * Scroll the highlight into view in the viewport
         */
        _scrollHighlightIntoView(highlightEl, coordinates, options = {}) {
            const { behavior = 'smooth' } = options;
            
            if (!highlightEl) {
                this._state.logger?.warn?.('No highlight element provided for scrolling');
                return;
            }

            // Try using the highlight element's scrollIntoView first
            try {
                highlightEl.scrollIntoView({
                    behavior,
                    block: 'center',
                    inline: 'center'
                });
                return;
            } catch (e) {
                this._state.logger?.warn?.('scrollIntoView failed, trying manual scroll', e);
            }

            // Fallback to manual scrolling calculation
            try {
                const viewerElement = this._state.viewer;
                if (!viewerElement) {
                    this._state.logger?.warn?.('No viewer element found for manual scrolling');
                    return;
                }

                const highlightRect = highlightEl.getBoundingClientRect();
                const viewerRect = viewerElement.getBoundingClientRect();
                
                // Check if highlight is already in view
                const isInView = highlightRect.top >= viewerRect.top && 
                               highlightRect.bottom <= viewerRect.bottom &&
                               highlightRect.left >= viewerRect.left && 
                               highlightRect.right <= viewerRect.right;
                
                if (isInView) {
                    return; // Already in view
                }

                // Calculate scroll offsets to center the highlight
                const scrollContainer = viewerElement.closest('.scroll-container') || 
                                      document.documentElement || 
                                      document.body;

                const targetScrollTop = highlightRect.top + window.scrollY - 
                                      (window.innerHeight / 2) + 
                                      (highlightRect.height / 2);

                const targetScrollLeft = highlightRect.left + window.scrollX - 
                                       (window.innerWidth / 2) + 
                                       (highlightRect.width / 2);

                // Smooth scroll to position
                if (scrollContainer.scrollTo) {
                    scrollContainer.scrollTo({
                        top: Math.max(0, targetScrollTop),
                        left: Math.max(0, targetScrollLeft),
                        behavior
                    });
                } else {
                    // Fallback for older browsers
                    scrollContainer.scrollTop = Math.max(0, targetScrollTop);
                    scrollContainer.scrollLeft = Math.max(0, targetScrollLeft);
                }
            } catch (e) {
                this._state.logger?.warn?.('Manual scroll calculation failed', e);
            }
        },

        /**
         * Schedule scrolling to happen after layout changes complete
         */
        _scheduleScrollAfterLayout(highlightEl, coordinates, options = {}) {
            const eventName = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS && window.PlayTimeConstants.EVENTS.LAYOUT_CHANGED) || 'playtime:layout-changed';
            
            // Set up one-time listener for layout change event
            const scrollAfterLayout = () => {
                // Remove the listener to prevent multiple calls
                window.removeEventListener(eventName, scrollAfterLayout);
                
                // Small delay to ensure all layout changes are complete
                setTimeout(() => {
                    this._scrollHighlightIntoView(highlightEl, coordinates, options);
                }, 50);
            };
            
            window.addEventListener(eventName, scrollAfterLayout);
            
            // Fallback timeout in case layout change event doesn't fire
            setTimeout(() => {
                window.removeEventListener(eventName, scrollAfterLayout);
                this._scrollHighlightIntoView(highlightEl, coordinates, options);
            }, 1000);
        },

        /**
         * Show the action button for a specific highlight
         * @param {HTMLElement} highlightElement - The highlight element to show action button for
         */
        _showActionButtonForHighlight(highlightElement) {
            if (!this._components.actionButton || !highlightElement) return;
            this._components.actionButton.showForHighlight(highlightElement);
        },

        /**
         * Show annotation form immediately for newly created highlight
         * @param {HTMLElement} highlightElement - The newly created highlight element
         */
        _showAnnotationFormForNewHighlight(highlightElement) {
            if (!highlightElement || !this._components.annotationForm) return;

            // Prepare highlight data with isNewHighlight flag
            const highlightData = this._prepareHighlightDataForAnnotation(highlightElement, { isNewHighlight: true });

            // Show the annotation form immediately
            this._components.annotationForm.showForHighlight(highlightData);
            
            this._state.logger.info?.('Annotation form shown for new highlight', { 
                highlightId: highlightElement.dataset.hlId 
            });
        },

        /**
         * Prepare highlight data object for annotation forms
         * @param {HTMLElement} highlightElement - The highlight DOM element
         * @param {Object} options - Additional options to include in the data
         * @returns {Object} Formatted highlight data object
         */
        _prepareHighlightDataForAnnotation(highlightElement, options = {}) {
            if (!highlightElement) return null;

            // Extract existing annotation data if present
            const existingAnnotation = {};
            const title = highlightElement.dataset.hlTitle;
            const notes = highlightElement.dataset.hlNotes;
            const isAnnotated = highlightElement.dataset.hlAnnotated === 'true';
            
            if (isAnnotated && (title || notes)) {
                existingAnnotation.title = title || '';
                existingAnnotation.notes = notes || '';
                if (highlightElement.dataset.hlAnnotationTimestamp) {
                    existingAnnotation.timestamp = parseInt(highlightElement.dataset.hlAnnotationTimestamp);
                }
            }

            return {
                highlightId: highlightElement.dataset.hlId,
                color: highlightElement.dataset.color,
                confidence: parseInt(highlightElement.dataset.confidence),
                page: highlightElement.dataset.page ? parseInt(highlightElement.dataset.page) : null,
                coordinates: this._getHighlightDimensions(highlightElement.dataset),
                annotation: Object.keys(existingAnnotation).length > 0 ? existingAnnotation : null,
                element: highlightElement,
                ...options
            };
        },

        /**
         * Handle action button click - opens annotation dialog for the highlight
         * @param {HTMLElement} highlightElement - The highlight element to annotate
         */
        _handleActionButtonClick(highlightElement) {
            if (!highlightElement) return;

            // Hide the action button
            this._components.actionButton.hide();

            // Prepare highlight data for the annotation form
            const highlightData = this._prepareHighlightDataForAnnotation(highlightElement);

            // Show the annotation form
            this._components.annotationForm.showForHighlight(highlightData);
        },

        /**
         * Handle delete button click - deletes the highlight
         * @param {HTMLElement} highlightElement - The highlight element to delete
         */
        async _handleDeleteButtonClick(highlightElement) {
            if (!highlightElement) return;

            // Hide the action button immediately
            this._components.actionButton.hide();

            try {
                // Get highlight ID from the element
                const highlightId = highlightElement.dataset.hlId;
                if (!highlightId) {
                    this.logger.warn('Cannot delete highlight: no ID found');
                    return;
                }

                // Get the highlight deletion service from DI container
                const diContainer = window.diContainer;
                if (!diContainer) {
                    this.logger.error('DI container not available for highlight deletion');
                    return;
                }

                const highlightDeletionService = diContainer.get('highlightDeletionService');
                if (!highlightDeletionService) {
                    this.logger.error('Highlight deletion service not available');
                    return;
                }

                // Delete the highlight (service handles confirmation dialog)
                await highlightDeletionService.deleteHighlight(highlightId);

                // The service handles the database deletion, but we need to remove from UI
                // Find and remove all highlight elements with this ID
                const highlightElements = document.querySelectorAll(`[data-hl-id="${highlightId}"]`);
                highlightElements.forEach(element => {
                    element.remove();
                });

                this.logger.info(`Highlight ${highlightId} deleted successfully`);

            } catch (error) {
                this.logger.error('Failed to delete highlight:', error);
                // You might want to show a user-friendly error message here
            }
        },

        /**
         * Handle annotation request event from event coordinator
         * @param {Object} data - Annotation request data
         */
        _handleAnnotationRequested(data) {
            if (this._components.annotationForm) {
                this._components.annotationForm.showForHighlight(data);
            }
        },

        /**
         * Handle annotation saved from the form
         * @param {Object} annotationData - The saved annotation data
         */
        async _handleAnnotationSaved(annotationData) {
            try {
                const { title, notes, timestamp, highlightData } = annotationData;
                
                // Store annotation data on the highlight element
                if (highlightData && highlightData.element) {
                    const element = highlightData.element;
                    element.dataset.hlTitle = title || '';
                    element.dataset.hlNotes = notes || '';
                    element.dataset.hlAnnotated = 'true';
                    element.dataset.hlAnnotationTimestamp = timestamp.toString();
                }

                // Dispatch saved event for other modules
                const event = new CustomEvent('playtime:highlight-annotation-saved', {
                    detail: {
                        ...highlightData,
                        annotation: { title, notes, timestamp }
                    }
                });
                
                (this._state.viewer || document).dispatchEvent(event);
                
                this._state.logger.info?.('Annotation saved', { 
                    highlightId: highlightData.highlightId,
                    title: title ? title.substring(0, 50) + '...' : '(no title)'
                });

                // Update persistence if available
                if (this._components.persistenceService) {
                    // If highlightId exists, update the existing record
                    if (highlightData.highlightId) {
                        await this._updateHighlightInPersistence(highlightData.highlightId, {
                            title,
                            notes,
                            annotated: true,
                            annotationTimestamp: timestamp
                        });
                    } else {
                        // This should not happen - highlights should have an ID after being saved to database
                        this._state.logger.error?.('Cannot save annotation: highlight has no database ID', {
                            highlightElement: highlightData.element?.dataset,
                            annotation: { title, notes }
                        });
                        throw new Error('Cannot save annotation: highlight must be saved to database first');
                    }
                }

            } catch (e) {
                this._state.logger.warn?.('Failed to handle annotation save', e);
            }
        },

        /**
         * Handle annotation cancelled from the form
         * @param {Object} highlightData - The highlight data for the cancelled annotation
         */
        _handleAnnotationCancelled(highlightData) {
            try {
                // If this was a newly created highlight, show the action button instead
                if (highlightData && highlightData.isNewHighlight && highlightData.element) {
                    this._showActionButtonForHighlight(highlightData.element);
                }

                // Dispatch cancelled event for other modules
                const event = new CustomEvent('playtime:highlight-annotation-cancelled', {
                    detail: highlightData
                });
                
                (this._state.viewer || document).dispatchEvent(event);
                
                this._state.logger.info?.('Annotation cancelled', { 
                    highlightId: highlightData?.highlightId,
                    wasNewHighlight: highlightData?.isNewHighlight || false
                });

            } catch (e) {
                this._state.logger.warn?.('Failed to handle annotation cancel', e);
            }
        },

        /**
         * Handle annotation saved event from event coordinator
         * @param {Object} data - Annotation saved event data
         */
        _handleAnnotationSavedEvent(data) {
            // This can be used by other parts of the system
            this._state.logger.info?.('Annotation saved event received', data);
        },

        /**
         * Handle annotation cancelled event from event coordinator
         * @param {Object} data - Annotation cancelled event data
         */
        _handleAnnotationCancelledEvent(data) {
            // This can be used by other parts of the system
            this._state.logger.info?.('Annotation cancelled event received', data);
        },

        /**
         * Update highlight data in persistence layer
         * @param {string} highlightId - The highlight ID
         * @param {Object} annotationData - The annotation data to store
         */
        async _updateHighlightInPersistence(highlightId, annotationData) {
            try {
                if (!this._components.persistenceService) return;

                // Get existing highlight data
                const existingData = await this._components.persistenceService.getHighlight(highlightId);
                if (existingData) {
                    // Update with annotation data
                    const updatedData = { ...existingData, ...annotationData };
                    await this._components.persistenceService.updateHighlight(highlightId, updatedData);
                    this._state.logger.info?.('Highlight annotation data updated in database', highlightId);
                } else {
                    this._state.logger.warn?.('Highlight not found in database for update', highlightId);
                }
            } catch (e) {
                this._state.logger.warn?.('Failed to update highlight in persistence', e);
            }
        },

        /**
         * Hide the action button and annotation form (called when focus changes)
         */
        hideActionButton() {
            if (this._components.actionButton) {
                this._components.actionButton.hide();
            }
            if (this._components.annotationForm) {
                this._components.annotationForm.hide();
            }
        }
    };

    // Export for global use
    global.PlayTimeHighlighting = PlayTimeHighlighting;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PlayTimeHighlighting;
    }

})(typeof window !== 'undefined' ? window : globalThis);
