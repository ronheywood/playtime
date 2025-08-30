// PlayTime Database module (IndexedDB wrapper)
// Real IndexedDB implementation for PDF storage

const DB_NAME = 'PlayTimeDB';
const DB_VERSION = 1;
const STORE_NAME = 'pdfFiles';

/**
 * Create PlayTime Database with dependency injection
 * @param {Object} logger - Logger instance to use for logging
 * @returns {Object} Database interface
 */
function createPlayTimeDB(logger = console) {
    let _db = null;

    return {
        init: function() {
            logger.log('🔄 DB initializing...');
            
            return new Promise((resolve, reject) => {
                if (!window.indexedDB) {
                    logger.warn('⚠️ IndexedDB not supported');
                    resolve();
                    return;
                }
                
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = () => {
                    logger.error('❌ DB initialization failed:', request.error);
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    _db = request.result;
                    logger.log('✅ DB initialized successfully');
                    resolve();
                };
                
                request.onupgradeneeded = (event) => {
                    const database = event.target.result;
                    
                    // Create object store for PDF files
                    if (!database.objectStoreNames.contains(STORE_NAME)) {
                        const store = database.createObjectStore(STORE_NAME, { 
                            keyPath: 'id', 
                            autoIncrement: true 
                        });
                        
                        // Create indexes for searching
                        store.createIndex('name', 'name', { unique: false });
                        store.createIndex('uploadDate', 'uploadDate', { unique: false });
                        
                        logger.log('✅ DB schema created');
                    }
                };
            });
        },
        
        savePDF: function(file) {
            logger.log('💾 Saving PDF:', file?.name);
            
            return new Promise((resolve, reject) => {
                if (!file) {
                    logger.warn('⚠️ No file provided');
                    resolve();
                    return;
                }
                
                if (!_db) {
                    logger.error('❌ Database not initialized');
                    reject(new Error('Database not initialized'));
                    return;
                }
                
                const reader = new FileReader();
                
                reader.onload = () => {
                    const pdfData = {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: reader.result,
                        uploadDate: new Date().toISOString()
                    };
                    
                    const transaction = _db.transaction([STORE_NAME], 'readwrite');
                    const store = transaction.objectStore(STORE_NAME);
                    const request = store.add(pdfData);
                    
                    request.onsuccess = () => {
                        logger.log('✅ PDF saved with ID:', request.result);
                        resolve(request.result);
                    };
                    
                    request.onerror = () => {
                        logger.error('❌ Failed to save PDF:', request.error);
                        reject(request.error);
                    };
                };
                
                reader.onerror = () => {
                    logger.error('❌ Failed to read file:', reader.error);
                    reject(reader.error);
                };
                
                reader.readAsArrayBuffer(file);
            });
        },
        
        getAllPDFs: function() {
            logger.log('📄 Retrieving all PDFs');
            
            return new Promise((resolve, reject) => {
                if (!_db) {
                    logger.error('❌ Database not initialized');
                    reject(new Error('Database not initialized'));
                    return;
                }
                
                const transaction = _db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const pdfs = request.result.map(pdf => ({
                        id: pdf.id,
                        name: pdf.name,
                        type: pdf.type,
                        size: pdf.size,
                        uploadDate: pdf.uploadDate
                    }));
                    logger.log('✅ Retrieved PDFs:', pdfs.length);
                    resolve(pdfs);
                };
                
                request.onerror = () => {
                    logger.error('❌ Failed to retrieve PDFs:', request.error);
                    reject(request.error);
                };
            });
        },
        
        getPDF: function(id) {
            logger.log('📄 Retrieving PDF by ID:', id);
            
            return new Promise((resolve, reject) => {
                if (!id) {
                    resolve(null);
                    return;
                }
                
                if (!_db) {
                    logger.error('❌ Database not initialized');
                    reject(new Error('Database not initialized'));
                    return;
                }
                
                const transaction = _db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(Number(id));
                
                request.onsuccess = () => {
                    if (request.result) {
                        const pdf = {
                            id: request.result.id,
                            name: request.result.name,
                            type: request.result.type,
                            size: request.result.size,
                            data: request.result.data,
                            uploadDate: request.result.uploadDate
                        };
                        logger.log('✅ Retrieved PDF:', pdf.name);
                        resolve(pdf);
                    } else {
                        logger.log('📄 PDF not found for ID:', id);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    logger.error('❌ Failed to retrieve PDF:', request.error);
                    reject(request.error);
                };
            });
        },

        // Getter for the database connection (for testing)
        get _db() {
            return _db;
        }
    };
}

// Export factory function for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createPlayTimeDB;
}
