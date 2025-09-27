import React from 'react';

export function DegradedModeBanner() {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const res = await fetch('/api/health', { credentials: 'include' });
        if (!res.ok) return; // don't show banner if endpoint not available
        const data = await res.json().catch(() => ({}));
        if (!cancelled && (data?.status === 'degraded')) {
          setMessage(data?.message || 'Some live features are unavailable until configuration is completed.');
          setVisible(true);
        }
      } catch {
        // silently ignore
      }
    }

    // Show in all environments for dev/QA/production visibility
    checkHealth();

    return () => { cancelled = true; };
  }, []);

  if (!visible) return null;

  return (
    <div className="w-full bg-amber-100 border-b border-amber-300 text-amber-900">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-start md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <i className="fas fa-triangle-exclamation" aria-hidden="true"></i>
          <p className="text-sm">
            Running in <strong>degraded mode</strong>. {message}
            {' '}Admin: Set API keys in Netlify Environment to enable full functionality.
          </p>
        </div>
        <button
          className="text-sm underline underline-offset-2 hover:opacity-80"
          onClick={() => setVisible(false)}
          aria-label="Dismiss degraded mode notice"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
