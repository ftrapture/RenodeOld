import BaseSource, { LoadResult } from './BaseSource.js';
import Track from './Track.js';
import * as mm from 'music-metadata';
import axios from 'axios';

class HttpSource extends BaseSource {
    constructor(renode) {
        super();
        this.renode = renode;
        this.supported_codecs = ['opus', 'aac', 'ogg', 'vorbis', 'pcm_s16le'];
    }

    get name() {
        return 'http';
    }

    canHandle(query) {
        return typeof query === 'string' && /^https?:\/\//i.test(query);
    }

    async getStreamUrl(uri) {
        return uri;
    }

    async load(url) {
        if (!this.canHandle(url)) {
            return LoadResult.error(new Error(`Invalid HTTP URL: ${url}`));
        }

        try {
            const metadata = await this.fetchMetadata(url);
            let isSeekable = true;
            if(this.renode.util.isHLS(url)) {
                isSeekable = false;
            }

            const codec = await this.renode.util.detectAudioCodec(url);

            if (!this.supported_codecs.includes(codec)) {
                throw new Error(`Unsupported codec: ${codec}`);
            }

            const track = {
                title: metadata.title || url.split('/').pop()?.split('?')[0] || 'Unknown Title',
                uri: url,
                identifier: codec + ":" + url,
                author: metadata.author || 'HTTP Stream',
                length: metadata.duration || 0,
                isStream: !isSeekable,
                isSeekable,
                isrc: metadata.isrc || null,
                artworkUrl: metadata.artworkUrl || null,
                sourceName: this.name
            };

            return LoadResult.trackLoaded(new Track({
                encoded: this.renode.util.encode(track),
                ...track
            }));
        } catch (err) {
            console.error("HttpSource load error:", err);
            return LoadResult.error(err);
        }
    }

    async fetchMetadata(url) {
        try {
            const res = await axios.get(url, { responseType: 'stream' });
            const stream = res.data;

            const metadata = await mm.parseStream(stream, { mimeType: res.headers['content-type'] }, { duration: true });

            const { common, format } = metadata;

            return {
                title: common.title || null,
                author: common.artist || null,
                isrc: common.isrc || null,
                duration: format.duration ? Math.floor(format.duration) : 0,
                artworkUrl: Array.isArray(common.picture) && common.picture.length > 0
                    ? `data:${common.picture[0].format};base64,${common.picture[0].data.toString('base64')}`
                    : null
            };
        } catch (err) {
            console.warn("Failed to fetch HTTP metadata:", err.message);
            return {
                title: null,
                author: null,
                isrc: null,
                duration: 0,
                artworkUrl: null
            };
        }
    }
}

export default HttpSource;
