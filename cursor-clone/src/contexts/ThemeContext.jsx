import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const themes = {
  'vs-dark': {
    name: 'Dark (Visual Studio)',
    type: 'dark',
    monaco: 'vs-dark',
    colors: {
      primary: '#007acc',
      background: '#1e1e1e',
      backgroundSecondary: '#252526',
      backgroundTertiary: '#2d2d2d',
      border: '#3e3e3e',
      text: '#cccccc',
      textSecondary: '#9d9d9d',
      textMuted: '#6a6a6a',
      accent: '#007acc',
      accentHover: '#005a9e',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3'
    }
  },
  'vs-light': {
    name: 'Light (Visual Studio)',
    type: 'light',
    monaco: 'vs',
    colors: {
      primary: '#0066cc',
      background: '#ffffff',
      backgroundSecondary: '#f3f3f3',
      backgroundTertiary: '#e8e8e8',
      border: '#d4d4d4',
      text: '#333333',
      textSecondary: '#666666',
      textMuted: '#999999',
      accent: '#0066cc',
      accentHover: '#004499',
      success: '#388e3c',
      warning: '#f57c00',
      error: '#d32f2f',
      info: '#1976d2'
    }
  },
  'hc-black': {
    name: 'High Contrast Dark',
    type: 'dark',
    monaco: 'hc-black',
    colors: {
      primary: '#ffffff',
      background: '#000000',
      backgroundSecondary: '#0c0c0c',
      backgroundTertiary: '#1a1a1a',
      border: '#6fc3df',
      text: '#ffffff',
      textSecondary: '#ffffff',
      textMuted: '#c8c8c8',
      accent: '#ffffff',
      accentHover: '#e0e0e0',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00ffff'
    }
  },
  'hc-light': {
    name: 'High Contrast Light',
    type: 'light',
    monaco: 'hc-light',
    colors: {
      primary: '#000000',
      background: '#ffffff',
      backgroundSecondary: '#f0f0f0',
      backgroundTertiary: '#e0e0e0',
      border: '#0f4a85',
      text: '#000000',
      textSecondary: '#000000',
      textMuted: '#333333',
      accent: '#000000',
      accentHover: '#333333',
      success: '#006600',
      warning: '#cc6600',
      error: '#cc0000',
      info: '#0066cc'
    }
  },
  'github-dark': {
    name: 'GitHub Dark',
    type: 'dark',
    monaco: 'vs-dark',
    colors: {
      primary: '#58a6ff',
      background: '#0d1117',
      backgroundSecondary: '#161b22',
      backgroundTertiary: '#21262d',
      border: '#30363d',
      text: '#c9d1d9',
      textSecondary: '#8b949e',
      textMuted: '#6e7681',
      accent: '#58a6ff',
      accentHover: '#4184e4',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      info: '#58a6ff'
    }
  },
  'github-light': {
    name: 'GitHub Light',
    type: 'light',
    monaco: 'vs',
    colors: {
      primary: '#0969da',
      background: '#ffffff',
      backgroundSecondary: '#f6f8fa',
      backgroundTertiary: '#eaeef2',
      border: '#d1d9e0',
      text: '#24292f',
      textSecondary: '#656d76',
      textMuted: '#8c959f',
      accent: '#0969da',
      accentHover: '#0550ae',
      success: '#1a7f37',
      warning: '#9a6700',
      error: '#d1242f',
      info: '#0969da'
    }
  },
  'monokai': {
    name: 'Monokai',
    type: 'dark',
    monaco: 'vs-dark',
    colors: {
      primary: '#a6e22e',
      background: '#272822',
      backgroundSecondary: '#2f3129',
      backgroundTertiary: '#383830',
      border: '#49483e',
      text: '#f8f8f2',
      textSecondary: '#a6a6a6',
      textMuted: '#75715e',
      accent: '#a6e22e',
      accentHover: '#8fc029',
      success: '#a6e22e',
      warning: '#e6db74',
      error: '#f92672',
      info: '#66d9ef'
    }
  },
  'solarized-dark': {
    name: 'Solarized Dark',
    type: 'dark',
    monaco: 'vs-dark',
    colors: {
      primary: '#268bd2',
      background: '#002b36',
      backgroundSecondary: '#073642',
      backgroundTertiary: '#0f4a54',
      border: '#586e75',
      text: '#839496',
      textSecondary: '#657b83',
      textMuted: '#586e75',
      accent: '#268bd2',
      accentHover: '#2176bd',
      success: '#859900',
      warning: '#b58900',
      error: '#dc322f',
      info: '#268bd2'
    }
  },
  'solarized-light': {
    name: 'Solarized Light',
    type: 'light',
    monaco: 'vs',
    colors: {
      primary: '#268bd2',
      background: '#fdf6e3',
      backgroundSecondary: '#eee8d5',
      backgroundTertiary: '#e4dcc6',
      border: '#93a1a1',
      text: '#657b83',
      textSecondary: '#586e75',
      textMuted: '#93a1a1',
      accent: '#268bd2',
      accentHover: '#2176bd',
      success: '#859900',
      warning: '#b58900',
      error: '#dc322f',
      info: '#268bd2'
    }
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('vs-dark');
  const [customThemes, setCustomThemes] = useState({});
  const [systemPreference, setSystemPreference] = useState('dark');

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light');
    
    const handleChange = (e) => {
      setSystemPreference(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('cursor-theme');
    if (savedTheme && (themes[savedTheme] || customThemes[savedTheme])) {
      setCurrentTheme(savedTheme);
    }
    
    // Load custom themes
    const savedCustomThemes = localStorage.getItem('cursor-custom-themes');
    if (savedCustomThemes) {
      try {
        setCustomThemes(JSON.parse(savedCustomThemes));
      } catch (error) {
        console.error('Failed to load custom themes:', error);
      }
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const theme = themes[currentTheme] || customThemes[currentTheme];
    if (!theme) return;

    const root = document.documentElement;
    const { colors } = theme;

    // Apply CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply theme class
    root.className = root.className.replace(/theme-\w+/g, '');
    root.classList.add(`theme-${currentTheme}`);
    
    // Save to localStorage
    localStorage.setItem('cursor-theme', currentTheme);
  }, [currentTheme, customThemes]);

  const changeTheme = useCallback((themeId) => {
    if (themes[themeId] || customThemes[themeId]) {
      setCurrentTheme(themeId);
    }
  }, [customThemes]);

  const getTheme = useCallback((themeId = currentTheme) => {
    return themes[themeId] || customThemes[themeId] || themes['vs-dark'];
  }, [currentTheme, customThemes]);

  const getAllThemes = useCallback(() => {
    return { ...themes, ...customThemes };
  }, [customThemes]);

  const getThemesByType = useCallback((type) => {
    const allThemes = getAllThemes();
    return Object.entries(allThemes)
      .filter(([_, theme]) => theme.type === type)
      .reduce((acc, [id, theme]) => {
        acc[id] = theme;
        return acc;
      }, {});
  }, [getAllThemes]);

  const createCustomTheme = useCallback((themeId, themeConfig) => {
    const newCustomThemes = {
      ...customThemes,
      [themeId]: {
        ...themeConfig,
        custom: true
      }
    };
    
    setCustomThemes(newCustomThemes);
    localStorage.setItem('cursor-custom-themes', JSON.stringify(newCustomThemes));
    
    return themeId;
  }, [customThemes]);

  const updateCustomTheme = useCallback((themeId, updates) => {
    if (!customThemes[themeId]) return false;
    
    const newCustomThemes = {
      ...customThemes,
      [themeId]: {
        ...customThemes[themeId],
        ...updates
      }
    };
    
    setCustomThemes(newCustomThemes);
    localStorage.setItem('cursor-custom-themes', JSON.stringify(newCustomThemes));
    
    return true;
  }, [customThemes]);

  const deleteCustomTheme = useCallback((themeId) => {
    if (!customThemes[themeId]) return false;
    
    const newCustomThemes = { ...customThemes };
    delete newCustomThemes[themeId];
    
    setCustomThemes(newCustomThemes);
    localStorage.setItem('cursor-custom-themes', JSON.stringify(newCustomThemes));
    
    // Switch to default theme if current theme was deleted
    if (currentTheme === themeId) {
      setCurrentTheme('vs-dark');
    }
    
    return true;
  }, [customThemes, currentTheme]);

  const exportTheme = useCallback((themeId) => {
    const theme = getTheme(themeId);
    if (!theme) return null;
    
    return {
      id: themeId,
      ...theme,
      exportedAt: new Date().toISOString()
    };
  }, [getTheme]);

  const importTheme = useCallback((themeData) => {
    try {
      const { id, exportedAt, custom, ...themeConfig } = themeData;
      
      if (!id || !themeConfig.name || !themeConfig.colors) {
        throw new Error('Invalid theme data');
      }
      
      const themeId = custom ? id : `imported-${id}-${Date.now()}`;
      return createCustomTheme(themeId, themeConfig);
    } catch (error) {
      console.error('Failed to import theme:', error);
      return null;
    }
  }, [createCustomTheme]);

  const resetToDefault = useCallback(() => {
    setCurrentTheme('vs-dark');
  }, []);

  const toggleThemeType = useCallback(() => {
    const currentThemeData = getTheme();
    const oppositeType = currentThemeData.type === 'dark' ? 'light' : 'dark';
    
    // Find a theme of the opposite type
    const oppositeThemes = getThemesByType(oppositeType);
    const themeIds = Object.keys(oppositeThemes);
    
    if (themeIds.length > 0) {
      // Prefer vs-dark/vs-light as defaults
      const preferredTheme = oppositeType === 'dark' ? 'vs-dark' : 'vs-light';
      const newTheme = oppositeThemes[preferredTheme] ? preferredTheme : themeIds[0];
      changeTheme(newTheme);
    }
  }, [getTheme, getThemesByType, changeTheme]);

  const matchSystemTheme = useCallback(() => {
    const preferredTheme = systemPreference === 'dark' ? 'vs-dark' : 'vs-light';
    changeTheme(preferredTheme);
  }, [systemPreference, changeTheme]);

  // Utility methods
  const isDarkTheme = useCallback(() => {
    return getTheme().type === 'dark';
  }, [getTheme]);

  const isLightTheme = useCallback(() => {
    return getTheme().type === 'light';
  }, [getTheme]);

  const getMonacoTheme = useCallback(() => {
    return getTheme().monaco;
  }, [getTheme]);

  const getThemeColors = useCallback(() => {
    return getTheme().colors;
  }, [getTheme]);

  const value = {
    // Current theme
    currentTheme,
    theme: getTheme(),
    colors: getThemeColors(),
    monacoTheme: getMonacoTheme(),
    
    // Theme management
    changeTheme,
    getTheme,
    getAllThemes,
    getThemesByType,
    
    // Custom themes
    createCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    customThemes,
    
    // Import/Export
    exportTheme,
    importTheme,
    
    // Utilities
    resetToDefault,
    toggleThemeType,
    matchSystemTheme,
    isDarkTheme,
    isLightTheme,
    systemPreference,
    
    // Theme data
    themes: getAllThemes()
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};