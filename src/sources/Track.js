/**
 * Represents a playable audio track with metadata
 */
class Track {
    /**
     * Create a new Track
     * @param {Object} options - Track options
     * @param {string} options.title - Track title
     * @param {string} options.uri - Track URI or URL
     * @param {string} options.identifier - Track identifier (e.g., YouTube video ID)
     * @param {string} options.author - Track author/artist
     * @param {number} options.duration - Track duration in milliseconds
     * @param {boolean} options.isStream - Whether this track is a stream
     * @param {string} options.sourceName - Source name (e.g., 'youtube', 'local')
     * @param {string} options.thumbnail - Thumbnail URL
     * @param {Object} options.requester - User who requested the track
     */
    constructor(options = {}) {
        this.encoded = options.encoded || null;
        this.info = {}
        this.info.identifier = options.identifier || null;
        this.info.isSeekable = options.isSeekable || false;
        this.info.author = options.author || 'Unknown Artist';
        this.info.length = options.length || 0;
        this.info.isStream = options.isStream || false;
        this.info.title = options.title || 'Unknown Title';
        this.info.uri = options.uri || null;
        this.info.sourceName = options.sourceName || 'unknown';
        this.info.artworkUrl = options.artworkUrl || null;
        this.info.isrc = null;
    }

    /**
     * Get a formatted duration string (MM:SS)
     * @returns {string} Formatted duration
     */
    get formattedDuration() {
        if (this.isStream) return 'LIVE';

        const totalSeconds = Math.floor(this.duration / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Convert track to a plain object for serialization
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            encoded: this.encoded,
            info: {
                title: this.info.title,
                uri: this.info.uri,
                identifier: this.info.identifier,
                author: this.info.author,
                length: this.info.duration,
                isStream: this.info.isStream,
                isrc: this.info.isrc,
                isSeekable: this.infoisSeekable,
                sourceName: this.info.sourceName,
                artworkUrl: this.info.artworkUrl
            }
        };
    }

    /**
     * Create a Track from a plain object
     * @param {Object} data - Track data
     * @returns {Track} Track instance
     */
    static from(data) {
        return new Track(data);
    }
}

export default Track; 