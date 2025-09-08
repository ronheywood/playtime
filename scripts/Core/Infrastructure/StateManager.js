/**
 * State Manager
 * Provides high-level state management operations
 * Acts as a facade for common state patterns
 */
class StateManager {
    constructor(appState, logger) {
        this.appState = appState;
        this.logger = logger;
        
        // Common state selectors
        this.selectors = {
            // Score selectors
            getCurrentScore: () => this.appState.getState('currentScore'),
            getScoreId: () => this.appState.getState('currentScore.id'),
            getScoreName: () => this.appState.getState('currentScore.name'),
            
            // Practice session selectors
            getPracticeSession: () => this.appState.getState('practiceSession'),
            isPracticeActive: () => !!this.appState.getState('practiceSession'),
            getCurrentSection: () => this.appState.getState('practiceSession.currentSection'),
            getSessionProgress: () => {
                const session = this.appState.getState('practiceSession');
                if (!session) return null;
                return {
                    completedSections: session.completedSections || 0,
                    totalSections: session.totalSections || 0,
                    startTime: session.startTime,
                    elapsedTime: Date.now() - session.startTime
                };
            },
            
            // PDF viewer selectors
            getPdfState: () => this.appState.getState('pdfViewer'),
            getCurrentPage: () => this.appState.getState('pdfViewer.currentPage'),
            getTotalPages: () => this.appState.getState('pdfViewer.totalPages'),
            getZoomLevel: () => this.appState.getState('pdfViewer.zoom'),
            isPdfLoading: () => this.appState.getState('pdfViewer.loading'),
            
            // Highlights selectors
            getHighlights: () => this.appState.getState('highlights'),
            getSelectedHighlight: () => this.appState.getState('selectedHighlight'),
            getHighlightById: (id) => {
                const highlights = this.appState.getState('highlights');
                return highlights.find(h => h.id === id);
            },
            getHighlightsForPage: (page) => {
                const highlights = this.appState.getState('highlights');
                return highlights.filter(h => h.page === page);
            },
            
            // UI selectors
            isFocusMode: () => this.appState.getState('ui.focusMode'),
            isSidebarVisible: () => this.appState.getState('ui.sidebarVisible'),
            getOpenDialogs: () => this.appState.getState('ui.dialogsOpen'),
            isDialogOpen: (dialogId) => {
                const dialogs = this.appState.getState('ui.dialogsOpen');
                return dialogs.includes(dialogId);
            },
            getTheme: () => this.appState.getState('ui.theme'),
            
            // Preferences selectors
            getPreferences: () => this.appState.getState('preferences'),
            getTimerDuration: () => this.appState.getState('preferences.timerDuration'),
            shouldShowConfidenceDialog: () => this.appState.getState('preferences.showConfidenceDialog'),
            isAutoSaveEnabled: () => this.appState.getState('preferences.autoSave')
        };

        // Common state actions
        this.actions = {
            // Score actions
            setCurrentScore: (score) => {
                this.appState.setState('currentScore', score);
                this.logger.info('Current score updated', { scoreId: score?.id, scoreName: score?.name });
            },
            
            clearCurrentScore: () => {
                this.appState.setState('currentScore', null);
                this.logger.info('Current score cleared');
            },
            
            // Practice session actions
            startPracticeSession: (sessionData) => {
                this.appState.setState('practiceSession', {
                    ...sessionData,
                    startTime: Date.now(),
                    completedSections: 0
                });
                this.logger.info('Practice session started', { sessionId: sessionData.id });
            },
            
            updatePracticeProgress: (sectionIndex, confidence) => {
                const session = this.appState.getState('practiceSession');
                if (!session) {
                    this.logger.warn('Cannot update progress: no active practice session');
                    return;
                }

                this.appState.batchUpdate({
                    'practiceSession.currentSection': sectionIndex,
                    'practiceSession.completedSections': session.completedSections + 1,
                    [`practiceSession.sectionConfidences.${sectionIndex}`]: confidence
                });
                
                this.logger.info('Practice progress updated', { sectionIndex, confidence });
            },
            
            endPracticeSession: () => {
                const session = this.appState.getState('practiceSession');
                if (session) {
                    const endTime = Date.now();
                    const duration = endTime - session.startTime;
                    
                    this.appState.setState('practiceSession', {
                        ...session,
                        endTime,
                        duration,
                        status: 'completed'
                    });
                    
                    this.logger.info('Practice session ended', { 
                        sessionId: session.id, 
                        duration: Math.round(duration / 1000) 
                    });
                }
            },
            
            clearPracticeSession: () => {
                this.appState.setState('practiceSession', null);
                this.logger.info('Practice session cleared');
            },
            
            // PDF viewer actions
            setPdfPage: (page) => {
                this.appState.setState('pdfViewer.currentPage', page);
            },
            
            setPdfTotalPages: (totalPages) => {
                this.appState.setState('pdfViewer.totalPages', totalPages);
            },
            
            setPdfZoom: (zoom) => {
                this.appState.setState('pdfViewer.zoom', zoom);
            },
            
            setPdfLoading: (loading) => {
                this.appState.setState('pdfViewer.loading', loading);
            },
            
            resetPdfViewer: () => {
                this.appState.batchUpdate({
                    'pdfViewer.currentPage': 1,
                    'pdfViewer.totalPages': 0,
                    'pdfViewer.zoom': 1.0,
                    'pdfViewer.loading': false
                });
            },
            
            // Highlights actions
            addHighlight: (highlight) => {
                const highlights = this.appState.getState('highlights');
                this.appState.setState('highlights', [...highlights, highlight]);
                this.logger.info('Highlight added', { highlightId: highlight.id });
            },
            
            updateHighlight: (highlightId, updates) => {
                const highlights = this.appState.getState('highlights');
                const updatedHighlights = highlights.map(h => 
                    h.id === highlightId ? { ...h, ...updates } : h
                );
                this.appState.setState('highlights', updatedHighlights);
                this.logger.info('Highlight updated', { highlightId, updates });
            },
            
            removeHighlight: (highlightId) => {
                const highlights = this.appState.getState('highlights');
                const filteredHighlights = highlights.filter(h => h.id !== highlightId);
                this.appState.setState('highlights', filteredHighlights);
                
                // Clear selection if this highlight was selected
                const selectedHighlight = this.appState.getState('selectedHighlight');
                if (selectedHighlight && selectedHighlight.id === highlightId) {
                    this.appState.setState('selectedHighlight', null);
                }
                
                this.logger.info('Highlight removed', { highlightId });
            },
            
            setSelectedHighlight: (highlight) => {
                this.appState.setState('selectedHighlight', highlight);
            },
            
            clearSelectedHighlight: () => {
                this.appState.setState('selectedHighlight', null);
            },
            
            setHighlights: (highlights) => {
                this.appState.setState('highlights', highlights);
                this.logger.info('Highlights set', { count: highlights.length });
            },
            
            // UI actions
            toggleFocusMode: () => {
                const current = this.appState.getState('ui.focusMode');
                this.appState.setState('ui.focusMode', !current);
                this.logger.info('Focus mode toggled', { focusMode: !current });
            },
            
            setFocusMode: (enabled) => {
                this.appState.setState('ui.focusMode', enabled);
                this.logger.info('Focus mode set', { focusMode: enabled });
            },
            
            toggleSidebar: () => {
                const current = this.appState.getState('ui.sidebarVisible');
                this.appState.setState('ui.sidebarVisible', !current);
            },
            
            setSidebarVisible: (visible) => {
                this.appState.setState('ui.sidebarVisible', visible);
            },
            
            openDialog: (dialogId) => {
                const dialogs = this.appState.getState('ui.dialogsOpen');
                if (!dialogs.includes(dialogId)) {
                    this.appState.setState('ui.dialogsOpen', [...dialogs, dialogId]);
                    this.logger.info('Dialog opened', { dialogId });
                }
            },
            
            closeDialog: (dialogId) => {
                const dialogs = this.appState.getState('ui.dialogsOpen');
                const filtered = dialogs.filter(id => id !== dialogId);
                this.appState.setState('ui.dialogsOpen', filtered);
                this.logger.info('Dialog closed', { dialogId });
            },
            
            closeAllDialogs: () => {
                this.appState.setState('ui.dialogsOpen', []);
                this.logger.info('All dialogs closed');
            },
            
            setTheme: (theme) => {
                this.appState.setState('ui.theme', theme);
                this.logger.info('Theme changed', { theme });
            },
            
            // Preferences actions
            setTimerDuration: (duration) => {
                this.appState.setState('preferences.timerDuration', duration);
                this.logger.info('Timer duration updated', { duration });
            },
            
            setShowConfidenceDialog: (show) => {
                this.appState.setState('preferences.showConfidenceDialog', show);
            },
            
            setAutoSave: (enabled) => {
                this.appState.setState('preferences.autoSave', enabled);
            },
            
            updatePreferences: (preferences) => {
                const current = this.appState.getState('preferences');
                this.appState.setState('preferences', { ...current, ...preferences });
                this.logger.info('Preferences updated', { preferences });
            }
        };
    }

