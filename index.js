import { Client, Intents } from 'discord.js';
import WebSocket from 'ws';
import axios from 'axios';
import fs from "fs";

const RENODE_SERVER = {
  host: 'localhost',
  port: 3000,
  auth: 'youshallnotpass' // Your authorization token
};
let sessionId;
const client = new Client({
  failIfNotExists: false,
  allowedMentions: {
    parse: ['roles', 'users'],
    repliedUser: false,
  },
  partials: [
    'MESSAGE',
    'CHANNEL',
    'REACTION',
    'GUILD_MEMBER',
    'USER'
  ],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_INTEGRATIONS,
    Intents.FLAGS.GUILD_WEBHOOKS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  ],
  presence: {
    activities: [
      {
        name: 'music',
        type: 'LISTENING',
      },
    ],
    status: 'online',
  },
});

// Initialize REST client
const rest = axios.create({
  baseURL: `http://${RENODE_SERVER.host}:${RENODE_SERVER.port}/v4`,
  headers: {
    'Authorization': RENODE_SERVER.auth,
    'Content-Type': 'application/json'
  }
});

// Initialize WebSocket connection
let ws = null;

function connectWebSocket() {
  if (!client.user?.id) {
    console.log('Client user ID not available yet, retrying in 1 second...');
    setTimeout(connectWebSocket, 1000);
    return;
  }

  const wsUrl = `ws://${RENODE_SERVER.host}:${RENODE_SERVER.port}/v4/websocket`;
  ws = new WebSocket(wsUrl, {
    headers: {
      'Authorization': RENODE_SERVER.auth,
      'User-Id': client.user.id,
      'Client-Name': 'Discord Bot'
    }
  });

  ws.on('open', () => {
    console.log('Connected to RenodePlayer WebSocket');
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.op) {
        case 'ready':
          console.log('WebSocket connection established', message);
          sessionId = message.sessionId
          break;
        case 'playerUpdate':
          break;
        case 'event':
          if(message.type === "TrackStartEvent") {
            const channel = client.guilds.cache.get(message.guildId)?.channels.cache.get('1252592369409196054');
          if (channel) {
            channel.send(`🎵 Now playing: **${message.track.info.title}** by *${message.track.info.author}*`);
          }
          }
          if(message.type === "TrackEndEvent") {
            const endChannel = client.guilds.cache.get(message.guildId)?.channels.cache.get('1252592369409196054');
          if (endChannel) {
            endChannel.send('Queue ended. Leaving voice channel.');
          }
          }
          break;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', (code) => {
    console.log(`WebSocket connection closed with code ${code}. Reconnecting in 5 seconds...`);
    setTimeout(connectWebSocket, 5000);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

client.on('ready', () => {
  console.log('Client is ready!');
  connectWebSocket();
});
let s = null
client.ws.on('VOICE_STATE_UPDATE', async (data) => {
  if (data.member.user.id === client.user.id && data.guild_id) {
    try {
      s = data.session_id;
    } catch (error) {
    }
  }
});

client.ws.on('VOICE_SERVER_UPDATE', async (data) => {
  if (data.guild_id) {
    
    try {
      await rest.patch(`/sessions/${sessionId}/players/${data.guild_id}`, {
        voice: {
          token: data.token,
          endpoint: data.endpoint,
          sessionId: s
        }
      }, {
        headers: {
          'Authorization': RENODE_SERVER.auth,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
    }
  }
});

function isUrl(value) {
        if (typeof value !== "string") return false;
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    }

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.channel) return;
  const prefix = '-';
  if (!message.content.toLowerCase().startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  // Basic commands
  if (cmd === 'ping') {
    return message.reply({ content: `Pong: **${client.ws.ping}ms**` });
  }

  // Music commands
  if (['play', 'p'].includes(cmd)) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply('You must be in a voice channel to use this command!');
    }

    const query = args.join(' ');
    if (!query) {
      return message.reply('Please provide a file name or search query.');
    }

    try {
      const searchResponse = await message.reply(`🔍 Searching for: \`${query}\``);

      // Search for tracks with proper headers
      const { data: searchResult } = await rest.get('/loadtracks', {
        params: { identifier: `${query.endsWith(".mp3") ? `local:${query}` : isUrl(query) ? query : "ytsearch:"+query}` }
      },
      {
        headers: {
          'Authorization': RENODE_SERVER.auth,
          'Content-Type': 'application/json'
        }
      });

      console.log(searchResult)

      if (searchResult.loadType === "empty" || searchResult.loadType === "error") {
        return searchResponse.edit('❌ No tracks found.');
      }

      
      // Join voice channel
      message.guild.shard.send({
        op: 4,
        d: {
          guild_id: message.guild.id,
          channel_id: voiceChannel.id,
          self_mute: false,
          self_deaf: false,
        },
      });

      await wait(999);
      
      if(searchResult.loadType === "search") {
        // Play the track
        await rest.patch(`/sessions/${sessionId}/players/${message.guildId}`, {
          track: {
            encoded: searchResult.data[0].encoded
          }
        },
      {
        headers: {
          'Authorization': RENODE_SERVER.auth,
          'Content-Type': 'application/json'
        }
      });

        return searchResponse.edit(`✅ Added **${searchResult.data[0].info.title}** to the queue`);
      }

      if(searchResult.loadType === "track") {
        // Play the track
        await rest.patch(`/sessions/${sessionId}/players/${message.guildId}`, {
          track: {
            encoded: searchResult.data.encoded
          }
        },
      {
        headers: {
          'Authorization': RENODE_SERVER.auth,
          'Content-Type': 'application/json'
        }
      });

        return searchResponse.edit(`✅ Added **${searchResult.data.info.title}** to the queue`);
      }

      if(searchResult.loadType === "playlist") {
        // Play the track
      await rest.patch(`/sessions/${sessionId}/players/${message.guildId}`, {
        track: {
          encoded: searchResult.data.tracks[0].encoded
        }
      },
      {
        headers: {
          'Authorization': RENODE_SERVER.auth,
          'Content-Type': 'application/json'
        }
      });
      
      return searchResponse.edit(`✅ Added **${searchResult.data.tracks[0].info.title}** to the queue from ${searchResult.data.info.name}`);
      }
      
    } catch (error) {
      console.error('Error playing track:', error);
      message.reply(`Error: ${error.message}`);
    }
  }

  if (cmd === 'stop') {
    try {
      await rest.delete(`/sessions/${sessionId}/players/${message.guildId}`);
      message.reply('⏹️ Playback stopped');
    } catch (error) {
      console.error('Error stopping playback:', error);
      message.reply(`Error: ${error.message}`);
    }
  }

  if (cmd === 'volume') {
    const volume = parseInt(args[0]);
    if (isNaN(volume) || volume < 0 || volume > 100) {
      return message.reply('Please provide a volume level between 0 and 100');
    }

    try {
      await rest.patch(`/sessions/${sessionId}/players/${message.guildId}`, {
        volume
      });
      message.reply(`🔊 Volume set to: **${volume}%**`);
    } catch (error) {
      console.error('Error setting volume:', error);
      message.reply(`Error: ${error.message}`);
    }
  }

  if (cmd === 'now' || cmd === 'np') {
    try {
      const { data: player } = await rest.get(`/sessions/${sessionId}/players/${message.guildId}`);
      
      if (!player || !player.track) {
        return message.reply('Nothing is currently playing');
      }

      const position = player.position || 0;
      const positionSeconds = Math.floor(position / 1000);
      const positionMinutes = Math.floor(positionSeconds / 60);
      const positionRemainingSeconds = positionSeconds % 60;
      const formattedPosition = `${positionMinutes}:${positionRemainingSeconds.toString().padStart(2, '0')}`;

      message.reply(`**Now Playing:**\n📀 **Track:** ${player.track}\n⏱️ **Position:** ${formattedPosition}\n🔊 **Volume:** ${player.volume}%`);
    } catch (error) {
      console.error('Error getting player info:', error);
      message.reply(`Error: ${error.message}`);
    }
  }
});

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

client.login("ODkyNzQwMTU0MjQ5MzE4NDcw.GMgSCy.NvNqJZ-sSs0KqESDE_QSLUm6tr1aMG5Oh6YNBk");
