# Enhanced Cursor Editor Clone

⚡ **AI-powered development environment with stream typing, file agents, and orchestration**

A modern, feature-rich code editor inspired by Cursor, built with React, Node.js, and AI integration. This project demonstrates advanced concepts including real-time collaboration, AI-assisted coding, and intelligent file management.

## 🌟 Features

### Phase 1: Core Foundation ✅
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **File Explorer**: Hierarchical file tree with icons and context menus
- **Git Integration**: Visual diff, branch management, and commit history
- **Modern UI**: VS Code-inspired interface with multiple themes
- **Responsive Design**: Works on desktop and mobile devices

### Phase 2: AI MVP ⚡ (In Progress)
- **Stream Typing Experience**: AI responses with realistic typing simulation
- **AI Chat Sidebar**: Interactive chat interface for coding assistance
- **WebSocket Integration**: Real-time communication with backend
- **Multiple AI Providers**: Support for Ollama (local) and OpenAI (cloud)
- **Context-Aware AI**: AI understands your project structure and files

### Phase 3: File-Aware Agent (Planned)
- **Intelligent File Operations**: AI can create, read, and modify files
- **Project Understanding**: AI maintains context about your codebase
- **Multi-step Edits**: AI can plan and execute complex refactoring tasks
- **Diff Preview**: Review AI changes before applying them

### Phase 4: Decision-Making & Orchestration (Planned)
- **Workflow Engine**: Chain multiple AI operations together
- **Automated Testing**: AI generates and runs tests for your code
- **Code Analysis**: Security, performance, and quality insights
- **Sandbox Execution**: Safe execution of AI-generated code

### Phase 5: Advanced Collaboration (Planned)
- **Live Share**: Real-time collaborative editing
- **Shared AI Agent**: Team-wide AI assistant with shared memory
- **AI-Assisted Reviews**: Automated code review suggestions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cursor-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🏗️ Architecture

### Frontend (React + Vite)
```
src/
├── components/          # React components
│   ├── editor/         # Monaco editor components
│   ├── layout/         # Layout components (sidebar, panels)
│   ├── sidebar/        # Sidebar views (explorer, git, AI)
│   └── ui/             # Reusable UI components
├── contexts/           # React context providers
│   ├── AIContext.jsx          # AI service management
│   ├── EditorContext.jsx     # Editor state management
│   ├── FileSystemContext.jsx # File operations
│   ├── GitContext.jsx        # Git operations
│   ├── ThemeContext.jsx      # Theme management
│   └── WebSocketContext.jsx  # Real-time communication
├── hooks/              # Custom React hooks
├── services/           # API services
└── utils/              # Utility functions
```

### Backend (Node.js + Express)
```
server/
├── index.js            # Main server entry point
├── routes/             # API routes
│   ├── ai.js          # AI endpoints
│   ├── files.js       # File system endpoints
│   └── git.js         # Git endpoints
├── services/           # Business logic
│   ├── AIOrchestrator.js     # AI service coordination
│   ├── FileSystemManager.js # File operations
│   └── GitManager.js         # Git operations
└── websocket/          # WebSocket handlers
    └── handlers.js     # Real-time event handling
```

## 🤖 AI Integration

### Supported AI Providers

#### Ollama (Local Development)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull gpt-oss:20b

# Configure in .env
AI_MODEL=ollama
OLLAMA_ENABLED=true
OLLAMA_HOST=http://localhost:11434
```

#### OpenAI (Production)
```bash
# Configure in .env
AI_MODEL=openai
OPENAI_API_KEY=your_api_key_here
```

### AI Commands
- `/explain` - Explain selected code
- `/fix` - Fix code errors
- `/refactor` - Refactor code for better quality
- `/generate` - Generate code from description
- `/test` - Generate unit tests
- `/optimize` - Optimize code performance
- `/document` - Add documentation

## 🎨 Themes

Built-in themes:
- **VS Code Dark** (default)
- **VS Code Light**
- **GitHub Dark**
- **GitHub Light**
- **Monokai**
- **Solarized Dark/Light**
- **High Contrast**

Custom theme support with import/export functionality.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+`` | Toggle Terminal |
| `Ctrl+P` | Quick Open |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+Shift+E` | Explorer |
| `Ctrl+Shift+F` | Search |
| `Ctrl+Shift+G` | Source Control |
| `Ctrl+Shift+A` | AI Chat |
| `Ctrl+S` | Save File |
| `Ctrl+Shift+I` | AI Assistance |

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173

