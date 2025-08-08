const DB_NAME = 'PlayTimeDB';
const DB_VERSION = 1;
const STORE_NAME = 'pdfFiles';

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
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    const store = database.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('uploadDate', 'uploadDate', { unique: false });
                    this.logger.info('✅ DB schema created');
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


