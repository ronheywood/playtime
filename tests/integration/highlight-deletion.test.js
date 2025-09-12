/**
 * Integration Test: Highlight Deletion
 * Verifies atomic deletion of highlights and cleanup of practice plans
 */

const TestHelpers = require('../helpers/test-helpers');

describe('Highlight Deletion Integration', () => {
    let database, highlightDeletionService, mockElements, mockLogger;

    beforeEach(async () => {
        // Set up DOM environment
        TestHelpers.setupDOM();
        TestHelpers.setupBasicDOM();
        
        // Mock global confirm for jsdom environment
        global.confirm = jest.fn(() => true); // Default to confirmed
        
        // Create mock database with the interface we need
        database = {
            initialized: true,
            highlights: new Map(),
            practicePlans: new Map(),
            
            // Mock IndexedDB interface for transactions
            db: {
                transaction: jest.fn((stores, mode) => {
                    const transaction = {
                        objectStore: jest.fn((storeName) => {
                            if (storeName === 'highlights') {
                                return {
                                    delete: jest.fn((id) => {
                                        database.highlights.delete(id);
                                    }),
                                    get: jest.fn((id) => ({
                                        onsuccess: null,
                                        result: database.highlights.get(id) || null
                                    }))
                                };
                            } else if (storeName === 'practicePlans') {
                                return {
                                    getAll: jest.fn(() => ({
                                        onsuccess: null,
                                        onerror: null,
                                        result: Array.from(database.practicePlans.values())
                                    })),
                                    put: jest.fn((plan) => {
                                        database.practicePlans.set(plan.id, plan);
                                    })
                                };
                            }
                        }),
                        oncomplete: null,
                        onerror: null
                    };
                    
                    // Simulate transaction success
                    setTimeout(() => {
                        if (transaction.oncomplete) transaction.oncomplete();
                    }, 0);
                    
                    return transaction;
                })
            },
            
            // Helper methods for tests
            async getHighlight(id) {
                return this.highlights.get(id) || null;
            },
            
            async saveHighlight(highlight) {
                this.highlights.set(highlight.id, highlight);
                return highlight.id;
            },
            
            async getPracticePlan(id) {
                return this.practicePlans.get(id) || null;
            },
            
            async savePracticePlan(plan) {
                this.practicePlans.set(plan.id, plan);
                return plan.id;
            }
        };
        
        // Create mock elements
        mockElements = TestHelpers.createFocusModeElements();
        
        // Create mock logger
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };
        
        // Create highlight deletion service
        const HighlightDeletionService = require('../../scripts/highlighting/HighlightDeletionService');
        highlightDeletionService = new HighlightDeletionService(database, mockLogger);
    });

    afterEach(async () => {
        TestHelpers.cleanup();
        
        // Reset mock logger
        if (mockLogger) {
            jest.clearAllMocks();
        }
        
        // Clean up global mocks
        if (global.confirm && global.confirm.mockRestore) {
            global.confirm.mockRestore();
        }
        delete global.confirm;
    });

    describe('Basic Highlight Deletion', () => {
        test('should delete highlight from database', async () => {
            // Arrange: Create a highlight
            const highlight = {
                id: 'highlight-1',
                scoreId: 'score-1',
                page: 1,
                coordinates: { x: 100, y: 100, width: 200, height: 50 },
                confidence: 'medium',
                title: 'Test Section',
                notes: 'Practice this slowly'
            };
            await database.saveHighlight(highlight);

            // Verify highlight exists
            const savedHighlight = await database.getHighlight('highlight-1');
            expect(savedHighlight).toBeTruthy();

            // Act: Delete the highlight
            const result = await highlightDeletionService.deleteHighlight('highlight-1');

            // Assert: Highlight should be deleted
            expect(result).toBe(true);
            const deletedHighlight = await database.getHighlight('highlight-1');
            expect(deletedHighlight).toBeNull();
        });

        test('should handle deletion of non-existent highlight', async () => {
            // Act & Assert: Should not throw error
            const result = await highlightDeletionService.deleteHighlight('non-existent');
            expect(result).toBe(false);
        });
    });

    describe('Practice Plan Integration', () => {
        test('should remove highlight from practice plans atomically', async () => {
            // Arrange: Create highlight and practice plan
            const highlight = {
                id: 'highlight-1',
                scoreId: 'score-1',
                page: 1,
                coordinates: { x: 100, y: 100, width: 200, height: 50 },
                confidence: 'medium',
                title: 'Section A',
                notes: 'Practice this slowly'
            };
            await database.saveHighlight(highlight);

            const practicePlan = {
                id: 'plan-1',
                scoreId: 'score-1',
                title: 'Daily Practice',
                sections: [
                    {
                        highlightId: 'highlight-1',
                        strategy: 'slow-practice',
                        targetTime: 300,
                        notes: 'Focus on dynamics'
                    },
                    {
                        highlightId: 'highlight-2', // Different highlight
                        strategy: 'repetition',
                        targetTime: 180,
                        notes: 'Work on accuracy'
                    }
                ],
                totalDuration: 480,
                createdAt: new Date().toISOString()
            };
            await database.savePracticePlan(practicePlan);

            // Act: Delete the highlight
            const result = await highlightDeletionService.deleteHighlight('highlight-1');

            // Assert: Highlight deleted and practice plan updated
            expect(result).toBe(true);
            
            // Highlight should be gone
            const deletedHighlight = await database.getHighlight('highlight-1');
            expect(deletedHighlight).toBeNull();

            // Practice plan should be updated
            const updatedPlan = await database.getPracticePlan('plan-1');
            expect(updatedPlan.sections).toHaveLength(1);
            expect(updatedPlan.sections[0].highlightId).toBe('highlight-2');
            expect(updatedPlan.totalDuration).toBe(180); // Recalculated
        });

        test('should handle multiple practice plans containing the same highlight', async () => {
            // Arrange: Create highlight and two practice plans
            const highlight = {
                id: 'highlight-1',
                scoreId: 'score-1',
                page: 1,
                coordinates: { x: 100, y: 100, width: 200, height: 50 },
                confidence: 'medium'
            };
            await database.saveHighlight(highlight);

            const plan1 = {
                id: 'plan-1',
                scoreId: 'score-1',
                sections: [{ highlightId: 'highlight-1', targetTime: 300 }],
                totalDuration: 300
            };
            const plan2 = {
                id: 'plan-2',
                scoreId: 'score-1',
                sections: [{ highlightId: 'highlight-1', targetTime: 240 }],
                totalDuration: 240
            };
            await database.savePracticePlan(plan1);
            await database.savePracticePlan(plan2);

            // Act: Delete the highlight
            const result = await highlightDeletionService.deleteHighlight('highlight-1');

            // Assert: Both practice plans should be updated
            expect(result).toBe(true);
            
            const updatedPlan1 = await database.getPracticePlan('plan-1');
            const updatedPlan2 = await database.getPracticePlan('plan-2');
            
            expect(updatedPlan1.sections).toHaveLength(0);
            expect(updatedPlan1.totalDuration).toBe(0);
            expect(updatedPlan2.sections).toHaveLength(0);
            expect(updatedPlan2.totalDuration).toBe(0);
        });

        test('should handle transaction rollback on database error', async () => {
            // Arrange: Create highlight
            const highlight = {
                id: 'highlight-1',
                scoreId: 'score-1',
                page: 1,
                coordinates: { x: 100, y: 100, width: 200, height: 50 }
            };
            await database.saveHighlight(highlight);

            // Mock database to simulate error during practice plan update
            const originalTransaction = database.db.transaction;
            database.db.transaction = jest.fn(() => {
                throw new Error('Database connection lost');
            });

            // Act & Assert: Should handle error gracefully
            await expect(highlightDeletionService.deleteHighlight('highlight-1'))
                .rejects.toThrow('Failed to delete highlight');

            // Verify logger was called with error
            expect(mockLogger.error).toHaveBeenCalledWith('Highlight deletion failed:', expect.any(Error));

            // Restore original transaction method
            database.db.transaction = originalTransaction;

            // Highlight should still exist (transaction rolled back)
            const stillExists = await database.getHighlight('highlight-1');
            expect(stillExists).toBeTruthy();
        });
    });

    describe('Confirmation Dialog', () => {
        test('should cancel deletion when user cancels confirmation', async () => {
            // Arrange: Create highlight
            const highlight = {
                id: 'highlight-1',
                scoreId: 'score-1',
                page: 1,
                coordinates: { x: 100, y: 100, width: 200, height: 50 }
            };
            await database.saveHighlight(highlight);

            // Mock confirm to return false (user cancels)
            const originalConfirm = global.confirm;
            global.confirm = jest.fn(() => false);

            // Act: Attempt to delete
            const result = await highlightDeletionService.deleteHighlight('highlight-1');

            // Assert: Deletion should be cancelled
            expect(result).toBe(false);
            expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this highlight?');
            
            // Highlight should still exist
            const stillExists = await database.getHighlight('highlight-1');
            expect(stillExists).toBeTruthy();

            // Restore confirm
            global.confirm = originalConfirm;
        });

        test('should proceed with deletion when user confirms', async () => {
            // Arrange: Create highlight
            const highlight = {
                id: 'highlight-1',
                scoreId: 'score-1',
                page: 1,
                coordinates: { x: 100, y: 100, width: 200, height: 50 }
            };
            await database.saveHighlight(highlight);

            // Mock confirm to return true (user confirms)
            const originalConfirm = global.confirm;
            global.confirm = jest.fn(() => true);

            // Act: Delete
            const result = await highlightDeletionService.deleteHighlight('highlight-1');

            // Assert: Deletion should proceed
            expect(result).toBe(true);
            expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this highlight?');
            
            // Highlight should be deleted
            const deleted = await database.getHighlight('highlight-1');
            expect(deleted).toBeNull();

            // Restore confirm
            global.confirm = originalConfirm;
        });
    });
});