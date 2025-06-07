import axios from 'axios';
import BaseSource, {
    LoadResult
} from './BaseSource.js';
import Track from './Track.js';
import config from '../configurations/settings.json' assert {
    type: 'json'
};
import {
    spawn
} from 'child_process';


class YouTubeSource extends BaseSource {
    /**
     * Create a new YouTubeSource
     * @param {Object} options - Source options
     * @param {string} options.apiKey - YouTube Data API key
     * @param {string} options.apiEndpoint - API endpoint for streaming
     */
    constructor(renode, options = {}) {
        super();
        this.renode = renode;
        this.apiKey = options.apiKey || config.youtube.api;
        this.apiEndpoint = options.apiEndpoint || config.youtube.endpoint;
        this.videoRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(&.*)?$/;
        this.playlistRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:playlist\?list=|watch\?.*?[&?]list=)([a-zA-Z0-9_-]+)/;
    }

    /**
     * Get the name of this source
     * @returns {string} Source name
     */
    get name() {
        return 'youtube';
    }

    /**
     * Check if this source can handle the given query
     * @param {string} query - Query to check
     * @returns {boolean} Whether this source can handle the query
     */
    canHandle(query) {
        // Handle YouTube URLs or treat as search
        return this.videoRegex.test(query) ||
            this.playlistRegex.test(query) ||
            typeof query === 'string';
    }

    /**
     * Load a track from the given query
     * @param {string} query - Search query or URL
     * @param {Object} options - Load options
     * @returns {Promise<LoadResult>} LoadResult object
     */
    async load(query, options = {}) {
        try {
            const playlistMatch = query.match(this.playlistRegex);
            if (playlistMatch) {
                const playlistId = playlistMatch[1];
                return (await this.getPlaylist(playlistId));
            }

            const videoMatch = query.match(this.videoRegex);
            if (videoMatch) {
                const videoId = videoMatch[4];
                return (await this.getVideo(videoId));
            }
            return (await this.search(query));
        } catch (error) {
            console.error('YouTube source error:', error);
            return LoadResult.error(error);
        }
    }

    /**
     * Get a track from a YouTube video ID
     * @param {string} videoId - YouTube video ID
     * @returns {Promise<LoadResult>} LoadResult with the track
     */
    async getVideo(videoId) {
        try {
            // Fetch video details
            const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'snippet,contentDetails',
                    id: videoId,
                    key: this.apiKey
                }
            });

            if (!response.data.items || response.data.items.length === 0) {
                return LoadResult.empty();
            }

            const video = response.data.items[0];
            const track = await this.buildTrack(video);

            return LoadResult.trackLoaded(track);
        } catch (error) {
            console.error('Error fetching video details:', error);
            return LoadResult.error(error);
        }
    }

    /**
     * Get tracks from a YouTube playlist ID
     * @param {string} playlistId - YouTube playlist ID
     * @returns {Promise<LoadResult>} LoadResult with the playlist tracks
     */
    async getPlaylist(playlistId) {
        try {
            // Fetch playlist details
            const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlists', {
                params: {
                    part: 'snippet',
                    id: playlistId,
                    key: this.apiKey
                }
            });

            if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
                return LoadResult.empty();
            }

            const playlist = playlistResponse.data.items[0];
            const playlistInfo = {
                name: playlist.snippet.title,
                selectedTrack: 0
            };

            const itemsResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
                params: {
                    part: 'snippet,contentDetails',
                    maxResults: 50, 
                    playlistId: playlistId,
                    key: this.apiKey
                }
            });

            if (!itemsResponse.data.items || itemsResponse.data.items.length === 0) {
                return LoadResult.empty();
            }

            const videoIds = itemsResponse.data.items.map(item => item.contentDetails.videoId).join(',');
            const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'snippet,contentDetails',
                    id: videoIds,
                    key: this.apiKey
                }
            });

            if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
                return LoadResult.empty();
            }

            const tracks = await Promise.all(
                videosResponse.data.items.map(video => this.buildTrack(video))
            );

            return LoadResult.playlistLoaded(tracks, playlistInfo);
        } catch (error) {
            console.error('Error fetching playlist:', error);
            return LoadResult.error(error);
        }
    }

    /**
     * Search for tracks on YouTube
     * @param {string} query - Search query
     * @returns {Promise<LoadResult>} LoadResult with search results
     */
    async search(query) {
        try {
            const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    maxResults: 10,
                    key: this.apiKey
                }
            });

            if (!response.data.items || response.data.items.length === 0) {
                return LoadResult.empty();
            }

            const videoIds = response.data.items.map(item => item.id.videoId).join(',');
            const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'snippet,contentDetails',
                    id: videoIds,
                    key: this.apiKey
                }
            });

            if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
                return LoadResult.empty();
            }

            const tracks = await Promise.all(
                videosResponse.data.items.map(video => this.buildTrack(video))
            );

            return LoadResult.searchResult(tracks);
        } catch (error) {
            console.error('Error searching YouTube:', error);
            return LoadResult.error(error);
        }
    }

    /**
     * Get stream URL from API for a YouTube URL
     * @param {string} youtubeUrl - YouTube URL
     * @param {Object} options - Additional options
     * @param {number} options.seekTime - Start time in seconds
     * @returns {Promise<string>} Stream URL
     */
    async getStreamUrl(videoUrl, hls = false) {
        return new Promise((resolve, reject) => {
            const process = spawn('./sources/api.exe', [videoUrl]);

            let output = '';
            let error = '';

            process.stdout.on('data', (data) => {
                output += data.toString();
            });

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error(`Python script failed: ${error}`));
                }

                try {
                    const result = JSON.parse(output).stream_url;
                    let url = !hls || !this.renode.util.isHLS(result) ? result + "&ratebypass=yes&range=0-" : result;
                    
                    resolve(url);
                } catch (err) {
                    reject(new Error(`Failed to parse Python output: ${err.message}`));
                }
            });
        });
    }

    /**
     * Build a Track object from YouTube video data
     * @param {Object} video - YouTube video data
     * @returns {Promise<Track>} Track object
     */
    async buildTrack(video) {
        // Parse duration from ISO 8601 (e.g., PT1H2M3S)
        const duration = this.parseDuration(video.contentDetails?.duration);

        const isLive = video.snippet?.liveBroadcastContent === 'live';
        const streamingDetails = video.streamingDetails || {};
        const isCurrentlyLive = isLive || streamingDetails?.isLive || false;
        const isSeekable = !isCurrentlyLive && duration > 0;

        let isrc = null;
        const tags = video.snippet?.tags || [];
        const description = video.snippet?.description || '';

        const isrcRegex = /([A-Z]{2}[A-Z0-9]{3}\d{2}\d{5})/i;

        for (const tag of tags) {
            const match = tag.match(isrcRegex);
            if (match) {
                isrc = match[1].toUpperCase();
                break;
            }
        }

        if (!isrc) {
            const match = description.match(isrcRegex);
            if (match) {
                isrc = match[1].toUpperCase();
            }
        }

        const track = {
            title: video.snippet?.title,
            uri: `https://www.youtube.com/watch?v=${video.id}`,
            identifier: video.id,
            author: video.snippet?.channelTitle,
            length: duration,
            isStream: isCurrentlyLive,
            sourceName: this.name,
            isrc,
            isSeekable,
            artworkUrl: video.snippet?.thumbnails?.maxres?.url || video.snippet?.thumbnails?.default?.url,
        };

        return new Track({
            encoded: this.renode.util.encode(track),
            ...track,
        });
    }


    /**
     * Parse ISO 8601 duration to milliseconds
     * @param {string} isoDuration - ISO 8601 duration string (e.g., PT1H2M3S)
     * @returns {number} Duration in milliseconds
     */
    parseDuration(isoDuration) {
        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);

        return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }
}

export default YouTubeSource;