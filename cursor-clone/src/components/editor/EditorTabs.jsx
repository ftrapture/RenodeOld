import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { X, Circle } from 'lucide-react';

const EditorTabs = () => {
  const { tabs, activeTab, setActiveTab, closeTab } = useEditor();

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const getFileIcon = (tab) => {
    // Simple file type icons
    const iconMap = {
      javascript: '🟨',
      typescript: '🔷',
      jsx: '⚛️',
      tsx: '⚛️',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      json: '📄',
      markdown: '📝',
      python: '🐍',
      java: '☕',
      cpp: '⚙️',
      c: '⚙️',
      go: '🐹',
      rust: '🦀',
      php: '🐘',
      ruby: '💎',
      swift: '🦉',
      kotlin: '🎯'
    };
    
    return iconMap[tab.language] || '📄';
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="h-9 bg-vscode-bg-secondary border-b border-vscode-border flex overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            flex items-center px-3 py-2 min-w-0 max-w-48 cursor-pointer border-r border-vscode-border
            transition-colors duration-200 group
            ${activeTab === tab.id 
              ? 'bg-vscode-bg text-vscode-text border-t-2 border-t-vscode-accent' 
              : 'bg-vscode-bg-secondary text-vscode-text-secondary hover:bg-vscode-bg-tertiary hover:text-vscode-text'
            }
          `}
          onClick={() => handleTabClick(tab.id)}
          title={tab.path}
        >
          {/* File icon */}
          <span className="text-sm mr-2 flex-shrink-0">
            {getFileIcon(tab)}
          </span>
          
          {/* File name */}
          <span className="text-sm truncate flex-1">
            {tab.name}
          </span>
          
          {/* Dirty indicator or close button */}
          <div className="ml-2 flex-shrink-0">
            {tab.isDirty ? (
              <Circle 
                size={8} 
                className="fill-current text-vscode-text-secondary" 
                title="Unsaved changes"
              />
            ) : (
              <button
                onClick={(e) => handleCloseTab(e, tab.id)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-vscode-border opacity-0 group-hover:opacity-100 transition-opacity"
                title="Close tab"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      ))}
      
      {/* Add some space at the end for better UX */}
      <div className="flex-1 min-w-4"></div>
    </div>
  );
};

export default EditorTabs;