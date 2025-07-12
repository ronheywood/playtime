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

    return {
        init: function() {
            logger.log('🔄 PDF Viewer initializing...');
            
            // Configure PDF.js worker
            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                logger.log('✅ PDF.js configured');
            }
            
            return Promise.resolve();
        },
        
        loadPDF: async function(file) {
            try {
                logger.log('📖 Loading PDF:', file.name);
                
                // Convert File to ArrayBuffer
                const arrayBuffer = await file.arrayBuffer();
                
                // Load PDF using PDF.js
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                currentPDF = pdf;
                totalPages = pdf.numPages;
                currentPage = 1;
                
                logger.log(`✅ PDF loaded: ${totalPages} pages`);
                
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
                logger.log(`🖼️ Rendering page ${pageNum}`);
                
                const page = await currentPDF.getPage(pageNum);
                const canvas = document.getElementById('pdf-canvas');
                const context = canvas.getContext('2d');
                
                // Calculate scale to fit canvas
                const viewport = page.getViewport({ scale: 1.0 });
                const scale = Math.min(
                    canvas.parentElement.clientWidth / viewport.width,
                    canvas.parentElement.clientHeight / viewport.height
                ) * 0.9; // Add 10% margin
                
                const scaledViewport = page.getViewport({ scale });
                
                // Set canvas dimensions
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                
                // Render the page
                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport
                };
                
                await page.render(renderContext).promise;
                currentPage = pageNum;
                
                logger.log(`✅ Page ${pageNum} rendered`);
                return Promise.resolve();
            } catch (error) {
                logger.error(`❌ Failed to render page ${pageNum}:`, error);
                return Promise.reject(error);
            }
        },
        
        getCurrentPage: function() {
            return currentPage;
        },
        
        getTotalPages: function() {
            return totalPages;
        },
        
        updatePageInfo: function() {
            const pageInfo = document.querySelector('#page-info');
            if (pageInfo) {
                pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            }
        },
        
        nextPage: async function() {
            if (currentPage < totalPages) {
                await this.renderPage(currentPage + 1);
                this.updatePageInfo();
            }
        },
        
        prevPage: async function() {
            if (currentPage > 1) {
                await this.renderPage(currentPage - 1);
                this.updatePageInfo();
            }
        }
    };
}

// Export factory function for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createPlayTimePDFViewer;
}
