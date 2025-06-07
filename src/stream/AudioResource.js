import prism from 'prism-media';
import config from '../configurations/settings.json' assert {
    type: 'json'
};
import {
    Readable
} from 'stream';
import axios from "axios";
import fs from 'fs';

class AudioResource {
    constructor(renode) {
        this.renode = renode;
        this.totalDur = 2 ** 32;
        this.max_seq = 2 ** 16;
        this.nonceBuffer = Buffer.alloc(24);
        this.opusSampleRate = config.opusConfig[this.renode.quality].sampleRate;
        this.packetBuffer = Buffer.allocUnsafe(12);
        this.nonce = 0;
        this.silenceFrame = Buffer.from([0xf8, 0xff, 0xfe]);
        this.timestamp = (this.opusSampleRate / 100) * 2;
        this.opusFramDuration = config.opusConfig[this.renode.quality].frameDuration;
        this.opusFrameSize = Math.floor((this.opusSampleRate * this.opusFramDuration) / 1000);
        this.max_nonce = 2 ** 32;
        this.bitrate = config.opusConfig[this.renode.quality].bitrate;
        this.opusEncodingQuality = config.opusConfig[this.renode.quality].opusEncodingQuality || 10;

        this.DISCORD_CLOSE_CODES = {
            1006: {
                reconnect: true
            },
            4014: {
                error: false
            },
            4015: {
                reconnect: true
            }
        };

        this.stream = null;
        this.playTimeout = null;

        this.args = [
            '-analyzeduration', '0',
            '-loglevel', '0',
            '-i', 'pipe:0',
            '-f', 's16le',
            '-ar', this.opusSampleRate.toString(),
            '-ac', '2',
            '-b:a', `${Math.floor(this.bitrate / 1000)}k`,
            //'-af', `volume=1.3,bass=g=1.0,treble=g=0.5,acompressor=threshold=-20dB:ratio=2:attack=5:release=1000,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=async=1:min_hard_comp=0.1`,
            '-q:a', `${this.opusEncodingQuality.toString()}`,
            '-application', `${config.opusConfig[this.renode.quality].application}`,
            '-sample_fmt', 's16',
            '-probesize', '32',
            '-thread_queue_size', '1024',
            '-reconnect', '1',
            '-reconnect_streamed', '1',
            '-reconnect_delay_max', '5'
        ];

        this.initializeAudioPipeline();
    }

    initializeAudioPipeline() {
        this.ffmpegStream = new prism.FFmpeg({
            args: this.args
        });
        this.volumeTransformer = new prism.VolumeTransformer({
            type: 's16le'
        });
        this.opusStream = new prism.opus.Encoder({
            rate: this.opusSampleRate,
            channels: 2,
            frameSize: this.opusFrameSize
        });

        this.opusStream.setFEC(config.opusConfig[this.renode.quality].fec);
        this.opusStream.setPLP(config.opusConfig[this.renode.quality].plp);

        [this.ffmpegStream, this.volumeTransformer, this.opusStream].forEach(stream => {
            stream.on('error', error => {
                console.error(`${stream.constructor.name} error:`, error);
                this.renode.player._updatePlayerState({
                    status: 'error',
                    reason: `${stream.constructor.name.toLowerCase()}_error`
                });
            });
        });
    }

    async createHttpStream(url) {
        return new Promise(async (resolve, reject) => {

            console.log("vdfgfdgfdgfdgfdgdfgfdgdfgdf")

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Range': 'bytes=0-',
                    'DNT': '1',
                },
                responseType: 'stream',
                timeout: 15000
            });

