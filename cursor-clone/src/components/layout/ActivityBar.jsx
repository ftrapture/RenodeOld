import React from 'react';
import { 
  FileText, 
  Search, 
  GitBranch, 
  Play, 
  Package, 
  Settings,
  MessageSquare,
  Bot,
  Terminal
} from 'lucide-react';

const ActivityBar = ({ activeView, onViewChange }) => {
  const activities = [
    {
      id: 'explorer',
      icon: FileText,
      title: 'Explorer',
      shortcut: 'Ctrl+Shift+E'
    },
    {
      id: 'search',
      icon: Search,
      title: 'Search',
      shortcut: 'Ctrl+Shift+F'
    },
    {
      id: 'git',
      icon: GitBranch,
      title: 'Source Control',
      shortcut: 'Ctrl+Shift+G'
    },
    {
      id: 'debug',
      icon: Play,
      title: 'Run and Debug',
      shortcut: 'Ctrl+Shift+D'
    },
    {
      id: 'extensions',
      icon: Package,
      title: 'Extensions',
      shortcut: 'Ctrl+Shift+X'
    },
    {
      id: 'ai-chat',
      icon: MessageSquare,
      title: 'AI Chat',
      shortcut: 'Ctrl+Shift+A'
    },
    {
      id: 'ai-assistant',
      icon: Bot,
      title: 'AI Assistant',
      shortcut: 'Ctrl+Shift+I'
    }
  ];

  const bottomActivities = [
    {
      id: 'terminal',
      icon: Terminal,
      title: 'Terminal',
      shortcut: 'Ctrl+`'
    },
    {
      id: 'settings',
      icon: Settings,
      title: 'Settings',
      shortcut: 'Ctrl+,'
    }
  ];

  const ActivityButton = ({ activity, isActive, onClick }) => {
    const Icon = activity.icon;
    
    return (
      <button
        onClick={() => onClick(activity.id)}
        className={`
          w-12 h-12 flex items-center justify-center relative group
          transition-colors duration-200
          ${isActive 
            ? 'bg-vscode-bg-secondary border-l-2 border-vscode-accent text-vscode-text' 
            : 'text-vscode-text-secondary hover:text-vscode-text hover:bg-vscode-bg-secondary/50'
          }
        `}
        title={`${activity.title} (${activity.shortcut})`}
      >
        <Icon size={20} />
        
        {/* Active indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-vscode-accent rounded-r" />
        )}
        
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-vscode-bg-tertiary border border-vscode-border rounded text-xs text-vscode-text opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {activity.title}
          <div className="text-vscode-text-secondary">{activity.shortcut}</div>
        </div>
      </button>
    );
  };

  return (
    <div className="w-12 bg-vscode-bg-secondary border-r border-vscode-border flex flex-col">
      {/* Main activities */}
      <div className="flex-1 flex flex-col">
        {activities.map(activity => (
          <ActivityButton
            key={activity.id}
            activity={activity}
            isActive={activeView === activity.id}
            onClick={onViewChange}
          />
        ))}
      </div>
      
      {/* Bottom activities */}
      <div className="flex flex-col border-t border-vscode-border">
        {bottomActivities.map(activity => (
          <ActivityButton
            key={activity.id}
            activity={activity}
            isActive={activeView === activity.id}
            onClick={onViewChange}
          />
        ))}
      </div>
    </div>
  );
};

export default ActivityBar;