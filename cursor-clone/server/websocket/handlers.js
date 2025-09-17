import { v4 as uuidv4 } from 'uuid';

export function setupWebSocketHandlers(wss, services) {
  const { fileSystemManager, aiOrchestrator, gitManager } = services;
  const clients = new Map();
  const rooms = new Map(); // For collaborative editing

  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    const client = {
      id: clientId,
      ws,
      room: null,
      cursor: null,
      selection: null
    };
    
    clients.set(clientId, client);
    console.log(`Client ${clientId} connected`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      clientId,
      message: 'Connected to Enhanced Cursor Editor'
    }));

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(client, message, services, clients, rooms);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      handleDisconnect(client, clients, rooms);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      handleDisconnect(client, clients, rooms);
    });
  });
}

async function handleMessage(client, message, services, clients, rooms) {
  const { type, ...payload } = message;
  
  switch (type) {
    case 'join_room':
      handleJoinRoom(client, payload.roomId, rooms);
      break;
      
    case 'leave_room':
      handleLeaveRoom(client, rooms);
      break;
      
    case 'cursor_update':
      handleCursorUpdate(client, payload, rooms);
      break;
      
    case 'text_change':
      handleTextChange(client, payload, rooms);
      break;
      
    case 'ai_stream_request':
      await handleAIStreamRequest(client, payload, services);
      break;
      
    case 'ai_command':
      await handleAICommand(client, payload, services);
      break;
      
    case 'file_watch':
      handleFileWatch(client, payload, services);
      break;
      
    case 'terminal_command':
      await handleTerminalCommand(client, payload, services);
      break;
      
    default:
      client.ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${type}`
      }));
  }
}

function handleJoinRoom(client, roomId, rooms) {
  // Leave current room if any
  if (client.room) {
    handleLeaveRoom(client, rooms);
  }
  
  client.room = roomId;
  
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  
  rooms.get(roomId).add(client);
  
  // Notify other clients in the room
  broadcastToRoom(roomId, rooms, {
    type: 'user_joined',
    clientId: client.id
  }, client.id);
  
  client.ws.send(JSON.stringify({
    type: 'room_joined',
    roomId,
    clients: Array.from(rooms.get(roomId)).map(c => ({
      id: c.id,
      cursor: c.cursor,
      selection: c.selection
    }))
  }));
}

function handleLeaveRoom(client, rooms) {
  if (!client.room) return;
  
  const room = rooms.get(client.room);
  if (room) {
    room.delete(client);
    
    // Notify other clients
    broadcastToRoom(client.room, rooms, {
      type: 'user_left',
      clientId: client.id
    }, client.id);
    
    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(client.room);
    }
  }
  
  client.room = null;
}

function handleCursorUpdate(client, payload, rooms) {
  client.cursor = payload.cursor;
  client.selection = payload.selection;
  
  if (client.room) {
    broadcastToRoom(client.room, rooms, {
      type: 'cursor_update',
      clientId: client.id,
      cursor: payload.cursor,
      selection: payload.selection
    }, client.id);
  }
}

function handleTextChange(client, payload, rooms) {
  if (client.room) {
    broadcastToRoom(client.room, rooms, {
      type: 'text_change',
      clientId: client.id,
      changes: payload.changes,
      version: payload.version
    }, client.id);
  }
}

async function handleAIStreamRequest(client, payload, services) {
  const { aiOrchestrator } = services;
  const { prompt, context, options = {} } = payload;
  
  try {
    // Start streaming response
    client.ws.send(JSON.stringify({
      type: 'ai_stream_start',
      requestId: payload.requestId
    }));
    
    const stream = await aiOrchestrator.streamResponse(prompt, {
      context,
      ...options,
      onToken: (token) => {
        client.ws.send(JSON.stringify({
          type: 'ai_stream_token',
          requestId: payload.requestId,
          token,
          typing: options.simulateTyping !== false
        }));
      },
      onThinking: (thinking) => {
        client.ws.send(JSON.stringify({
          type: 'ai_thinking',
          requestId: payload.requestId,
          thinking
        }));
      }
    });
    
    client.ws.send(JSON.stringify({
      type: 'ai_stream_complete',
      requestId: payload.requestId,
      response: stream.fullResponse,
      metadata: stream.metadata
    }));
    
  } catch (error) {
    console.error('AI stream error:', error);
    client.ws.send(JSON.stringify({
      type: 'ai_stream_error',
      requestId: payload.requestId,
      error: error.message
    }));
  }
}

async function handleAICommand(client, payload, services) {
  const { aiOrchestrator } = services;
  const { command, args, context } = payload;
  
  try {
    const result = await aiOrchestrator.executeCommand(command, args, context);
    
    client.ws.send(JSON.stringify({
      type: 'ai_command_result',
      requestId: payload.requestId,
      result
    }));
    
  } catch (error) {
    console.error('AI command error:', error);
    client.ws.send(JSON.stringify({
      type: 'ai_command_error',
      requestId: payload.requestId,
      error: error.message
    }));
  }
}

function handleFileWatch(client, payload, services) {
  const { fileSystemManager } = services;
  const { path, watch } = payload;
  
  if (watch) {
    fileSystemManager.watchFile(path, (event, filename) => {
      client.ws.send(JSON.stringify({
        type: 'file_change',
        path,
        event,
        filename
      }));
    });
  } else {
    fileSystemManager.unwatchFile(path);
  }
}

async function handleTerminalCommand(client, payload, services) {
  // This would integrate with node-pty for terminal emulation
  // For now, just send back a mock response
  client.ws.send(JSON.stringify({
    type: 'terminal_output',
    requestId: payload.requestId,
    output: `Mock terminal output for: ${payload.command}`,
    exitCode: 0
  }));
}

function handleDisconnect(client, clients, rooms) {
  console.log(`Client ${client.id} disconnected`);
  
  handleLeaveRoom(client, rooms);
  clients.delete(client.id);
}

function broadcastToRoom(roomId, rooms, message, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const messageStr = JSON.stringify(message);
  
  room.forEach(client => {
    if (client.id !== excludeClientId && client.ws.readyState === 1) {
      client.ws.send(messageStr);
    }
  });
}