import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const GitContext = createContext();

export const useGit = () => {
  const context = useContext(GitContext);
  if (!context) {
    throw new Error('useGit must be used within a GitProvider');
  }
  return context;
};

export const GitProvider = ({ children }) => {
  const [isRepo, setIsRepo] = useState(false);
  const [status, setStatus] = useState(null);
  const [branches, setBranches] = useState({ current: null, local: [], remote: [] });
  const [commits, setCommits] = useState([]);
  const [remotes, setRemotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // API helper
  const apiRequest = useCallback(async (endpoint, options = {}) => {
    try {
      const response = await fetch(`/api/git${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Git API error:', error);
      throw error;
    }
  }, []);

  // Status operations
  const getStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await apiRequest('/status');
      setStatus(data);
      setIsRepo(data.isRepo);
      
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  const refreshStatus = useCallback(() => {
    return getStatus();
  }, [getStatus]);

  // Branch operations
  const getBranches = useCallback(async () => {
    try {
      const data = await apiRequest('/branches');
      setBranches(data);
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  const createBranch = useCallback(async (name, options = {}) => {
    try {
      const data = await apiRequest('/branches', {
        method: 'POST',
        body: JSON.stringify({ name, ...options })
      });
      
      // Refresh branches after creation
      getBranches();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getBranches]);

  const switchBranch = useCallback(async (branchName) => {
    try {
      const data = await apiRequest(`/branches/${branchName}`, {
        method: 'PUT'
      });
      
      // Refresh status and branches
      getStatus();
      getBranches();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getStatus, getBranches]);

  const deleteBranch = useCallback(async (branchName, force = false) => {
    try {
      const data = await apiRequest(`/branches/${branchName}?force=${force}`, {
        method: 'DELETE'
      });
      
      // Refresh branches after deletion
      getBranches();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getBranches]);

  const mergeBranch = useCallback(async (branchName, options = {}) => {
    try {
      const data = await apiRequest('/merge', {
        method: 'POST',
        body: JSON.stringify({ branchName, ...options })
      });
      
      // Refresh status after merge
      getStatus();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getStatus]);

  // Commit operations
  const getCommitHistory = useCallback(async (options = {}) => {
    try {
      const { maxCount = 50, filePath } = options;
      const params = new URLSearchParams({ maxCount: maxCount.toString() });
      if (filePath) params.append('filePath', filePath);
      
      const data = await apiRequest(`/history?${params}`);
      setCommits(data.commits || []);
      
      return data.commits || [];
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  const stageFiles = useCallback(async (files) => {
    try {
      const data = await apiRequest('/stage', {
        method: 'POST',
        body: JSON.stringify({ files })
      });
      
      // Refresh status after staging
      getStatus();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getStatus]);

  const unstageFiles = useCallback(async (files) => {
    try {
      const data = await apiRequest('/unstage', {
        method: 'POST',
        body: JSON.stringify({ files })
      });
      
      // Refresh status after unstaging
      getStatus();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getStatus]);

  const commit = useCallback(async (message, options = {}) => {
    try {
      const data = await apiRequest('/commit', {
        method: 'POST',
        body: JSON.stringify({ message, ...options })
      });
      
      // Refresh status and history after commit
      getStatus();
      getCommitHistory();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getStatus, getCommitHistory]);

  // Remote operations
  const getRemotes = useCallback(async () => {
    try {
      const data = await apiRequest('/remotes');
      setRemotes(data.remotes || []);
      return data.remotes || [];
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  const addRemote = useCallback(async (name, url) => {
    try {
      const data = await apiRequest('/remotes', {
        method: 'POST',
        body: JSON.stringify({ name, url })
      });
      
      // Refresh remotes after adding
      getRemotes();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getRemotes]);

  const pull = useCallback(async (options = {}) => {
    try {
      const data = await apiRequest('/pull', {
        method: 'POST',
        body: JSON.stringify(options)
      });
      
      // Refresh status and history after pull
      getStatus();
      getCommitHistory();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getStatus, getCommitHistory]);

  const push = useCallback(async (options = {}) => {
    try {
      const data = await apiRequest('/push', {
        method: 'POST',
        body: JSON.stringify(options)
      });
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  // Diff operations
  const getDiff = useCallback(async (options = {}) => {
    try {
      const { staged = false, filePath, commitHash } = options;
      const params = new URLSearchParams({ staged: staged.toString() });
      if (filePath) params.append('filePath', filePath);
      if (commitHash) params.append('commitHash', commitHash);
      
      const data = await apiRequest(`/diff?${params}`);
      return data.diff || '';
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  // File history operations
  const getFileHistory = useCallback(async (filePath, options = {}) => {
    try {
      const { maxCount = 20 } = options;
      const params = new URLSearchParams({ maxCount: maxCount.toString() });
      
      const data = await apiRequest(`/history/${encodeURIComponent(filePath)}?${params}`);
      return data.history || [];
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  const getFileBlame = useCallback(async (filePath) => {
    try {
      const data = await apiRequest(`/blame/${encodeURIComponent(filePath)}`);
      return data.blame || [];
    } catch (error) {
      throw error;
    }
  }, [apiRequest]);

  // Repository initialization
  const initRepository = useCallback(async () => {
    try {
      const data = await apiRequest('/init', {
        method: 'POST'
      });
      
      // Refresh status after initialization
      getStatus();
      
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getStatus]);

  // Batch operations
  const batchOperation = useCallback(async (operations) => {
    try {
      const data = await apiRequest('/batch', {
        method: 'POST',
        body: JSON.stringify({ operations })
      });
      
      // Refresh status after batch operations
      getStatus();
      
      return data.results || [];
    } catch (error) {
      throw error;
    }
  }, [apiRequest, getStatus]);

  // Utility methods
  const isFileStaged = useCallback((filePath) => {
    return status?.staged?.includes(filePath) || false;
  }, [status]);

  const isFileModified = useCallback((filePath) => {
    return status?.modified?.includes(filePath) || false;
  }, [status]);

  const isFileUntracked = useCallback((filePath) => {
    return status?.not_added?.includes(filePath) || false;
  }, [status]);

  const getFileStatus = useCallback((filePath) => {
    if (isFileStaged(filePath)) return 'staged';
    if (isFileModified(filePath)) return 'modified';
    if (isFileUntracked(filePath)) return 'untracked';
    return 'clean';
  }, [isFileStaged, isFileModified, isFileUntracked]);

  const hasChanges = useCallback(() => {
    return status && (
      (status.staged && status.staged.length > 0) ||
      (status.modified && status.modified.length > 0) ||
      (status.not_added && status.not_added.length > 0) ||
      (status.deleted && status.deleted.length > 0)
    );
  }, [status]);

  const canCommit = useCallback(() => {
    return status && status.staged && status.staged.length > 0;
  }, [status]);

  const isBehind = useCallback(() => {
    return status && status.behind > 0;
  }, [status]);

  const isAhead = useCallback(() => {
    return status && status.ahead > 0;
  }, [status]);

  // Initialize git data
  useEffect(() => {
    const initialize = async () => {
      try {
        await getStatus();
        if (isRepo) {
          getBranches();
          getCommitHistory({ maxCount: 20 });
          getRemotes();
        }
      } catch (error) {
        console.error('Failed to initialize Git context:', error);
      }
    };

    initialize();
  }, []);

  const value = {
    // State
    isRepo,
    status,
    branches,
    commits,
    remotes,
    isLoading,
    error,
    
    // Status operations
    getStatus,
    refreshStatus,
    
    // Branch operations
    getBranches,
    createBranch,
    switchBranch,
    deleteBranch,
    mergeBranch,
    
    // Commit operations
    getCommitHistory,
    stageFiles,
    unstageFiles,
    commit,
    
    // Remote operations
    getRemotes,
    addRemote,
    pull,
    push,
    
    // Diff operations
    getDiff,
    
    // File operations
    getFileHistory,
    getFileBlame,
    
    // Repository operations
    initRepository,
    batchOperation,
    
    // Utility methods
    isFileStaged,
    isFileModified,
    isFileUntracked,
    getFileStatus,
    hasChanges,
    canCommit,
    isBehind,
    isAhead
  };

  return (
    <GitContext.Provider value={value}>
      {children}
    </GitContext.Provider>
  );
};