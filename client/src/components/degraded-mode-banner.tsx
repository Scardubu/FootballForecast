import React from 'react';
import { Button } from '@/components/ui/button';

export function DegradedModeBanner() {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isServerDown, setIsServerDown] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        try {
          const res = await fetch('/api/health', { 
            credentials: 'include',
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (!res.ok) {
            if (!cancelled) {
              setMessage('API server is not responding correctly. Some features may be unavailable.');
              setVisible(true);
            }
            return;
          }
          
          const data = await res.json().catch(() => ({}));
          if (cancelled) {
            return;
          }

          setIsServerDown(false);
          setIsInitialLoad(false);
          localStorage.setItem('serverStatus', 'online');
          window.dispatchEvent(new Event('serverStatusChange'));

          if (data?.status === 'degraded') {
            // Check if it's just ML service unavailable (which is optional)
            if (data?.ml === 'unavailable' && data?.db === 'healthy') {
              // ML service is optional - don't show degraded mode banner
              setVisible(false);
              setMessage(null);
            } else {
              setMessage(data?.message || 'Some live features are unavailable until configuration is completed.');
              setVisible(true);
            }
          } else {
            setVisible(false);
            setMessage(null);
          }
        } catch (error) {
          clearTimeout(timeoutId);
          if (!cancelled) {
            // Only show error if not initial load (prevents flash of error on page load)
            if (!isInitialLoad) {
              // Show server connection error message
              setIsServerDown(true);
              setMessage('Server connection failed. Running in offline mode with limited functionality.');
              setVisible(true);
              
              // Store server status in localStorage for other components to check
              localStorage.setItem('serverStatus', 'offline');
              window.dispatchEvent(new Event('serverStatusChange'));
            } else {
              // On initial load, silently mark as loaded
              setIsInitialLoad(false);
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage('Error checking application health status.');
          setVisible(true);
        }
      }
    }

    // Show in all environments for dev/QA/production visibility
    checkHealth();
    
    // Set up periodic health checks
    const intervalId = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.isServerOffline = false;
      localStorage.setItem('serverStatus', 'online');
      window.dispatchEvent(new Event('serverStatusChange'));
    };
  }, []);

  // Expose server status to window for other components to check
  React.useEffect(() => {
    window.isServerOffline = isServerDown;
    localStorage.setItem('serverStatus', isServerDown ? 'offline' : 'online');
    window.dispatchEvent(new Event('serverStatusChange'));
  }, [isServerDown]);

  if (!visible) return null;

  // Use different styling based on server status
  const bgColor = isServerDown ? "bg-red-100/70" : "bg-amber-100/70";
  const borderColor = isServerDown ? "border-red-300/60" : "border-amber-300/60";
  const textColor = isServerDown ? "text-red-900" : "text-amber-900";
  const icon = isServerDown ? "fa-server" : "fa-triangle-exclamation";

  return (
    <div className={`w-full ${bgColor} border-b ${borderColor} ${textColor}`}>
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="glass-effect hover-lift smooth-transition px-4 py-3 rounded-xl border border-white/30 flex flex-col gap-2">
          <div className="flex items-start md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3">
              <i className={`fas ${icon}`} aria-hidden="true"></i>
              <p className="text-sm">
              {isServerDown ? (
                <>
                  <strong>Server connection error</strong>. {message}
                  {import.meta.env.DEV && ' Try running the server with npm run dev in a separate terminal.'}
                </>
              ) : (
                <>
                  Running in <strong>degraded mode</strong>. {message}
                  {' '}Admin: Set API keys in Netlify Environment to enable full functionality.
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {isServerDown && (
              <button
                className="text-sm underline underline-offset-2 hover:opacity-80"
                onClick={() => setShowHelp(!showHelp)}
                aria-label={showHelp ? "Hide help" : "Show help"}
              >
                {showHelp ? "Hide help" : "Show help"}
              </button>
            )}
            <button
              className="text-sm underline underline-offset-2 hover:opacity-80"
              onClick={() => setVisible(false)}
              aria-label="Dismiss notice"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        {showHelp && isServerDown && (
          <div className="mt-2 p-3 rounded text-sm bg-white/60 dark:bg-slate-900/50 border border-white/30 dark:border-slate-800/40">
            <h4 className="font-medium mb-1">Troubleshooting Steps:</h4>
            <ol className="list-decimal pl-5 space-y-1">
              <li>The application is running in <strong>offline mode</strong> with mock data.</li>
              <li>To use real data, start the server with <code className="bg-white/70 px-1 rounded">npm run dev</code> in a terminal.</li>
              <li>Make sure port 5000 is not in use by another application.</li>
              <li>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-1"
                  onClick={() => window.location.reload()}
                >
                  <i className="fas fa-refresh mr-1"></i> Refresh Page
                </Button>
              </li>
            </ol>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
