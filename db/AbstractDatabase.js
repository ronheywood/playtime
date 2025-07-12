// db/AbstractDatabase.js
class AbstractDatabase {
    async init() { throw new Error('Not implemented'); }
    async save(item) { throw new Error('Not implemented'); }
    async getAll() { throw new Error('Not implemented'); }
    async get(id) { throw new Error('Not implemented'); }
    async delete(id) { throw new Error('Not implemented'); }
}

module.exports = AbstractDatabase;
