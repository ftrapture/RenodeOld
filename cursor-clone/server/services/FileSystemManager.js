import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { createReadStream, createWriteStream } from 'fs';

export class FileSystemManager {
  constructor() {
    this.watchers = new Map();
    this.workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
    this.allowedExtensions = new Set([
      '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
      '.py', '.java', '.cpp', '.c', '.h', '.hpp',
      '.html', '.css', '.scss', '.sass', '.less',
      '.json', '.xml', '.yaml', '.yml', '.toml',
      '.md', '.txt', '.log', '.env', '.gitignore',
      '.sql', '.graphql', '.gql', '.proto',
      '.go', '.rs', '.php', '.rb', '.swift', '.kt',
      '.sh', '.bash', '.zsh', '.fish', '.ps1'
    ]);
    
    this.maxFileSize = 50 * 1024 * 1024; // 50MB limit
  }
  
  isReady() {
    return true;
  }
  
  // File Operations
  async readFile(filePath) {
    try {
      const fullPath = this.resolvePath(filePath);
      await this.validatePath(fullPath);
      
      const stats = await fs.stat(fullPath);
      if (stats.size > this.maxFileSize) {
        throw new Error('File too large to read');
      }
      
      const content = await fs.readFile(fullPath, 'utf-8');
      const extension = path.extname(fullPath);
      
      return {
        path: filePath,
        content,
        size: stats.size,
        modified: stats.mtime,
        extension,
        language: this.detectLanguage(extension),
        encoding: 'utf-8'
      };
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }
  
  async writeFile(filePath, content, options = {}) {
    try {
      const fullPath = this.resolvePath(filePath);
      const directory = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      await fs.mkdir(directory, { recursive: true });
      
      // Validate file extension
      const extension = path.extname(fullPath);
      if (!this.allowedExtensions.has(extension) && !options.force) {
        throw new Error(`File extension ${extension} not allowed`);
      }
      
      await fs.writeFile(fullPath, content, 'utf-8');
      
      const stats = await fs.stat(fullPath);
      
      return {
        path: filePath,
        size: stats.size,
        modified: stats.mtime,
        created: options.isNew || false
      };
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }
  
  async deleteFile(filePath) {
    try {
      const fullPath = this.resolvePath(filePath);
      await this.validatePath(fullPath);
      
      await fs.unlink(fullPath);
      
      return { path: filePath, deleted: true };
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }
  
  async createDirectory(dirPath) {
    try {
      const fullPath = this.resolvePath(dirPath);
      await fs.mkdir(fullPath, { recursive: true });
      
      return { path: dirPath, created: true };
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }
  
  async listDirectory(dirPath = '.', options = {}) {
    try {
      const fullPath = this.resolvePath(dirPath);
      await this.validatePath(fullPath);
      
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const items = [];
      
      for (const entry of entries) {
        // Skip hidden files unless explicitly requested
        if (entry.name.startsWith('.') && !options.includeHidden) {
          continue;
        }
        
        const itemPath = path.join(dirPath, entry.name);
        const fullItemPath = path.join(fullPath, entry.name);
        
        try {
          const stats = await fs.stat(fullItemPath);
          
          items.push({
            name: entry.name,
            path: itemPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: entry.isFile() ? stats.size : null,
            modified: stats.mtime,
            extension: entry.isFile() ? path.extname(entry.name) : null,
            language: entry.isFile() ? this.detectLanguage(path.extname(entry.name)) : null
          });
        } catch (statError) {
          // Skip files we can't stat (permissions, etc.)
          continue;
        }
      }
      
      // Sort: directories first, then files alphabetically
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      return items;
    } catch (error) {
      throw new Error(`Failed to list directory ${dirPath}: ${error.message}`);
    }
  }
  
  async searchFiles(query, options = {}) {
    const {
      directory = '.',
      extensions = [],
      includeContent = false,
      caseSensitive = false,
      maxResults = 100
    } = options;
    
    try {
      const fullPath = this.resolvePath(directory);
      const results = [];
      
      const searchInDirectory = async (dirPath) => {
        if (results.length >= maxResults) return;
        
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          
          const entryPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(fullPath, entryPath);
          
          // Skip hidden files and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }
          
          if (entry.isDirectory()) {
            await searchInDirectory(entryPath);
          } else {
            const extension = path.extname(entry.name);
            
            // Filter by extension if specified
            if (extensions.length > 0 && !extensions.includes(extension)) {
              continue;
            }
            
            // Check filename match
            const nameMatch = caseSensitive 
              ? entry.name.includes(query)
              : entry.name.toLowerCase().includes(query.toLowerCase());
            
            let contentMatch = false;
            let matchedLines = [];
            
            // Check content match if requested
            if (includeContent && this.allowedExtensions.has(extension)) {
              try {
                const content = await fs.readFile(entryPath, 'utf-8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                  const lineMatch = caseSensitive
                    ? line.includes(query)
                    : line.toLowerCase().includes(query.toLowerCase());
                  
                  if (lineMatch) {
                    contentMatch = true;
                    matchedLines.push({
                      lineNumber: index + 1,
                      content: line.trim(),
                      context: lines.slice(Math.max(0, index - 1), index + 2)
                    });
                  }
                });
              } catch (readError) {
                // Skip files we can't read
              }
            }
            
            if (nameMatch || contentMatch) {
              results.push({
                path: relativePath,
                name: entry.name,
                type: 'file',
                extension,
                language: this.detectLanguage(extension),
                matchType: nameMatch ? 'filename' : 'content',
                matchedLines: includeContent ? matchedLines : undefined
              });
            }
          }
        }
      };
      
      await searchInDirectory(fullPath);
      
      return results;
    } catch (error) {
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }
  
  // File Watching
  watchFile(filePath, callback) {
    const fullPath = this.resolvePath(filePath);
    
    if (this.watchers.has(filePath)) {
      this.watchers.get(filePath).close();
    }
    
    const watcher = chokidar.watch(fullPath, {
      persistent: true,
      ignoreInitial: true
    });
    
    watcher.on('all', (event, path) => {
      callback(event, path);
    });
    
    this.watchers.set(filePath, watcher);
  }
  
  unwatchFile(filePath) {
    if (this.watchers.has(filePath)) {
      this.watchers.get(filePath).close();
      this.watchers.delete(filePath);
    }
  }
  
  // Project Analysis
  async analyzeProject(rootPath = '.') {
    try {
      const fullPath = this.resolvePath(rootPath);
      const analysis = {
        root: rootPath,
        totalFiles: 0,
        totalSize: 0,
        languages: {},
        structure: {},
        packageFiles: [],
        configFiles: [],
        testFiles: []
      };
      
      const analyzeDirectory = async (dirPath, structure) => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') && entry.name !== '.env') {
            continue;
          }
          
          const entryPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules') continue;
            
            structure[entry.name] = {};
            await analyzeDirectory(entryPath, structure[entry.name]);
          } else {
            const stats = await fs.stat(entryPath);
            const extension = path.extname(entry.name);
            const language = this.detectLanguage(extension);
            
            analysis.totalFiles++;
            analysis.totalSize += stats.size;
            
            if (language !== 'unknown') {
              analysis.languages[language] = (analysis.languages[language] || 0) + 1;
            }
            
            // Categorize special files
            if (['package.json', 'package-lock.json', 'yarn.lock', 'requirements.txt', 'Cargo.toml', 'go.mod'].includes(entry.name)) {
              analysis.packageFiles.push(path.relative(fullPath, entryPath));
            }
            
            if (entry.name.includes('config') || entry.name.includes('.config.') || ['.env', '.gitignore', 'tsconfig.json'].includes(entry.name)) {
              analysis.configFiles.push(path.relative(fullPath, entryPath));
            }
            
            if (entry.name.includes('test') || entry.name.includes('spec') || entry.name.includes('.test.') || entry.name.includes('.spec.')) {
              analysis.testFiles.push(path.relative(fullPath, entryPath));
            }
            
            structure[entry.name] = {
              type: 'file',
              size: stats.size,
              language
            };
          }
        }
      };
      
      await analyzeDirectory(fullPath, analysis.structure);
      
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze project: ${error.message}`);
    }
  }
  
  // Utility Methods
  resolvePath(filePath) {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.workspaceRoot, filePath);
  }
  
  async validatePath(fullPath) {
    // Ensure path is within workspace
    const relativePath = path.relative(this.workspaceRoot, fullPath);
    if (relativePath.startsWith('..')) {
      throw new Error('Path outside workspace not allowed');
    }
    
    // Check if path exists
    try {
      await fs.access(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('File or directory not found');
      }
      throw error;
    }
  }
  
  detectLanguage(extension) {
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.vue': 'vue',
      '.svelte': 'svelte',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.md': 'markdown',
      '.txt': 'text',
      '.log': 'text',
      '.env': 'text',
      '.gitignore': 'text',
      '.sql': 'sql',
      '.graphql': 'graphql',
      '.gql': 'graphql',
      '.proto': 'protobuf',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.fish': 'shell',
      '.ps1': 'powershell'
    };
    
    return languageMap[extension] || 'unknown';
  }
  
  // Cleanup
  destroy() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }
}