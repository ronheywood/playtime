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
        PDF_VIEWER: '.pdf-viewer-container',
        ZOOM_IN_BTN: '[data-role="zoom-in"]',
        ZOOM_OUT_BTN: '[data-role="zoom-out"]',
        ZOOM_DISPLAY: '[data-role="zoom-display"]'
    },
    CSS_CLASSES: {
        SCORE_ITEM: 'score-item',
        SCORE_META: 'score-meta',
        SCORE_TITLE: 'score-title',
        SCORE_FILENAME: 'score-filename',
        SCORE_DATE: 'score-date',
        SCORE_PAGES: 'score-pages'
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
                const scoreItems = pdfs.map(pdf => this._createScoreItemHTML(pdf)).join('');
                scoresList.innerHTML = scoreItems;
                this._attachClickHandlers(scoresList);
                _logger.info(`Score list refreshed with ${pdfs.length} items`);
                const currentTitle = document.querySelector(SCORE_LIST_CONFIG.SELECTORS.CURRENT_SCORE_TITLE);
                if (pdfs.length > 0 && currentTitle && !currentTitle.textContent.includes(pdfs[0].name || pdfs[0].filename)) {
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
                // Hide any existing status message when selecting a score from the list
                const viewer = document.querySelector(SCORE_LIST_CONFIG.SELECTORS.PDF_VIEWER);
                if (viewer) {
                    const msg = viewer.querySelector('.status-message');
                    if (msg && typeof msg.remove === 'function') msg.remove();
                }

                this._updateCurrentScoreTitle(pdf.name || pdf.filename);
                await this._loadIntoPDFViewer(pdf);
                // Mark selected item in the list for accessibility and UI state
                this._markSelectedItem(pdf.id);
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
            const rawName = pdf.name || pdf.filename || '';
            const baseName = rawName.replace(/\.pdf$/i, '');
            const prettyTitle = baseName
                .replace(/[\-_]+/g, ' ')
                .trim()
                .replace(/\b\w/g, c => c.toUpperCase());
            const pagesBadge = typeof pdf.pages === 'number'
                ? `<span class="badge badge-outline ${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_PAGES}">${pdf.pages} pages</span>`
                : '';
            return `
                <div class="${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_ITEM}" data-pdf-id="${pdf.id}" role="button" tabindex="0" aria-current="false">
                    <div class="${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_META}">
                        <div class="${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_TITLE}">${prettyTitle}</div>
                        <div class="${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_FILENAME}">${rawName}</div>
                        ${pagesBadge}
                    </div>
                    <div class="${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_DATE}">${uploadDate}</div>
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
                    if (this._customSelectionHandler) {
                        this._customSelectionHandler(pdfId, item);
                    } else {
                        this.loadScore(pdfId);
                    }
                });
                // Keyboard activation
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        item.click();
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
        },

        /**
         * Mark selected item in the list for accessibility and UI state
         * @private
         */
        _markSelectedItem: function(pdfId) {
            const listEl = document.querySelector(SCORE_LIST_CONFIG.SELECTORS.SCORES_LIST);
            if (!listEl) return;
            listEl.querySelectorAll(`.${SCORE_LIST_CONFIG.CSS_CLASSES.SCORE_ITEM}`).forEach(el => {
                const isActive = el.getAttribute('data-pdf-id') === String(pdfId);
                el.classList.toggle('selected', isActive);
                el.setAttribute('aria-current', isActive ? 'true' : 'false');
            });
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
