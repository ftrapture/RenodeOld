import React, { useEffect, useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { useEditor } from '../../contexts/EditorContext';
import { useTheme } from '../../contexts/ThemeContext';

const MonacoEditor = ({ tab }) => {
  const { 
    registerEditor, 
    updateTabContent, 
    theme: editorTheme,
    fontSize,
    wordWrap,
    minimap,
    lineNumbers
  } = useEditor();
  
  const { monacoTheme } = useTheme();
  
  const editorRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    setIsLoading(false);
    
    // Register editor with context
    registerEditor(tab.id, editor, monaco);
    
    // Configure editor
    editor.updateOptions({
      fontSize,
      wordWrap,
      minimap: { enabled: minimap },
      lineNumbers
    });
    
    // Focus editor
    editor.focus();
    
    // Set up keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save file
      // This will be handled by the editor context
    });
    
    // Set up AI assistance keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI, () => {
      // Trigger AI assistance
      const selection = editor.getSelection();
      const selectedText = editor.getModel().getValueInRange(selection);
      console.log('AI assistance requested for:', selectedText);
    });
  };

  const handleEditorChange = (value) => {
    if (value !== undefined) {
      updateTabContent(tab.id, value);
    }
  };

  const handleEditorValidation = (markers) => {
    // Handle validation markers (errors, warnings, etc.)
    console.log('Validation markers:', markers);
  };

  const getLanguage = () => {
    // Map file extensions to Monaco language identifiers
    const languageMap = {
      javascript: 'javascript',
      typescript: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      json: 'json',
      markdown: 'markdown',
      python: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rust: 'rust',
      php: 'php',
      ruby: 'ruby',
      swift: 'swift',
      kotlin: 'kotlin',
      xml: 'xml',
      yaml: 'yaml',
      sql: 'sql',
      shell: 'shell',
      powershell: 'powershell'
    };
    
    return languageMap[tab.language] || 'plaintext';
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-vscode-bg">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-vscode-text mb-2">Failed to load editor</div>
          <div className="text-sm text-vscode-text-secondary mb-4">{error}</div>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
            }}
            className="px-4 py-2 bg-vscode-accent hover:bg-vscode-accent-hover text-white rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-vscode-bg z-10">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-vscode-accent"></div>
            <span className="text-vscode-text-secondary">Loading editor...</span>
          </div>
        </div>
      )}
      
      <Editor
        height="100%"
        language={getLanguage()}
        theme={monacoTheme}
        value={tab.content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        onValidate={handleEditorValidation}
        loading={null} // We handle loading ourselves
        options={{
          fontSize,
          fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
          lineHeight: 1.5,
          wordWrap,
          minimap: { enabled: minimap },
          lineNumbers,
          renderWhitespace: 'boundary',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          trimAutoWhitespace: true,
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          acceptSuggestionOnCommitCharacter: true,
          snippetSuggestions: 'top',
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false
          },
          parameterHints: {
            enabled: true
          },
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoSurround: 'languageDefined',
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',
          matchBrackets: 'always',
          find: {
            seedSearchStringFromSelection: 'selection',
            autoFindInSelection: 'never'
          },
          contextmenu: true,
          mouseWheelZoom: true,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: true,
          renderLineHighlight: 'line',
          selectionHighlight: true,
          occurrencesHighlight: true,
          codeLens: true,
          colorDecorators: true,
          lightbulb: {
            enabled: true
          }
        }}
      />
      
      {/* AI assistance overlay */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex flex-col space-y-2">
          {/* AI suggestions would appear here */}
        </div>
      </div>
    </div>
  );
};

export default MonacoEditor;