    /**
     * Subscribe to state changes with automatic cleanup
     * @param {string} path - State path to watch
     * @param {Function} callback - Change callback
     * @returns {Object} Subscription object with unsubscribe method
     */
    subscribe(path, callback) {
        const unsubscribe = this.appState.subscribe(path, callback);
        
        return {
            unsubscribe,
            // Helper to get current value
            getValue: () => this.appState.getState(path)
        };
    }

    /**
     * Create a computed state value that updates when dependencies change
     * @param {Function} computeFn - Function that computes the value
     * @param {string[]} dependencies - State paths to watch
     * @param {Function} callback - Callback when computed value changes
     * @returns {Object} Computed subscription object
     */
    computed(computeFn, dependencies, callback) {
        let currentValue = computeFn();
        
        const unsubscribers = dependencies.map(dep => 
            this.appState.subscribe(dep, () => {
                const newValue = computeFn();
                if (newValue !== currentValue) {
                    const oldValue = currentValue;
                    currentValue = newValue;
                    callback(newValue, oldValue);
                }
            })
        );

        return {
            getValue: () => currentValue,
            unsubscribe: () => {
                unsubscribers.forEach(unsub => unsub());
            }
        };
    }

    /**
     * Watch multiple state paths and get notified of any changes
     * @param {string[]} paths - Array of state paths to watch
     * @param {Function} callback - Callback with changed path info
     * @returns {Function} Unsubscribe function
     */
    watchMultiple(paths, callback) {
        const unsubscribers = paths.map(path => 
            this.appState.subscribe(path, (newValue, oldValue) => {
                callback({ path, newValue, oldValue });
            })
        );

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }

