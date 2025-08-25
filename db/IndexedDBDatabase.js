const DB_NAME = 'PlayTimeDB';
const DB_VERSION = 2; // bumped for sections (practice sections) store
const STORE_NAME = 'pdfFiles';
const SECTIONS_STORE = 'sections';

export class IndexedDBDatabase extends window.AbstractDatabase {
    // Abstract method: save(item)
    async save(file, meta = {}) {
        this.logger.info('💾 Saving PDF:', file?.name);
        return new Promise((resolve, reject) => {
            if (!file) {
                this.logger.warn('⚠️ No file provided');
                resolve();
                return;
            }
            if (!this._db) {
                this.logger.error('❌ Database not initialized');
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
                    uploadDate: new Date().toISOString(),
                    // new: optional metadata
                    pages: Number.isFinite(meta.pages) ? Number(meta.pages) : undefined,
                };
                const transaction = this._db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.add(pdfData);
                request.onsuccess = () => {
                    this.logger.info('✅ PDF saved with ID:', request.result);
                    resolve(request.result);
                };
                request.onerror = () => {
                    this.logger.error('❌ Failed to save PDF:', request.error);
                    reject(request.error);
                };
            };
            reader.onerror = () => {
                this.logger.error('❌ Failed to read file:', reader.error);
                reject(reader.error);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // Abstract method: getAll()
    async getAll() {
        this.logger.info('📄 Retrieving all PDFs');
        return new Promise((resolve, reject) => {
            if (!this._db) {
                this.logger.error('❌ Database not initialized');
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
                    uploadDate: pdf.uploadDate,
                    pages: pdf.pages,
                }));
                this.logger.info('✅ Retrieved PDFs:', pdfs.length);
                resolve(pdfs);
            };
            request.onerror = () => {
                this.logger.error('❌ Failed to retrieve PDFs:', request.error);
                reject(request.error);
            };
        });
    }

    // Abstract method: get(id)
    async get(id) {
        this.logger.info('📄 Retrieving PDF by ID:', id);
        return new Promise((resolve, reject) => {
            if (!id) {
                resolve(null);
                return;
            }
            if (!this._db) {
                this.logger.error('❌ Database not initialized');
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
                        uploadDate: request.result.uploadDate,
                        pages: request.result.pages,
                    };
                    this.logger.info('✅ Retrieved PDF:', pdf.name);
                    resolve(pdf);
                } else {
                    this.logger.info('📄 PDF not found for ID:', id);
                    resolve(null);
                }
            };
            request.onerror = () => {
                this.logger.error('❌ Failed to retrieve PDF:', request.error);
                reject(request.error);
            };
        });
    }

    // Abstract method: delete(id)
    async delete(id) {
        this.logger.info('🗑️ Deleting PDF by ID:', id);
        return new Promise((resolve, reject) => {
            if (!this._db) {
                this.logger.error('❌ Database not initialized');
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = this._db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(Number(id));
            request.onsuccess = () => {
                this.logger.info('✅ Deleted PDF with ID:', id);
                resolve();
            };
            request.onerror = () => {
                this.logger.error('❌ Failed to delete PDF:', request.error);
                reject(request.error);
            };
        });
    }

    // ---- Sections (Practice Sections) API ----
    async addHighlight(section) {
        if (!section || section.pdfId == null) return Promise.resolve();
        return new Promise((resolve, reject) => {
            if (!this._db) { return reject(new Error('Database not initialized')); }
            try {
                const tx = this._db.transaction([SECTIONS_STORE], 'readwrite');
                const store = tx.objectStore(SECTIONS_STORE);
                const record = { ...section, createdAt: section.createdAt || new Date().toISOString() };
                const req = store.add(record);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            } catch (e) { reject(e); }
        });
    }
    async getHighlights(pdfId) {
        return new Promise((resolve, reject) => {
            if (!this._db) { return reject(new Error('Database not initialized')); }
            try {
                const tx = this._db.transaction([SECTIONS_STORE], 'readonly');
                const store = tx.objectStore(SECTIONS_STORE);
                const idx = store.index('pdfId');
                const req = idx.getAll(IDBKeyRange.only(pdfId));
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            } catch(e) { reject(e); }
        });
    }
    
    async getHighlight(id) {
        return new Promise((resolve, reject) => {
            if (!this._db) { return reject(new Error('Database not initialized')); }
            try {
                const tx = this._db.transaction([SECTIONS_STORE], 'readonly');
                const store = tx.objectStore(SECTIONS_STORE);
                // Ensure ID is a number for IndexedDB auto-increment keys
                const numericId = Number(id);
                const req = store.get(numericId);
                req.onsuccess = () => {
                    resolve(req.result || null);
                };
                req.onerror = () => reject(req.error);
            } catch(e) { reject(e); }
        });
    }
    
    async updateHighlight(id, updates) {
        return new Promise((resolve, reject) => {
            if (!this._db) { return reject(new Error('Database not initialized')); }
            try {
                const tx = this._db.transaction([SECTIONS_STORE], 'readwrite');
                const store = tx.objectStore(SECTIONS_STORE);
                
                // Ensure ID is a number for IndexedDB auto-increment keys
                const numericId = Number(id);
                
                // First get the existing record
                const getReq = store.get(numericId);
                getReq.onsuccess = () => {
                    const existingRecord = getReq.result;
                    if (!existingRecord) {
                        reject(new Error(`Highlight with id ${id} not found`));
                        return;
                    }
                    
                    // Merge the updates with existing data
                    const updatedRecord = { 
                        ...existingRecord, 
                        ...updates, 
                        id: numericId, // Ensure ID doesn't change and remains numeric
                        updatedAt: new Date().toISOString()
                    };
                    
                    // Update the record
                    const putReq = store.put(updatedRecord);
                    putReq.onsuccess = () => resolve(updatedRecord);
                    putReq.onerror = () => reject(putReq.error);
                };
                getReq.onerror = () => reject(getReq.error);
            } catch(e) { reject(e); }
        });
    }
    constructor(logger = console) {
        super();
        this._db = null;
        this.logger = logger;
    }

    async init() {
        this.logger.info('🔄 DB initializing...');
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                this.logger.warn('⚠️ IndexedDB not supported');
                resolve();
                return;
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => {
                this.logger.error('❌ DB initialization failed:', request.error);
                reject(request.error);
            };
            request.onsuccess = () => {
                this._db = request.result;
                this.logger.info('✅ DB initialized successfully');
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                // pdfFiles store
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('uploadDate', 'uploadDate', { unique: false });
                    this.logger.info('✅ pdfFiles store created');
                }
                // sections relational-like store
                if (!database.objectStoreNames.contains(SECTIONS_STORE)) {
                    const s = database.createObjectStore(SECTIONS_STORE, { keyPath: 'id', autoIncrement: true });
                    s.createIndex('pdfId', 'pdfId', { unique: false });
                    this.logger.info('✅ sections store created');
                }
            };
        });
    }


    get _dbConn() {
        return this._db;
    }
}

/**
 * Factory function to create a new IndexedDBDatabase instance.
 *
 * This enables dependency injection and testability for the PlayTime app.
 * Use this factory in production code, and inject a different factory (e.g., for MemoryDatabase) in tests.
 *
 * @example
 *   import { createIndexedDBDatabase } from './db/IndexedDBDatabase.js';
 *   const db = createIndexedDBDatabase(logger);
 *
 * @param {Object} logger - Logger instance to use for logging (optional)
 * @returns {IndexedDBDatabase}
 */
export function createIndexedDBDatabase(logger = console) {
    return new IndexedDBDatabase(logger);
}


