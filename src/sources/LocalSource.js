import fs from 'fs';
import * as mm from 'music-metadata';
import path from 'path';
import {
    promisify
} from 'util';
import BaseSource, {
    LoadResult
} from './BaseSource.js';
import Track from './Track.js';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);


class LocalSource extends BaseSource {
    /**
     * Create a new LocalSource
     * @param {Object} options - Source options
     * @param {string} options.basePath - Base path for local files
     * @param {Array} options.allowedExtensions - Array of allowed file extensions
     */
    constructor(renode, options = {}) {
        super();
        this.renode = renode;
        this.basePath = options.basePath || process.cwd();
        this.allowedExtensions = options.allowedExtensions || ['.mp3', '.wav', '.ogg', '.flac', '.m4a'];
    }

    /**
     * Get the name of this source
     * @returns {string} Source name
     */
    get name() {
        return 'local';
    }

    /**
     * Check if this source can handle the given query
     * @param {string} query - Query to check
     * @returns {boolean} Whether this source can handle the query
     */
    canHandle(query) {
        if (typeof query !== 'string') return false;

        // Check if query ends with one of the allowed extensions
        return this.allowedExtensions.some(ext => query.toLowerCase().endsWith(ext));
    }


    async getStreamUrl(uri) {
        try {
            const path = decodeURI(uri).replace(/^file:\/+/, '');
            const fileName = path.split(/[/\\]/).pop();

            const extension = '.' + fileName.split('.').pop().toLowerCase();

            if (this.allowedExtensions.includes(extension)) {
                return fileName;
            }

            return null;
        } catch (e) {
            console.error("Error parsing URI:", e);
            return null;
        }
    }


    /**
     * Load a track from the given query
     * @param {string} query - File path
     * @param {Object} options - Load options
     * @returns {Promise<LoadResult>} LoadResult object
     */
    async load(query, options = {}) {
        try {
            const filePath = path.resolve(this.basePath, query);

            const stats = await stat(filePath).catch(() => null);
            if (!stats) {
                return LoadResult.error(new Error(`File not found: ${query}`));
            }

            if (stats.isDirectory()) {
                return await this.loadDirectory(filePath);
            } else {
                if (!this.canHandle(filePath)) {
                    return LoadResult.error(new Error(`Unsupported file type: ${query}`));
                }

                const track = await this.buildTrack(filePath);
                return LoadResult.trackLoaded(track);
            }
        } catch (error) {
            console.error('Local source error:', error);
            return LoadResult.error(error);
        }
    }

    /**
     * Load all audio files from a directory as a playlist
     * @param {string} dirPath - Directory path
     * @returns {Promise<LoadResult>} LoadResult with the playlist tracks
     */
    async loadDirectory(dirPath) {
        try {
            const files = await readdir(dirPath);

            const audioFiles = files.filter(file =>
                this.allowedExtensions.some(ext => file.toLowerCase().endsWith(ext))
            );

            if (audioFiles.length === 0) {
                return LoadResult.empty();
            }

            const tracks = await Promise.all(
                audioFiles.map(file => this.buildTrack(path.join(dirPath, file)))
            );

            const playlistInfo = {
                name: path.basename(dirPath),
                selectedTrack: 0
            };

            return LoadResult.playlistLoaded(tracks, playlistInfo);
        } catch (error) {
            console.error('Error loading directory:', error);
            return LoadResult.error(error);
        }
    }

    /**
     * Build a Track object from a local file path
     * @param {string} filePath - Path to the audio file
     * @returns {Promise<Track>} Track object
     */
    async buildTrack(filePath) {
        const fileInfo = path.parse(filePath);
        const title = fileInfo.name;
        const author = 'Local File';

        let metadata;
        try {
            metadata = await mm.parseFile(filePath, {
                duration: true
            });
        } catch (err) {
            console.warn(`Failed to parse audio metadata for ${filePath}:`, err.message);
            metadata = null;
        }

        const durationSeconds = metadata?.format?.duration ?
            Math.floor(metadata.format.duration) :
            0;

        let isrc = null;
        if (metadata?.common?.isrc) {
            isrc = metadata.common.isrc.toUpperCase();
        } else {
            const isrcRegex = /([A-Z]{2}[A-Z0-9]{3}\d{2}\d{5})/i;
            const match = title.match(isrcRegex);
            if (match) {
                isrc = match[1].toUpperCase();
            }
        }

        const track = {
            title: title,
            uri: `file://${filePath}`,
            identifier: filePath,
            author: author,
            length: durationSeconds,
            isStream: false,
            isrc: isrc,
            isSeekable: true,
            sourceName: this.name,
            artworkUrl: null
        };

        return new Track({
            encoded: this.renode.util.encode(track),
            ...track
        });
    }
}

export default LocalSource;