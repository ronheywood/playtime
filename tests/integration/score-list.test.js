/**
 * Integration tests for PlayTime Score List Component
 * Testing the score list functionality with real components
 */

// Import shared test utilities
const TEST_CONSTANTS = require('../helpers/test-constants');
const TestHelpers = require('../helpers/test-helpers');
const { CONFIG } = require('../../scripts/main');

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
        // Mock database using new abstraction
        mockDatabase = {
            getAll: jest.fn(),
            get: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            init: jest.fn()
        };
        // Load score list component
        scoreListModule = require('../../scripts/score-list.js').createPlayTimeScoreList;
        scoreListConfig = require('../../scripts/score-list.js').SCORE_LIST_CONFIG;
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
                name: 'sample-score.pdf',
                uploadDate: new Date('2024-01-01').toISOString()
            },
            {
                id: '2',
                name: 'another-score.pdf',
                uploadDate: new Date('2024-01-02').toISOString()
            }
        ];
        mockDatabase.getAll.mockResolvedValue(mockPDFs);
        // Act
        await playTimeScoreList.refresh();
        // Assert
        const scoresList = document.querySelector('#scores-list');
        const scoreItems = scoresList.querySelectorAll('.score-item');
        expect(mockDatabase.getAll).toHaveBeenCalled();
        expect(scoreItems).toHaveLength(2);
        expect(scoresList.textContent).toContain('sample-score.pdf');
        expect(scoresList.textContent).toContain('another-score.pdf');
    });

    test('should handle empty score list gracefully', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        mockDatabase.getAll.mockResolvedValue([]);
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
            name: 'test-score.pdf',
            data: new ArrayBuffer(100),
            uploadDate: new Date().toISOString()
        };
        mockDatabase.get.mockResolvedValue(mockPDF);
        // Act
        await playTimeScoreList.loadScore('1');
        // Assert
        expect(mockDatabase.get).toHaveBeenCalledWith('1');
        const currentTitle = document.querySelector(scoreListConfig.SELECTORS.CURRENT_SCORE_TITLE);
        expect(currentTitle.textContent).toContain('test-score.pdf');
    });

    test('should handle database errors gracefully', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        mockDatabase.getAll.mockRejectedValue(new Error('Database error'));
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
                name: 'sample-score.pdf',
                uploadDate: new Date().toISOString()
            }
        ];
        mockDatabase.getAll.mockResolvedValue(mockPDFs);
        mockDatabase.get.mockResolvedValue({
            id: '1',
            name: 'sample-score.pdf',
            data: new ArrayBuffer(100)
        });
        await playTimeScoreList.refresh();
        // Act
        const scoreItem = document.querySelector('.score-item');
        scoreItem.click();
        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));
        // Assert
        expect(mockDatabase.get).toHaveBeenCalledWith('1');
    });

    test('should display page count badge when pages are available', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        const mockPDFs = [
            {
                id: '1',
                name: 'sample-score.pdf',
                pages: 3,
                uploadDate: new Date('2024-01-01').toISOString()
            }
        ];
        mockDatabase.getAll.mockResolvedValue(mockPDFs);
        // Act
        await playTimeScoreList.refresh();
        // Assert
        const scoresList = document.querySelector('#scores-list');
        const pageBadges = scoresList.querySelectorAll('.score-pages');
        expect(pageBadges.length).toBe(1);
        expect(pageBadges[0].textContent).toContain('3 pages');
    });

    test('should hide status message when selecting a score from the list', async () => {
        // Arrange
        const playTimeScoreList = scoreListModule(mockDatabase, mockLogger);
        const mockPDFs = [
            { id: '1', name: 'one.pdf', uploadDate: new Date().toISOString() }
        ];
        mockDatabase.getAll.mockResolvedValue(mockPDFs);
        mockDatabase.get.mockResolvedValue({ id: '1', name: 'one.pdf', data: new ArrayBuffer(10) });

        // Create a status message inside the viewer to simulate previous upload
        const viewer = document.querySelector(scoreListConfig.SELECTORS.PDF_VIEWER);
        const status = document.createElement('div');
        status.className = 'status-message';
        status.textContent = CONFIG.MESSAGES.SUCCESS_FILE_SELECTED + 'one.pdf';
        viewer.appendChild(status);

        await playTimeScoreList.refresh();

        // Act: select the score
        const scoreItem = document.querySelector('.score-item');
        scoreItem.click();
        await new Promise(r => setTimeout(r, 20));

        // Assert: status message should be removed/hidden
        const removed = viewer.querySelector('.status-message');
        expect(removed).toBeNull();
    });
});
