import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';

const AIContext = createContext();

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

export const AIProvider = ({ children }) => {
  const { isConnected, subscribe, requestAIStream, sendAICommand } = useWebSocket();
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('gpt-oss:20b');
  
  // Chat history
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Stream handlers
  const streamHandlers = useRef(new Map());
  const commandHandlers = useRef(new Map());

  // Initialize AI service
  useEffect(() => {
    if (isConnected) {
      loadAvailableModels();
    }
  }, [isConnected]);

  // Subscribe to WebSocket AI messages
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribes = [
      subscribe('ai_stream_start', handleStreamStart),
      subscribe('ai_stream_token', handleStreamToken),
      subscribe('ai_stream_complete', handleStreamComplete),
      subscribe('ai_stream_error', handleStreamError),
      subscribe('ai_thinking', handleThinking),
      subscribe('ai_command_result', handleCommandResult),
      subscribe('ai_command_error', handleCommandError)
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isConnected]);

  const loadAvailableModels = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/models');
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data.models || []);
      }
    } catch (error) {
      console.error('Failed to load AI models:', error);
    }
  }, []);

  const handleStreamStart = useCallback((data) => {
    const { requestId } = data;
    setIsStreaming(true);
    setCurrentStreamId(requestId);
    setStreamBuffer('');
    setIsThinking(false);
    
    const handler = streamHandlers.current.get(requestId);
    if (handler?.onStart) {
      handler.onStart();
    }
  }, []);

  const handleStreamToken = useCallback((data) => {
    const { requestId, token, typing } = data;
    
    if (requestId === currentStreamId) {
      setStreamBuffer(prev => prev + token);
      
      const handler = streamHandlers.current.get(requestId);
      if (handler?.onToken) {
        handler.onToken(token, typing);
      }
    }
  }, [currentStreamId]);

  const handleStreamComplete = useCallback((data) => {
    const { requestId, response, metadata } = data;
    
    setIsStreaming(false);
    setCurrentStreamId(null);
    setStreamBuffer('');
    
    const handler = streamHandlers.current.get(requestId);
    if (handler?.onComplete) {
      handler.onComplete(response, metadata);
    }
    
    // Clean up handler
    streamHandlers.current.delete(requestId);
  }, []);

  const handleStreamError = useCallback((data) => {
    const { requestId, error } = data;
    
    setIsStreaming(false);
    setCurrentStreamId(null);
    setStreamBuffer('');
    setIsThinking(false);
    
    const handler = streamHandlers.current.get(requestId);
    if (handler?.onError) {
      handler.onError(error);
    }
    
    // Clean up handler
    streamHandlers.current.delete(requestId);
  }, []);

  const handleThinking = useCallback((data) => {
    const { thinking } = data;
    setIsThinking(true);
    setThinkingMessage(thinking);
  }, []);

  const handleCommandResult = useCallback((data) => {
    const { requestId, result } = data;
    
    const handler = commandHandlers.current.get(requestId);
    if (handler?.onSuccess) {
      handler.onSuccess(result);
    }
    
    // Clean up handler
    commandHandlers.current.delete(requestId);
  }, []);

  const handleCommandError = useCallback((data) => {
    const { requestId, error } = data;
    
    const handler = commandHandlers.current.get(requestId);
    if (handler?.onError) {
      handler.onError(error);
    }
    
    // Clean up handler
    commandHandlers.current.delete(requestId);
  }, []);

  // AI interaction methods
  const streamResponse = useCallback((prompt, options = {}) => {
    if (!isConnected) {
      throw new Error('WebSocket not connected');
    }

    const {
      context = [],
      model = currentModel,
      temperature = 0.7,
      maxTokens = 2048,
      simulateTyping = true,
      onStart,
      onToken,
      onComplete,
      onError
    } = options;

    const requestId = requestAIStream(prompt, context, {
      model,
      temperature,
      maxTokens,
      simulateTyping
    });

    // Register handlers
    streamHandlers.current.set(requestId, {
      onStart,
      onToken,
      onComplete,
      onError
    });

    return requestId;
  }, [isConnected, currentModel, requestAIStream]);

  const executeCommand = useCallback((command, args = {}, context = {}) => {
    if (!isConnected) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const requestId = sendAICommand(command, args, context);

      // Register handlers
      commandHandlers.current.set(requestId, {
        onSuccess: resolve,
        onError: reject
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (commandHandlers.current.has(requestId)) {
          commandHandlers.current.delete(requestId);
          reject(new Error('Command timeout'));
        }
      }, 30000);
    });
  }, [isConnected, sendAICommand]);

  // Chat methods
  const sendChatMessage = useCallback((message, options = {}) => {
    const userMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    // Add user message to history
    setChatHistory(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Prepare AI response placeholder
    const aiMessage = {
      id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      streaming: true
    };

    setChatHistory(prev => [...prev, aiMessage]);

    // Send stream request
    const requestId = streamResponse(message, {
      context: chatHistory.slice(-10), // Last 10 messages for context
      simulateTyping: true,
      ...options,
      onToken: (token, typing) => {
        setChatHistory(prev => prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: msg.content + token }
            : msg
        ));
        options.onToken?.(token, typing);
      },
      onComplete: (response, metadata) => {
        setChatHistory(prev => prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: response, streaming: false, metadata }
            : msg
        ));
        setIsTyping(false);
        options.onComplete?.(response, metadata);
      },
      onError: (error) => {
        setChatHistory(prev => prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: `Error: ${error}`, streaming: false, error: true }
            : msg
        ));
        setIsTyping(false);
        options.onError?.(error);
      }
    });

    return requestId;
  }, [streamResponse, chatHistory]);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  // Code assistance methods
  const explainCode = useCallback(async (code, language = 'javascript') => {
    return executeCommand('/explain', { code, language });
  }, [executeCommand]);

  const fixCode = useCallback(async (code, error, language = 'javascript') => {
    return executeCommand('/fix', { code, error, language });
  }, [executeCommand]);

  const refactorCode = useCallback(async (code, goal, language = 'javascript') => {
    return executeCommand('/refactor', { code, goal, language });
  }, [executeCommand]);

  const generateCode = useCallback(async (description, language = 'javascript', framework = null) => {
    return executeCommand('/generate', { description, language, framework });
  }, [executeCommand]);

  const generateTests = useCallback(async (code, language = 'javascript', testFramework = 'jest') => {
    return executeCommand('/test', { code, language, testFramework });
  }, [executeCommand]);

  const optimizeCode = useCallback(async (code, optimizationGoal, language = 'javascript') => {
    return executeCommand('/optimize', { code, optimizationGoal, language });
  }, [executeCommand]);

  const documentCode = useCallback(async (code, language = 'javascript', style = 'JSDoc') => {
    return executeCommand('/document', { code, language, style });
  }, [executeCommand]);

  // Utility methods
  const stopStreaming = useCallback(() => {
    if (currentStreamId) {
      streamHandlers.current.delete(currentStreamId);
      setIsStreaming(false);
      setCurrentStreamId(null);
      setStreamBuffer('');
      setIsThinking(false);
    }
  }, [currentStreamId]);

  const value = {
    // State
    isStreaming,
    currentStreamId,
    streamBuffer,
    isThinking,
    thinkingMessage,
    availableModels,
    currentModel,
    chatHistory,
    isTyping,
    
    // Configuration
    setCurrentModel,
    
    // Core methods
    streamResponse,
    executeCommand,
    stopStreaming,
    
    // Chat methods
    sendChatMessage,
    clearChatHistory,
    
    // Code assistance methods
    explainCode,
    fixCode,
    refactorCode,
    generateCode,
    generateTests,
    optimizeCode,
    documentCode,
    
    // Utility
    loadAvailableModels
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};