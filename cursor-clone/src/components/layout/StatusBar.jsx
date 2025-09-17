import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useGit } from '../../contexts/GitContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { GitBranch, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

const StatusBar = ({ onToggleSideBar, onTogglePanel }) => {
  const { getActiveTab, hasUnsavedChanges } = useEditor();
  const { isRepo, branches, hasChanges } = useGit();
  const { isConnected, reconnectAttempts, maxReconnectAttempts } = useWebSocket();
  const { currentTheme, toggleThemeType } = useTheme();
  
  const activeTab = getActiveTab();

  const getConnectionStatus = () => {
    if (isConnected) {
      return { icon: Wifi, text: 'Connected', color: 'text-green-400' };
    } else if (reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts) {
      return { icon: AlertCircle, text: `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`, color: 'text-yellow-400' };
    } else {
      return { icon: WifiOff, text: 'Disconnected', color: 'text-red-400' };
    }
  };

  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;

  return (
    <div className="h-6 bg-vscode-accent text-white flex items-center justify-between px-2 text-xs">
      {/* Left side */}
      <div className="flex items-center space-x-4">
        {/* Connection status */}
        <div className={`flex items-center space-x-1 ${connectionStatus.color}`}>
          <ConnectionIcon size={12} />
          <span>{connectionStatus.text}</span>
        </div>
        
        {/* Git branch */}
        {isRepo && branches?.current && (
          <div className="flex items-center space-x-1">
            <GitBranch size={12} />
            <span>{branches.current}</span>
            {hasChanges() && <span className="text-yellow-300">●</span>}
          </div>
        )}
        
        {/* Unsaved changes indicator */}
        {hasUnsavedChanges() && (
          <div className="flex items-center space-x-1 text-yellow-300">
            <span>●</span>
            <span>Unsaved changes</span>
          </div>
        )}
      </div>
      
      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* File info */}
        {activeTab && (
          <div className="flex items-center space-x-2">
            <span>{activeTab.language || 'Plain Text'}</span>
            {activeTab.content && (
              <span>
                Ln 1, Col 1
              </span>
            )}
          </div>
        )}
        
        {/* Theme toggle */}
        <button
          onClick={toggleThemeType}
          className="hover:bg-white/10 px-2 py-1 rounded transition-colors"
          title="Toggle Theme"
        >
          {currentTheme.includes('dark') ? '🌙' : '☀️'}
        </button>
        
        {/* Encoding */}
        <span>UTF-8</span>
        
        {/* End of line */}
        <span>LF</span>
        
        {/* Feedback */}
        <button 
          className="hover:bg-white/10 px-2 py-1 rounded transition-colors"
          title="Send Feedback"
        >
          😊
        </button>
      </div>
    </div>
  );
};

export default StatusBar;