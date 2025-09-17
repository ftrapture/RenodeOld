import React from 'react';
import { useEditor } from '../../contexts/EditorContext';

// Editor components
import EditorTabs from '../editor/EditorTabs';
import MonacoEditor from '../editor/MonacoEditor';
import WelcomeScreen from '../editor/WelcomeScreen';

const EditorArea = () => {
  const { tabs, activeTab } = useEditor();
  
  const hasOpenTabs = tabs.length > 0;
  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="flex-1 flex flex-col bg-vscode-bg overflow-hidden">
      {/* Tabs */}
      {hasOpenTabs && (
        <EditorTabs />
      )}
      
      {/* Editor Content */}
      <div className="flex-1 relative overflow-hidden">
        {hasOpenTabs && activeTabData ? (
          <MonacoEditor
            key={activeTab}
            tab={activeTabData}
          />
        ) : (
          <WelcomeScreen />
        )}
      </div>
    </div>
  );
};

export default EditorArea;