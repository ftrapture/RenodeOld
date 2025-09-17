import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useFileSystem } from '../../contexts/FileSystemContext';

// Layout components
import TitleBar from './TitleBar';
import ActivityBar from './ActivityBar';
import SideBar from './SideBar';
import EditorArea from './EditorArea';
import Panel from './Panel';
import StatusBar from './StatusBar';

// UI components
import ConnectionStatus from '../ui/ConnectionStatus';
import NotificationToast from '../ui/NotificationToast';

const MainLayout = () => {
  const { theme } = useTheme();
  const { isConnected } = useWebSocket();
  const { isLoading } = useFileSystem();
  
  const [activeView, setActiveView] = useState('explorer');
  const [sideBarVisible, setSideBarVisible] = useState(true);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelPosition, setPanelPosition] = useState('bottom');
  const [sideBarWidth, setSideBarWidth] = useState(240);
  const [panelHeight, setPanelHeight] = useState(200);
  const [notifications, setNotifications] = useState([]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle sidebar (Ctrl/Cmd + B)
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSideBarVisible(prev => !prev);
      }
      
      // Toggle panel (Ctrl/Cmd + `)
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setPanelVisible(prev => !prev);
      }
      
      // Toggle terminal (Ctrl/Cmd + Shift + `)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '~') {
        e.preventDefault();
        setPanelVisible(true);
        setActiveView('terminal');
      }
      
      // Quick Open (Ctrl/Cmd + P)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        // TODO: Implement quick open
      }
      
      // Command Palette (Ctrl/Cmd + Shift + P)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        // TODO: Implement command palette
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add notification helper
  const addNotification = (notification) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
    
    // Auto-remove after delay
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, notification.duration || 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Show connection status notification
  useEffect(() => {
    if (!isConnected) {
      addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Attempting to reconnect to server...',
        duration: 0 // Persistent until connected
      });
    } else {
      // Remove connection notifications when connected
      setNotifications(prev => prev.filter(n => 
        !(n.title === 'Connection Lost' || n.title === 'Connected')
      ));
      
      addNotification({
        type: 'success',
        title: 'Connected',
        message: 'Successfully connected to Enhanced Cursor Editor server',
        duration: 3000
      });
    }
  }, [isConnected]);

  return (
    <div className="h-screen w-screen flex flex-col bg-vscode-bg text-vscode-text overflow-hidden">
      {/* Title Bar */}
      <TitleBar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar 
          activeView={activeView}
          onViewChange={setActiveView}
        />
        
        {/* Sidebar */}
        {sideBarVisible && (
          <SideBar
            activeView={activeView}
            width={sideBarWidth}
            onWidthChange={setSideBarWidth}
            onClose={() => setSideBarVisible(false)}
          />
        )}
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorArea />
          
          {/* Panel */}
          {panelVisible && (
            <Panel
              position={panelPosition}
              height={panelHeight}
              onHeightChange={setPanelHeight}
              onPositionChange={setPanelPosition}
              onClose={() => setPanelVisible(false)}
            />
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <StatusBar 
        onToggleSideBar={() => setSideBarVisible(prev => !prev)}
        onTogglePanel={() => setPanelVisible(prev => !prev)}
      />
      
      {/* Connection Status Indicator */}
      <ConnectionStatus />
      
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            {...notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-vscode-bg-secondary rounded-lg p-6 border border-vscode-border">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-vscode-accent"></div>
              <span className="text-vscode-text">Loading...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;