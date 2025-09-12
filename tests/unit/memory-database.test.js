// tests/unit/memory-database.test.js
const MemoryDatabase = require('../../scripts/db/MemoryDatabase');

describe('MemoryDatabase', () => {
    let db;

    beforeEach(async () => {
        db = new MemoryDatabase();
        await db.init();
    });

    describe('deleteHighlight', () => {
        beforeEach(async () => {
            // Add some test highlights
            await db.addHighlight({ pdfId: 1, text: 'highlight 1', page: 1 });
            await db.addHighlight({ pdfId: 1, text: 'highlight 2', page: 2 });
            await db.addHighlight({ pdfId: 2, text: 'highlight 3', page: 1 });
        });

        it('should delete an existing highlight', async () => {
            const highlights = await db.getHighlights(1);
            expect(highlights).toHaveLength(2);
            
            const highlightToDelete = highlights[0];
            const result = await db.deleteHighlight(highlightToDelete.id);
            
            expect(result).toBe(true);
            
            const remainingHighlights = await db.getHighlights(1);
            expect(remainingHighlights).toHaveLength(1);
            expect(remainingHighlights[0].id).not.toBe(highlightToDelete.id);
        });

        it('should return false when deleting non-existent highlight', async () => {
            const result = await db.deleteHighlight(999);
            expect(result).toBe(false);
        });

        it('should remove PDF entry when all highlights are deleted', async () => {
            const highlights = await db.getHighlights(1);
            expect(highlights).toHaveLength(2);
            
            // Delete both highlights
            await db.deleteHighlight(highlights[0].id);
            await db.deleteHighlight(highlights[1].id);
            
            const remainingHighlights = await db.getHighlights(1);
            expect(remainingHighlights).toHaveLength(0);
        });

        it('should only delete from the correct PDF', async () => {
            const pdf1Highlights = await db.getHighlights(1);
            const pdf2Highlights = await db.getHighlights(2);
            
            expect(pdf1Highlights).toHaveLength(2);
            expect(pdf2Highlights).toHaveLength(1);
            
            // Delete from PDF 1
            await db.deleteHighlight(pdf1Highlights[0].id);
            
            // PDF 1 should have one less, PDF 2 should be unchanged
            expect(await db.getHighlights(1)).toHaveLength(1);
            expect(await db.getHighlights(2)).toHaveLength(1);
        });

        it('should throw error when database not initialized', async () => {
            const uninitializedDb = new MemoryDatabase();
            await expect(uninitializedDb.deleteHighlight(1)).rejects.toThrow('Database not initialized');
        });
    });

    describe('deleteWithTransaction', () => {
        beforeEach(async () => {
            // Add some test highlights
            await db.addHighlight({ pdfId: 1, text: 'highlight 1', page: 1 });
            await db.addHighlight({ pdfId: 1, text: 'highlight 2', page: 2 });
            await db.addHighlight({ pdfId: 2, text: 'highlight 3', page: 1 });
        });

        it('should execute single deleteHighlight operation', async () => {
            const highlights = await db.getHighlights(1);
            const highlightToDelete = highlights[0];
            
            const operations = [
                { type: 'deleteHighlight', highlightId: highlightToDelete.id }
            ];
            
            const result = await db.deleteWithTransaction(operations);
            
            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                type: 'deleteHighlight',
                success: true
            });
            
            const remainingHighlights = await db.getHighlights(1);
            expect(remainingHighlights).toHaveLength(1);
        });

        it('should execute multiple deleteHighlight operations atomically', async () => {
            const highlights = await db.getHighlights(1);
            
            const operations = [
                { type: 'deleteHighlight', highlightId: highlights[0].id },
                { type: 'deleteHighlight', highlightId: highlights[1].id }
            ];
            
            const result = await db.deleteWithTransaction(operations);
            
            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(2);
            expect(result.results[0].success).toBe(true);
            expect(result.results[1].success).toBe(true);
            
            const remainingHighlights = await db.getHighlights(1);
            expect(remainingHighlights).toHaveLength(0);
        });

        it('should handle deletePracticePlanHighlights operation', async () => {
            const operations = [
                { type: 'deletePracticePlanHighlights', practicePlanId: 123 }
            ];
            
            const result = await db.deleteWithTransaction(operations);
            
            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(1);
            expect(result.results[0]).toEqual({
                type: 'deletePracticePlanHighlights',
                success: true
            });
        });

        it('should handle mixed operation types', async () => {
            const highlights = await db.getHighlights(1);
            
            const operations = [
                { type: 'deleteHighlight', highlightId: highlights[0].id },
                { type: 'deletePracticePlanHighlights', practicePlanId: 123 }
            ];
            
            const result = await db.deleteWithTransaction(operations);
            
            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(2);
            expect(result.results[0].success).toBe(true);
            expect(result.results[1].success).toBe(true);
        });

        it('should throw error for unsupported operation type', async () => {
            const operations = [
                { type: 'unsupportedOperation', data: 'test' }
            ];
            
            await expect(db.deleteWithTransaction(operations)).rejects.toThrow('Unsupported transaction operation: unsupportedOperation');
        });

        it('should throw error when database not initialized', async () => {
            const uninitializedDb = new MemoryDatabase();
            const operations = [{ type: 'deleteHighlight', highlightId: 1 }];
            
            await expect(uninitializedDb.deleteWithTransaction(operations)).rejects.toThrow('Database not initialized');
        });

        it('should handle empty operations array', async () => {
            const result = await db.deleteWithTransaction([]);
            
            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(0);
        });
    });
});