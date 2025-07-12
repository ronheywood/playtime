// db/MemoryDatabase.js
const AbstractDatabase = require('./AbstractDatabase');

class MemoryDatabase extends AbstractDatabase {
    constructor() {
        super();
        this._store = new Map();
        this._nextId = 1;
        this._initialized = false;
    }

    async init() {
        this._initialized = true;
    }

    async save(item) {
        if (!this._initialized) throw new Error('Database not initialized');
        if (!item) return;
        const id = item.id || this._nextId++;
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
}

module.exports = MemoryDatabase;
