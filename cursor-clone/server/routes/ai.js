import express from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiting for AI requests
const aiRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 50, // Number of requests
  duration: 60, // Per 60 seconds
});

export function setupAIRoutes(aiOrchestrator) {
  const router = express.Router();
  
  // Apply rate limiting to all AI routes
  router.use(async (req, res, next) => {
    try {
      await aiRateLimiter.consume(req.ip);
      next();
    } catch (rejRes) {
      res.status(429).json({
        error: 'Too many AI requests',
        resetTime: new Date(Date.now() + rejRes.msBeforeNext)
      });
    }
  });
  
  // Health check for AI services
  router.get('/health', (req, res) => {
    res.json({
      status: aiOrchestrator.isReady() ? 'ready' : 'initializing',
      model: process.env.AI_MODEL || 'ollama',
      timestamp: new Date().toISOString()
    });
  });
  
  // Chat completion (non-streaming)
  router.post('/chat', async (req, res) => {
    try {
      const { 
        messages, 
        model, 
        temperature, 
        maxTokens,
        context = {} 
      } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
      }
      
      // Convert messages to prompt format
      const prompt = messages[messages.length - 1]?.content || '';
      const contextMessages = messages.slice(0, -1);
      
      const response = await aiOrchestrator.streamResponse(prompt, {
        context: contextMessages,
        model,
        temperature,
        maxTokens,
        simulateTyping: false
      });
      
      res.json({
        response: response.fullResponse,
        metadata: response.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('AI chat error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Execute AI commands
  router.post('/command', async (req, res) => {
    try {
      const { command, args = {}, context = {} } = req.body;
      
      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }
      
      const result = await aiOrchestrator.executeCommand(command, args, context);
      
      res.json({
        command,
        result: result.fullResponse,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('AI command error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Code explanation
  router.post('/explain', async (req, res) => {
    try {
      const { code, language, context = {} } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }
      
      const result = await aiOrchestrator.executeCommand('/explain', {
        code,
        language: language || 'javascript'
      }, context);
      
      res.json({
        explanation: result.fullResponse,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Code explanation error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Code fixing
  router.post('/fix', async (req, res) => {
    try {
      const { code, error: codeError, language, context = {} } = req.body;
      
      if (!code || !codeError) {
        return res.status(400).json({ error: 'Code and error are required' });
      }
      
      const result = await aiOrchestrator.executeCommand('/fix', {
        code,
        error: codeError,
        language: language || 'javascript'
      }, context);
      
      res.json({
        fixedCode: result.fullResponse,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Code fixing error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Code refactoring
  router.post('/refactor', async (req, res) => {
    try {
      const { code, goal, language, context = {} } = req.body;
      
      if (!code || !goal) {
        return res.status(400).json({ error: 'Code and refactoring goal are required' });
      }
      
      const result = await aiOrchestrator.executeCommand('/refactor', {
        code,
        goal,
        language: language || 'javascript'
      }, context);
      
      res.json({
        refactoredCode: result.fullResponse,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Code refactoring error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Code generation
  router.post('/generate', async (req, res) => {
    try {
      const { description, language, framework, context = {} } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: 'Code description is required' });
      }
      
      const result = await aiOrchestrator.executeCommand('/generate', {
        description,
        language: language || 'javascript',
        framework
      }, context);
      
      res.json({
        generatedCode: result.fullResponse,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Code generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Test generation
  router.post('/test', async (req, res) => {
    try {
      const { code, language, testFramework, context = {} } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }
      
      const result = await aiOrchestrator.executeCommand('/test', {
        code,
        language: language || 'javascript',
        testFramework: testFramework || 'jest'
      }, context);
      
      res.json({
        tests: result.fullResponse,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Test generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Code optimization
  router.post('/optimize', async (req, res) => {
    try {
      const { code, optimizationGoal, language, context = {} } = req.body;
      
      if (!code || !optimizationGoal) {
        return res.status(400).json({ error: 'Code and optimization goal are required' });
      }
      
      const result = await aiOrchestrator.executeCommand('/optimize', {
        code,
        optimizationGoal,
        language: language || 'javascript'
      }, context);
      
      res.json({
        optimizedCode: result.fullResponse,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Code optimization error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Documentation generation
  router.post('/document', async (req, res) => {
    try {
      const { code, language, style, context = {} } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }
      
      const result = await aiOrchestrator.executeCommand('/document', {
        code,
        language: language || 'javascript',
        style: style || 'JSDoc'
      }, context);
      
      res.json({
        documentedCode: result.fullResponse,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Documentation generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Project analysis and suggestions
  router.post('/analyze', async (req, res) => {
    try {
      const { 
        files = [], 
        projectType, 
        analysisType = 'general',
        context = {} 
      } = req.body;
      
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Files array is required' });
      }
      
      // Build context from files
      const fileContents = files.map(file => 
        `File: ${file.path}\n\`\`\`${file.language || 'text'}\n${file.content}\n\`\`\``
      ).join('\n\n');
      
      let prompt;
      switch (analysisType) {
        case 'security':
          prompt = `Analyze these files for security vulnerabilities and provide recommendations:\n\n${fileContents}`;
          break;
        case 'performance':
          prompt = `Analyze these files for performance issues and optimization opportunities:\n\n${fileContents}`;
          break;
        case 'structure':
          prompt = `Analyze the project structure and suggest improvements:\n\n${fileContents}`;
          break;
        case 'dependencies':
          prompt = `Analyze the project dependencies and suggest updates or alternatives:\n\n${fileContents}`;
          break;
        default:
          prompt = `Provide a comprehensive analysis of this ${projectType || 'software'} project:\n\n${fileContents}`;
      }
      
      const result = await aiOrchestrator.streamResponse(prompt, {
        context: [{ ...context, projectType, analysisType }],
        simulateTyping: false
      });
      
      res.json({
        analysis: result.fullResponse,
        analysisType,
        filesAnalyzed: files.length,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Project analysis error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get available AI models
  router.get('/models', async (req, res) => {
    try {
      const models = [];
      
      // Add Ollama models if available
      if (aiOrchestrator.ollama) {
        try {
          const ollamaModels = await aiOrchestrator.ollama.list();
          models.push(...ollamaModels.models.map(model => ({
            id: model.name,
            name: model.name,
            provider: 'ollama',
            size: model.size,
            modified: model.modified_at
          })));
        } catch (error) {
          console.warn('Failed to fetch Ollama models:', error.message);
        }
      }
      
      // Add OpenAI models if available
      if (aiOrchestrator.openai) {
        models.push(
          { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' }
        );
      }
      
      res.json({ models });
      
    } catch (error) {
      console.error('Failed to get models:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  return router;
}