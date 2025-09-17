import OpenAI from 'openai';
import { Ollama } from 'ollama';
import dotenv from 'dotenv';

dotenv.config();

export class AIOrchestrator {
  constructor() {
    this.openai = null;
    this.ollama = null;
    this.activeModel = process.env.AI_MODEL || 'ollama'; // 'ollama' or 'openai'
    this.isInitialized = false;
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Initialize Ollama for local development
      if (this.activeModel === 'ollama' || process.env.OLLAMA_ENABLED === 'true') {
        this.ollama = new Ollama({
          host: process.env.OLLAMA_HOST || 'http://localhost:11434'
        });
        
        // Test connection and ensure model is available
        try {
          await this.ollama.list();
          console.log('✅ Ollama connected successfully');
        } catch (error) {
          console.warn('⚠️  Ollama not available, falling back to OpenAI');
          this.activeModel = 'openai';
        }
      }
      
      // Initialize OpenAI as fallback or primary
      if (this.activeModel === 'openai' || process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI client initialized');
      }
      
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize AI services:', error);
      this.isInitialized = false;
    }
  }
  
  isReady() {
    return this.isInitialized && (this.ollama || this.openai);
  }
  
  async streamResponse(prompt, options = {}) {
    if (!this.isReady()) {
      throw new Error('AI services not initialized');
    }
    
    const {
      context = [],
      model = 'gpt-oss:20b',
      temperature = 0.7,
      maxTokens = 2048,
      onToken = () => {},
      onThinking = () => {},
      simulateTyping = true
    } = options;
    
    // Build messages array
    const messages = [
      {
        role: 'system',
        content: this.getSystemPrompt(context)
      },
      ...context.map(ctx => ({
        role: ctx.role || 'user',
        content: ctx.content
      })),
      {
        role: 'user',
        content: prompt
      }
    ];
    
    if (this.activeModel === 'ollama' && this.ollama) {
      return await this.streamWithOllama(messages, {
        model,
        temperature,
        onToken,
        onThinking,
        simulateTyping
      });
    } else if (this.openai) {
      return await this.streamWithOpenAI(messages, {
        model: 'gpt-4',
        temperature,
        maxTokens,
        onToken,
        onThinking,
        simulateTyping
      });
    } else {
      throw new Error('No AI service available');
    }
  }
  
  async streamWithOllama(messages, options) {
    const { model, temperature, onToken, onThinking, simulateTyping } = options;
    
    let fullResponse = '';
    const startTime = Date.now();
    
    try {
      onThinking('Analyzing your request...');
      
      const response = await this.ollama.chat({
        model: model.includes(':') ? model : 'llama2:7b',
        messages,
        stream: true,
        options: {
          temperature
        }
      });
      
      for await (const part of response) {
        if (part.message?.content) {
          const token = part.message.content;
          fullResponse += token;
          
          if (simulateTyping) {
            // Simulate human-like typing speed (30-60 WPM)
            const delay = Math.random() * 50 + 20;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          onToken(token);
        }
      }
      
      const endTime = Date.now();
      
      return {
        fullResponse,
        metadata: {
          model,
          tokensGenerated: fullResponse.length,
          responseTime: endTime - startTime,
          service: 'ollama'
        }
      };
      
    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw new Error(`Ollama error: ${error.message}`);
    }
  }
  
  async streamWithOpenAI(messages, options) {
    const { model, temperature, maxTokens, onToken, onThinking, simulateTyping } = options;
    
    let fullResponse = '';
    const startTime = Date.now();
    
    try {
      onThinking('Processing with OpenAI...');
      
      const stream = await this.openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          
          if (simulateTyping) {
            // Simulate typing for each character
            for (const char of content) {
              const delay = Math.random() * 30 + 10;
              await new Promise(resolve => setTimeout(resolve, delay));
              onToken(char);
            }
          } else {
            onToken(content);
          }
        }
      }
      
      const endTime = Date.now();
      
      return {
        fullResponse,
        metadata: {
          model,
          tokensGenerated: fullResponse.length,
          responseTime: endTime - startTime,
          service: 'openai'
        }
      };
      
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw new Error(`OpenAI error: ${error.message}`);
    }
  }
  
  async executeCommand(command, args = {}, context = {}) {
    const commands = {
      '/explain': this.explainCode,
      '/fix': this.fixCode,
      '/refactor': this.refactorCode,
      '/generate': this.generateCode,
      '/test': this.generateTests,
      '/optimize': this.optimizeCode,
      '/document': this.documentCode
    };
    
    const handler = commands[command];
    if (!handler) {
      throw new Error(`Unknown command: ${command}`);
    }
    
    return await handler.call(this, args, context);
  }
  
  async explainCode(args, context) {
    const { code, language } = args;
    const prompt = `Explain this ${language} code in detail:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    
    return await this.streamResponse(prompt, {
      context: [context],
      simulateTyping: false
    });
  }
  
  async fixCode(args, context) {
    const { code, error, language } = args;
    const prompt = `Fix this ${language} code that has the following error:\n\nError: ${error}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide the corrected code with explanation.`;
    
    return await this.streamResponse(prompt, {
      context: [context],
      simulateTyping: false
    });
  }
  
  async refactorCode(args, context) {
    const { code, language, goal } = args;
    const prompt = `Refactor this ${language} code to ${goal}:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide the refactored code with explanation of changes.`;
    
    return await this.streamResponse(prompt, {
      context: [context],
      simulateTyping: false
    });
  }
  
  async generateCode(args, context) {
    const { description, language, framework } = args;
    const prompt = `Generate ${language} code${framework ? ` using ${framework}` : ''} for: ${description}`;
    
    return await this.streamResponse(prompt, {
      context: [context],
      simulateTyping: true
    });
  }
  
  async generateTests(args, context) {
    const { code, language, testFramework } = args;
    const prompt = `Generate unit tests for this ${language} code using ${testFramework}:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    
    return await this.streamResponse(prompt, {
      context: [context],
      simulateTyping: false
    });
  }
  
  async optimizeCode(args, context) {
    const { code, language, optimizationGoal } = args;
    const prompt = `Optimize this ${language} code for ${optimizationGoal}:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide optimized code with performance improvements explained.`;
    
    return await this.streamResponse(prompt, {
      context: [context],
      simulateTyping: false
    });
  }
  
  async documentCode(args, context) {
    const { code, language, style } = args;
    const prompt = `Add comprehensive documentation to this ${language} code in ${style} style:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    
    return await this.streamResponse(prompt, {
      context: [context],
      simulateTyping: false
    });
  }
  
  getSystemPrompt(context) {
    return `You are an advanced AI coding assistant integrated into a Cursor-like editor. You have the following capabilities:

1. **Stream Typing**: You respond with realistic typing simulation, character by character
2. **File Awareness**: You can read, create, and modify files in the project
3. **Context Understanding**: You maintain awareness of the project structure and context
4. **Multi-step Planning**: You can break down complex tasks into manageable steps

Current project context:
- Language: ${context.language || 'Unknown'}
- Framework: ${context.framework || 'None specified'}
- Project type: ${context.projectType || 'Unknown'}

Guidelines:
- Always provide practical, working code
- Explain your reasoning when making significant changes
- Suggest best practices and optimizations
- Be concise but thorough in explanations
- Consider the broader project context in your responses`;
  }
}