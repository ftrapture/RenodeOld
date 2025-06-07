class UdpSocket {
    renode;
    interval;
    options;
    ssrcs;
    udp;
    nonce;
    constructor(renode) {
        this.renode = renode;
        this.interval = 0;
        this.options = {};
        this.ssrcs = {};
        this.udp = null;
        this.nonce = Buffer.alloc(24);
    }

    /**
     * Sends data through the UDP socket to the designated IP and port.
     * @param {Buffer} data - Data buffer to be sent.
     * @param {Function} [cb] - Optional callback function for handling errors.
     */
    send(data, cb) {
        if (!cb) {
            cb = (error) => {
                if (error) this.renode.emit('error', error); 
            };
        }

        this.udp.send(data, this.options.port, this.options.ip, cb);
    }

    /**
     * Sets the speaking status over the WebSocket connection to Discord.
     * @param {boolean} value - Boolean value indicating whether the bot is speaking.
     */
    setMicValue(value) {
        this.renode.gateway.ws.send(JSON.stringify({
            op: 5, 
            d: {
                speaking: value,
                delay: 0,
                ssrc: this.options.ssrc
            },
        }));
    }

    /**
     * Destroys the UDP connection and clears associated resources.
     * @param {number} code - The code to close the WebSocket with.
     * @param {string} reason - The reason for closing the connection.
     */
    destroy(code, reason) {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        if (this.renode.audio.playTimeout) {
            clearTimeout(this.renode.audio.playTimeout);
            this.renode.audio.playTimeout = null;
        }

        this.renode.player.sequence = 0;
        this.renode.player.timestamp = 0;
        this.renode.player.nextPacket = 0;

        if (this.ws && !this.ws.closing) {
            this.renode.gateway.ws.close(code, reason);
            this.renode.gateway.ws.removeAllListeners();
            this.renode.gateway.ws = null;
        }

        if (this.udp) {
            this.udp.close();
            this.udp.removeAllListeners();
            this.udp = null;
        }
    }

    /**
     * Sends an audio chunk through the UDP socket after applying necessary encryption.
     * @param {Buffer} chunk - Audio data chunk to send.
     */
    sendAudioChunk(chunk) {
        this.renode.audio.packetBuffer.writeUInt8(0x80, 0); 
        this.renode.audio.packetBuffer.writeUInt8(0x78, 1); 
        this.renode.audio.packetBuffer.writeUInt16BE(this.renode.player.sequence, 2); 
        this.renode.audio.packetBuffer.writeUInt32BE(this.renode.player.timestamp, 4); 
        this.renode.audio.packetBuffer.writeUInt32BE(this.options.ssrc, 8); 

        this.renode.audio.packetBuffer.copy(this.nonce, 0, 0, 12);

        this.renode.player.timestamp += this.renode.audio.timestamp;
        if (this.renode.player.timestamp >= this.renode.audio.totalDur) {
            this.renode.player.timestamp = 0;
        }

        this.renode.player.sequence++;
        if (this.renode.player.sequence === this.renode.audio.max_seq) {
            this.renode.player.sequence = 0;
        }

        let packet = null;

        switch (this.renode.encryptionKey) {
            case 'xsalsa20_poly1305': {
                const output = this.renode.encryptionLib.executeMethod("close", chunk, this.nonce, this.options.secretKey);
                packet = Buffer.concat([this.renode.audio.packetBuffer, output]);
                break;
            }
            case 'xsalsa20_poly1305_suffix': {
                const random = this.renode.encryptionLib.executeMethod("random", 24, this.renode.audio.nonceBuffer);
                const output = this.renode.encryptionLib.executeMethod("close", chunk, random, this.options.secretKey);
                packet = Buffer.concat([this.renode.audio.packetBuffer, output, random]);
                break;
            }
            case 'aead_xchacha20_poly1305_rtpsize':
            case 'xsalsa20_poly1305_lite': {
                this.renode.audio.nonce++;
                if (this.renode.audio.nonce === this.renode.audio.max_nonce) {
                    this.renode.audio.nonce = 0;
                }
                this.renode.audio.nonceBuffer.writeUInt32LE(this.renode.audio.nonce, 0);
                const output = this.renode.encryptionLib.executeMethod("close", chunk, this.renode.audio.nonceBuffer, this.options.secretKey);
                packet = Buffer.concat([this.renode.audio.packetBuffer, output, this.renode.audio.nonceBuffer.subarray(0, 4)]);
                break;
            }
        }

        this.send(packet, (error) => {
            if (error) {
                this.renode.stats.packets.omitted++;
            } else {
                this.renode.stats.packets.transmitted++;
            }
            this.renode.stats.packets.expected++;
        });
    }

    /**
     * Initiates IP discovery by sending a discovery packet and waiting for a response.
     * @returns {Promise<Object>} - Resolves with the discovered IP and port.
     */
    _ipDiscovery() {
        return new Promise((resolve) => {
            this.udp.once('message', (message) => {
                const data = message.readUInt16BE(0);
                if (data !== 2) return;

                const packet = Buffer.from(message);

                resolve({
                    ip: packet.subarray(8, packet.indexOf(0, 8)).toString('utf8'),
                    port: packet.readUInt16BE(packet.length - 2)
                });
            });

            const buf = Buffer.alloc(74);
            buf.writeUInt16BE(1, 0); 
            buf.writeUInt16BE(70, 2); 
            buf.writeUInt32BE(this.udp.ssrc, 4); 

            this.send(buf);
        });
    }
}

export default UdpSocket;
