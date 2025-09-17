import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EditorProvider } from './contexts/EditorContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { AIProvider } from './contexts/AIContext';
import { FileSystemProvider } from './contexts/FileSystemContext';
import { GitProvider } from './contexts/GitContext';
import { ThemeProvider } from './contexts/ThemeContext';

import MainLayout from './components/layout/MainLayout';
import LoadingScreen from './components/ui/LoadingScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    // Initialize the application
    const initializeApp = async () => {
      try {
        // Simulate initialization process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if backend is available
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error('Backend service unavailable');
        }
        
        const healthData = await response.json();
        console.log('Backend health:', healthData);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('App initialization failed:', error);
        setInitError(error.message);
      }
    };

    initializeApp();
  }, []);

  if (initError) {
    return (
      <div className="flex items-center justify-center h-screen bg-vscode-bg text-vscode-text">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Initialization Failed</h1>
          <p className="text-vscode-text-secondary mb-4">{initError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-vscode-accent hover:bg-vscode-accent-hover rounded text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WebSocketProvider>
          <FileSystemProvider>
            <GitProvider>
              <AIProvider>
                <EditorProvider>
                  <Router>
                    <div className="h-screen w-screen overflow-hidden bg-vscode-bg text-vscode-text">
                      <Routes>
                        <Route path="/" element={<MainLayout />} />
                        <Route path="/project/:projectId" element={<MainLayout />} />
                        <Route path="/file/*" element={<MainLayout />} />
                        <Route path="*" element={<MainLayout />} />
                      </Routes>
                    </div>
                  </Router>
                </EditorProvider>
              </AIProvider>
            </GitProvider>
          </FileSystemProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;