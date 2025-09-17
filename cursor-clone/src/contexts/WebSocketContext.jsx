import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [clientId, setClientId] = useState(null);
  
  const messageHandlers = useRef(new Map());
  const reconnectTimer = useRef(null);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);
        setSocket(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setSocket(null);
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectAttempts);
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimer.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    
    if (socket) {
      socket.close(1000, 'Manual disconnect');
    }
  }, [socket]);

  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
      return false;
    }
  }, [socket]);

  const handleMessage = useCallback((message) => {
    const { type, ...payload } = message;
    
    // Handle system messages
    switch (type) {
      case 'connection':
        setClientId(payload.clientId);
        console.log('Client ID assigned:', payload.clientId);
        break;
        
      case 'error':
        console.error('WebSocket error:', payload.message);
        break;
        
      default:
        // Forward to registered handlers
        const handler = messageHandlers.current.get(type);
        if (handler) {
          handler(payload);
        } else {
          console.log('Unhandled message type:', type, payload);
        }
    }
  }, []);

  const subscribe = useCallback((messageType, handler) => {
    messageHandlers.current.set(messageType, handler);
    
    // Return unsubscribe function
    return () => {
      messageHandlers.current.delete(messageType);
    };
  }, []);

  // WebSocket-specific methods for different features
  const joinRoom = useCallback((roomId) => {
    return sendMessage({
      type: 'join_room',
      roomId
    });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    return sendMessage({
      type: 'leave_room'
    });
  }, [sendMessage]);

  const updateCursor = useCallback((cursor, selection) => {
    return sendMessage({
      type: 'cursor_update',
      cursor,
      selection
    });
  }, [sendMessage]);

  const sendTextChange = useCallback((changes, version) => {
    return sendMessage({
      type: 'text_change',
      changes,
      version
    });
  }, [sendMessage]);

  const requestAIStream = useCallback((prompt, context, options = {}) => {
    const requestId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    sendMessage({
      type: 'ai_stream_request',
      requestId,
      prompt,
      context,
      options
    });
    
    return requestId;
  }, [sendMessage]);

  const sendAICommand = useCallback((command, args, context) => {
    const requestId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    sendMessage({
      type: 'ai_command',
      requestId,
      command,
      args,
      context
    });
    
    return requestId;
  }, [sendMessage]);

  const watchFile = useCallback((path) => {
    return sendMessage({
      type: 'file_watch',
      path,
      watch: true
    });
  }, [sendMessage]);

  const unwatchFile = useCallback((path) => {
    return sendMessage({
      type: 'file_watch',
      path,
      watch: false
    });
  }, [sendMessage]);

  const sendTerminalCommand = useCallback((command, options = {}) => {
    const requestId = `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    sendMessage({
      type: 'terminal_command',
      requestId,
      command,
      options
    });
    
    return requestId;
  }, [sendMessage]);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
    };
  }, []);

  const value = {
    socket,
    isConnected,
    clientId,
    reconnectAttempts,
    maxReconnectAttempts,
    
    // Connection methods
    connect,
    disconnect,
    sendMessage,
    subscribe,
    
    // Feature-specific methods
    joinRoom,
    leaveRoom,
    updateCursor,
    sendTextChange,
    requestAIStream,
    sendAICommand,
    watchFile,
    unwatchFile,
    sendTerminalCommand
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};