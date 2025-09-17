import React, { useState } from 'react';
import { Search, FileText, Replace, MoreHorizontal } from 'lucide-react';

const SearchView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-vscode-border">
        <div className="space-y-2">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pr-8 bg-vscode-bg border border-vscode-border rounded text-sm text-vscode-text placeholder-vscode-text-secondary focus:outline-none focus:border-vscode-accent"
            />
            <Search size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-vscode-text-secondary" />
          </div>
          
          {/* Replace input */}
          {showReplace && (
            <div className="relative">
              <input
                type="text"
                placeholder="Replace"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                className="w-full px-3 py-2 pr-8 bg-vscode-bg border border-vscode-border rounded text-sm text-vscode-text placeholder-vscode-text-secondary focus:outline-none focus:border-vscode-accent"
              />
              <Replace size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-vscode-text-secondary" />
            </div>
          )}
          
          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowReplace(!showReplace)}
                className={`p-1 rounded hover:bg-vscode-border transition-colors ${
                  showReplace ? 'bg-vscode-border text-vscode-text' : 'text-vscode-text-secondary hover:text-vscode-text'
                }`}
                title="Toggle Replace"
              >
                <Replace size={14} />
              </button>
            </div>
            
            <button
              className="p-1 rounded hover:bg-vscode-border text-vscode-text-secondary hover:text-vscode-text transition-colors"
              title="Search Options"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          searchResults.length > 0 ? (
            <div className="p-2">
              {/* Search results would go here */}
              <div className="text-sm text-vscode-text-secondary">
                {searchResults.length} results found
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <div className="text-sm text-vscode-text-secondary mb-2">No results found</div>
              <div className="text-xs text-vscode-text-secondary">
                Try a different search term
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-sm text-vscode-text-secondary mb-2">Search across files</div>
            <div className="text-xs text-vscode-text-secondary">
              Enter a search term to get started
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;