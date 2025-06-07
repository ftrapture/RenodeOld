import axios from "axios";
import {
    Buffer
} from "buffer";

class Util {
    encode(track) {
        try {
            let pos = 0;
            let buf = Buffer.alloc(256);

            const flags = (track.uri ? 1 << 0 : 0) |
                (track.artworkUrl ? 1 << 1 : 0) |
                (track.isrc ? 1 << 2 : 0);

            const writeByte = v => {
                buf[pos++] = v;
            };
            const writeUShort = v => {
                buf.writeUInt16BE(v, pos);
                pos += 2;
            };
            const writeInt = v => {
                buf.writeInt32BE(v, pos);
                pos += 4;
            };
            const writeLong = v => {
                buf.writeBigInt64BE(BigInt(v), pos);
                pos += 8;
            };
            const writeUTF = str => {
                const strBuf = Buffer.from(str, 'utf8');
                writeUShort(strBuf.length);
                if (pos + strBuf.length > buf.length) {
                    const newBuf = Buffer.alloc(pos + strBuf.length);
                    buf.copy(newBuf, 0, 0, pos);
                    buf = newBuf;
                }
                strBuf.copy(buf, pos);
                pos += strBuf.length;
            };

            writeInt(2);
            writeInt(flags);
            writeUTF(track.identifier);
            writeUTF(track.author);
            writeLong(track.length);
            writeByte(track.isStream ? 1 : 0);
            writeUTF(track.title);

            if (track.uri) writeUTF(track.uri);
            writeUTF(track.sourceName);
            if (track.artworkUrl) writeUTF(track.artworkUrl);
            if (track.isrc) writeUTF(track.isrc);

            return buf.subarray(0, pos).toString('base64');
        } catch {
            return null;
        }
    }

    decode(encoded) {
        try {
            const buffer = Buffer.from(encoded, 'base64');
            let pos = 0;

            const readByte = () => buffer[pos++];
            const readUShort = () => {
                if (pos + 2 > buffer.length) throw new RangeError("Out of range readUShort");
                const v = buffer.readUInt16BE(pos);
                pos += 2;
                return v;
            };
            const readInt = () => {
                if (pos + 4 > buffer.length) throw new RangeError("Out of range readInt");
                const v = buffer.readInt32BE(pos);
                pos += 4;
                return v;
            };
            const readLong = () => {
                if (pos + 8 > buffer.length) throw new RangeError("Out of range readLong");
                const v = buffer.readBigInt64BE(pos);
                pos += 8;
                return v;
            };
            const readUTF = () => {
                const len = readUShort();
                if (pos + len > buffer.length) throw new RangeError("Out of range readUTF string");
                const str = buffer.toString('utf8', pos, pos + len);
                pos += len;
                return str;
            };

            const version = readInt();
            const flags = readInt();

            const identifier = readUTF();
            const author = readUTF();
            const length = Number(readLong());
            const isStream = !!readByte();
            const title = readUTF();

            const uri = (flags & (1 << 0)) ? readUTF() : null;
            const sourceName = readUTF();
            const artworkUrl = (flags & (1 << 1)) ? readUTF() : null;
            const isrc = (flags & (1 << 2)) ? readUTF() : null;

            const decoded = {
                title,
                author,
                identifier,
                isStream,
                uri,
                artworkUrl,
                isrc,
                length,
                isSeekable: !isStream,
                sourceName
            };

            if (!this.isValidTrack(decoded)) throw new Error("Invalid track");
            return decoded;
        } catch (e) {
            console.error("Decode failed:", e.message);
            return null;
        }
    }


    async detectAudioCodec(url) {
        try {
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Range': 'bytes=0-2047',
                },
                responseType: 'arraybuffer',
                timeout: 10000
            });

            const buffer = Buffer.from(res.data);
            const str = buffer.toString('utf8');

            if (buffer.includes(Buffer.from('OpusHead'))) return 'opus';
            if (str.includes('ftypM4A') || str.includes('isom')) return 'aac';
            if (str.includes('vorbis')) return 'vorbis';
            if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WAVE') return 'pcm_s16le';

            return res.headers["content-type"] || 'unknown';
        } catch (err) {
            console.warn('Failed to probe codec:', err.message);
            return 'unknown';
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isUrl(value) {
        if (typeof value !== "string") return false;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }

    isHLS(url) {
        return url.includes('.m3u8') || url.includes('playlist/index.m3u8');
    }

    isEncoded(track) {
        return typeof track === "string" && /^[A-Za-z0-9+/=]+$/.test(track);
    }

    isDecoded(track) {
        return this.isValidTrack(track);
    }

    isValidTrack(track) {
        return (
            typeof track.title === "string" &&
            typeof track.author === "string" &&
            typeof track.identifier === "string" &&
            typeof track.length === "number" &&
            typeof track.isSeekable === "boolean" &&
            typeof track.sourceName === "string" &&
            typeof track.isStream === "boolean" &&
            'uri' in track &&
            'artworkUrl' in track &&
            'isrc' in track
        );
    }
}

export default Util;