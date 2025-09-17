import express from 'express';

export function setupGitRoutes(gitManager) {
  const router = express.Router();
  
  // Get repository status
  router.get('/status', async (req, res) => {
    try {
      const status = await gitManager.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get branches
  router.get('/branches', async (req, res) => {
    try {
      const branches = await gitManager.getBranches();
      res.json(branches);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get commit history
  router.get('/history', async (req, res) => {
    try {
      const { maxCount = 50, filePath } = req.query;
      const commits = await gitManager.getCommitHistory({
        maxCount: parseInt(maxCount),
        filePath
      });
      res.json({ commits });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get diff
  router.get('/diff', async (req, res) => {
    try {
      const { staged = false, filePath, commitHash } = req.query;
      const diff = await gitManager.getDiff({
        staged: staged === 'true',
        filePath,
        commitHash
      });
      res.json({ diff });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Stage files
  router.post('/stage', async (req, res) => {
    try {
      const { files } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required' });
      }
      
      const result = await gitManager.stageFiles(files);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Unstage files
  router.post('/unstage', async (req, res) => {
    try {
      const { files } = req.body;
      
      if (!files || !Array.isArray(files)) {
        return res.status(400).json({ error: 'Files array is required' });
      }
      
      const result = await gitManager.unstageFiles(files);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Create commit
  router.post('/commit', async (req, res) => {
    try {
      const { message, amend = false, author } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Commit message is required' });
      }
      
      const result = await gitManager.commit(message, { amend, author });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Create branch
  router.post('/branches', async (req, res) => {
    try {
      const { name, checkout = true, startPoint } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Branch name is required' });
      }
      
      const result = await gitManager.createBranch(name, { checkout, startPoint });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Switch branch
  router.put('/branches/:branchName', async (req, res) => {
    try {
      const { branchName } = req.params;
      const result = await gitManager.switchBranch(branchName);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Delete branch
  router.delete('/branches/:branchName', async (req, res) => {
    try {
      const { branchName } = req.params;
      const { force = false } = req.query;
      
      const result = await gitManager.deleteBranch(branchName, { 
        force: force === 'true' 
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Merge branch
  router.post('/merge', async (req, res) => {
    try {
      const { branchName, noFastForward = false } = req.body;
      
      if (!branchName) {
        return res.status(400).json({ error: 'Branch name is required' });
      }
      
      const result = await gitManager.mergeBranch(branchName, { noFastForward });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Pull changes
  router.post('/pull', async (req, res) => {
    try {
      const { remote = 'origin', branch } = req.body;
      const result = await gitManager.pull({ remote, branch });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Push changes
  router.post('/push', async (req, res) => {
    try {
      const { remote = 'origin', branch, setUpstream = false } = req.body;
      const result = await gitManager.push({ remote, branch, setUpstream });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Initialize repository
  router.post('/init', async (req, res) => {
    try {
      const result = await gitManager.initRepository();
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Add remote
  router.post('/remotes', async (req, res) => {
    try {
      const { name, url } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({ error: 'Remote name and URL are required' });
      }
      
      const result = await gitManager.addRemote(name, url);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get remotes
  router.get('/remotes', async (req, res) => {
    try {
      const remotes = await gitManager.getRemotes();
      res.json({ remotes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get file history
  router.get('/history/:filePath(*)', async (req, res) => {
    try {
      const { filePath } = req.params;
      const { maxCount = 20 } = req.query;
      
      const history = await gitManager.getFileHistory(filePath, {
        maxCount: parseInt(maxCount)
      });
      
      res.json({ history, filePath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get file blame
  router.get('/blame/:filePath(*)', async (req, res) => {
    try {
      const { filePath } = req.params;
      const blame = await gitManager.blameFile(filePath);
      res.json({ blame, filePath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Batch git operations
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
            case 'stage':
              result = await gitManager.stageFiles(operation.files);
              break;
            case 'unstage':
              result = await gitManager.unstageFiles(operation.files);
              break;
            case 'commit':
              result = await gitManager.commit(operation.message, operation.options);
              break;
            case 'push':
              result = await gitManager.push(operation.options);
              break;
            case 'pull':
              result = await gitManager.pull(operation.options);
              break;
            default:
              throw new Error(`Unknown operation type: ${operation.type}`);
          }
          
          results.push({ 
            success: true, 
            operation: operation.type, 
            result 
          });
          
        } catch (error) {
          results.push({ 
            success: false, 
            operation: operation.type, 
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