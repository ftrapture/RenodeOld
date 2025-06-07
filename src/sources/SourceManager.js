import { LoadResult } from './BaseSource.js';
import YouTubeSource from './YouTubeSource.js';
import LocalSource from './LocalSource.js';
import HttpSource from './HttpSource.js';

class SourceManager {
    /**
     * Create a new SourceManager
     * @param {Object} options - Manager options
     */
    constructor(renode, options = {}) {
        this.sources = new Map();
        this.renode = renode;
        this.defaultSource = null;
        if (options.registerDefaults !== false) {
            this.registerDefaultSources(options);
        }
    }

    /**
     * Register default sources
     * @param {Object} options - Options to pass to sources
     */
    registerDefaultSources(options = {}) {
        this.registerSource(
            new YouTubeSource(this.renode, {
                apiKey: options.youtubeApiKey,
                apiEndpoint: options.youtubeApiEndpoint
            })
        );

        this.registerSource(
            new LocalSource(this.renode, {
                basePath: options.localBasePath,
                allowedExtensions: options.localAllowedExtensions
            })
        );

        this.registerSource(
            new HttpSource(this.renode)
        );

        this.defaultSource = this.getSource('youtube');
    }

    /**
     * Register a source
     * @param {BaseSource} source - The source to register
     */
    registerSource(source) {
        this.sources.set(source.name, source);
    }

    /**
     * Unregister a source
     * @param {string} name - The name of the source to unregister
     */
    unregisterSource(name) {
        this.sources.delete(name);
    }

    /**
     * Get a source by name
     * @param {string} name - The name of the source
     * @returns {BaseSource} The source
     */
    getSource(name) {
        return this.sources.get(name);
    }

    /**
     * Get all registered sources
     * @returns {Array} Array of sources
     */
    getAllSources() {
        return Array.from(this.sources.values());
    }

    /**
     * Find the appropriate source for a query
     * @param {string} query - The query to find a source for
     * @returns {BaseSource} The source that can handle the query
     */
    findSourceForQuery(query) {
        for (const source of this.sources.values()) {
            if (source.canHandle(query)) {
                return source;
            }
        }

        return this.defaultSource;
    }

    /**
     * Load tracks from a query
     * @param {string} query - The query to load tracks from
     * @param {Object} options - Load options
     * @param {string} options.sourceName - Force a specific source by name
     * @returns {Promise<LoadResult>} The load result
     */
    async loadTracks(query, options = {}) {
        let source;

        if (options.sourceName) {
            source = this.getSource(options.sourceName);
            if (!source) {
                return LoadResult.error(new Error(`Source '${options.sourceName}' not found`));
            }
        } else {
            source = this.findSourceForQuery(query);
            if (!source) {
                return LoadResult.error(new Error('No source found for query'));
            }
        }

        return await source.load(query, options);
    }
}

export default SourceManager; 