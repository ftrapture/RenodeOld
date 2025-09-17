import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

// Import sidebar views
import ExplorerView from '../sidebar/ExplorerView';
import SearchView from '../sidebar/SearchView';
import GitView from '../sidebar/GitView';
import DebugView from '../sidebar/DebugView';
import ExtensionsView from '../sidebar/ExtensionsView';
import AIChatView from '../sidebar/AIChatView';
import AIAssistantView from '../sidebar/AIAssistantView';
import TerminalView from '../sidebar/TerminalView';
import SettingsView from '../sidebar/SettingsView';

const SideBar = ({ activeView, width, onWidthChange, onClose }) => {
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const minWidth = 200;
  const maxWidth = 600;

  // Handle mouse down on resize handle
  const handleMouseDown = (e) => {
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX.current;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + deltaX));
    onWidthChange(newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Restore cursor and text selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const getViewTitle = () => {
    const titles = {
      explorer: 'Explorer',
      search: 'Search',
      git: 'Source Control',
      debug: 'Run and Debug',
      extensions: 'Extensions',
      'ai-chat': 'AI Chat',
      'ai-assistant': 'AI Assistant',
      terminal: 'Terminal',
      settings: 'Settings'
    };
    return titles[activeView] || 'Unknown';
  };

  const renderView = () => {
    switch (activeView) {
      case 'explorer':
        return <ExplorerView />;
      case 'search':
        return <SearchView />;
      case 'git':
        return <GitView />;
      case 'debug':
        return <DebugView />;
      case 'extensions':
        return <ExtensionsView />;
      case 'ai-chat':
        return <AIChatView />;
      case 'ai-assistant':
        return <AIAssistantView />;
      case 'terminal':
        return <TerminalView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-vscode-text-secondary">
            <div className="text-center">
              <div className="text-4xl mb-4">🚧</div>
              <div>View not implemented yet</div>
              <div className="text-sm mt-2">Coming soon!</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div 
      ref={sidebarRef}
      className="bg-vscode-bg-secondary border-r border-vscode-border flex flex-col relative"
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-vscode-border bg-vscode-bg-tertiary">
        <span className="text-sm font-medium text-vscode-text truncate">
          {getViewTitle()}
        </span>
        
        <div className="flex items-center space-x-1">
          {/* Collapse button */}
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center hover:bg-vscode-border rounded text-vscode-text-secondary hover:text-vscode-text transition-colors"
            title="Hide Sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderView()}
      </div>
      
      {/* Resize handle */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-vscode-accent/30 transition-colors ${
          isResizing ? 'bg-vscode-accent/50' : ''
        }`}
        onMouseDown={handleMouseDown}
        title="Resize Sidebar"
      />
      
      {/* Resize indicator */}
      {isResizing && (
        <div className="absolute top-0 right-0 w-0.5 h-full bg-vscode-accent pointer-events-none" />
      )}
    </div>
  );
};

export default SideBar;