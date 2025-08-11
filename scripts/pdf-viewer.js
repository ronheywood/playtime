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

    // Zoom state (inner-loop integration requirement)
    let zoomMultiplier = 1.0;
    const ZOOM = { MIN: 0.5, MAX: 3.0, STEP: 0.25 };

    // Clamp helper
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    return {
        init: function() {
            logger.info('🔄 PDF Viewer initializing...');
            
            // Configure PDF.js worker
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                logger.info('✅ PDF.js configured');
            }
            
            return Promise.resolve();
        },
        
        loadPDF: async function(file) {
            try {
                logger.info('📖 Loading PDF:', file.name);
                
                // Convert File to ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();
                
                // Load PDF using PDF.js
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                currentPDF = pdf;
                totalPages = pdf.numPages;
                currentPage = 1;
                
                logger.info(`✅ PDF loaded: ${totalPages} pages`);
                
                // Render first page
                await this.renderPage(1);
                
                // Update page info
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
                // Base viewport (unscaled)
                const baseViewport = page.getViewport({ scale: 1.0 });
                // Determine container dimensions (fallbacks for JSDOM/test environment)
                let containerWidth = (canvas.parentElement && canvas.parentElement.clientWidth) || canvas.clientWidth || baseViewport.width || 800;
                let containerHeight = (canvas.parentElement && canvas.parentElement.clientHeight) || canvas.clientHeight || baseViewport.height || 600;
                if (!containerWidth || !containerHeight) { // final fallback
                    containerWidth = baseViewport.width;
                    containerHeight = baseViewport.height;
                }
                // Fit scale with margin
                const fitScale = Math.min(
                    containerWidth / baseViewport.width,
                    containerHeight / baseViewport.height
                ) * 0.9;
                const effectiveScale = (isFinite(fitScale) ? fitScale : 1) * zoomMultiplier;
                const scaledViewport = page.getViewport({ scale: effectiveScale });
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                const renderContext = { canvasContext: context, viewport: scaledViewport };
                await page.render(renderContext).promise;
                currentPage = pageNum;
                logger.info(`✅ Page ${pageNum} rendered (zoom x${zoomMultiplier.toFixed(2)}) scale=${effectiveScale.toFixed(2)}`);
                return Promise.resolve();
            } catch (error) {
                logger.error(`❌ Failed to render page ${pageNum}:`, error);
                return Promise.reject(error);
            }
        },
        
        // Zoom API (integration tests will drive this)
        getZoom: function() { return zoomMultiplier; },
        setZoom: function(multiplier) {
            const prev = zoomMultiplier;
            zoomMultiplier = clamp(Number(multiplier) || 1.0, ZOOM.MIN, ZOOM.MAX);
            if (zoomMultiplier !== prev) {
                logger.info(`🔍 Zoom set to ${zoomMultiplier.toFixed(2)}`);
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
            const pageInfo = document.querySelector('#page-info');
            if (pageInfo) { pageInfo.textContent = `Page ${currentPage} of ${totalPages}`; }
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
