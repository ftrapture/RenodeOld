import React from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

const ConnectionStatus = () => {
  const { isConnected, reconnectAttempts, maxReconnectAttempts } = useWebSocket();

  // Don't show anything if connected
  if (isConnected) {
    return null;
  }

  const isReconnecting = reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts;
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`
        flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg border
        ${isReconnecting 
          ? 'bg-yellow-500/90 border-yellow-400 text-yellow-900' 
          : 'bg-red-500/90 border-red-400 text-red-900'
        }
      `}>
        {isReconnecting ? (
          <>
            <AlertCircle size={16} className="animate-pulse" />
            <span className="text-sm font-medium">
              Reconnecting... ({reconnectAttempts}/{maxReconnectAttempts})
            </span>
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span className="text-sm font-medium">Connection lost</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;