// PlayTime PDF Viewer module (PDF.js integration)

/**
 * Create PlayTime PDF Viewer with dependency injection
 * @param {Object} logger - Logger instance to use for logging
 * @returns {Object} PDF Viewer interface
 */
function createPlayTimePDFViewer(logger = console) {
    // PDF viewer state
    let currentPDF = null;
    let currentPage = 1;
    let totalPages = 0;

    // Zoom state
    let zoomMultiplier = 1.0;
    const ZOOM = { MIN: 1.0, MAX: 3.0, STEP: 0.25 };

    // Single document base fit scale to ensure consistent zoom across pages
    let documentBaseFitScale = null;
    let lastEffectiveScale = 1; // exposed for deterministic tests

    // Clamp helper
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    return {
        init: function() {
            logger.info('🔄 PDF Viewer initializing...');
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                logger.info('✅ PDF.js configured');
            }
            return Promise.resolve();
        },
        
        loadPDF: async function(file) {
            try {
                logger.info('📖 Loading PDF:', file.name);
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                currentPDF = pdf;
                totalPages = pdf.numPages;
                currentPage = 1;
                documentBaseFitScale = null; // reset for new document
                logger.info(`✅ PDF loaded: ${totalPages} pages`);
                await this.renderPage(1);
                this.updatePageInfo();
                return Promise.resolve();
            } catch (error) {
                logger.error('❌ Failed to load PDF:', error);
                return Promise.reject(error);
            }
        },
        
        renderPage: async function(pageNum) {
            if (!currentPDF) {
                logger.warn('❌ No PDF loaded');
                return Promise.reject(new Error('No PDF loaded'));
            }
            try {
                logger.info(`🖼️ Rendering page ${pageNum}`);
                const page = await currentPDF.getPage(pageNum);
                const canvas = document.getElementById('pdf-canvas');
                const context = canvas.getContext('2d');
                const baseViewport = page.getViewport({ scale: 1.0 });

                const containerEl = (canvas.closest && canvas.closest('.pdf-viewer-container')) || canvas.parentElement || canvas;
                let containerWidth = containerEl.clientWidth || baseViewport.width || 800;
                let containerHeight = containerEl.clientHeight || baseViewport.height || 600;
                if (!containerWidth || !containerHeight) {
                    containerWidth = baseViewport.width;
                    containerHeight = baseViewport.height;
                }

                // Compute base fit scale once for the document to keep zoom consistent across pages
                if (!documentBaseFitScale) {
                    const firstFit = Math.min(
                        containerWidth / baseViewport.width,
                        containerHeight / baseViewport.height
                    ) * 0.9;
                    documentBaseFitScale = isFinite(firstFit) && firstFit > 0 ? firstFit : 1;
                    logger.info(`ℹ️ Document base fit scale set: ${documentBaseFitScale.toFixed(3)}`);
                }

                const effectiveScale = documentBaseFitScale * zoomMultiplier;
                lastEffectiveScale = effectiveScale;

                const scaledViewport = page.getViewport({ scale: effectiveScale });
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                const renderContext = { canvasContext: context, viewport: scaledViewport };
                await page.render(renderContext).promise;
                currentPage = pageNum;
                logger.info(`✅ Page ${pageNum} rendered (zoom x${zoomMultiplier.toFixed(2)}) baseFit=${documentBaseFitScale.toFixed(2)} effective=${effectiveScale.toFixed(2)}`);
                // Publish page-changed for interested modules (e.g., highlighting visibility)
                try {
                    const evName = (window.PlayTimeConstants && window.PlayTimeConstants.EVENTS && window.PlayTimeConstants.EVENTS.PAGE_CHANGED) || 'playtime:page-changed';
                    const ev = new CustomEvent(evName, { detail: { page: currentPage } });
                    window.dispatchEvent(ev);
                } catch(_) { /* noop */ }
                return Promise.resolve();
            } catch (error) {
                logger.error(`❌ Failed to render page ${pageNum}:`, error);
                return Promise.reject(error);
            }
        },
        
        // Zoom API (integration tests will drive this)
        getZoom: function() { return zoomMultiplier; },
        getEffectiveScale: function() { return lastEffectiveScale; }, // deterministic hook for future tests
        getZoomBounds: function() { return { min: ZOOM.MIN, max: ZOOM.MAX }; },
        setZoom: function(multiplier) {
            const prev = zoomMultiplier;
            zoomMultiplier = clamp(Number(multiplier) || 1.0, ZOOM.MIN, ZOOM.MAX);
            if (zoomMultiplier !== prev) {
                logger.info(`🔍 Zoom set to ${zoomMultiplier.toFixed(2)}`);
                // Auto re-render current page when PDF is loaded so UI updates immediately
                if (currentPDF) {
                    // fire and forget; callers can still explicitly call reRenderCurrentPage() if they want await semantics
                    this.reRenderCurrentPage();
                }
            }
            return zoomMultiplier;
        },
        zoomIn: function() { return this.setZoom(zoomMultiplier + ZOOM.STEP); },
        zoomOut: function() { return this.setZoom(zoomMultiplier - ZOOM.STEP); },
        
        // Convenience: re-render current page with existing zoom (used by UI controls)
        reRenderCurrentPage: async function() {
            if (!currentPDF) return;
            await this.renderPage(currentPage);
            this.updatePageInfo();
        },
        
        getCurrentPage: function() { return currentPage; },
        getTotalPages: function() { return totalPages; },
        
        updatePageInfo: function() {
            const roleSelector = (window.PlayTimeConstants && window.PlayTimeConstants.SELECTORS && window.PlayTimeConstants.SELECTORS.PAGE_INFO) || '[data-role="page-info"]';
            const nodes = Array.from(document.querySelectorAll(roleSelector));
            nodes.forEach(n => { n.textContent = `Page ${currentPage} of ${totalPages}`; });
        },
        
        nextPage: async function() {
            if (currentPage < totalPages) { await this.renderPage(currentPage + 1); this.updatePageInfo(); }
        },
        prevPage: async function() {
            if (currentPage > 1) { await this.renderPage(currentPage - 1); this.updatePageInfo(); }
        }
    };
}

// Export factory function for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createPlayTimePDFViewer;
}
