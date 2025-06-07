import { EventEmitter } from 'events';
import SourceManager from './SourceManager.js';
import Track from './Track.js';

class Player extends EventEmitter {
    /**
     * Create a new Player
     * @param {Object} renode - Renode instance
     * @param {Object} options - Player options
     */
    constructor(renode, options = {}) {
        super();
        this.renode = renode;
        this.sourceManager = new SourceManager(this.renode, options);
        this.volume = options.volume || 100;
        this.playing = false;
        this.track = null;
        this.paused = false;
        this.currentPosition = 0;
        this.streamUrl = null;
        this.options = {
            leaveOnEmpty: options.leaveOnEmpty !== false,
            leaveOnEnd: options.leaveOnEnd !== false,
            leaveOnStop: options.leaveOnStop !== false,
            autoResume: options.autoResume !== false,
            noTranscoding: options.noTranscoding === true,
            defaultVolume: options.defaultVolume ?? 100
        };
    }

    /**
     * Load tracks from a query
     * @param {string} query - The query to load
     * @param {Object} options - Load options
     * @returns {Promise<Object>} Load result
     */
    async load(query, options = {}) {
        try {
            const result = await this.sourceManager.loadTracks(query, options);
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Play a track or resume playback
     * @param {Track|Object|string} track - Track to play, or query to search
     * @param {Object} options - Play options
     * @returns {Promise<Track>} The track that is playing
     */
    async play(encoded, options = {}) {
        if(!this.renode.util.isEncoded(encoded)) 
            throw new Error('No track provided');

        const decoded = this.renode.util.decode(encoded);

        this.track = new Track(decoded);

        return this.playTrack(decoded);
    }

    /**
     * Play a specific track
     * @param {Track} track - The track to play
     * @returns {Promise<Track>} The track that started playing
     */
    async playTrack(track) {
        let url = null;
        console.log('Attempting to play track:', track.title);

        try {
            if (this.renode.audio && this.renode.audio.stream) {
                try {
                    this.renode.audio.stream.destroy();
                    this.renode.audio.stream = null;
                } catch (err) {
                    console.error('Error destroying previous stream:', err);
                }
            }

            if (this.renode.audio && this.renode.audio.initializeAudioPipeline) {
                try {
                    this.renode.audio.initializeAudioPipeline();
                } catch (err) {
                    console.error('Error reinitializing audio pipeline:', err);
                }
            }

            this.playing = true;
            this.paused = false;
            const source = this.sourceManager.getSource(track.sourceName);

            if (!source) {
                throw new Error(`Source '${track.sourceName}' not found`);
            }

            url = await source.getStreamUrl(track.uri, !!track.isStream);
            this.streamUrl = url;
            console.log('Resolved stream URL:', url);
         
            console.log('Sending stream URL to player...');
            await this.renode.player.play(url);
           
            this.startPositionTracking();

            console.log('Track started playing:', track.title);
            return track;
        } catch (error) {
            console.error('Error playing track:', error);
            this.playing = false;
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Stop playback
     * @param {string} [reason='user'] - Reason for stopping
     */
    stop(reason = 'ended') {
        if (!this.playing) return;

        try {
            this.stopPositionTracking();

            if (this.renode.audio && this.renode.audio.playTimeout) {
                clearTimeout(this.renode.audio.playTimeout);
                this.renode.audio.playTimeout = null;
            }

            if (this.renode.audio && this.renode.audio.stream) {
                this.renode.audio.stream.destroy();
                this.renode.audio.stream = null;
            }

            if (this.renode.player && this.renode.player.stop) {
                this.renode.player.stop(reason);
            }

            this.playing = false;
            this.paused = false;

            this.renode.player.stop(reason);

            if (this.options.leaveOnStop) {
                setTimeout(() => {
                    if (this.renode.gateway) {
                        this.renode.gateway.destroy(1000, 'Normal closure');
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error stopping playback:', error);
        }
    }

    /**
     * Pause playback
     * @returns {boolean} Whether the pause was successful
     */
    pause() {
        if (!this.playing || this.paused) return false;

        this.paused = true;
        this.renode.player.pause();
        this.stopPositionTracking();

        return true;
    }

    /**
     * Resume playback
     * @returns {boolean} Whether the resume was successful
     */
    resume() {
        if (!this.playing || !this.paused) return false;

        this.paused = false;
        this.renode.player.unpause();
        this.startPositionTracking();

        return true;
    }

    /**
     * Set the volume
     * @param {number} volume - Volume (0-100)
     * @returns {number} The new volume
     */
    setVolume(volume) {
        volume = Math.max(0, Math.min(100, volume));
        this.volume = volume;

        const normalizedVolume = volume / 100;

        try {
            this.renode.audio.setVolume(normalizedVolume);
        } catch (error) {
            console.error('Error setting volume:', error);
        }

        return volume;
    }

    /**
     * Start tracking the playback position
     */
    startPositionTracking() {
        this.positionInterval = setInterval(() => {
            this.currentPosition += 100;
        }, 100);
    }

    /**
     * Stop tracking the playback position
     */
    stopPositionTracking() {
        if (this.positionInterval) {
            clearInterval(this.positionInterval);
            this.positionInterval = null;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopPositionTracking();
        this.stop();
        this.removeAllListeners();
    }

    /**
     * Update the internal position counter (for UI display) without seeking in the actual stream
     * @param {number} position - Position in milliseconds 
     * @returns {boolean} Whether the position update was successful
     */
    async seek(position) {
        if (!this.playing || !this.track) {
            return false;
        }

        position = Math.max(0, position);
        console.log(`[Player] Updating position counter to: ${position}sec`);

        try {
            this.currentPosition = position;

            await this.renode.audio.seek(this.currentPosition)

            this.stopPositionTracking();
            this.startPositionTracking();

            return true;
        } catch (error) {
            console.error('[Player] Error updating position:', error);
            return false;
        }
    }
}

export default Player; 