            console.log("okkkkkkkkkkkk")

            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                // Handle redirects
                console.log(`Redirecting to: ${response.headers.location}`);
                this.createHttpStream(response.headers.location).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode < 200 || response.statusCode >= 300) {
                reject(new Error(`HTTP status code ${response.statusCode}`));
                return;
            }

            // Create a pass-through stream
            const stream = new Readable({
                read() {
                    // This is intentionally empty as data is pushed from the response
                }
            });

            response.data.on('data', (chunk) => {
                stream.push(chunk);
            });

            response.data.on('end', () => {
                stream.push(null);
            });

            response.data.on('error', (error) => {
                stream.destroy(error);
                reject(error);
            });

            console.log('HTTP stream created successfully');
            resolve(stream);
        });
    }

    async createAudioResource(input) {
        let inputStream;

        if (typeof input === 'string') {
            if (input.startsWith('http')) {
                if (this.renode.util.isHLS(input)) {
                    this.ffmpegStream = new prism.FFmpeg({
                        args: [
                            '-reconnect', '1',
                            '-reconnect_streamed', '1',
                            '-reconnect_delay_max', '5',
                            '-i', input,
                            '-analyzeduration', '0',
                            '-loglevel', '0',
                            '-f', 's16le',
                            '-ar', this.opusSampleRate.toString(),
                            '-ac', '2',
                            '-b:a', `${Math.floor(this.bitrate / 1000)}k`,
                            '-q:a', `${this.opusEncodingQuality}`,
                            '-application', `${config.opusConfig[this.renode.quality].application}`,
                            '-sample_fmt', 's16',
                            '-probesize', '32',
                            '-thread_queue_size', '1024',
                        ]
                    });

                    inputStream = this.ffmpegStream;
                } else {
                    inputStream = await this.createHttpStream(input);
                    inputStream = inputStream.pipe(this.ffmpegStream);
                }
            } else {
                inputStream = fs.createReadStream(input).pipe(this.ffmpegStream);
                inputStream.on('error', error => {
                    console.error('Local file stream error:', error);
                });
            }
        } else if (input instanceof Readable) {
            inputStream = input.pipe(this.ffmpegStream);
        } else {
            throw new Error('Input must be a URL string or Readable stream');
        }

        this.stream = inputStream
            .pipe(this.volumeTransformer)
            .pipe(this.opusStream);


        this.stream.on('error', error => {

            console.error('Audio pipeline error:', error);

            this.destroy({
                code: 1006,
                reason: 'Stream error'
            }, true);

            this.renode.player.stop('error');

        });

        this.stream.on('end', () => {

            console.log('Audio stream ended.');

            this.renode.player._updateState({
                closeCode: 1000,
                closeReason: 'Normal closure'
            });

            this.renode.player._updatePlayerState({
                status: 'idle',
                reason: 'ended'
            });
        });

        return this.stream;
    }

    destroy(state = {
        code: 1000,
        reason: "Normal Closure"
    }, destroyStream) {
        if (this.playTimeout) {
            clearTimeout(this.playTimeout);
            this.playTimeout = null;
        }

        if (this.renode.gateway) {
            try {
                this.renode.gateway.destroy(state.code, state.reason);
            } catch (error) {
                console.error('Error destroying gateway:', error);
            }
        }

        if (this.renode.socket) {
            this.renode.socket.options = {};
        }

        if (destroyStream) {
            try {
                if (this.volumeTransformer) {
                    this.volumeTransformer.destroy();
                    this.volumeTransformer = null;
                }

                if (this.stream) {
                    this.stream.destroy();
                    this.stream.removeAllListeners();
                    this.stream = null;
                }

                this.initializeAudioPipeline();
            } catch (error) {
                console.error('Error destroying streams:', error);
            }
        }

        if (this.renode.player && this.renode.player._updateState) {
            this.renode.player._updateState(state);
        }

        if (this.renode.player && this.renode.player._updatePlayerState) {
            this.renode.player._updatePlayerState({
                status: 'idle',
                reason: 'destroyed'
            });
        }
    }

    _packetInterval() {
        const delay = Math.max(0, this.renode.player.nextPacket - Date.now());

        this.playTimeout = setTimeout(() => {
            if (!this.stream) {
                console.error('Stream is null in _packetInterval, stopping playback');
                return this.renode.player.stop('error');
            }

            try {
                const chunk = this.stream.read(this.opusFrameSize);

                if (!chunk && this.stream.canStop) {
                    return this.renode.player.stop('finished');
                }

                if (chunk) {
                    this.renode.socket.sendAudioChunk(chunk);
                }

                this.renode.player.nextPacket += this.opusFramDuration;
                this._packetInterval();
            } catch (error) {
                console.error('Error in packet interval:', error);
                this.destroy({
                    code: 1006,
                    reason: 'Stream error'
                }, true);
                this.renode.player.stop('error');
            }
        }, delay);
    }


    async seek(seconds) {
        const url = this.renode.musicPlayer.streamUrl;

        if(this.renode.util.isHLS(url) || !this.renode.musicPlayer.track.isSeekable || this.renode.musicPlayer.track.isStream) {
            throw new Error("Cannot seek hls streams.")
        }

        if (typeof seconds !== 'number' || seconds < 0) return;

        try {
            const seekArgs = [
                '-ss', seconds.toString(),
                '-analyzeduration', '0',
                '-loglevel', '0',
                '-i', url,
                '-f', 's16le',
                '-ar', this.opusSampleRate.toString(),
                '-ac', '2',
                '-b:a', `${Math.floor(this.bitrate / 1000)}k`,
                '-q:a', `${this.opusEncodingQuality}`,
                '-application', `${config.opusConfig[this.renode.quality].application}`,
                '-sample_fmt', 's16',
                '-probesize', '32',
                '-thread_queue_size', '1024',
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5'
            ];

            const newFfmpeg = new prism.FFmpeg({
                args: seekArgs
            });
            const newVolume = new prism.VolumeTransformer({
                type: 's16le'
            });
            const newOpus = new prism.opus.Encoder({
                rate: this.opusSampleRate,
                channels: 2,
                frameSize: this.opusFrameSize
            });

            newOpus.setFEC(config.opusConfig[this.renode.quality].fec);
            newOpus.setPLP(config.opusConfig[this.renode.quality].plp);

            const newStream = newFfmpeg.pipe(newVolume).pipe(newOpus);

            await new Promise((resolve, reject) => {
                let ready = false;
                const check = () => {
                    const chunk = newStream.read(this.opusFrameSize);
                    if (chunk) {
                        ready = true;
                        resolve();
                    } else {
                        setTimeout(() => {
                            if (!ready) check();
                        }, 10);
                    }
                };
                check();
            });

            this.renode.player.stop('seeking');
            this.ffmpegStream = newFfmpeg;
            this.volumeTransformer = newVolume;
            this.opusStream = newOpus;
            this.stream = newStream;

            this._packetInterval();

        } catch (error) {
            console.error('Seek failed:', error);
            this.renode.player.stop('error');
        }
    }



    setVolume(volume) {
        volume = Math.max(0, Math.min(1, volume));

        /*if (this.volumeTransformer?.destroyed) {
            console.warn('Volume transformer is destroyed, reinitializing...');
            this.volumeTransformer = new prism.VolumeTransformer({
                type: 's16le'
            });
            this.stream = this.stream.pipe(this.volumeTransformer).pipe(this.opusStream);
        }*/

        if (this.volumeTransformer) {
            try {
                this.volumeTransformer.setVolume(volume);
                console.log(`Volume set to ${volume}`);
            } catch (error) {
                console.error('Error setting volume:', error);
            }
        } else {
            console.warn('Volume transformer not available');
        }

        return volume;
    }
}

export default AudioResource;