import React, { useEffect, useState } from 'react';
import { useFileSystem } from '../../contexts/FileSystemContext';
import { useEditor } from '../../contexts/EditorContext';
import { 
  Folder, 
  FolderOpen, 
  File, 
  ChevronRight, 
  ChevronDown,
  Plus,
  RefreshCw,
  Search
} from 'lucide-react';

const ExplorerView = () => {
  const { 
    directoryContents, 
    currentDirectory, 
    readDirectory, 
    createDirectory,
    isLoading,
    error,
    getFileIcon
  } = useFileSystem();
  
  const { openFile } = useEditor();
  
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    // Load root directory on mount
    readDirectory('.');
  }, []);

  const handleItemClick = async (item) => {
    setSelectedItem(item.path);
    
    if (item.type === 'directory') {
      // Toggle folder expansion
      const newExpanded = new Set(expandedFolders);
      if (newExpanded.has(item.path)) {
        newExpanded.delete(item.path);
      } else {
        newExpanded.add(item.path);
      }
      setExpandedFolders(newExpanded);
    } else {
      // Open file
      try {
        await openFile(item.path);
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };

  const handleRefresh = () => {
    readDirectory(currentDirectory);
  };

  const renderFileIcon = (item) => {
    if (item.type === 'directory') {
      return expandedFolders.has(item.path) ? (
        <FolderOpen size={16} className="text-vscode-accent" />
      ) : (
        <Folder size={16} className="text-vscode-accent" />
      );
    }
    
    // Use emoji icons for files
    const emoji = getFileIcon(item);
    return <span className="text-sm">{emoji}</span>;
  };

  const renderItem = (item, level = 0) => {
    const isSelected = selectedItem === item.path;
    const isExpanded = expandedFolders.has(item.path);
    
    return (
      <div key={item.path}>
        <div
          className={`
            flex items-center px-2 py-1 cursor-pointer hover:bg-vscode-bg-tertiary
            ${isSelected ? 'bg-vscode-bg-tertiary border-l-2 border-vscode-accent' : ''}
          `}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => handleItemClick(item)}
          title={item.path}
        >
          {/* Chevron for directories */}
          {item.type === 'directory' && (
            <div className="w-4 flex justify-center mr-1">
              {isExpanded ? (
                <ChevronDown size={12} className="text-vscode-text-secondary" />
              ) : (
                <ChevronRight size={12} className="text-vscode-text-secondary" />
              )}
            </div>
          )}
          
          {/* File/folder icon */}
          <div className="mr-2 flex-shrink-0">
            {renderFileIcon(item)}
          </div>
          
          {/* Name */}
          <span className="text-sm text-vscode-text truncate flex-1">
            {item.name}
          </span>
          
          {/* File size for files */}
          {item.type === 'file' && item.size && (
            <span className="text-xs text-vscode-text-secondary ml-2">
              {formatFileSize(item.size)}
            </span>
          )}
        </div>
        
        {/* Render children if directory is expanded */}
        {item.type === 'directory' && isExpanded && (
          <div className="ml-4">
            {/* TODO: Load and render directory contents */}
            <div className="text-xs text-vscode-text-secondary px-2 py-1">
              Loading...
            </div>
          </div>
        )}
      </div>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-4 text-center">
          <div className="text-red-400 mb-2">⚠️</div>
          <div className="text-sm text-vscode-text mb-2">Failed to load directory</div>
          <div className="text-xs text-vscode-text-secondary mb-4">{error}</div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-vscode-accent hover:bg-vscode-accent-hover text-white rounded text-xs"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-vscode-border">
        <span className="text-xs font-medium text-vscode-text-secondary uppercase tracking-wide">
          Files
        </span>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 hover:bg-vscode-border rounded text-vscode-text-secondary hover:text-vscode-text transition-colors"
            title="Refresh Explorer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          <button
            className="p-1 hover:bg-vscode-border rounded text-vscode-text-secondary hover:text-vscode-text transition-colors"
            title="New File"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
      
      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-vscode-accent"></div>
            <span className="ml-2 text-sm text-vscode-text-secondary">Loading...</span>
          </div>
        ) : directoryContents.length > 0 ? (
          <div className="py-1">
            {directoryContents.map(item => renderItem(item))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl mb-4">📁</div>
            <div className="text-sm text-vscode-text-secondary mb-2">No files found</div>
            <div className="text-xs text-vscode-text-secondary">
              This directory appears to be empty
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorerView;