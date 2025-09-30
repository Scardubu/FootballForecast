import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SetupRequiredCard() {
  const [show, setShow] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch('/api/health', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data?.status === 'degraded') {
          setMsg(data?.message || 'Serverless API is running in degraded mode.');
          setShow(true);
        }
      } catch {
        // ignore
      }
    }
    if (import.meta.env.PROD) check();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;

  return (
    <Card className={cn(
      'glass-effect hover-lift smooth-transition border border-amber-300/60 text-amber-900',
      'bg-amber-50/80'
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <i className="fas fa-triangle-exclamation" aria-hidden="true"></i>
          Setup Required
        </CardTitle>
      </CardHeader>
      <CardContent className="text-amber-900">
        <p className="mb-3">
          {msg} To enable full functionality (live data, authenticated features, and ML predictions), set the required environment variables in Netlify and redeploy.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><code>API_FOOTBALL_KEY</code> – enables live football data</li>
          <li><code>API_BEARER_TOKEN</code> – secure token for API authentication</li>
          <li><code>SCRAPER_AUTH_TOKEN</code> – secure token for scraper endpoints</li>
          <li><code>DATABASE_URL</code> (optional) – enable persistent storage</li>
          <li><code>ML_SERVICE_URL</code> (optional) – connect the Python ML service</li>
          <li><code>ML_FALLBACK_ENABLED</code> (optional) – allow fallbacks if ML is down</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="default">
            <a href="https://app.netlify.com/sites/resilient-souffle-0daafe/settings/deploys#environment" target="_blank" rel="noreferrer noopener">
              Open Netlify Env Settings
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href="/robots.txt" target="_blank" rel="noreferrer noopener">View robots.txt</a>
          </Button>
          <Button asChild variant="secondary">
            <a href="/sitemap.xml" target="_blank" rel="noreferrer noopener">View sitemap.xml</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
