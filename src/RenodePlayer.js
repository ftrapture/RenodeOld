import Audio from "./stream/AudioResource.js";
import AudioPlayer from "./stream/PlayerResource.js";
import Websocket from "./sockets/Websocket.js";
import Udpsocket from "./sockets/Udpsocket.js";
import Sodium from "./AudioDataEncryptor.js";
import { EventEmitter } from "node:events";
import Util from "./Util.js";
import { Player as MusicPlayer } from "./sources/index.js";
import config from './configurations/settings.json' assert { type: 'json' };

class RenodePlayer extends EventEmitter {
    guildId;
    encryptionLib;
    player;
    audio;
    quality;
    userId;
    isConnected;
    encryptionKey;
    sessionId;
    gateway;
    socket;
    token;
    playerState;
    endpoint;
    ping;
    initiated;
    stats;
    util;
    musicPlayer;
    constructor(options) {
        super();
        this.guildId = null;
        this.util = new Util();
        this.encryptionLib = new Sodium();
        this.quality = options?.quality && typeof options.quality === "string" ? options.quality.toLowerCase() : "high";
        this.userId = null;
        this.playerState = {
            status: "idle",
            reason: "disconnected"
        };
        this.isConnected = false;
        this.encryptionKey = "xsalsa20_poly1305_lite";
        this.sessionId = null;
        this.token = null;
        this.endpoint = null;
        this.ping = -1;
        this.initiated = false;
        this.stats = {
            packets: {
                transmitted: 0,
                omitted: 0,
                expected: 0
            }
        };
        this.player = new AudioPlayer(this);
        this.audio = new Audio(this);
        this.gateway = new Websocket(this);
        this.socket = new Udpsocket(this);
        this.musicPlayer = new MusicPlayer(this, {
            youtubeApiKey: options?.youtubeApiKey || config.youtube.api,
            youtubeApiEndpoint: options?.youtubeApiEndpoint || config.youtube.endpoint,
            localBasePath: options?.localBasePath || process.cwd(),
            volume: options?.volume || 100,
            leaveOnEmpty: !!options?.leaveOnEmpty,
            leaveOnEnd: !!options?.leaveOnEnd,
            leaveOnStop: !!options?.leaveOnStop,
            noTranscoding: !!options?.noTranscoding
        });
    }

    get isInitiated() {
        return this.initiated;
    }

    async init(options) {
        this.initiated = true;
        this.guildId = options.guildId;
        this.userId = options.userId;
        if (options.key)
            this.encryptionKey = options.key;
        await this.encryptionLib.initialize("sodium-native");
        return this;
    }

    setSession(session_id) {
        this.sessionId = session_id;
    }

    sendData(options) {
        if (!options.token || !options.endpoint) throw new Error("RenodePlayer :: 'token' & 'endpoint' must be properly provided.")
        this.token = options.token;
        this.endpoint = options.endpoint;
        if(options.sessionId) {
            this.setSession(options.sessionId);
        }
    }

    /**
     * Play a track
     * @param {string|Object} query - Query string or Track object
     * @param {Object} options - Play options
     * @returns {Promise<Object>} The track that is playing
     */
    async play(query, options = {}) {
        return this.musicPlayer.play(query, options);
    }

    /**
     * Stop playback
     */
    stop(reason = "ended") {
        return this.musicPlayer.stop(reason);
    }

    /**
     * Pause playback
     */
    pause() {
        return this.musicPlayer.pause();
    }

    /**
     * Resume playback
     */
    resume() {
        return this.musicPlayer.resume();
    }
    /**
     * Go back to the previous track
     */
    previous() {
        return this.musicPlayer.previous();
    }

    /**
     * Set the volume (0-100)
     * @param {number} volume - Volume level
     */
    setVolume(volume) {
        return this.musicPlayer.setVolume(volume);
    }

    /**
     * Seek to a position in the current track
     * @param {number} position - Position in milliseconds
     * @returns {boolean} Whether the seek was successful
     */
    seek(position) {
        return this.musicPlayer.seek(position);
    }

    /**
     * Get the current queue
     * @returns {Object} The queue
     */
    get track() {
        return this.musicPlayer.track;
    }

    /**
     * Get the current playback position in milliseconds
     * @returns {number} Current position in milliseconds
     */
    get currentPosition() {
        return this.musicPlayer.currentPosition;
    }

    /**
     * Search for tracks
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    async search(query, options = {}) {
        return this.musicPlayer.load(query, options);
    }

    /**
     * Reset the audio system for clean track transitions
     * This method performs a complete reset of the audio system
     */
    async reset() {
        console.log('Performing complete audio system reset');

        try {
            if (this.player) {
                try {
                    this.player.stop('reset');
                } catch (err) {
                    console.error('Error stopping player:', err);
                }
            }

            if (this.audio) {
                // Clear timeouts
                if (this.audio.playTimeout) {
                    clearTimeout(this.audio.playTimeout);
                    this.audio.playTimeout = null;
                }

                if (this.audio.stream) {
                    try {
                        this.audio.stream.destroy();
                        this.audio.stream = null;
                    } catch (err) {
                        console.error('Error destroying audio stream:', err);
                    }
                }

                if (typeof this.audio.initializeAudioPipeline === 'function') {
                    try {
                        this.audio.initializeAudioPipeline();
                    } catch (err) {
                        console.error('Error reinitializing audio pipeline:', err);
                    }
                }
            }

            if (this.gateway) {
                try {
                    this.gateway.destroy(1000, 'System reset');
                } catch (err) {
                    console.error('Error destroying gateway:', err);
                }
            }

            this.playerState = {
                status: "idle",
                reason: "reset"
            };

            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Audio system reset complete');
            return true;
        } catch (error) {
            console.error('Error during system reset:', error);
            return false;
        }
    }

    /**
     * Update the position counter without seeking the actual stream
     * Useful for synchronizing displayed position with actual playback
     * @param {number} position - Position in milliseconds
     * @returns {boolean} Whether the position update was successful
     */
    seek(position) {
        return this.musicPlayer.seek(position);
    }
}

export default RenodePlayer;
