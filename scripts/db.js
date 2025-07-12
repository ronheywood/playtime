// PlayTime Database module (IndexedDB wrapper)
// Real IndexedDB implementation for PDF storage

console.log('📦 DB module loaded');

const DB_NAME = 'PlayTimeDB';
const DB_VERSION = 1;
const STORE_NAME = 'pdfFiles';

// Real IndexedDB functionality
window.PlayTimeDB = {
    _db: null,
    
    init: function() {
        console.log('🔄 DB initializing...');
        
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('⚠️ IndexedDB not supported');
                resolve();
                return;
            }
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = () => {
                console.error('❌ DB initialization failed:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this._db = request.result;
                console.log('✅ DB initialized successfully');
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
                    
                    console.log('✅ DB schema created');
                }
            };
        });
    },
    
    savePDF: function(file) {
        console.log('💾 Saving PDF:', file?.name);
        
        return new Promise((resolve, reject) => {
            if (!file) {
                console.warn('⚠️ No file provided');
                resolve();
                return;
            }
            
            if (!this._db) {
                console.error('❌ Database not initialized');
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
                
                const transaction = this._db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.add(pdfData);
                
                request.onsuccess = () => {
                    console.log('✅ PDF saved with ID:', request.result);
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    console.error('❌ Failed to save PDF:', request.error);
                    reject(request.error);
                };
            };
            
            reader.onerror = () => {
                console.error('❌ Failed to read file:', reader.error);
                reject(reader.error);
            };
            
            reader.readAsArrayBuffer(file);
        });
    },
    
    getAllPDFs: function() {
        console.log('📄 Retrieving all PDFs');
        
        return new Promise((resolve, reject) => {
            if (!this._db) {
                console.error('❌ Database not initialized');
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this._db.transaction([STORE_NAME], 'readonly');
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
                console.log('✅ Retrieved PDFs:', pdfs.length);
                resolve(pdfs);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to retrieve PDFs:', request.error);
                reject(request.error);
            };
        });
    },
    
    getPDF: function(id) {
        console.log('📄 Retrieving PDF by ID:', id);
        
        return new Promise((resolve, reject) => {
            if (!id) {
                resolve(null);
                return;
            }
            
            if (!this._db) {
                console.error('❌ Database not initialized');
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this._db.transaction([STORE_NAME], 'readonly');
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
                    console.log('✅ Retrieved PDF:', pdf.name);
                    resolve(pdf);
                } else {
                    console.log('📄 PDF not found for ID:', id);
                    resolve(null);
                }
            };
            
            request.onerror = () => {
                console.error('❌ Failed to retrieve PDF:', request.error);
                reject(request.error);
            };
        });
    }
};
