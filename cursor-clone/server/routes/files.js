import express from 'express';
import multer from 'multer';

const upload = multer({ 
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

export function setupFileRoutes(fileSystemManager) {
  const router = express.Router();
  
  // Get file content
  router.get('/*', async (req, res) => {
    try {
      const filePath = req.params[0] || '.';
      
      // Check if it's a directory listing request
      if (req.query.type === 'directory') {
        const items = await fileSystemManager.listDirectory(filePath, {
          includeHidden: req.query.hidden === 'true'
        });
        res.json({ items });
      } else {
        // File content request
        const file = await fileSystemManager.readFile(filePath);
        res.json(file);
      }
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
  
  // Create or update file
  router.put('/*', async (req, res) => {
    try {
      const filePath = req.params[0];
      const { content, options = {} } = req.body;
      
      if (!content && content !== '') {
        return res.status(400).json({ error: 'Content is required' });
      }
      
      const result = await fileSystemManager.writeFile(filePath, content, options);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Delete file
  router.delete('/*', async (req, res) => {
    try {
      const filePath = req.params[0];
      const result = await fileSystemManager.deleteFile(filePath);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Create directory
  router.post('/directories/*', async (req, res) => {
    try {
      const dirPath = req.params[0];
      const result = await fileSystemManager.createDirectory(dirPath);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Search files
  router.post('/search', async (req, res) => {
    try {
      const { 
        query, 
        directory = '.', 
        extensions = [], 
        includeContent = false,
        caseSensitive = false,
        maxResults = 100
      } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const results = await fileSystemManager.searchFiles(query, {
        directory,
        extensions,
        includeContent,
        caseSensitive,
        maxResults
      });
      
      res.json({ results, query });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Upload files
  router.post('/upload', upload.array('files'), async (req, res) => {
    try {
      const { targetDirectory = '.' } = req.body;
      const results = [];
      
      for (const file of req.files) {
        const filePath = `${targetDirectory}/${file.originalname}`;
        const result = await fileSystemManager.writeFile(
          filePath, 
          file.buffer.toString('utf-8'),
          { isNew: true }
        );
        results.push(result);
      }
      
      res.json({ uploaded: results });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Analyze project structure
  router.get('/analysis/project', async (req, res) => {
    try {
      const rootPath = req.query.path || '.';
      const analysis = await fileSystemManager.analyzeProject(rootPath);
      res.json(analysis);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get file statistics
  router.get('/stats/*', async (req, res) => {
    try {
      const filePath = req.params[0];
      const file = await fileSystemManager.readFile(filePath);
      
      // Calculate basic statistics
      const lines = file.content.split('\n');
      const stats = {
        path: filePath,
        size: file.size,
        lines: lines.length,
        characters: file.content.length,
        words: file.content.split(/\s+/).filter(word => word.length > 0).length,
        language: file.language,
        extension: file.extension,
        modified: file.modified,
        encoding: file.encoding
      };
      
      // Language-specific statistics
      if (file.language === 'javascript' || file.language === 'typescript') {
        const functions = (file.content.match(/function\s+\w+/g) || []).length;
        const classes = (file.content.match(/class\s+\w+/g) || []).length;
        const imports = (file.content.match(/import\s+.*from/g) || []).length;
        
        stats.codeStats = { functions, classes, imports };
      }
      
      res.json(stats);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Batch operations
  router.post('/batch', async (req, res) => {
    try {
      const { operations } = req.body;
      
      if (!Array.isArray(operations)) {
        return res.status(400).json({ error: 'Operations must be an array' });
      }
      
      const results = [];
      
      for (const operation of operations) {
        try {
          let result;
          
          switch (operation.type) {
            case 'read':
              result = await fileSystemManager.readFile(operation.path);
              break;
            case 'write':
              result = await fileSystemManager.writeFile(
                operation.path, 
                operation.content, 
                operation.options
              );
              break;
            case 'delete':
              result = await fileSystemManager.deleteFile(operation.path);
              break;
            case 'mkdir':
              result = await fileSystemManager.createDirectory(operation.path);
              break;
            default:
              throw new Error(`Unknown operation type: ${operation.type}`);
          }
          
          results.push({ 
            success: true, 
            operation: operation.type, 
            path: operation.path, 
            result 
          });
          
        } catch (error) {
          results.push({ 
            success: false, 
            operation: operation.type, 
            path: operation.path, 
            error: error.message 
          });
        }
      }
      
      res.json({ results });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  return router;
}