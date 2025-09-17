import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useGit } from '../../contexts/GitContext';
import { useWebSocket } from '../../contexts/WebSocketContext';

const TitleBar = () => {
  const { getActiveTab, hasUnsavedChanges } = useEditor();
  const { isRepo, branches } = useGit();
  const { isConnected } = useWebSocket();
  
  const activeTab = getActiveTab();
  const currentBranch = branches?.current;
  
  const getTitle = () => {
    let title = 'Enhanced Cursor Editor';
    
    if (activeTab) {
      const fileName = activeTab.name;
      const isDirty = activeTab.isDirty ? '●' : '';
      title = `${isDirty}${fileName} - ${title}`;
    }
    
    return title;
  };

  const getProjectInfo = () => {
    const parts = [];
    
    if (isRepo && currentBranch) {
      parts.push(`⎇ ${currentBranch}`);
    }
    
    if (hasUnsavedChanges()) {
      parts.push('● Unsaved changes');
    }
    
    if (!isConnected) {
      parts.push('⚠ Offline');
    }
    
    return parts.join(' • ');
  };

  return (
    <div className="h-8 bg-vscode-bg-secondary border-b border-vscode-border flex items-center justify-between px-4 text-sm select-none">
      {/* Left side - Menu and title */}
      <div className="flex items-center space-x-4">
        {/* App icon and title */}
        <div className="flex items-center space-x-2">
          <span className="text-vscode-accent font-bold">⚡</span>
          <span className="text-vscode-text font-medium">
            {getTitle()}
          </span>
        </div>
        
        {/* Project info */}
        {getProjectInfo() && (
          <span className="text-vscode-text-secondary text-xs">
            {getProjectInfo()}
          </span>
        )}
      </div>
      
      {/* Right side - Window controls (placeholder for desktop app) */}
      <div className="flex items-center space-x-1">
        {/* Connection indicator */}
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} title={isConnected ? 'Connected' : 'Disconnected'} />
        
        {/* Window controls would go here in desktop version */}
        <div className="hidden">
          <button className="w-6 h-6 hover:bg-vscode-border rounded flex items-center justify-center">
            <span className="text-xs">−</span>
          </button>
          <button className="w-6 h-6 hover:bg-vscode-border rounded flex items-center justify-center">
            <span className="text-xs">□</span>
          </button>
          <button className="w-6 h-6 hover:bg-red-500 rounded flex items-center justify-center">
            <span className="text-xs">×</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;