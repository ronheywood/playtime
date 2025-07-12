/**
 * Score - A value object representing a musical score.
 * 
 * This immutable class normalizes and validates score data, providing a 
 * consistent interface regardless of the underlying database structure.
 * It decouples the application logic from database schema details.
 */
class Score {
    /**
     * Creates a new Score instance.
     * @param {Object} data - Score data
     * @param {number|string} data.id - Unique identifier
     * @param {string} data.filename - Original filename (required)
     * @param {string} [data.name] - Display name (defaults to filename if not provided)
     * @param {string} [data.uploadDate] - Upload date (ISO string or Date-like)
     * @param {number} [data.fileSize] - File size in bytes
     * @param {string} [data.contentType] - MIME type
     */
    constructor(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Score data must be a non-null object');
        }

        // Validate required fields
        if (data.id === undefined || data.id === null || data.id === '') {
            throw new Error('Score must have a valid id');
        }

        if (!data.filename || typeof data.filename !== 'string' || data.filename.trim() === '') {
            throw new Error('Score must have a valid filename');
        }

        // Normalize properties
        const id = String(data.id);
        const filename = data.filename.trim();
        const name = data.name && typeof data.name === 'string' && data.name.trim() !== '' ? data.name.trim() : filename;
        const uploadDate = data.uploadDate || null;
        const fileSize = typeof data.fileSize === 'number' ? data.fileSize : null;
        const contentType = data.contentType || null;

        // Make properties immutable
        Object.defineProperty(this, '_id', { value: id, writable: false, enumerable: false, configurable: false });
        Object.defineProperty(this, '_filename', { value: filename, writable: false, enumerable: false, configurable: false });
        Object.defineProperty(this, '_name', { value: name, writable: false, enumerable: false, configurable: false });
        Object.defineProperty(this, '_uploadDate', { value: uploadDate, writable: false, enumerable: false, configurable: false });
        Object.defineProperty(this, '_fileSize', { value: fileSize, writable: false, enumerable: false, configurable: false });
        Object.defineProperty(this, '_contentType', { value: contentType, writable: false, enumerable: false, configurable: false });

        // Make this object immutable
        Object.freeze(this);
    }

    // Getters for all properties
    get id() { return this._id; }
    get filename() { return this._filename; }
    get name() { return this._name; }
    get uploadDate() { return this._uploadDate; }
    get fileSize() { return this._fileSize; }
    get contentType() { return this._contentType; }

    /**
     * Gets the display name for this score.
     * @returns {string} The name to display in the UI
     */
    getDisplayName() {
        return this._name;
    }

    /**
     * Gets the file extension from the filename.
     * @returns {string} File extension (including the dot) or empty string if none
     */
    getFileExtension() {
        const lastDot = this._filename.lastIndexOf('.');
        return lastDot > 0 ? this._filename.substring(lastDot) : '';
    }

    /**
     * Checks if this score represents a PDF file.
     * @returns {boolean} True if the file is a PDF
     */
    isPDF() {
        const hasPDFExtension = this.getFileExtension().toLowerCase() === '.pdf';
        const hasPDFContentType = this._contentType && this._contentType.toLowerCase() === 'application/pdf';
        return Boolean(hasPDFExtension || hasPDFContentType);
    }

    /**
     * Creates a plain object representation suitable for serialization.
     * @returns {Object} Plain object with all score properties
     */
    toObject() {
        return {
            id: this._id,
            filename: this._filename,
            name: this._name,
            uploadDate: this._uploadDate,
            fileSize: this._fileSize,
            contentType: this._contentType
        };
    }

    /**
     * Creates a new Score with updated properties.
     * @param {Object} updates - Properties to update
     * @returns {Score} New Score instance with updated properties
     */
    withUpdates(updates) {
        return new Score({
            ...this.toObject(),
            ...updates
        });
    }

    /**
     * String representation for debugging.
     * @returns {string} String representation
     */
    toString() {
        return `Score(id=${this._id}, filename="${this._filename}", name="${this._name}")`;
    }

    /**
     * Creates a Score from database record data.
     * This method handles the mapping from database structure to Score object.
     * @param {Object} dbRecord - Database record
     * @returns {Score} New Score instance
     */
    static fromDatabaseRecord(dbRecord) {
        if (!dbRecord) {
            throw new Error('Database record cannot be null or undefined');
        }

        return new Score({
            id: dbRecord.id,
            filename: dbRecord.filename || dbRecord.name, // Handle both possible field names
            name: dbRecord.name || dbRecord.filename,       // Prefer name, fallback to filename
            uploadDate: dbRecord.uploadDate || dbRecord.created_at || dbRecord.createdAt,
            fileSize: dbRecord.fileSize || dbRecord.file_size || dbRecord.size,
            contentType: dbRecord.contentType || dbRecord.content_type || dbRecord.mimeType
        });
    }

    /**
     * Creates multiple Scores from an array of database records.
     * @param {Array} dbRecords - Array of database records
     * @returns {Array<Score>} Array of Score instances
     */
    static fromDatabaseRecords(dbRecords) {
        if (!Array.isArray(dbRecords)) {
            throw new Error('Database records must be an array');
        }

        return dbRecords.map(record => Score.fromDatabaseRecord(record));
    }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Score;
} else if (typeof window !== 'undefined') {
    window.Score = Score;
}
