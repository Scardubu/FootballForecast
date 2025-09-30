import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MockDataProvider } from '@/lib/mock-data-provider';

interface OfflineIndicatorProps {
  className?: string;
  variant?: 'default' | 'subtle' | 'inline';
  showIcon?: boolean;
}

export function OfflineIndicator({ 
  className = '', 
  variant = 'default',
  showIcon = true 
}: OfflineIndicatorProps) {
  const [isOffline, setIsOffline] = React.useState(MockDataProvider.isOfflineMode());

  React.useEffect(() => {
    const handleServerStatusChange = () => {
      setIsOffline(MockDataProvider.isOfflineMode());
    };

    window.addEventListener('serverStatusChange', handleServerStatusChange);
    return () => window.removeEventListener('serverStatusChange', handleServerStatusChange);
  }, []);

  if (!isOffline) return null;

  const variants = {
    default: 'bg-amber-100 text-amber-800 border-amber-200',
    subtle: 'bg-gray-100 text-gray-600 border-gray-200',
    inline: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  const content = (
    <>
      {showIcon && <i className="fas fa-wifi-slash text-xs mr-1" aria-hidden="true" />}
      <span className="text-xs font-medium">Mock Data</span>
    </>
  );

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${variants[variant]} ${className}`}>
        {content}
      </span>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`${variants[variant]} ${className}`}
    >
      {content}
    </Badge>
  );
}

// Hook to check offline status
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = React.useState(MockDataProvider.isOfflineMode());

  React.useEffect(() => {
    const handleServerStatusChange = () => {
      setIsOffline(MockDataProvider.isOfflineMode());
    };

    window.addEventListener('serverStatusChange', handleServerStatusChange);
    return () => window.removeEventListener('serverStatusChange', handleServerStatusChange);
  }, []);

  return isOffline;
}
