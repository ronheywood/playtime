const PlayTimeHighlighting = require('../../../scripts/highlighting/highlighting');
const HighlightPersistenceService = require('../../../scripts/highlighting/HighlightPersistenceService');

describe('Highlight Annotation Persistence', () => {
    let highlighting;
    let mockDatabase;
    let persistenceService;
    let mockLogger;

    beforeEach(() => {
        // Mock DOM elements
        const mockCanvas = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
            dataset: {}
        };

        const mockViewer = {
            querySelector: jest.fn(() => mockCanvas),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn()
        };

        // Mock database with storage
        const storage = {
            highlights: []
        };

        mockDatabase = {
            addHighlight: jest.fn().mockImplementation(async (highlight) => {
                const id = storage.highlights.length + 1;
                const record = { id, ...highlight, createdAt: new Date().toISOString() };
                storage.highlights.push(record);
                return id;
            }),
            getHighlights: jest.fn().mockImplementation(async (pdfId) => {
                return storage.highlights.filter(h => h.pdfId === pdfId);
            }),
            getHighlight: jest.fn().mockImplementation(async (id) => {
                return storage.highlights.find(h => h.id === id) || null;
            }),
            updateHighlight: jest.fn().mockImplementation(async (id, updates) => {
                const index = storage.highlights.findIndex(h => h.id === id);
                if (index === -1) {
                    throw new Error(`Highlight with id ${id} not found`);
                }
                storage.highlights[index] = { 
                    ...storage.highlights[index], 
                    ...updates, 
                    id: id,
                    updatedAt: new Date().toISOString()
                };
                return storage.highlights[index];
            })
        };

        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        // Create persistence service
        persistenceService = new HighlightPersistenceService(mockDatabase, mockLogger);

        // Create highlighting instance
        highlighting = PlayTimeHighlighting;
        
        // Mock confidence module
        const mockConfidence = {
            getConfidenceColor: jest.fn((level) => {
                const colors = ['red', 'amber', 'green'];
                return colors[level] || 'red';
            }),
            validateConfidenceLevel: jest.fn((level) => {
                return level >= 0 && level <= 2;
            }),
            CONFIDENCE_LEVELS: { RED: 0, AMBER: 1, GREEN: 2 }
        };
        
        // Mock constants module
        const mockConstants = {
            EVENTS: {
                HIGHLIGHT_ANNOTATION_REQUESTED: 'playtime:highlight-annotation-requested',
                HIGHLIGHT_ANNOTATION_SAVED: 'playtime:highlight-annotation-saved',
                HIGHLIGHT_ANNOTATION_CANCELLED: 'playtime:highlight-annotation-cancelled'
            }
        };
        
    highlighting.init(mockViewer, mockLogger, mockConfidence, mockConstants, { database: mockDatabase });
        highlighting._components.persistenceService = persistenceService;
    });

    afterEach(() => {
        // No cleanup method needed for this test
    });

    test('saves annotation data to database when highlight is annotated', async () => {
        // First, save a highlight to the database
        const highlightData = {
            pdfId: 'test-pdf-123',
            page: 1,
            confidence: 1,
            xPct: 0.1,
            yPct: 0.2,
            wPct: 0.3,
            hPct: 0.1
        };

        const highlightId = await persistenceService.saveHighlight({
            toDatabaseRecord: () => highlightData
        }, 'test-pdf-123');

        // Verify the highlight was saved
        expect(mockDatabase.addHighlight).toHaveBeenCalledWith(highlightData);
        expect(highlightId).toBe(1);

        // Now simulate saving annotation data
        const annotationData = {
            title: 'Test Annotation Title',
            notes: 'These are test notes for the highlight',
            annotated: true,
            annotationTimestamp: Date.now()
        };

        // Call the annotation save handler directly
        await highlighting._updateHighlightInPersistence(highlightId, annotationData);

        // Verify the database was updated with annotation data
        expect(mockDatabase.getHighlight).toHaveBeenCalledWith(highlightId);
        expect(mockDatabase.updateHighlight).toHaveBeenCalledWith(highlightId, expect.objectContaining({
            title: annotationData.title,
            notes: annotationData.notes,
            annotated: annotationData.annotated,
            annotationTimestamp: annotationData.annotationTimestamp
        }));

        // Verify the final state in storage
        const updatedHighlight = await mockDatabase.getHighlight(highlightId);
        expect(updatedHighlight).toMatchObject({
            ...highlightData,
            ...annotationData,
            id: highlightId
        });
        expect(updatedHighlight.title).toBe('Test Annotation Title');
        expect(updatedHighlight.notes).toBe('These are test notes for the highlight');
        expect(updatedHighlight.annotated).toBe(true);
        expect(updatedHighlight.updatedAt).toBeDefined();
    });

    test('handles annotation save through complete workflow', async () => {
        // Create a mock highlight element with ID
        const mockElement = {
            dataset: {}
        };

        // Set up a highlight that was previously saved
        const highlightId = await persistenceService.saveHighlight({
            toDatabaseRecord: () => ({
                pdfId: 'test-pdf-456',
                page: 1,
                confidence: 2,
                xPct: 0.2,
                yPct: 0.3,
                wPct: 0.4,
                hPct: 0.2
            })
        }, 'test-pdf-456');

        // Simulate the complete annotation save workflow
        const annotationData = {
            title: 'Integration Test Title',
            notes: 'Integration test notes',
            timestamp: Date.now(),
            highlightData: {
                highlightId,
                element: mockElement,
                isNewHighlight: false
            }
        };

        // Call the full annotation save handler
        await highlighting._handleAnnotationSaved(annotationData);

        // Verify the element was updated
        expect(mockElement.dataset.hlTitle).toBe('Integration Test Title');
        expect(mockElement.dataset.hlNotes).toBe('Integration test notes');
        expect(mockElement.dataset.hlAnnotated).toBe('true');
        expect(mockElement.dataset.hlAnnotationTimestamp).toBeDefined();

        // Verify the database was updated
        expect(mockDatabase.updateHighlight).toHaveBeenCalledWith(highlightId, expect.objectContaining({
            title: 'Integration Test Title',
            notes: 'Integration test notes',
            annotated: true,
            annotationTimestamp: annotationData.timestamp
        }));

        // Verify the final database state
        const updatedHighlight = await mockDatabase.getHighlight(highlightId);
        expect(updatedHighlight.title).toBe('Integration Test Title');
        expect(updatedHighlight.notes).toBe('Integration test notes');
        expect(updatedHighlight.annotated).toBe(true);
    });

    test('handles database errors gracefully', async () => {
        // First create a highlight
        const highlightId = await persistenceService.saveHighlight({
            toDatabaseRecord: () => ({
                pdfId: 'test-pdf-error',
                page: 1,
                confidence: 1,
                xPct: 0.1,
                yPct: 0.2,
                wPct: 0.3,
                hPct: 0.1
            })
        }, 'test-pdf-error');

        // Mock database to throw an error on update
        mockDatabase.updateHighlight.mockRejectedValueOnce(new Error('Database error'));

        const annotationData = {
            title: 'Test Title',
            notes: 'Test Notes',
            annotated: true,
            annotationTimestamp: Date.now()
        };

        // Should not throw, but should log warning
        await highlighting._updateHighlightInPersistence(highlightId, annotationData);

        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Failed to update highlight in persistence',
            expect.any(Error)
        );
    });
});
