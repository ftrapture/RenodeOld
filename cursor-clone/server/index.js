import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { setupWebSocketHandlers } from './websocket/handlers.js';
import { setupFileRoutes } from './routes/files.js';
import { setupAIRoutes } from './routes/ai.js';
import { setupGitRoutes } from './routes/git.js';
import { FileSystemManager } from './services/FileSystemManager.js';
import { AIOrchestrator } from './services/AIOrchestrator.js';
import { GitManager } from './services/GitManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize services
const fileSystemManager = new FileSystemManager();
const aiOrchestrator = new AIOrchestrator();
const gitManager = new GitManager();

// Store services in app for access in routes
app.locals.services = {
  fileSystemManager,
  aiOrchestrator,
  gitManager
};

// Routes
app.use('/api/files', setupFileRoutes(fileSystemManager));
app.use('/api/ai', setupAIRoutes(aiOrchestrator));
app.use('/api/git', setupGitRoutes(gitManager));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// WebSocket handlers
setupWebSocketHandlers(wss, { fileSystemManager, aiOrchestrator, gitManager });

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      filesystem: fileSystemManager.isReady(),
      ai: aiOrchestrator.isReady(),
      git: gitManager.isReady()
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Enhanced Cursor Editor Server running on port ${PORT}`);
  console.log(`📁 File System: Ready`);
  console.log(`🤖 AI Orchestrator: ${aiOrchestrator.isReady() ? 'Ready' : 'Initializing...'}`);
  console.log(`📚 Git Manager: Ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});