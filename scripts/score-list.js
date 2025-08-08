/**
 * PlayTime Score List Component
 * Manages the display and interaction with the list of uploaded PDF scores
 * Uses dependency injection for database and logger
 */

// Configuration for this component
const SCORE_LIST_CONFIG = {
    SELECTORS: {
        SCORES_LIST: '#scores-list',
        CURRENT_SCORE_TITLE: '[data-role="current-score-title"]',
        PDF_VIEWER: '.pdf-viewer-container'
    },
    CSS_CLASSES: {
        SCORE_ITEM: 'score-item',
        SCORE_NAME: 'score-name',
        SCORE_DATE: 'score-date'
    },
    MESSAGES: {
        NO_SCORES_AVAILABLE: 'No scores available',
        NO_SCORES_YET: 'No scores yet. Upload a PDF to get started!',
        ERROR_LOADING_SCORES: 'Error loading scores',
        SCORES_LIST_NOT_FOUND: 'Scores list element not found',
        DATABASE_NOT_AVAILABLE: 'Database not available for score list'
    }
};

function createPlayTimeScoreList(database, logger = console) {
    // Private state
    let _database = database;
    let _logger = logger;

    return {
        /**
         * Initialize the score list component
         */
        init: function() {
            _logger.info('Score list component initialized');
            return Promise.resolve();
        },

        /**
         * Refresh the score list by fetching from database and updating DOM
         * @param {string} containerSelector - Optional selector for the container element
         */
        refresh: async function(containerSelector = SCORE_LIST_CONFIG.SELECTORS.SCORES_LIST) {
            const scoresList = document.querySelector(containerSelector);
            
            if (!scoresList) {
                _logger.warn(SCORE_LIST_CONFIG.MESSAGES.SCORES_LIST_NOT_FOUND);
                return;
            }
            
            if (!_database || !_database.getAll) {
                _logger.warn(SCORE_LIST_CONFIG.MESSAGES.DATABASE_NOT_AVAILABLE);
                scoresList.innerHTML = `<p>${SCORE_LIST_CONFIG.MESSAGES.NO_SCORES_AVAILABLE}</p>`;
                return;
            }
            
            try {
                const pdfs = await _database.getAll();
                if (pdfs.length === 0) {
                    scoresList.innerHTML = `<p>${SCORE_LIST_CONFIG.MESSAGES.NO_SCORES_YET}</p>`;
                    return;
                }
                // Create score items HTML
                const scoreItems = pdfs.map(pdf => this._createScoreItemHTML(pdf)).join('');
                scoresList.innerHTML = scoreItems;
                // Attach event listeners for score selection
                this._attachClickHandlers(scoresList);
                _logger.info(`Score list refreshed with ${pdfs.length} items`);
                // Auto-select the first score if present and none is currently selected
                const currentTitle = document.querySelector(SCORE_LIST_CONFIG.SELECTORS.CURRENT_SCORE_TITLE);
                if (pdfs.length > 0 && currentTitle && !currentTitle.textContent.includes(pdfs[0].name || pdfs[0].filename)) {
                    // Select the first score by default after refresh
                    await this.loadScore(pdfs[0].id);
                }
            } catch (error) {
                _logger.error('Failed to refresh score list:', error);
                scoresList.innerHTML = `<p>${SCORE_LIST_CONFIG.MESSAGES.ERROR_LOADING_SCORES}</p>`;
            }
        },

        /**
         * Load a specific score into the viewer
         * @param {string} pdfId - The ID of the PDF to load
         * @param {Function} onScoreLoaded - Optional callback when score is loaded
         */
        loadScore: async function(pdfId, onScoreLoaded = null) {
            if (!_database || !_database.get) {
                _logger.error('Database not available for loading score');
                return;
            }
            try {
                const pdf = await _database.get(pdfId);
                if (!pdf) {
                    _logger.error('PDF not found:', pdfId);
                    return;
                }
                // Update current score title
                this._updateCurrentScoreTitle(pdf.name || pdf.filename);
                // Load into PDF viewer if available
                await this._loadIntoPDFViewer(pdf);
                // Call optional callback
                if (onScoreLoaded && typeof onScoreLoaded === 'function') {
                    onScoreLoaded(pdf);
                }
                _logger.info(`Score loaded: ${pdf.name || pdf.filename}`);
            } catch (error) {
                _logger.error('Failed to load score into viewer:', error);
            }
        },

        /**
         * Set a custom score selection handler
         * @param {Function} handler - Function to call when a score is selected
         */
        setSelectionHandler: function(handler) {
            this._customSelectionHandler = handler;
        },

        /**
         * Get the current database instance
         */
        getDatabase: function() {
            return _database;
        },

        /**
         * Update the database instance (for dependency injection)
         * @param {Object} database - New database instance
         */
        setDatabase: function(database) {
            _database = database;
        },

        // Private methods (exposed for testing)
        
        /**
         * Create HTML for a single score item
         * @private
         */
        _createScoreItemHTML: function(pdf) {
            const uploadDate = new Date(pdf.uploadDate).toLocaleDateString();
            return `
                <div class="${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_ITEM}" data-pdf-id="${pdf.id}">
                    <span class="${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_NAME}">${pdf.name || pdf.filename}</span>
                    <span class="${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_DATE}">${uploadDate}</span>
                </div>
            `;
        },

        /**
         * Attach click handlers to score items
         * @private
         */
        _attachClickHandlers: function(scoresList) {
            scoresList.querySelectorAll(`.${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_ITEM}`).forEach(item => {
                item.addEventListener('click', () => {
                    const pdfId = item.dataset.pdfId;
                    
                    // Use custom handler if set, otherwise use default
                    if (this._customSelectionHandler) {
                        this._customSelectionHandler(pdfId, item);
                    } else {
                        this.loadScore(pdfId);
                    }
                });
            });
        },

        /**
         * Update the current score title display
         * @private
         */
        _updateCurrentScoreTitle: function(filename) {
            const currentTitles = document.querySelectorAll(SCORE_LIST_CONFIG.SELECTORS.CURRENT_SCORE_TITLE);
            if (currentTitles) {
                currentTitles.forEach(t => t.textContent = `${filename}`);
            }
        },

        /**
         * Load PDF into the viewer component
         * @private
         */
        _loadIntoPDFViewer: async function(pdf) {
            const pdfViewer = document.querySelector(SCORE_LIST_CONFIG.SELECTORS.PDF_VIEWER);
            if (pdfViewer && window.PlayTimePDFViewer) {
                const blob = new Blob([pdf.data], { type: 'application/pdf' });
                await window.PlayTimePDFViewer.loadPDF(blob);
            }
        }
    };
}

// Export for Node.js (testing) and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createPlayTimeScoreList, 
        SCORE_LIST_CONFIG
    };
} else if (typeof window !== 'undefined') {
    window.createPlayTimeScoreList = createPlayTimeScoreList;
}