    /**
     * Create a state slice for a specific component
     * @param {string} basePath - Base state path for the slice
     * @returns {Object} State slice with scoped getters and setters
     */
    createSlice(basePath) {
        return {
            get: (subPath = '') => {
                const fullPath = subPath ? `${basePath}.${subPath}` : basePath;
                return this.appState.getState(fullPath);
            },
            
            set: (subPath, value) => {
                let fullPath, actualValue;
                
                if (typeof subPath === 'string') {
                    fullPath = `${basePath}.${subPath}`;
                    actualValue = value;
                } else {
                    // If first argument is not string, treat it as value for base path
                    fullPath = basePath;
                    actualValue = subPath;
                }
                
                this.appState.setState(fullPath, actualValue);
            },
            
            subscribe: (subPath, callback) => {
                let fullPath;
                let actualCallback;
                
                if (typeof subPath === 'function') {
                    // If first argument is function, watch base path
                    fullPath = basePath;
                    actualCallback = subPath;
                } else {
                    fullPath = `${basePath}.${subPath}`;
                    actualCallback = callback;
                }
                
                return this.appState.subscribe(fullPath, actualCallback);
            }
        };
    }

    /**
     * Get current application state snapshot
     */
    getSnapshot() {
        return this.appState.getSnapshot();
    }

    /**
     * Load application state from snapshot
     */
    loadSnapshot(snapshot) {
        this.appState.loadSnapshot(snapshot);
    }

    /**
     * Reset application state
     */
    reset() {
        this.appState.reset();
    }

    /**
     * Undo last state change
     */
    undo() {
        return this.appState.undo();
    }

    /**
     * Redo next state change
     */
    redo() {
        return this.appState.redo();
    }
}

// Export for both ES6 modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
} else if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}
