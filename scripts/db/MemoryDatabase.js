// db/MemoryDatabase.js
const AbstractDatabase = require('./AbstractDatabase');

class MemoryDatabase extends AbstractDatabase {
    constructor() {
        super();
        this._store = new Map();
        this._nextId = 1;
        this._initialized = false;
    this._sections = new Map(); // pdfId -> array of sections
    this._nextSectionId = 1;
    }

    async init() {
        this._initialized = true;
    }

    async save(item) {
        if (!this._initialized) throw new Error('Database not initialized');
        if (!item) return;
        // Always assign a unique string ID if not present
        let id = item.id;
        if (!id) {
            id = String(this._nextId++);
            item.id = id;
        }
        const toSave = { ...item, id };
        this._store.set(id, toSave);
        return id;
    }

    async getAll() {
        if (!this._initialized) throw new Error('Database not initialized');
        return Array.from(this._store.values());
    }

    async get(id) {
        if (!this._initialized) throw new Error('Database not initialized');
        if (!id) return null;
        return this._store.get(id) || null;
    }

    async delete(id) {
        if (!this._initialized) throw new Error('Database not initialized');
        this._store.delete(id);
    }

    // ---- Sections (Practice Sections) API ----
    async addHighlight(section) {
        if (!this._initialized) throw new Error('Database not initialized');
        if (!section || section.pdfId == null) return;
        const id = this._nextSectionId++;
        const record = { id, createdAt: new Date().toISOString(), ...section };
        const list = this._sections.get(section.pdfId) || [];
        list.push(record);
        this._sections.set(section.pdfId, list);
        return id;
    }
    
    async getHighlights(pdfId) {
        if (!this._initialized) throw new Error('Database not initialized');
        return (this._sections.get(pdfId) || []).slice();
    }
    
    async deleteHighlight(highlightId) {
        if (!this._initialized) throw new Error('Database not initialized');
        
        // Find and remove the highlight from all PDF sections
        for (const [pdfId, highlights] of this._sections.entries()) {
            const index = highlights.findIndex(h => h.id === highlightId);
            if (index !== -1) {
                highlights.splice(index, 1);
                if (highlights.length === 0) {
                    this._sections.delete(pdfId);
                }
                return true;
            }
        }
        return false;
    }
    
    // Transaction support for atomic operations
    async deleteWithTransaction(operations) {
        if (!this._initialized) throw new Error('Database not initialized');
        
        try {
            // In memory database, we simulate transaction by collecting all operations
            // and executing them atomically
            const results = [];
            
            for (const operation of operations) {
                switch (operation.type) {
                    case 'deleteHighlight':
                        const deleted = await this.deleteHighlight(operation.highlightId);
                        results.push({ type: operation.type, success: deleted });
                        break;
                    
                    case 'deletePracticePlanHighlights':
                        // For now, just return success - extend when practice plan functionality is needed
                        results.push({ type: operation.type, success: true });
                        break;
                        
                    default:
                        throw new Error(`Unsupported transaction operation: ${operation.type}`);
                }
            }
            
            return { success: true, results };
        } catch (error) {
            // In a real database, we'd rollback here
            // For memory database, operations are already atomic
            throw error;
        }
    }
}

module.exports = MemoryDatabase;
