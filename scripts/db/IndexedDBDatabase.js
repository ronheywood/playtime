const DB_NAME = 'PlayTimeDB';
const DB_VERSION = 3; // bumped for practice plans and practice plan highlights stores
const STORE_NAME = 'pdfFiles';
const SECTIONS_STORE = 'sections';
const PRACTICE_PLANS_STORE = 'practicePlans';
const PRACTICE_PLAN_HIGHLIGHTS_STORE = 'practicePlanHighlights';

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

    // ---- Practice Plans API ----
    async savePracticePlan(practicePlan) {
        return new Promise((resolve, reject) => {
            if (!this._db) { 
                return reject(new Error('Database not initialized')); 
            }
            try {
                const tx = this._db.transaction([PRACTICE_PLANS_STORE], 'readwrite');
                const store = tx.objectStore(PRACTICE_PLANS_STORE);
                const record = { 
                    ...practicePlan, 
                    createdAt: practicePlan.createdAt || new Date().toISOString() 
                };
                const req = store.add(record);
                req.onsuccess = () => {
                    this.logger.info('✅ Practice plan saved with ID:', req.result);
                    resolve(req.result);
                };
                req.onerror = () => {
                    this.logger.error('❌ Failed to save practice plan:', req.error);
                    reject(req.error);
                };
            } catch (e) { 
                this.logger.error('❌ Exception saving practice plan:', e);
                reject(e); 
            }
        });
    }

    async getPracticePlan(id) {
        return new Promise((resolve, reject) => {
            if (!this._db) { 
                return reject(new Error('Database not initialized')); 
            }
            try {
                const tx = this._db.transaction([PRACTICE_PLANS_STORE], 'readonly');
                const store = tx.objectStore(PRACTICE_PLANS_STORE);
                const numericId = Number(id);
                const req = store.get(numericId);
                req.onsuccess = () => {
                    resolve(req.result || null);
                };
                req.onerror = () => reject(req.error);
            } catch(e) { reject(e); }
        });
    }

    async getPracticePlansForScore(scoreId) {
        return new Promise((resolve, reject) => {
            if (!this._db) { 
                return reject(new Error('Database not initialized')); 
            }
            try {
                const tx = this._db.transaction([PRACTICE_PLANS_STORE], 'readonly');
                const store = tx.objectStore(PRACTICE_PLANS_STORE);
                const idx = store.index('scoreId');
                const req = idx.getAll(IDBKeyRange.only(Number(scoreId)));
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            } catch(e) { reject(e); }
        });
    }

    async deletePracticePlan(id) {
        return new Promise((resolve, reject) => {
            if (!this._db) { 
                return reject(new Error('Database not initialized')); 
            }
            try {
                const tx = this._db.transaction([PRACTICE_PLANS_STORE], 'readwrite');
                const store = tx.objectStore(PRACTICE_PLANS_STORE);
                const numericId = Number(id);
                const req = store.delete(numericId);
                req.onsuccess = () => {
                    this.logger.info('✅ Practice plan deleted with ID:', id);
                    resolve();
                };
                req.onerror = () => {
                    this.logger.error('❌ Failed to delete practice plan:', req.error);
                    reject(req.error);
                };
            } catch (e) { 
                this.logger.error('❌ Exception deleting practice plan:', e);
                reject(e); 
            }
        });
    }

    async updatePracticePlan(id, updates) {
        return new Promise((resolve, reject) => {
            if (!this._db) { 
                return reject(new Error('Database not initialized')); 
            }
            try {
                const tx = this._db.transaction([PRACTICE_PLANS_STORE], 'readwrite');
                const store = tx.objectStore(PRACTICE_PLANS_STORE);
                const numericId = Number(id);
                
                // First get the existing record
                const getReq = store.get(numericId);
                getReq.onsuccess = () => {
                    const existingRecord = getReq.result;
                    if (!existingRecord) {
                        reject(new Error(`Practice plan with id ${id} not found`));
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
                    putReq.onsuccess = () => {
                        this.logger.info('✅ Practice plan updated with ID:', id);
                        resolve(updatedRecord);
                    };
                    putReq.onerror = () => {
                        this.logger.error('❌ Failed to update practice plan:', putReq.error);
                        reject(putReq.error);
                    };
                };
                getReq.onerror = () => reject(getReq.error);
            } catch (e) { 
                this.logger.error('❌ Exception updating practice plan:', e);
                reject(e); 
            }
        });
    }

    // ---- Practice Plan Highlights API ----
    async savePracticePlanHighlight(planHighlight) {
        return new Promise((resolve, reject) => {
            if (!this._db) { 
                return reject(new Error('Database not initialized')); 
            }
            try {
                const tx = this._db.transaction([PRACTICE_PLAN_HIGHLIGHTS_STORE], 'readwrite');
                const store = tx.objectStore(PRACTICE_PLAN_HIGHLIGHTS_STORE);
                const record = { 
                    ...planHighlight, 
                    createdAt: planHighlight.createdAt || new Date().toISOString() 
                };
                const req = store.add(record);
                req.onsuccess = () => {
                    this.logger.debug?.('✅ Practice plan highlight saved with ID:', req.result);
                    resolve(req.result);
                };
                req.onerror = () => {
                    this.logger.error('❌ Failed to save practice plan highlight:', req.error);
                    reject(req.error);
                };
            } catch (e) { 
                this.logger.error('❌ Exception saving practice plan highlight:', e);
                reject(e); 
            }
        });
    }

    async getPracticePlanHighlights(practicePlanId) {
        return new Promise((resolve, reject) => {
            if (!this._db) { 
                return reject(new Error('Database not initialized')); 
            }
            try {
                const tx = this._db.transaction([PRACTICE_PLAN_HIGHLIGHTS_STORE], 'readonly');
                const store = tx.objectStore(PRACTICE_PLAN_HIGHLIGHTS_STORE);
                const idx = store.index('practicePlanId');
                const req = idx.getAll(IDBKeyRange.only(Number(practicePlanId)));
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => reject(req.error);
            } catch(e) { reject(e); }
        });
    }

    async deletePracticePlanHighlights(practicePlanId) {
        return new Promise((resolve, reject) => {
            if (!this._db) { 
                return reject(new Error('Database not initialized')); 
            }
            try {
                const tx = this._db.transaction([PRACTICE_PLAN_HIGHLIGHTS_STORE], 'readwrite');
                const store = tx.objectStore(PRACTICE_PLAN_HIGHLIGHTS_STORE);
                const idx = store.index('practicePlanId');
                const req = idx.openCursor(IDBKeyRange.only(Number(practicePlanId)));
                
                req.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        this.logger.info('✅ Practice plan highlights deleted for plan ID:', practicePlanId);
                        resolve();
                    }
                };
                req.onerror = () => {
                    this.logger.error('❌ Failed to delete practice plan highlights:', req.error);
                    reject(req.error);
                };
            } catch (e) { 
                this.logger.error('❌ Exception deleting practice plan highlights:', e);
                reject(e); 
            }
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
                // practice plans store
                if (!database.objectStoreNames.contains(PRACTICE_PLANS_STORE)) {
                    const pp = database.createObjectStore(PRACTICE_PLANS_STORE, { keyPath: 'id', autoIncrement: true });
                    pp.createIndex('scoreId', 'scoreId', { unique: false });
                    pp.createIndex('createdAt', 'createdAt', { unique: false });
                    this.logger.info('✅ practice plans store created');
                }
                // practice plan highlights store (many-to-many)
                if (!database.objectStoreNames.contains(PRACTICE_PLAN_HIGHLIGHTS_STORE)) {
                    const pph = database.createObjectStore(PRACTICE_PLAN_HIGHLIGHTS_STORE, { keyPath: 'id', autoIncrement: true });
                    pph.createIndex('practicePlanId', 'practicePlanId', { unique: false });
                    pph.createIndex('highlightId', 'highlightId', { unique: false });
                    pph.createIndex('sortOrder', 'sortOrder', { unique: false });
                    this.logger.info('✅ practice plan highlights store created');
                }
            };
        });
    }


    // ---- Highlight Deletion API ----
    async deleteHighlight(highlightId) {
        return new Promise((resolve, reject) => {
            if (!this._db) {
                return reject(new Error('Database not initialized'));
            }
            try {
                const tx = this._db.transaction([SECTIONS_STORE], 'readwrite');
                const store = tx.objectStore(SECTIONS_STORE);
                const numericId = Number(highlightId);
                
                const req = store.delete(numericId);
                req.onsuccess = () => {
                    this.logger.info('✅ Highlight deleted with ID:', highlightId);
                    resolve(true);
                };
                req.onerror = () => {
                    this.logger.error('❌ Failed to delete highlight:', req.error);
                    reject(req.error);
                };
            } catch (e) {
                reject(e);
            }
        });
    }
    
    // ---- Transaction Support for Atomic Operations ----
    async deleteWithTransaction(operations) {
        return new Promise((resolve, reject) => {
            if (!this._db) {
                return reject(new Error('Database not initialized'));
            }
            
            try {
                // Create transaction that spans all needed object stores
                const storeNames = [SECTIONS_STORE, PRACTICE_PLAN_HIGHLIGHTS_STORE];
                const tx = this._db.transaction(storeNames, 'readwrite');
                const results = [];
                let completedOperations = 0;
                
                const checkCompletion = () => {
                    if (completedOperations === operations.length) {
                        resolve({ success: true, results });
                    }
                };
                
                tx.onerror = () => {
                    this.logger.error('❌ Transaction failed:', tx.error);
                    reject(tx.error);
                };
                
                tx.onabort = () => {
                    this.logger.error('❌ Transaction aborted');
                    reject(new Error('Transaction aborted'));
                };
                
                // Execute all operations within the transaction
                operations.forEach((operation, operationIndex) => {
                    switch (operation.type) {
                        case 'deleteHighlight':
                            const sectionsStore = tx.objectStore(SECTIONS_STORE);
                            const deleteReq = sectionsStore.delete(Number(operation.highlightId));
                            
                            deleteReq.onsuccess = () => {
                                results[operationIndex] = { type: operation.type, success: true };
                                completedOperations++;
                                checkCompletion();
                            };
                            
                            deleteReq.onerror = () => {
                                this.logger.error('❌ Failed to delete highlight in transaction:', deleteReq.error);
                                tx.abort();
                            };
                            break;
                            
                        case 'deletePracticePlanHighlights':
                            const practiceStore = tx.objectStore(PRACTICE_PLAN_HIGHLIGHTS_STORE);
                            const practicePlanIndex = practiceStore.index('practicePlanId');
                            const cursorReq = practicePlanIndex.openCursor(IDBKeyRange.only(Number(operation.practicePlanId)));
                            
                            cursorReq.onsuccess = (event) => {
                                const cursor = event.target.result;
                                if (cursor) {
                                    cursor.delete();
                                    cursor.continue();
                                } else {
                                    // All practice plan highlights deleted
                                    results[operationIndex] = { type: operation.type, success: true };
                                    completedOperations++;
                                    checkCompletion();
                                }
                            };
                            
                            cursorReq.onerror = () => {
                                this.logger.error('❌ Failed to delete practice plan highlights in transaction:', cursorReq.error);
                                tx.abort();
                            };
                            break;
                            
                        default:
                            tx.abort();
                            reject(new Error(`Unsupported transaction operation: ${operation.type}`));
                            return;
                    }
                });
                
            } catch (e) {
                reject(e);
            }
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

// CommonJS export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IndexedDBDatabase, createIndexedDBDatabase };
}


