
class BaseSource {
    /**
     * Get the name of this source
     * @returns {string} Source name
     */
    get name() {
        throw new Error('Method not implemented');
    }

    /**
     * Load a track from the given query
     * @param {string} query - Search query or URL
     * @param {Object} options - Load options
     * @returns {Promise<Object>} LoadResult object
     */
    load(query, options = {}) {
        throw new Error('Method not implemented');
    }

    /**
     * Check if this source can handle the given query
     * @param {string} query - Query to check
     * @returns {boolean} Whether this source can handle the query
     */
    canHandle(query) {
        throw new Error('Method not implemented');
    }
}

export class LoadResult {
    /**
     * Create a new LoadResult
     * @param {Object} options - Load result options
     * @param {string} options.loadType - Type of load result ('TRACK', 'PLAYLIST', 'SEARCH', 'EMPTY', 'ERROR')
     * @param {Array} options.tracks - Array of Track objects
     * @param {Object} options.playlist - Playlist info (if loadType is PLAYLIST)
     * @param {Error} options.error - Error (if loadType is ERROR)
     */
    constructor(options = {}) {
        this.loadType = options.loadType || 'EMPTY';
        this.data = options.data || [];
        this.playlist = options.playlist || null;
        this.error = options.error || null;
    }

    /**
     * Create a TRACK_LOADED result
     * @param {Track} track - The loaded track
     * @returns {LoadResult} LoadResult instance
     */
    static trackLoaded(track) {
        return new LoadResult({
            loadType: 'track',
            data: {...track}
        });
    }

    /**
     * Create a PLAYLIST_LOADED result
     * @param {Array} tracks - Array of Track objects
     * @param {Object} playlist - Playlist info
     * @returns {LoadResult} LoadResult instance
     */
    static playlistLoaded(tracks, playlist) {
        return new LoadResult({
            loadType: 'playlist',
            data: {
                info: {...playlist},
                tracks
            }
        });
    }

    /**
     * Create a SEARCH_RESULT result
     * @param {Array} tracks - Array of Track objects
     * @returns {LoadResult} LoadResult instance
     */
    static searchResult(tracks) {
        return new LoadResult({
            loadType: 'search',
            data: [...tracks]
        });
    }

    /**
     * Create a NO_MATCHES result
     * @returns {LoadResult} LoadResult instance
     */
    static empty() {
        return new LoadResult({
            loadType: 'empty',
            data: {}
        });
    }

    /**
     * Create a LOAD_FAILED result
     * @param {Error} error - The error that occurred
     * @returns {LoadResult} LoadResult instance
     */
    static error(error) {
        return new LoadResult({
            loadType: 'error',
            data: {
                ...error
            }
        });
    }
}

export default BaseSource; 