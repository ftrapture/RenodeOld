import React, { useState, useEffect } from 'react';

const LoadingScreen = ({ 
  title = "Enhanced Cursor Editor",
  subtitle = "Loading AI-powered development environment...",
  progress = null,
  messages = [
    "Initializing Monaco Editor...",
    "Connecting to WebSocket...",
    "Loading AI services...",
    "Setting up file system...",
    "Preparing Git integration...",
    "Almost ready..."
  ]
}) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    if (progress === null) {
      // Auto-progress through messages
      const interval = setInterval(() => {
        setCurrentMessage(prev => (prev + 1) % messages.length);
        setCurrentProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 800);

      return () => clearInterval(interval);
    } else {
      setCurrentProgress(progress);
    }
  }, [progress, messages.length]);

  return (
    <div className="fixed inset-0 bg-vscode-bg flex flex-col items-center justify-center z-50">
      {/* Logo */}
      <div className="mb-8 relative">
        <div className="w-16 h-16 bg-gradient-to-br from-vscode-accent to-blue-400 rounded-xl flex items-center justify-center shadow-glow animate-pulse-slow">
          <span className="text-2xl font-bold text-white">⚡</span>
        </div>
        
        {/* Animated rings */}
        <div className="absolute inset-0 rounded-xl border-2 border-vscode-accent opacity-30 animate-ping"></div>
        <div className="absolute inset-0 rounded-xl border-2 border-blue-400 opacity-20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-vscode-text mb-2 animate-fade-in">
        {title}
      </h1>

      {/* Subtitle */}
      <p className="text-vscode-text-secondary mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {subtitle}
      </p>

      {/* Current loading message */}
      <div className="h-6 mb-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <p className="text-sm text-vscode-text-secondary animate-slide-up">
          {messages[currentMessage]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-vscode-border rounded-full overflow-hidden animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <div 
          className="h-full bg-gradient-to-r from-vscode-accent to-blue-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${currentProgress}%` }}
        ></div>
      </div>

      {/* Progress percentage */}
      <div className="mt-2 text-xs text-vscode-text-secondary animate-fade-in" style={{ animationDelay: '0.8s' }}>
        {Math.round(currentProgress)}%
      </div>

      {/* Feature highlights */}
      <div className="mt-12 grid grid-cols-3 gap-8 text-center animate-fade-in" style={{ animationDelay: '1s' }}>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-vscode-bg-secondary rounded-lg flex items-center justify-center mb-2">
            <span className="text-lg">🤖</span>
          </div>
          <span className="text-xs text-vscode-text-secondary">AI Assistant</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-vscode-bg-secondary rounded-lg flex items-center justify-center mb-2">
            <span className="text-lg">⚡</span>
          </div>
          <span className="text-xs text-vscode-text-secondary">Stream Typing</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-vscode-bg-secondary rounded-lg flex items-center justify-center mb-2">
            <span className="text-lg">🔗</span>
          </div>
          <span className="text-xs text-vscode-text-secondary">Collaboration</span>
        </div>
      </div>

      {/* Loading dots */}
      <div className="mt-8 flex space-x-1 animate-fade-in" style={{ animationDelay: '1.2s' }}>
        <div className="w-2 h-2 bg-vscode-accent rounded-full animate-thinking"></div>
        <div className="w-2 h-2 bg-vscode-accent rounded-full animate-thinking" style={{ animationDelay: '0.16s' }}></div>
        <div className="w-2 h-2 bg-vscode-accent rounded-full animate-thinking" style={{ animationDelay: '0.32s' }}></div>
      </div>
    </div>
  );
};

export default LoadingScreen;