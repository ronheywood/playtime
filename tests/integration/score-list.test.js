/**
 * Integration tests for PlayTime Score List Component
 * Testing the score list functionality with real components
 */

// Import shared test utilities
const TEST_CONSTANTS = require('../helpers/test-constants');
const TestHelpers = require('../helpers/test-helpers');

describe('PlayTime Score List Integration', () => {
    let mockDatabase, mockLogger, scoreListModule;

    beforeEach(() => {
        jest.resetModules();
        
        // Mock console methods to avoid noise in tests
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        
        // Setup DOM structure
        TestHelpers.setupCompleteDOM();
        
        // Mock logger
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            loading: jest.fn()
        };

        // Mock database
        mockDatabase = {
            getAllPDFs: jest.fn(),
            getPDF: jest.fn(),
            savePDF: jest.fn(),
            init: jest.fn()
        };

        // Load score list component
        scoreListModule = require('../../scripts/score-list.js');
    });

    afterEach(() => {
        TestHelpers.cleanupLoggerMocks();
        document.body.innerHTML = '';
        
        if (global.window) {
            delete global.window.createPlayTimeScoreList;
        }
    });

    test('should initialize score list component successfully', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        
        // Act
        await playTimeScoreList.init();

        // Assert
        expect(mockLogger.info).toHaveBeenCalledWith('Score list component initialized');
    });

    test('should refresh score list with PDF data from database', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        const mockPDFs = [
            {
                id: '1',
                filename: 'sample-score.pdf',
                uploadDate: new Date('2024-01-01').toISOString()
            },
            {
                id: '2',
                filename: 'another-score.pdf',
                uploadDate: new Date('2024-01-02').toISOString()
            }
        ];
        mockDatabase.getAllPDFs.mockResolvedValue(mockPDFs);

        // Act
        await playTimeScoreList.refresh();

        // Assert
        const scoresList = document.querySelector('#scores-list');
        const scoreItems = scoresList.querySelectorAll('.score-item');
        
        expect(mockDatabase.getAllPDFs).toHaveBeenCalled();
        expect(scoreItems).toHaveLength(2);
        expect(scoresList.textContent).toContain('sample-score.pdf');
        expect(scoresList.textContent).toContain('another-score.pdf');
    });

    test('should handle empty score list gracefully', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        mockDatabase.getAllPDFs.mockResolvedValue([]);

        // Act
        await playTimeScoreList.refresh();

        // Assert
        const scoresList = document.querySelector('#scores-list');
        expect(scoresList.textContent).toContain('No scores yet. Upload a PDF to get started!');
    });

    test('should load selected score into viewer', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        const mockPDF = {
            id: '1',
            filename: 'test-score.pdf',
            data: new ArrayBuffer(100),
            uploadDate: new Date().toISOString()
        };
        mockDatabase.getPDF.mockResolvedValue(mockPDF);

        // Act
        await playTimeScoreList.loadScore('1');

        // Assert
        expect(mockDatabase.getPDF).toHaveBeenCalledWith('1');
        
        const currentTitle = document.querySelector('.current-score-title');
        expect(currentTitle.textContent).toContain('Current Score: test-score.pdf');
    });

    test('should handle database errors gracefully', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        mockDatabase.getAllPDFs.mockRejectedValue(new Error('Database error'));

        // Act
        await playTimeScoreList.refresh();

        // Assert
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to refresh score list:', expect.any(Error));
        
        const scoresList = document.querySelector('#scores-list');
        expect(scoresList.textContent).toContain('Error loading scores');
    });

    test('should handle score selection clicks', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        const mockPDFs = [
            {
                id: '1',
                filename: 'sample-score.pdf',
                uploadDate: new Date().toISOString()
            }
        ];
        mockDatabase.getAllPDFs.mockResolvedValue(mockPDFs);
        mockDatabase.getPDF.mockResolvedValue({
            id: '1',
            filename: 'sample-score.pdf',
            data: new ArrayBuffer(100)
        });

        await playTimeScoreList.refresh();

        // Act
        const scoreItem = document.querySelector('.score-item');
        scoreItem.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        // Assert
        expect(mockDatabase.getPDF).toHaveBeenCalledWith('1');
    });
});
