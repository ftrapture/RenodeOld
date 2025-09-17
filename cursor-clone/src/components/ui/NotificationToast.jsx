import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const NotificationToast = ({ 
  type = 'info', 
  title, 
  message, 
  duration = 5000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 50);

    // Auto-close if duration is set
    if (duration > 0) {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          return Math.max(0, newProgress);
        });
      }, 100);

      const closeTimer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(closeTimer);
      };
    }
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Wait for animation
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500/90',
          borderColor: 'border-green-400',
          textColor: 'text-green-900',
          progressColor: 'bg-green-600'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-500/90',
          borderColor: 'border-yellow-400',
          textColor: 'text-yellow-900',
          progressColor: 'bg-yellow-600'
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-500/90',
          borderColor: 'border-red-400',
          textColor: 'text-red-900',
          progressColor: 'bg-red-600'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-500/90',
          borderColor: 'border-blue-400',
          textColor: 'text-blue-900',
          progressColor: 'bg-blue-600'
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <div className={`
      transform transition-all duration-200 ease-out
      ${isVisible 
        ? 'translate-x-0 opacity-100 scale-100' 
        : 'translate-x-full opacity-0 scale-95'
      }
    `}>
      <div className={`
        min-w-80 max-w-96 rounded-lg shadow-lg border backdrop-blur-sm
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        relative overflow-hidden
      `}>
        {/* Progress bar */}
        {duration > 0 && (
          <div className="absolute top-0 left-0 h-1 bg-black/10">
            <div 
              className={`h-full transition-all duration-100 ease-linear ${config.progressColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <Icon size={20} className="flex-shrink-0 mt-0.5" />
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              {title && (
                <div className="font-semibold text-sm mb-1">
                  {title}
                </div>
              )}
              {message && (
                <div className="text-sm opacity-90">
                  {message}
                </div>
              )}
            </div>
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;