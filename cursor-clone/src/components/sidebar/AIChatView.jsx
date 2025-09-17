import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../../contexts/AIContext';
import { Send, Bot, User, Loader } from 'lucide-react';

const AIChatView = () => {
  const { chatHistory, sendChatMessage, isTyping, clearChatHistory } = useAI();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

  const handleSendMessage = async () => {
    if (!message.trim() || isTyping) return;
    
    const messageText = message.trim();
    setMessage('');
    
    try {
      await sendChatMessage(messageText);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    clearChatHistory();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-vscode-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot size={16} className="text-vscode-accent" />
            <span className="text-sm font-medium text-vscode-text">AI Chat</span>
          </div>
          
          {chatHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs text-vscode-text-secondary hover:text-vscode-text px-2 py-1 rounded hover:bg-vscode-border transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">🤖</div>
            <div className="text-sm text-vscode-text-secondary mb-2">Start a conversation</div>
            <div className="text-xs text-vscode-text-secondary">
              Ask me anything about coding, debugging, or development
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map((msg) => (
              <div key={msg.id} className={`flex space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' 
                    ? 'bg-vscode-accent text-white' 
                    : 'bg-blue-500 text-white'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                
                {/* Message */}
                <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-full p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-vscode-accent text-white' 
                      : 'bg-vscode-bg-tertiary text-vscode-text'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                      {msg.streaming && <span className="stream-cursor" />}
                    </div>
                    
                    {msg.error && (
                      <div className="text-xs text-red-400 mt-1">
                        Failed to send message
                      </div>
                    )}
                  </div>
                  
                  <div className={`text-xs text-vscode-text-secondary mt-1 ${
                    msg.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
                  <Bot size={16} />
                </div>
                <div className="flex-1">
                  <div className="inline-block p-3 rounded-lg bg-vscode-bg-tertiary text-vscode-text">
                    <div className="flex items-center space-x-2">
                      <Loader size={14} className="animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-3 border-t border-vscode-border">
        <div className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI anything..."
            disabled={isTyping}
            className="flex-1 px-3 py-2 bg-vscode-bg border border-vscode-border rounded text-sm text-vscode-text placeholder-vscode-text-secondary resize-none focus:outline-none focus:border-vscode-accent disabled:opacity-50"
            rows="2"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isTyping}
            className="px-3 py-2 bg-vscode-accent hover:bg-vscode-accent-hover disabled:bg-vscode-border disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        
        <div className="text-xs text-vscode-text-secondary mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default AIChatView;