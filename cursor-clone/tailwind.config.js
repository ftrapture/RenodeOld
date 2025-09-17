/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code Dark Theme colors
        'vscode': {
          'bg': '#1e1e1e',
          'bg-secondary': '#252526',
          'bg-tertiary': '#2d2d2d',
          'border': '#3e3e3e',
          'text': '#cccccc',
          'text-secondary': '#9d9d9d',
          'accent': '#007acc',
          'accent-hover': '#005a9e',
          'success': '#4caf50',
          'warning': '#ff9800',
          'error': '#f44336',
          'info': '#2196f3'
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
        'sans': ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif']
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem'
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem'
      },
      animation: {
        'typing': 'typing 1s infinite',
        'blink': 'blink 1s infinite',
        'thinking': 'thinking 1.4s infinite ease-in-out',
        'pulse-slow': 'pulse 3s infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out'
      },
      keyframes: {
        typing: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' }
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' }
        },
        thinking: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      backdropBlur: {
        'xs': '2px'
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 122, 204, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 122, 204, 0.4)'
      }
    },
  },
  plugins: [],
}