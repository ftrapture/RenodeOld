import React from 'react';
import { X, Maximize2 } from 'lucide-react';

const Panel = ({ position, height, onHeightChange, onPositionChange, onClose }) => {
  return (
    <div 
      className="bg-vscode-bg-secondary border-t border-vscode-border flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-3 border-b border-vscode-border bg-vscode-bg-tertiary">
        <span className="text-sm font-medium text-vscode-text">
          Panel
        </span>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center hover:bg-vscode-border rounded text-vscode-text-secondary hover:text-vscode-text transition-colors"
            title="Close Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex-1 flex items-center justify-center text-vscode-text-secondary">
          <div className="text-center">
            <div className="text-4xl mb-4">📋</div>
            <div>Panel Content</div>
            <div className="text-sm mt-2">Coming soon!</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Panel;