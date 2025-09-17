import React from 'react';
import { useFileSystem } from '../../contexts/FileSystemContext';
import { useEditor } from '../../contexts/EditorContext';
import { FileText, Folder, Search, GitBranch, Settings } from 'lucide-react';

const WelcomeScreen = () => {
  const { readDirectory } = useFileSystem();
  const { openFile } = useEditor();

  const quickActions = [
    {
      title: 'Open File',
      description: 'Quickly open a file from your workspace',
      icon: FileText,
      action: () => {
        // TODO: Implement file picker
        console.log('Open file picker');
      },
      shortcut: 'Ctrl+O'
    },
    {
      title: 'Open Folder',
      description: 'Open an entire folder as your workspace',
      icon: Folder,
      action: () => readDirectory('.'),
      shortcut: 'Ctrl+K Ctrl+O'
    },
    {
      title: 'Search Files',
      description: 'Search across all files in your workspace',
      icon: Search,
      action: () => {
        // TODO: Switch to search view
        console.log('Switch to search');
      },
      shortcut: 'Ctrl+Shift+F'
    },
    {
      title: 'Clone Repository',
      description: 'Clone a Git repository to get started',
      icon: GitBranch,
      action: () => {
        // TODO: Implement git clone
        console.log('Clone repository');
      },
      shortcut: 'Ctrl+Shift+P'
    }
  ];

  const recentFiles = [
    // TODO: Load from localStorage or backend
  ];

  const tips = [
    {
      title: 'AI-Powered Coding',
      description: 'Use the AI chat sidebar to get coding help, explanations, and code generation.',
      icon: '🤖'
    },
    {
      title: 'Stream Typing',
      description: 'Experience AI responses with realistic typing simulation for better collaboration feel.',
      icon: '⚡'
    },
    {
      title: 'File Agent',
      description: 'The AI can read, create, and modify files directly in your project.',
      icon: '📁'
    },
    {
      title: 'Git Integration',
      description: 'Full Git support with visual diff, branch management, and commit history.',
      icon: '🌿'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-vscode-bg">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-vscode-accent to-blue-400 rounded-xl mb-6">
            <span className="text-2xl font-bold text-white">⚡</span>
          </div>
          <h1 className="text-3xl font-bold text-vscode-text mb-4">
            Enhanced Cursor Editor
          </h1>
          <p className="text-vscode-text-secondary text-lg">
            AI-powered development environment with stream typing, file agents, and orchestration
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-vscode-text mb-6">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="p-4 bg-vscode-bg-secondary hover:bg-vscode-bg-tertiary border border-vscode-border rounded-lg text-left transition-colors group"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-vscode-accent/10 rounded-lg group-hover:bg-vscode-accent/20 transition-colors">
                    <action.icon size={20} className="text-vscode-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-vscode-text mb-1">{action.title}</h3>
                    <p className="text-sm text-vscode-text-secondary mb-2">{action.description}</p>
                    <span className="text-xs text-vscode-text-secondary bg-vscode-bg px-2 py-1 rounded">
                      {action.shortcut}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        {recentFiles.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-vscode-text mb-6">Recent Files</h2>
            <div className="space-y-2">
              {recentFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => openFile(file.path)}
                  className="w-full p-3 bg-vscode-bg-secondary hover:bg-vscode-bg-tertiary border border-vscode-border rounded-lg text-left transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText size={16} className="text-vscode-text-secondary" />
                    <div className="flex-1">
                      <div className="font-medium text-vscode-text">{file.name}</div>
                      <div className="text-sm text-vscode-text-secondary">{file.path}</div>
                    </div>
                    <div className="text-xs text-vscode-text-secondary">
                      {file.lastModified}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features & Tips */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-vscode-text mb-6">Features & Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tips.map((tip, index) => (
              <div key={index} className="p-4 bg-vscode-bg-secondary border border-vscode-border rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{tip.icon}</div>
                  <div>
                    <h3 className="font-medium text-vscode-text mb-2">{tip.title}</h3>
                    <p className="text-sm text-vscode-text-secondary">{tip.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-vscode-text mb-6">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {[
              { keys: ['Ctrl', 'B'], description: 'Toggle Sidebar' },
              { keys: ['Ctrl', '`'], description: 'Toggle Terminal' },
              { keys: ['Ctrl', 'P'], description: 'Quick Open' },
              { keys: ['Ctrl', 'Shift', 'P'], description: 'Command Palette' },
              { keys: ['Ctrl', 'Shift', 'E'], description: 'Explorer' },
              { keys: ['Ctrl', 'Shift', 'F'], description: 'Search' },
              { keys: ['Ctrl', 'Shift', 'G'], description: 'Source Control' },
              { keys: ['Ctrl', 'Shift', 'A'], description: 'AI Chat' },
              { keys: ['Ctrl', 'S'], description: 'Save File' }
            ].map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-vscode-bg-secondary rounded">
                <span className="text-vscode-text-secondary">{shortcut.description}</span>
                <div className="flex space-x-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <kbd key={keyIndex} className="px-2 py-1 bg-vscode-bg border border-vscode-border rounded text-xs">
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-vscode-text-secondary">
          <p className="mb-2">Enhanced Cursor Editor v1.0.0</p>
          <p className="text-sm">
            Built with AI-powered features for modern development workflows
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;