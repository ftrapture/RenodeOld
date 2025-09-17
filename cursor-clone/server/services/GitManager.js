import simpleGit from 'simple-git';
import path from 'path';

export class GitManager {
  constructor() {
    this.workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
    this.git = simpleGit(this.workspaceRoot);
    this.isInitialized = false;
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Check if we're in a git repository
      const isRepo = await this.git.checkIsRepo();
      if (isRepo) {
        this.isInitialized = true;
        console.log('✅ Git repository detected');
      } else {
        console.log('ℹ️  Not in a git repository');
      }
    } catch (error) {
      console.warn('⚠️  Git initialization failed:', error.message);
    }
  }
  
  isReady() {
    return true; // Always ready, even if not in a git repo
  }
  
  async getStatus() {
    try {
      if (!this.isInitialized) {
        return { isRepo: false };
      }
      
      const status = await this.git.status();
      const branch = await this.git.branch();
      
      return {
        isRepo: true,
        current: branch.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        staged: status.staged,
        modified: status.modified,
        not_added: status.not_added,
        deleted: status.deleted,
        renamed: status.renamed,
        conflicted: status.conflicted
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }
  
  async getBranches() {
    try {
      if (!this.isInitialized) {
        return { local: [], remote: [] };
      }
      
      const branches = await this.git.branch(['-a']);
      
      return {
        current: branches.current,
        local: branches.all.filter(branch => !branch.startsWith('remotes/')),
        remote: branches.all.filter(branch => branch.startsWith('remotes/'))
      };
    } catch (error) {
      throw new Error(`Failed to get branches: ${error.message}`);
    }
  }
  
  async getCommitHistory(options = {}) {
    try {
      if (!this.isInitialized) {
        return [];
      }
      
      const { maxCount = 50, filePath = null } = options;
      
      const logOptions = {
        maxCount,
        format: {
          hash: '%H',
          date: '%ai',
          message: '%s',
          author_name: '%an',
          author_email: '%ae'
        }
      };
      
      let log;
      if (filePath) {
        log = await this.git.log({ ...logOptions, file: filePath });
      } else {
        log = await this.git.log(logOptions);
      }
      
      return log.all.map(commit => ({
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: {
          name: commit.author_name,
          email: commit.author_email
        },
        date: new Date(commit.date),
        refs: commit.refs || ''
      }));
    } catch (error) {
      throw new Error(`Failed to get commit history: ${error.message}`);
    }
  }
  
  async getDiff(options = {}) {
    try {
      if (!this.isInitialized) {
        return '';
      }
      
      const { staged = false, filePath = null, commitHash = null } = options;
      
      let diff;
      if (commitHash) {
        // Diff between commit and working directory
        diff = await this.git.diff([commitHash, filePath].filter(Boolean));
      } else if (staged) {
        // Diff of staged changes
        diff = await this.git.diff(['--cached', filePath].filter(Boolean));
      } else {
        // Diff of unstaged changes
        diff = await this.git.diff([filePath].filter(Boolean));
      }
      
      return diff;
    } catch (error) {
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }
  
  async stageFiles(filePaths) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      if (Array.isArray(filePaths)) {
        await this.git.add(filePaths);
      } else {
        await this.git.add(filePaths);
      }
      
      return { staged: filePaths };
    } catch (error) {
      throw new Error(`Failed to stage files: ${error.message}`);
    }
  }
  
  async unstageFiles(filePaths) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      if (Array.isArray(filePaths)) {
        await this.git.reset(['HEAD', ...filePaths]);
      } else {
        await this.git.reset(['HEAD', filePaths]);
      }
      
      return { unstaged: filePaths };
    } catch (error) {
      throw new Error(`Failed to unstage files: ${error.message}`);
    }
  }
  
  async commit(message, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      const { amend = false, author = null } = options;
      
      const commitOptions = [];
      if (amend) commitOptions.push('--amend');
      if (author) commitOptions.push(`--author="${author}"`);
      
      const result = await this.git.commit(message, commitOptions);
      
      return {
        hash: result.commit,
        summary: result.summary,
        branch: result.branch
      };
    } catch (error) {
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }
  
  async createBranch(branchName, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      const { checkout = true, startPoint = null } = options;
      
      if (startPoint) {
        await this.git.checkoutBranch(branchName, startPoint);
      } else if (checkout) {
        await this.git.checkoutLocalBranch(branchName);
      } else {
        await this.git.branch([branchName]);
      }
      
      return { branch: branchName, checkout };
    } catch (error) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }
  
  async switchBranch(branchName) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      await this.git.checkout(branchName);
      
      return { branch: branchName };
    } catch (error) {
      throw new Error(`Failed to switch branch: ${error.message}`);
    }
  }
  
  async deleteBranch(branchName, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      const { force = false } = options;
      
      if (force) {
        await this.git.deleteLocalBranch(branchName, true);
      } else {
        await this.git.deleteLocalBranch(branchName);
      }
      
      return { deleted: branchName };
    } catch (error) {
      throw new Error(`Failed to delete branch: ${error.message}`);
    }
  }
  
  async mergeBranch(branchName, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      const { noFastForward = false } = options;
      
      const mergeOptions = [];
      if (noFastForward) mergeOptions.push('--no-ff');
      
      const result = await this.git.merge([branchName, ...mergeOptions]);
      
      return {
        result: result,
        conflicts: result.conflicts || []
      };
    } catch (error) {
      throw new Error(`Failed to merge branch: ${error.message}`);
    }
  }
  
  async pull(options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      const { remote = 'origin', branch = null } = options;
      
      const result = await this.git.pull(remote, branch);
      
      return {
        summary: result.summary,
        files: result.files,
        insertions: result.insertions,
        deletions: result.deletions
      };
    } catch (error) {
      throw new Error(`Failed to pull: ${error.message}`);
    }
  }
  
  async push(options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      const { remote = 'origin', branch = null, setUpstream = false } = options;
      
      const pushOptions = [];
      if (setUpstream) pushOptions.push('--set-upstream');
      
      const result = await this.git.push(remote, branch, pushOptions);
      
      return { result };
    } catch (error) {
      throw new Error(`Failed to push: ${error.message}`);
    }
  }
  
  async initRepository() {
    try {
      await this.git.init();
      this.isInitialized = true;
      
      return { initialized: true };
    } catch (error) {
      throw new Error(`Failed to initialize repository: ${error.message}`);
    }
  }
  
  async addRemote(name, url) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      await this.git.addRemote(name, url);
      
      return { remote: name, url };
    } catch (error) {
      throw new Error(`Failed to add remote: ${error.message}`);
    }
  }
  
  async getRemotes() {
    try {
      if (!this.isInitialized) {
        return [];
      }
      
      const remotes = await this.git.getRemotes(true);
      
      return remotes.map(remote => ({
        name: remote.name,
        refs: {
          fetch: remote.refs.fetch,
          push: remote.refs.push
        }
      }));
    } catch (error) {
      throw new Error(`Failed to get remotes: ${error.message}`);
    }
  }
  
  async getFileHistory(filePath, options = {}) {
    try {
      if (!this.isInitialized) {
        return [];
      }
      
      const { maxCount = 20 } = options;
      
      const log = await this.git.log({
        file: filePath,
        maxCount,
        format: {
          hash: '%H',
          date: '%ai',
          message: '%s',
          author_name: '%an',
          author_email: '%ae'
        }
      });
      
      return log.all.map(commit => ({
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: {
          name: commit.author_name,
          email: commit.author_email
        },
        date: new Date(commit.date)
      }));
    } catch (error) {
      throw new Error(`Failed to get file history: ${error.message}`);
    }
  }
  
  async blameFile(filePath) {
    try {
      if (!this.isInitialized) {
        throw new Error('Not in a git repository');
      }
      
      // Git blame is not directly supported by simple-git, so we'll use raw git
      const blame = await this.git.raw(['blame', '--line-porcelain', filePath]);
      
      // Parse blame output (simplified)
      const lines = blame.split('\n');
      const blameData = [];
      
      let currentCommit = null;
      let lineNumber = 0;
      
      for (const line of lines) {
        if (line.match(/^[0-9a-f]{40}/)) {
          currentCommit = {
            hash: line.split(' ')[0],
            lineNumber: parseInt(line.split(' ')[2])
          };
        } else if (line.startsWith('author ')) {
          if (currentCommit) {
            currentCommit.author = line.substring(7);
          }
        } else if (line.startsWith('author-time ')) {
          if (currentCommit) {
            currentCommit.date = new Date(parseInt(line.substring(12)) * 1000);
          }
        } else if (line.startsWith('\t')) {
          if (currentCommit) {
            blameData.push({
              ...currentCommit,
              content: line.substring(1),
              shortHash: currentCommit.hash.substring(0, 7)
            });
            currentCommit = null;
          }
        }
      }
      
      return blameData;
    } catch (error) {
      throw new Error(`Failed to blame file: ${error.message}`);
    }
  }
}