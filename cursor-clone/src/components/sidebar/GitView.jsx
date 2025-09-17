import React from 'react';
import { useGit } from '../../contexts/GitContext';
import { GitBranch, GitCommit, Plus, Minus, RefreshCw } from 'lucide-react';

const GitView = () => {
  const { 
    isRepo, 
    status, 
    branches, 
    hasChanges, 
    canCommit,
    refreshStatus,
    isLoading 
  } = useGit();

  if (!isRepo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="text-4xl mb-4">📂</div>
        <div className="text-sm text-vscode-text-secondary mb-2">No repository found</div>
        <div className="text-xs text-vscode-text-secondary mb-4">
          Initialize a repository to use source control features
        </div>
        <button className="px-3 py-1 bg-vscode-accent hover:bg-vscode-accent-hover text-white rounded text-xs">
          Initialize Repository
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-vscode-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-vscode-text-secondary uppercase tracking-wide">
            Source Control
          </span>
          <button
            onClick={refreshStatus}
            disabled={isLoading}
            className="p-1 hover:bg-vscode-border rounded text-vscode-text-secondary hover:text-vscode-text transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {/* Branch info */}
        {branches?.current && (
          <div className="flex items-center space-x-2 mb-2">
            <GitBranch size={14} className="text-vscode-accent" />
            <span className="text-sm text-vscode-text">{branches.current}</span>
          </div>
        )}
        
        {/* Status summary */}
        {status && (
          <div className="text-xs text-vscode-text-secondary">
            {status.ahead > 0 && `${status.ahead} ahead, `}
            {status.behind > 0 && `${status.behind} behind, `}
            {hasChanges() ? 'Changes present' : 'No changes'}
          </div>
        )}
      </div>
      
      {/* Changes */}
      <div className="flex-1 overflow-y-auto">
        {hasChanges() ? (
          <div className="p-2 space-y-3">
            {/* Staged changes */}
            {status?.staged && status.staged.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-medium text-vscode-text-secondary uppercase tracking-wide">
                    Staged Changes
                  </span>
                  <span className="text-xs text-vscode-text-secondary">
                    {status.staged.length}
                  </span>
                </div>
                {status.staged.map(file => (
                  <div key={file} className="flex items-center space-x-2 px-2 py-1 hover:bg-vscode-bg-tertiary rounded">
                    <Plus size={12} className="text-green-500" />
                    <span className="text-sm text-vscode-text truncate">{file}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Modified files */}
            {status?.modified && status.modified.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-medium text-vscode-text-secondary uppercase tracking-wide">
                    Changes
                  </span>
                  <span className="text-xs text-vscode-text-secondary">
                    {status.modified.length}
                  </span>
                </div>
                {status.modified.map(file => (
                  <div key={file} className="flex items-center space-x-2 px-2 py-1 hover:bg-vscode-bg-tertiary rounded">
                    <span className="text-orange-500 text-xs">M</span>
                    <span className="text-sm text-vscode-text truncate">{file}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Untracked files */}
            {status?.not_added && status.not_added.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs font-medium text-vscode-text-secondary uppercase tracking-wide">
                    Untracked Files
                  </span>
                  <span className="text-xs text-vscode-text-secondary">
                    {status.not_added.length}
                  </span>
                </div>
                {status.not_added.map(file => (
                  <div key={file} className="flex items-center space-x-2 px-2 py-1 hover:bg-vscode-bg-tertiary rounded">
                    <span className="text-green-500 text-xs">U</span>
                    <span className="text-sm text-vscode-text truncate">{file}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Commit section */}
            {canCommit() && (
              <div className="pt-2 border-t border-vscode-border">
                <textarea
                  placeholder="Message (Ctrl+Enter to commit)"
                  className="w-full p-2 bg-vscode-bg border border-vscode-border rounded text-sm text-vscode-text placeholder-vscode-text-secondary resize-none focus:outline-none focus:border-vscode-accent"
                  rows="3"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-vscode-text-secondary">
                    {status.staged.length} staged changes
                  </span>
                  <button className="px-3 py-1 bg-vscode-accent hover:bg-vscode-accent-hover text-white rounded text-xs">
                    Commit
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl mb-4">✨</div>
            <div className="text-sm text-vscode-text-secondary mb-2">No changes</div>
            <div className="text-xs text-vscode-text-secondary">
              Your working tree is clean
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitView;