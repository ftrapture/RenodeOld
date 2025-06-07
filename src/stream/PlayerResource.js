class Player {
    constructor(renode) {
        this.renode = renode;
        this.sequence = 0;
        this.timestamp = 0;
        this.nextPacket = 0;
        this.retryCount = 0; 
        this.maxRetries = 3; 
        this.muted = false;
        this.deaf = false;
        this.volume = 100;
        this.connectionState = {
            status: 'disconnected',
            closeCode: null,
            closeReason: null
        };
        this.playerState = {
            status: 'idle',
            reason: null
        };
    }

    /**
     * Updates the player's connection state.
     *
     * @param {Object} state - The state object to update.
     */
    _updateState(state) {
        this.connectionState = {
            ...this.connectionState,
            ...state
        };
        this.renode.emit('connectionStateChange', { ...this.connectionState });
    }

    /**
     * Updates the player's playback state.
     *
     * @param {Object} state - The state object to update.
     */
    _updatePlayerState(state) {
        const oldState = { ...this.playerState };
        this.playerState = {
            ...this.playerState,
            ...state
        };
        this.renode.emit('playerStateChange', oldState, { ...this.playerState });
    }

    /**
     * Requests the player to start playing.
     * Called internally after WebSocket connection setup.
     */
    requestPlay() {
        this.nextPacket = Date.now();

        if (this.renode.audio.stream) {
            this._updatePlayerState({ status: 'playing', reason: 'requested' });
            this.renode.socket.setMicValue(true);
            this.renode.audio._packetInterval();
        }
    }

    /**
     * Unpause a paused playback.
     *
     * @param {string} [reason='user'] - The reason for unpausing.
     * @returns {boolean} - Whether the unpause was successful.
     */
    unpause(reason = 'user') {
        if (this.playerState.status !== 'paused') return false;

        this._updatePlayerState({ status: 'playing', reason });
        this.renode.socket.setMicValue(true);
        this.renode.audio._packetInterval();
        return true;
    }

    /**
     * Pauses the current playback.
     *
     * @param {string} [reason='user'] - The reason for pausing.
     * @returns {boolean} - Whether the pause was successful.
     */
    pause(reason = 'user') {
        if (this.playerState.status !== 'playing') return false;

        clearTimeout(this.renode.audio.playTimeout);
        this.renode.audio.playTimeout = null;
        this.renode.socket.setMicValue(false);
        this._updatePlayerState({ status: 'paused', reason });
        return true;
    }

    /**
     * Stops the current playback.
     *
     * @param {string} [reason='user'] - The reason for stopping.
     * @returns {boolean} - Whether the stop was successful.
     */
    stop(reason = 'ended') {
        if (this.playerState.status === 'idle') return false;

        clearTimeout(this.renode.audio.playTimeout);
        this.renode.audio.playTimeout = null;
        this.renode.socket.setMicValue(false);
        if(reason !== "seeking") this._updatePlayerState({ status: 'idle', reason });
        this._markAsStoppable();
        return true;
    }

    /**
     * Starts playing the provided audio stream or resource.
     *
     * @param {ReadableStream|string} audioResource - The audio stream or URL to play.
     */
    async play(audioResource) {
        if (audioResource) {
            try {
                const stream = await this.renode.audio.createAudioResource(audioResource);
                this.renode.audio.stream = stream;
            } catch (error) {
                console.error('Error creating audio resource:', error);
                this._updatePlayerState({ status: 'error', reason: 'resource_creation_failed' });
                throw error;
            }
        }
        this.renode.gateway.connect(() => this.requestPlay());
    }

    /**
     * Destroys the player and cleans up resources.
     */
    destroy() {
        this.renode.audio.destroy({ status: 'destroyed' }, true);
    }

    /**
     * Marks the audio stream as stoppable, allowing it to be stopped when finished.
     */
    _markAsStoppable() {
        if(this.renode?.audio?.stream) this.renode.audio.stream.canStop = true;
    }

    /**
     * Checks if the UDP connection is established.
     *
     * @returns {boolean} - True if UDP is connected, otherwise false.
     */
    isUDPConnected() {
        return !!this.renode?.socket?.options;
    }
}

export default Player;