# AI Configuration
AI_MODEL=ollama                    # 'ollama' or 'openai'
OLLAMA_ENABLED=true
OLLAMA_HOST=http://localhost:11434
OPENAI_API_KEY=your_key_here

# File System
WORKSPACE_ROOT=/your/workspace/path
MAX_FILE_SIZE=52428800            # 50MB

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

### Editor Settings
- Font family: JetBrains Mono, Consolas, Monaco
- Font size: 14px (configurable)
- Tab size: 2 spaces
- Word wrap: On
- Minimap: Enabled
- Auto-save: 1 second delay

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📦 Building for Production

```bash
# Build the application
npm run build

# Preview the build
npm run preview

# Start production server
npm start
```

## 🔌 API Documentation

### File System API
- `GET /api/files/*` - Read file or directory
- `PUT /api/files/*` - Create or update file
- `DELETE /api/files/*` - Delete file
- `POST /api/files/search` - Search files
- `POST /api/files/batch` - Batch operations

### AI API
- `POST /api/ai/chat` - Chat completion
- `POST /api/ai/command` - Execute AI command
- `POST /api/ai/explain` - Explain code
- `POST /api/ai/fix` - Fix code
- `POST /api/ai/generate` - Generate code
- `GET /api/ai/models` - List available models

### Git API
- `GET /api/git/status` - Repository status
- `GET /api/git/branches` - List branches
- `GET /api/git/history` - Commit history
- `POST /api/git/commit` - Create commit
- `POST /api/git/stage` - Stage files

## 🔄 WebSocket Events

### Client → Server
- `join_room` - Join collaboration room
- `cursor_update` - Update cursor position
- `text_change` - Send text changes
- `ai_stream_request` - Request AI response
- `file_watch` - Watch file changes

### Server → Client
- `ai_stream_token` - AI response token
- `ai_thinking` - AI thinking indicator
- `file_change` - File system change
- `cursor_update` - Collaborator cursor update
- `user_joined/left` - Collaboration events

## 🚧 Development Roadmap

### Current Phase: AI MVP
- [x] WebSocket infrastructure
- [x] AI context providers
- [x] Stream typing simulation
- [x] Chat interface
- [ ] Command palette integration
- [ ] Inline AI suggestions
- [ ] Code completion

### Next Phase: File Agent
- [ ] AI file operations
- [ ] Project analysis
- [ ] Multi-step refactoring
- [ ] Change preview system
- [ ] Undo/redo for AI changes

### Future Phases
- [ ] Workflow orchestration
- [ ] Automated testing
- [ ] Code quality analysis
- [ ] Team collaboration
- [ ] Plugin system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Add tests for new features
- Update documentation
- Use conventional commits
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Monaco Editor** - The code editor that powers VS Code
- **Cursor** - Inspiration for AI-powered development
- **React** - UI framework
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Ollama** - Local AI model serving
- **OpenAI** - AI API services

## 📞 Support

- 📧 Email: support@enhanced-cursor-editor.com
- 💬 Discord: [Join our community](https://discord.gg/enhanced-cursor)
- 📚 Documentation: [docs.enhanced-cursor-editor.com](https://docs.enhanced-cursor-editor.com)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/cursor-clone/issues)

---

**Built with ❤️ by the Enhanced Cursor Editor team**

*Making AI-powered development accessible to everyone*