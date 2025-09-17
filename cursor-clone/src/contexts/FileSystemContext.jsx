import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';

const FileSystemContext = createContext();

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};

export const FileSystemProvider = ({ children }) => {
  const { isConnected, subscribe, watchFile, unwatchFile } = useWebSocket();
  
  const [currentDirectory, setCurrentDirectory] = useState('.');
  const [directoryContents, setDirectoryContents] = useState([]);
  const [openFiles, setOpenFiles] = useState(new Map());
  const [watchedFiles, setWatchedFiles] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectAnalysis, setProjectAnalysis] = useState(null);

  // Subscribe to file change events
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('file_change', handleFileChange);
    return unsubscribe;
  }, [isConnected, subscribe]);

  const handleFileChange = useCallback((data) => {
    const { path, event, filename } = data;
    console.log('File change detected:', { path, event, filename });
    
    // Update file in openFiles if it's currently open
    if (openFiles.has(path)) {
      refreshFile(path);
    }
    
    // Refresh directory contents if a file in current directory changed
    if (path.startsWith(currentDirectory)) {
      refreshDirectory();
    }
  }, [openFiles, currentDirectory]);

  // API methods
  const apiRequest = useCallback(async (endpoint, options = {}) => {
    try {
      const response = await fetch(`/api/files${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File system API error:', error);
      throw error;
    }
  }, []);

  // Directory operations
  const readDirectory = useCallback(async (path = '.') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await apiRequest(`/${path}?type=directory`);
      setDirectoryContents(data.items || []);
      setCurrentDirectory(path);
      
      return data.items || [];
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  const refreshDirectory = useCallback(() => {
    return readDirectory(currentDirectory);
  }, [currentDirectory, readDirectory]);

  const createDirectory = useCallback(async (path) => {
    try {
      await apiRequest(`/directories/${path}`, {
        method: 'POST'
      });
      
      // Refresh current directory if the new directory is in it
      if (path.startsWith(currentDirectory)) {
        refreshDirectory();
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, currentDirectory, refreshDirectory]);

  // File operations
  const readFile = useCallback(async (path) => {
    try {
      const data = await apiRequest(`/${path}`);
      
      // Cache the file content
      setOpenFiles(prev => new Map(prev).set(path, {
        ...data,
        lastRead: new Date()
      }));
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  const writeFile = useCallback(async (path, content, options = {}) => {
    try {
      const data = await apiRequest(`/${path}`, {
        method: 'PUT',
        body: JSON.stringify({ content, options })
      });
      
      // Update cached file content
      setOpenFiles(prev => {
        const updated = new Map(prev);
        if (updated.has(path)) {
          updated.set(path, {
            ...updated.get(path),
            content,
            size: data.size,
            modified: data.modified,
            lastWrite: new Date()
          });
        }
        return updated;
      });
      
      // Refresh directory if file is in current directory
      if (path.startsWith(currentDirectory)) {
        refreshDirectory();
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, currentDirectory, refreshDirectory]);

  const deleteFile = useCallback(async (path) => {
    try {
      await apiRequest(`/${path}`, {
        method: 'DELETE'
      });
      
      // Remove from cache
      setOpenFiles(prev => {
        const updated = new Map(prev);
        updated.delete(path);
        return updated;
      });
      
      // Stop watching if was watched
      if (watchedFiles.has(path)) {
        unwatchFile(path);
        setWatchedFiles(prev => {
          const updated = new Set(prev);
          updated.delete(path);
          return updated;
        });
      }
      
      // Refresh directory
      if (path.startsWith(currentDirectory)) {
        refreshDirectory();
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, currentDirectory, refreshDirectory, watchedFiles, unwatchFile]);

  const refreshFile = useCallback(async (path) => {
    try {
      const data = await readFile(path);
      return data;
    } catch (error) {
      console.error('Failed to refresh file:', error);
      throw error;
    }
  }, [readFile]);

  // File watching
  const startWatching = useCallback((path) => {
    if (!watchedFiles.has(path)) {
      watchFile(path);
      setWatchedFiles(prev => new Set(prev).add(path));
    }
  }, [watchFile, watchedFiles]);

  const stopWatching = useCallback((path) => {
    if (watchedFiles.has(path)) {
      unwatchFile(path);
      setWatchedFiles(prev => {
        const updated = new Set(prev);
        updated.delete(path);
        return updated;
      });
    }
  }, [unwatchFile, watchedFiles]);

  // Search operations
  const searchFiles = useCallback(async (query, options = {}) => {
    try {
      const data = await apiRequest('/search', {
        method: 'POST',
        body: JSON.stringify({
          query,
          directory: options.directory || currentDirectory,
          extensions: options.extensions || [],
          includeContent: options.includeContent || false,
          caseSensitive: options.caseSensitive || false,
          maxResults: options.maxResults || 100
        })
      });
      
      return data.results || [];
    } catch (error) {
      throw error;
    }
  }, [apiRequest, currentDirectory]);

  // Batch operations
  const batchOperation = useCallback(async (operations) => {
    try {
      const data = await apiRequest('/batch', {
        method: 'POST',
        body: JSON.stringify({ operations })
      });
      
      // Refresh directory after batch operations
      refreshDirectory();
      
      return data.results || [];
    } catch (error) {
      throw error;
    }
  }, [apiRequest, refreshDirectory]);

  // Project analysis
  const analyzeProject = useCallback(async (rootPath = '.') => {
    try {
      const data = await apiRequest(`/analysis/project?path=${encodeURIComponent(rootPath)}`);
      setProjectAnalysis(data);
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  // File statistics
  const getFileStats = useCallback(async (path) => {
    try {
      const data = await apiRequest(`/stats/${path}`);
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  // Utility methods
  const getFileContent = useCallback((path) => {
    const file = openFiles.get(path);
    return file?.content || null;
  }, [openFiles]);

  const isFileOpen = useCallback((path) => {
    return openFiles.has(path);
  }, [openFiles]);

  const getOpenFiles = useCallback(() => {
    return Array.from(openFiles.entries()).map(([path, file]) => ({
      path,
      ...file
    }));
  }, [openFiles]);

  const closeFile = useCallback((path) => {
    setOpenFiles(prev => {
      const updated = new Map(prev);
      updated.delete(path);
      return updated;
    });
    
    // Stop watching if no longer needed
    stopWatching(path);
  }, [stopWatching]);

  const getFileIcon = useCallback((file) => {
    if (file.type === 'directory') {
      return '📁';
    }
    
    const iconMap = {
      '.js': '🟨',
      '.jsx': '⚛️',
      '.ts': '🔷',
      '.tsx': '⚛️',
      '.html': '🌐',
      '.css': '🎨',
      '.scss': '🎨',
      '.json': '📄',
      '.md': '📝',
      '.py': '🐍',
      '.java': '☕',
      '.cpp': '⚙️',
      '.c': '⚙️',
      '.go': '🐹',
      '.rs': '🦀',
      '.php': '🐘',
      '.rb': '💎',
      '.swift': '🦉',
      '.kt': '🎯',
      '.vue': '💚',
      '.svelte': '🧡',
      '.sql': '🗄️',
      '.sh': '🐚',
      '.yml': '📋',
      '.yaml': '📋',
      '.toml': '📋',
      '.xml': '📄',
      '.svg': '🖼️',
      '.png': '🖼️',
      '.jpg': '🖼️',
      '.jpeg': '🖼️',
      '.gif': '🖼️',
      '.ico': '🖼️',
      '.pdf': '📕',
      '.txt': '📄',
      '.log': '📜',
      '.env': '🔐',
      '.gitignore': '🚫',
      '.gitattributes': '📋',
      'package.json': '📦',
      'package-lock.json': '🔒',
      'yarn.lock': '🧶',
      'Dockerfile': '🐳',
      'docker-compose.yml': '🐳',
      'README.md': '📖'
    };
    
    // Check specific filenames first
    if (iconMap[file.name]) {
      return iconMap[file.name];
    }
    
    // Then check extensions
    if (file.extension && iconMap[file.extension]) {
      return iconMap[file.extension];
    }
    
    return '📄';
  }, []);

  // Initialize by loading current directory
  useEffect(() => {
    readDirectory('.');
  }, []);

  const value = {
    // State
    currentDirectory,
    directoryContents,
    openFiles,
    watchedFiles,
    isLoading,
    error,
    projectAnalysis,
    
    // Directory operations
    readDirectory,
    refreshDirectory,
    createDirectory,
    
    // File operations
    readFile,
    writeFile,
    deleteFile,
    refreshFile,
    closeFile,
    
    // File watching
    startWatching,
    stopWatching,
    
    // Search and analysis
    searchFiles,
    analyzeProject,
    getFileStats,
    
    // Batch operations
    batchOperation,
    
    // Utility methods
    getFileContent,
    isFileOpen,
    getOpenFiles,
    getFileIcon,
    
    // Navigation
    setCurrentDirectory
  };

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
};