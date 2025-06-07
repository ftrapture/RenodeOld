import WebSocket from "ws";
import dgram from 'node:dgram';
import { PassThrough } from 'node:stream';


class VoiceWebSocket {
  renode;
  ws;
  callback;
  reconnection;
  constructor(renode) {
    this.renode = renode;
    this.ws = null;
    this.callback = null;
    this.reconnection = false;
    this.renode.on("TrackEventStart", this.handleTrackEvent.bind(this));
    this.renode.on("TrackEventEnd", this.handleTrackEvent.bind(this));
    this.renode.on("TrackEventStuck", this.handleTrackEvent.bind(this));
    this.renode.on("WebsocketClosed", this.handleTrackEvent.bind(this));
  }

  handleTrackEvent(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Destroys the WebSocket and UDP connection, clears intervals and timeouts,
   * and resets the player's state.
   *
   * @param {number} code - WebSocket close code.
   * @param {string} reason - Reason for closing the connection.
   */
  destroy(code, reason) {
    if (this.renode.socket.interval) {
      clearInterval(this.renode.socket.interval);
      this.renode.socket.interval = null;
    }

    if (this.renode.audio.playTimeout) {
      clearTimeout(this.renode.audio.playTimeout);
      this.renode.audio.playTimeout = null;
    }

    this.renode.player.sequence = 0;
    this.renode.player.timestamp = 0;
    this.renode.player.nextPacket = 0;

    if (this.ws && !this.ws.closing) {
      this.ws.close(code, reason);
      this.ws.removeAllListeners();
      this.ws = null;
    }

    if (this.renode.socket.udp) {
      this.renode.socket.udp.close();
      this.renode.socket.udp.removeAllListeners();
      this.renode.socket.udp = null;
    }
  }

  /**
   * Initiates a WebSocket connection to the voice server.
   * Handles reconnections and state updates.
   *
   * @param {Function} cb - Callback function on successful connection.
   * @param {boolean} reconnection - Flag indicating if this is a reconnection attempt.
   */
  connect(cb, reconnection = false) {
    this.callback = cb;
    this.reconnection = reconnection;

    if (this.ws) {
      this.destroy(1000, 'Normal close');
      this.renode.player._updateState({ status: 'disconnected', reason: 'closed', code: 4014, closeReason: 'Disconnected.' });
      this.renode.player._updatePlayerState({ status: 'idle', reason: 'destroyed' });
    }

    this.renode.player._updateState({ status: 'connecting' });

    this.ws = new WebSocket(`wss://${this.renode.endpoint}/?v=7`, {
      headers: {
        'User-Agent': 'Renode'
      }
    });

    this.ws.on('open', this.open.bind(this));
    this.ws.on('message', this.message.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', (error) => this.renode.emit('error', error));
  }

  /**
   * Handles incoming WebSocket messages and routes based on operation code.
   *
   * @param {string} data - JSON string message from WebSocket.
   */
  async message(data) {
    const payload = JSON.parse(data);
    switch (payload.op) {
      case 2: 
        await this.handleReady(payload);
        break;
      case 4:
        this.renode.socket.options.secretKey = new Uint8Array(payload.d.secret_key);
        if (this.callback) this.callback();
        this.renode.player._updateState({ status: 'connected' });
        break;
      case 5: 
        this.handleSpeaking(payload);
        break;
      case 6: 
        this.renode.ping = Date.now() - (payload.d?.t || payload.d);
        break;
      case 8: 
        this.setupHeartbeat(payload.d.heartbeat_interval);
        break;
      default:
        console.warn(`Unhandled op code: ${payload.op}`);
        break;
    }
  }

  /**
   * Opens a WebSocket connection, sending the appropriate identify or resume payload.
   */
  open() {
    const payload = this.reconnection ? {
      op: 7, // Resume
      d: {
        server_id: this.renode.guildId,
        session_id: this.renode.sessionId,
        token: this.renode.token,
        seq_ack: 10
      }
    } : {
      op: 0, // Identify
      d: {
        server_id: this.renode.guildId,
        user_id: this.renode.userId,
        session_id: this.renode.sessionId,
        token: this.renode.token,
      }
    };
    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Handles WebSocket close events and manages reconnections.
   *
   * @param {number} code - WebSocket close code.
   * @param {string} reason - Reason for WebSocket closure.
   */
  handleClose(code, reason) {
    if (!this.ws) return;

    const closeCode = this.renode.audio.DISCORD_CLOSE_CODES[code];

    console.log(JSON.parse(code));

    if (closeCode?.reconnect) {
      this.destroy(code, reason);
      this.renode.player._updatePlayerState({ status: 'idle', reason: 'reconnecting' });
      this.connect(() => {
        if (this.renode.audio.stream) this.renode.player.unpause('reconnected');
      }, true);
    } else {
      this.renode.audio.destroy({ status: 'disconnected', reason: 'closed', code, closeReason: reason }, false);
    }
  }

  /**
   * Sets up the UDP connection when WebSocket is ready.
   *
   * @param {Object} payload - The payload from the WebSocket message.
   */
  async handleReady(payload) {
    this.renode.socket.options = {
      ssrc: payload.d.ssrc,
      ip: payload.d.ip,
      port: payload.d.port,
      secretKey: null
    };

    this.renode.socket.udp = dgram.createSocket('udp4');

    this.renode.socket.udp.on('message', (data) => this.handleUdpMessage(data));
    this.renode.socket.udp.on('error', (error) => this.renode.emit('error', error));
    this.renode.socket.udp.on('close', () => this.renode.audio.destroy({ status: 'disconnected' }));

    const serverInfo = await this.renode.socket._ipDiscovery();

    this.ws.send(JSON.stringify({
      op: 1,
      d: {
        protocol: 'udp',
        data: {
          address: serverInfo.ip,
          port: serverInfo.port,
          mode: this.renode.encryptionKey
        }
      }
    }));
  }

  /**
   * Manages speaking events and streams voice data from users.
   *
   * @param {Object} payload - The payload from the WebSocket message.
   */
  handleSpeaking(payload) {
    this.renode.socket.ssrcs[payload.d.ssrc] = {
      userId: payload.d.user_id,
      stream: new PassThrough()
    };
    this.renode.emit('speakStart', payload.d.user_id, payload.d.ssrc);
  }

  /**
   * Handles incoming UDP messages, decrypting voice data and managing streams.
   *
   * @param {Buffer} data - Incoming UDP message data.
   */
  handleUdpMessage(data) {
    if (data.length <= 8) return;

    const ssrc = data.readUInt32BE(8);
    const userData = this.renode.socket.ssrcs[ssrc];

    if (!userData || !this.renode.socket.options.secretKey) return;

    let dataEnd = null;

    switch (this.renode.encryptionKey) {
      case 'xsalsa20_poly1305':
        dataEnd = data.length;
        data.copy(this.renode.audio.nonceBuffer, 0, 0, 12);
        break;
      case 'xsalsa20_poly1305_suffix':
        dataEnd = data.length - 24;
        data.copy(this.renode.audio.nonceBuffer, 0, dataEnd);
        break;
      case 'aead_xchacha20_poly1305_rtpsize':
      case 'xsalsa20_poly1305_lite':
        dataEnd = data.length - 4;
        data.copy(this.renode.audio.nonceBuffer, 0, dataEnd);
        break;
    }

    let voiceData = Buffer.from(this.renode.encryptionLib(
        "open",
        data.slice(12, dataEnd),
        this.renode.audio.nonceBuffer,
        this.renode.socket.options.secretKey
    ));

    if (!voiceData) return;

    if (this.renode.audio.recordStream) this.renode.audio.recordStream.push(voiceData);
    userData.stream.push(voiceData);
  }

  /**
   * Sets up the WebSocket heartbeat mechanism to keep the connection alive.
   *
   * @param {number} interval - Heartbeat interval in milliseconds.
   */
  setupHeartbeat(interval) {
    if (this.renode.socket.interval) clearInterval(this.renode.socket.interval);

    this.renode.socket.interval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.ws.send(JSON.stringify({ op: 3, d: Date.now() }));
    }, interval);
  }
}

export default VoiceWebSocket;
