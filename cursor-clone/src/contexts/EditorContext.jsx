import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './WebSocketContext';
import { useFileSystem } from './FileSystemContext';

const EditorContext = createContext();

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};

export const EditorProvider = ({ children }) => {
  const { isConnected, subscribe, joinRoom, leaveRoom, updateCursor, sendTextChange } = useWebSocket();
  const { readFile, writeFile, startWatching, stopWatching } = useFileSystem();
  
  // Editor state
  const [activeTab, setActiveTab] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [editorInstances, setEditorInstances] = useState(new Map());
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [roomId, setRoomId] = useState(null);
  
  // Editor settings
  const [theme, setTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState('on');
  const [minimap, setMinimap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState('on');
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveDelay, setAutoSaveDelay] = useState(1000);
  
  // Editor refs
  const monacoRef = useRef(null);
  const editorRef = useRef(null);
  const autoSaveTimers = useRef(new Map());
  const pendingChanges = useRef(new Map());
  const versionCounter = useRef(0);

  // Subscribe to collaboration events
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribes = [
      subscribe('room_joined', handleRoomJoined),
      subscribe('user_joined', handleUserJoined),
      subscribe('user_left', handleUserLeft),
      subscribe('cursor_update', handleCursorUpdate),
      subscribe('text_change', handleTextChange)
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [isConnected]);

  const handleRoomJoined = useCallback((data) => {
    const { roomId, clients } = data;
    setRoomId(roomId);
    setIsCollaborating(true);
    setCollaborators(clients.filter(c => c.id !== data.clientId));
  }, []);

  const handleUserJoined = useCallback((data) => {
    const { clientId } = data;
    setCollaborators(prev => [...prev, { id: clientId, cursor: null, selection: null }]);
  }, []);

  const handleUserLeft = useCallback((data) => {
    const { clientId } = data;
    setCollaborators(prev => prev.filter(c => c.id !== clientId));
  }, []);

  const handleCursorUpdate = useCallback((data) => {
    const { clientId, cursor, selection } = data;
    setCollaborators(prev => prev.map(c => 
      c.id === clientId 
        ? { ...c, cursor, selection }
        : c
    ));
  }, []);

  const handleTextChange = useCallback((data) => {
    const { clientId, changes, version } = data;
    
    // Apply remote changes to the editor
    if (editorRef.current && activeTab) {
      const model = editorRef.current.getModel();
      if (model) {
        // Apply changes without triggering our own change event
        model.applyEdits(changes);
      }
    }
  }, [activeTab]);

  // Tab management
  const openFile = useCallback(async (filePath, options = {}) => {
    try {
      // Check if file is already open
      const existingTab = tabs.find(tab => tab.path === filePath);
      if (existingTab) {
        setActiveTab(existingTab.id);
        return existingTab;
      }

      // Read file content
      const fileData = await readFile(filePath);
      
      // Create new tab
      const tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newTab = {
        id: tabId,
        path: filePath,
        name: filePath.split('/').pop(),
        content: fileData.content,
        language: fileData.language,
        isDirty: false,
        isNew: options.isNew || false,
        lastSaved: fileData.modified,
        ...options
      };

      setTabs(prev => [...prev, newTab]);
      setActiveTab(tabId);
      
      // Start watching file for changes
      startWatching(filePath);
      
      return newTab;
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  }, [tabs, readFile, startWatching]);

  const closeTab = useCallback((tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Stop watching file
    stopWatching(tab.path);
    
    // Clear auto-save timer
    if (autoSaveTimers.current.has(tabId)) {
      clearTimeout(autoSaveTimers.current.get(tabId));
      autoSaveTimers.current.delete(tabId);
    }
    
    // Remove from pending changes
    pendingChanges.current.delete(tabId);
    
    // Remove editor instance
    setEditorInstances(prev => {
      const updated = new Map(prev);
      updated.delete(tabId);
      return updated;
    });

    // Remove tab
    setTabs(prev => {
      const updated = prev.filter(t => t.id !== tabId);
      
      // If closing active tab, switch to another tab
      if (tabId === activeTab) {
        const currentIndex = prev.findIndex(t => t.id === tabId);
        if (updated.length > 0) {
          const nextTab = updated[Math.min(currentIndex, updated.length - 1)];
          setActiveTab(nextTab.id);
        } else {
          setActiveTab(null);
        }
      }
      
      return updated;
    });
  }, [tabs, activeTab, stopWatching]);

  const saveFile = useCallback(async (tabId = activeTab) => {
    if (!tabId) return;
    
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      await writeFile(tab.path, tab.content);
      
      // Update tab state
      setTabs(prev => prev.map(t => 
        t.id === tabId 
          ? { ...t, isDirty: false, lastSaved: new Date() }
          : t
      ));
      
      // Clear pending changes
      pendingChanges.current.delete(tabId);
      
      // Clear auto-save timer
      if (autoSaveTimers.current.has(tabId)) {
        clearTimeout(autoSaveTimers.current.get(tabId));
        autoSaveTimers.current.delete(tabId);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  }, [activeTab, tabs, writeFile]);

  const saveAllFiles = useCallback(async () => {
    const dirtyTabs = tabs.filter(tab => tab.isDirty);
    const results = await Promise.allSettled(
      dirtyTabs.map(tab => saveFile(tab.id))
    );
    
    return results;
  }, [tabs, saveFile]);

  // Editor content management
  const updateTabContent = useCallback((tabId, content, triggerChange = true) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId 
        ? { ...t, content, isDirty: true }
        : t
    ));
    
    if (triggerChange && isCollaborating) {
      // Send change to collaborators
      const version = ++versionCounter.current;
      const changes = [{ content }]; // Simplified - in real implementation, use proper diff
      sendTextChange(changes, version);
    }
    
    // Handle auto-save
    if (autoSave) {
      // Clear existing timer
      if (autoSaveTimers.current.has(tabId)) {
        clearTimeout(autoSaveTimers.current.get(tabId));
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        saveFile(tabId);
      }, autoSaveDelay);
      
      autoSaveTimers.current.set(tabId, timer);
    }
  }, [isCollaborating, sendTextChange, autoSave, autoSaveDelay, saveFile]);

  // Monaco Editor integration
  const registerEditor = useCallback((tabId, editor, monaco) => {
    monacoRef.current = monaco;
    editorRef.current = editor;
    
    setEditorInstances(prev => {
      const updated = new Map(prev);
      updated.set(tabId, { editor, monaco });
      return updated;
    });
    
    // Set up editor event listeners
    editor.onDidChangeModelContent((e) => {
      const content = editor.getValue();
      updateTabContent(tabId, content, true);
    });
    
    editor.onDidChangeCursorPosition((e) => {
      if (isCollaborating) {
        updateCursor(e.position, editor.getSelection());
      }
    });
    
    editor.onDidChangeCursorSelection((e) => {
      if (isCollaborating) {
        updateCursor(editor.getPosition(), e.selection);
      }
    });
  }, [updateTabContent, isCollaborating, updateCursor]);

  // Collaboration methods
  const startCollaboration = useCallback((roomId) => {
    if (isConnected) {
      joinRoom(roomId);
    }
  }, [isConnected, joinRoom]);

  const stopCollaboration = useCallback(() => {
    if (isConnected && isCollaborating) {
      leaveRoom();
      setIsCollaborating(false);
      setCollaborators([]);
      setRoomId(null);
    }
  }, [isConnected, isCollaborating, leaveRoom]);

  // Editor commands
  const executeCommand = useCallback((commandId, ...args) => {
    if (editorRef.current) {
      return editorRef.current.trigger('keyboard', commandId, args);
    }
  }, []);

  const insertText = useCallback((text, position = null) => {
    if (editorRef.current) {
      const pos = position || editorRef.current.getPosition();
      editorRef.current.executeEdits('insert-text', [{
        range: new monacoRef.current.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
        text
      }]);
    }
  }, []);

  const replaceText = useCallback((range, text) => {
    if (editorRef.current && monacoRef.current) {
      editorRef.current.executeEdits('replace-text', [{
        range: new monacoRef.current.Range(
          range.startLineNumber,
          range.startColumn,
          range.endLineNumber,
          range.endColumn
        ),
        text
      }]);
    }
  }, []);

  const getSelectedText = useCallback(() => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      return editorRef.current.getModel().getValueInRange(selection);
    }
    return '';
  }, []);

  const getCurrentPosition = useCallback(() => {
    return editorRef.current ? editorRef.current.getPosition() : null;
  }, []);

  const goToLine = useCallback((lineNumber) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(lineNumber);
      editorRef.current.setPosition({ lineNumber, column: 1 });
    }
  }, []);

  // Utility methods
  const getActiveTab = useCallback(() => {
    return tabs.find(tab => tab.id === activeTab) || null;
  }, [tabs, activeTab]);

  const getDirtyTabs = useCallback(() => {
    return tabs.filter(tab => tab.isDirty);
  }, [tabs]);

  const hasUnsavedChanges = useCallback(() => {
    return tabs.some(tab => tab.isDirty);
  }, [tabs]);

  const getTabById = useCallback((tabId) => {
    return tabs.find(tab => tab.id === tabId) || null;
  }, [tabs]);

  const getTabByPath = useCallback((path) => {
    return tabs.find(tab => tab.path === path) || null;
  }, [tabs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all auto-save timers
      autoSaveTimers.current.forEach(timer => clearTimeout(timer));
      autoSaveTimers.current.clear();
      
      // Stop collaboration
      if (isCollaborating) {
        stopCollaboration();
      }
    };
  }, []);

  const value = {
    // State
    activeTab,
    tabs,
    editorInstances,
    isCollaborating,
    collaborators,
    roomId,
    
    // Settings
    theme,
    fontSize,
    wordWrap,
    minimap,
    lineNumbers,
    autoSave,
    autoSaveDelay,
    
    // Tab management
    openFile,
    closeTab,
    saveFile,
    saveAllFiles,
    setActiveTab,
    
    // Content management
    updateTabContent,
    
    // Monaco integration
    registerEditor,
    monacoRef,
    editorRef,
    
    // Collaboration
    startCollaboration,
    stopCollaboration,
    
    // Editor commands
    executeCommand,
    insertText,
    replaceText,
    getSelectedText,
    getCurrentPosition,
    goToLine,
    
    // Settings
    setTheme,
    setFontSize,
    setWordWrap,
    setMinimap,
    setLineNumbers,
    setAutoSave,
    setAutoSaveDelay,
    
    // Utility
    getActiveTab,
    getDirtyTabs,
    hasUnsavedChanges,
    getTabById,
    getTabByPath
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};