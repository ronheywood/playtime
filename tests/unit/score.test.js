const Score = require('../../scripts/score');

describe('Score Value Object', () => {
    describe('constructor', () => {
        it('should create a valid Score with minimal required data', () => {
            const score = new Score({
                id: 1,
                filename: 'test.pdf'
            });

            expect(score.id).toBe('1');
            expect(score.filename).toBe('test.pdf');
            expect(score.name).toBe('test.pdf'); // defaults to filename
            expect(score.uploadDate).toBeNull();
            expect(score.fileSize).toBeNull();
            expect(score.contentType).toBeNull();
        });

        it('should create a Score with all properties provided', () => {
            const uploadDate = '2023-12-01T10:00:00Z';
            const score = new Score({
                id: 42,
                filename: 'symphony.pdf',
                name: 'Beethoven Symphony No. 9',
                uploadDate: uploadDate,
                fileSize: 1024000,
                contentType: 'application/pdf'
            });

            expect(score.id).toBe('42');
            expect(score.filename).toBe('symphony.pdf');
            expect(score.name).toBe('Beethoven Symphony No. 9');
            expect(score.uploadDate).toBe(uploadDate);
            expect(score.fileSize).toBe(1024000);
            expect(score.contentType).toBe('application/pdf');
        });

        it('should trim whitespace from filename and name', () => {
            const score = new Score({
                id: 1,
                filename: '  spaced.pdf  ',
                name: '  Spaced Name  '
            });

            expect(score.filename).toBe('spaced.pdf');
            expect(score.name).toBe('Spaced Name');
        });

        it('should convert id to string', () => {
            const numericId = new Score({ id: 123, filename: 'test.pdf' });
            const stringId = new Score({ id: 'abc', filename: 'test.pdf' });

            expect(numericId.id).toBe('123');
            expect(stringId.id).toBe('abc');
        });

        it('should default name to filename when name is not provided', () => {
            const score = new Score({
                id: 1,
                filename: 'default-name.pdf'
            });

            expect(score.name).toBe('default-name.pdf');
        });

        it('should default name to filename when name is empty string', () => {
            const score = new Score({
                id: 1,
                filename: 'fallback.pdf',
                name: ''
            });

            expect(score.name).toBe('fallback.pdf');
        });

        it('should default name to filename when name is only whitespace', () => {
            const score = new Score({
                id: 1,
                filename: 'whitespace.pdf',
                name: '   '
            });

            expect(score.name).toBe('whitespace.pdf');
        });

        // Validation tests
        it('should throw error when data is null', () => {
            expect(() => new Score(null)).toThrow('Score data must be a non-null object');
        });

        it('should throw error when data is undefined', () => {
            expect(() => new Score(undefined)).toThrow('Score data must be a non-null object');
        });

        it('should throw error when data is not an object', () => {
            expect(() => new Score('string')).toThrow('Score data must be a non-null object');
            expect(() => new Score(123)).toThrow('Score data must be a non-null object');
        });

        it('should throw error when id is missing', () => {
            expect(() => new Score({ filename: 'test.pdf' })).toThrow('Score must have a valid id');
        });

        it('should throw error when id is null', () => {
            expect(() => new Score({ id: null, filename: 'test.pdf' })).toThrow('Score must have a valid id');
        });

        it('should throw error when id is empty string', () => {
            expect(() => new Score({ id: '', filename: 'test.pdf' })).toThrow('Score must have a valid id');
        });

        it('should throw error when filename is missing', () => {
            expect(() => new Score({ id: 1 })).toThrow('Score must have a valid filename');
        });

        it('should throw error when filename is null', () => {
            expect(() => new Score({ id: 1, filename: null })).toThrow('Score must have a valid filename');
        });

        it('should throw error when filename is empty string', () => {
            expect(() => new Score({ id: 1, filename: '' })).toThrow('Score must have a valid filename');
        });

        it('should throw error when filename is only whitespace', () => {
            expect(() => new Score({ id: 1, filename: '   ' })).toThrow('Score must have a valid filename');
        });

        it('should throw error when filename is not a string', () => {
            expect(() => new Score({ id: 1, filename: 123 })).toThrow('Score must have a valid filename');
        });
    });

    describe('immutability', () => {
        it('should be immutable - cannot modify properties', () => {
            const score = new Score({
                id: 1,
                filename: 'test.pdf',
                name: 'Test Score'
            });

            // In strict mode, these would throw. In non-strict mode, they fail silently.
            // Test that the values remain unchanged after attempted modification.
            const originalId = score.id;
            const originalFilename = score.filename;
            const originalName = score.name;

            // Attempt to modify (these will fail silently in non-strict mode)
            score.id = '999';
            score.filename = 'modified.pdf';
            score.name = 'Modified Name';

            // Values should remain unchanged
            expect(score.id).toBe(originalId);
            expect(score.filename).toBe(originalFilename);
            expect(score.name).toBe(originalName);
        });

        it('should be frozen', () => {
            const score = new Score({ id: 1, filename: 'test.pdf' });
            expect(Object.isFrozen(score)).toBe(true);
        });
    });

    describe('display methods', () => {
        describe('getDisplayName', () => {
            it('should return the name property', () => {
                const score = new Score({
                    id: 1,
                    filename: 'file.pdf',
                    name: 'Display Name'
                });

                expect(score.getDisplayName()).toBe('Display Name');
            });

            it('should return filename when name defaults to filename', () => {
                const score = new Score({
                    id: 1,
                    filename: 'filename.pdf'
                });

                expect(score.getDisplayName()).toBe('filename.pdf');
            });
        });

        describe('getFileExtension', () => {
            it('should return file extension with dot', () => {
                const score = new Score({ id: 1, filename: 'test.pdf' });
                expect(score.getFileExtension()).toBe('.pdf');
            });

            it('should return extension for files with multiple dots', () => {
                const score = new Score({ id: 1, filename: 'file.name.with.dots.txt' });
                expect(score.getFileExtension()).toBe('.txt');
            });

            it('should return empty string for files without extension', () => {
                const score = new Score({ id: 1, filename: 'noextension' });
                expect(score.getFileExtension()).toBe('');
            });

            it('should return empty string for files starting with dot but no extension', () => {
                const score = new Score({ id: 1, filename: '.hiddenfile' });
                expect(score.getFileExtension()).toBe('');
            });

            it('should handle files starting with dot that have extension', () => {
                const score = new Score({ id: 1, filename: '.hidden.txt' });
                expect(score.getFileExtension()).toBe('.txt');
            });
        });

        describe('isPDF', () => {
            it('should return true for .pdf extension (lowercase)', () => {
                const score = new Score({ id: 1, filename: 'test.pdf' });
                expect(score.isPDF()).toBe(true);
            });

            it('should return true for .PDF extension (uppercase)', () => {
                const score = new Score({ id: 1, filename: 'test.PDF' });
                expect(score.isPDF()).toBe(true);
            });

            it('should return true for mixed case .Pdf extension', () => {
                const score = new Score({ id: 1, filename: 'test.Pdf' });
                expect(score.isPDF()).toBe(true);
            });

            it('should return false for non-PDF extensions', () => {
                const score = new Score({ id: 1, filename: 'test.txt' });
                expect(score.isPDF()).toBe(false);
            });

            it('should return true when contentType is application/pdf regardless of extension', () => {
                const score = new Score({
                    id: 1,
                    filename: 'test.txt',
                    contentType: 'application/pdf'
                });
                expect(score.isPDF()).toBe(true);
            });

            it('should return true when contentType is APPLICATION/PDF (uppercase)', () => {
                const score = new Score({
                    id: 1,
                    filename: 'test.txt',
                    contentType: 'APPLICATION/PDF'
                });
                expect(score.isPDF()).toBe(true);
            });

            it('should return false for files with no extension and no contentType', () => {
                const score = new Score({ id: 1, filename: 'noextension' });
                expect(score.isPDF()).toBe(false);
            });
        });
    });

    describe('utility methods', () => {
        describe('toObject', () => {
            it('should return a plain object with all properties', () => {
                const score = new Score({
                    id: 1,
                    filename: 'test.pdf',
                    name: 'Test',
                    uploadDate: '2023-12-01',
                    fileSize: 1024,
                    contentType: 'application/pdf'
                });

                const obj = score.toObject();

                expect(obj).toEqual({
                    id: '1',
                    filename: 'test.pdf',
                    name: 'Test',
                    uploadDate: '2023-12-01',
                    fileSize: 1024,
                    contentType: 'application/pdf'
                });

                // Should be a plain object, not a Score instance
                expect(obj instanceof Score).toBe(false);
                expect(typeof obj).toBe('object');
            });

            it('should include null values for optional properties', () => {
                const score = new Score({ id: 1, filename: 'test.pdf' });
                const obj = score.toObject();

                expect(obj).toEqual({
                    id: '1',
                    filename: 'test.pdf',
                    name: 'test.pdf',
                    uploadDate: null,
                    fileSize: null,
                    contentType: null
                });
            });
        });

        describe('withUpdates', () => {
            it('should create a new Score with updated properties', () => {
                const original = new Score({
                    id: 1,
                    filename: 'test.pdf',
                    name: 'Original'
                });

                const updated = original.withUpdates({
                    name: 'Updated Name',
                    fileSize: 2048
                });

                expect(updated.id).toBe('1');
                expect(updated.filename).toBe('test.pdf');
                expect(updated.name).toBe('Updated Name');
                expect(updated.fileSize).toBe(2048);

                // Original should be unchanged
                expect(original.name).toBe('Original');
                expect(original.fileSize).toBeNull();

                // Should be different instances
                expect(updated).not.toBe(original);
            });

            it('should validate updates and throw on invalid data', () => {
                const original = new Score({ id: 1, filename: 'test.pdf' });

                expect(() => original.withUpdates({ filename: '' }))
                    .toThrow('Score must have a valid filename');
            });
        });

        describe('toString', () => {
            it('should return a readable string representation', () => {
                const score = new Score({
                    id: 42,
                    filename: 'symphony.pdf',
                    name: 'Beethoven 9th'
                });

                expect(score.toString()).toBe('Score(id=42, filename="symphony.pdf", name="Beethoven 9th")');
            });
        });
    });

    describe('static factory methods', () => {
        describe('fromDatabaseRecord', () => {
            it('should create Score from typical database record', () => {
                const dbRecord = {
                    id: 1,
                    filename: 'test.pdf',
                    name: 'Test Score',
                    uploadDate: '2023-12-01',
                    fileSize: 1024,
                    contentType: 'application/pdf'
                };

                const score = Score.fromDatabaseRecord(dbRecord);

                expect(score.id).toBe('1');
                expect(score.filename).toBe('test.pdf');
                expect(score.name).toBe('Test Score');
                expect(score.uploadDate).toBe('2023-12-01');
                expect(score.fileSize).toBe(1024);
                expect(score.contentType).toBe('application/pdf');
            });

            it('should handle database record with only filename (no name field)', () => {
                const dbRecord = {
                    id: 1,
                    filename: 'only-filename.pdf'
                };

                const score = Score.fromDatabaseRecord(dbRecord);

                expect(score.filename).toBe('only-filename.pdf');
                expect(score.name).toBe('only-filename.pdf');
            });

            it('should handle database record with only name (no filename field)', () => {
                const dbRecord = {
                    id: 1,
                    name: 'only-name.pdf'
                };

                const score = Score.fromDatabaseRecord(dbRecord);

                expect(score.filename).toBe('only-name.pdf');
                expect(score.name).toBe('only-name.pdf');
            });

            it('should prefer name over filename when both are present', () => {
                const dbRecord = {
                    id: 1,
                    filename: 'raw-filename.pdf',
                    name: 'Preferred Display Name'
                };

                const score = Score.fromDatabaseRecord(dbRecord);

                expect(score.filename).toBe('raw-filename.pdf');
                expect(score.name).toBe('Preferred Display Name');
            });

            it('should handle alternative database field names', () => {
                const dbRecord = {
                    id: 1,
                    filename: 'test.pdf',
                    created_at: '2023-12-01',
                    file_size: 1024,
                    content_type: 'application/pdf'
                };

                const score = Score.fromDatabaseRecord(dbRecord);

                expect(score.uploadDate).toBe('2023-12-01');
                expect(score.fileSize).toBe(1024);
                expect(score.contentType).toBe('application/pdf');
            });

            it('should handle camelCase alternative field names', () => {
                const dbRecord = {
                    id: 1,
                    filename: 'test.pdf',
                    createdAt: '2023-12-01',
                    size: 2048,
                    mimeType: 'application/pdf'
                };

                const score = Score.fromDatabaseRecord(dbRecord);

                expect(score.uploadDate).toBe('2023-12-01');
                expect(score.fileSize).toBe(2048);
                expect(score.contentType).toBe('application/pdf');
            });

            it('should throw error for null database record', () => {
                expect(() => Score.fromDatabaseRecord(null))
                    .toThrow('Database record cannot be null or undefined');
            });

            it('should throw error for undefined database record', () => {
                expect(() => Score.fromDatabaseRecord(undefined))
                    .toThrow('Database record cannot be null or undefined');
            });

            it('should throw error for invalid database record', () => {
                expect(() => Score.fromDatabaseRecord({ id: 1 }))
                    .toThrow('Score must have a valid filename');
            });
        });

    });
});
