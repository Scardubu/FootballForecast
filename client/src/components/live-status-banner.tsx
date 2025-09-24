import React from 'react';

interface LiveStatusBannerProps {
  message?: string;
}

export const LiveStatusBanner: React.FC<LiveStatusBannerProps> = ({ message }) => {
  const [visible, setVisible] = React.useState(true);
  if (!visible) return null;
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-100 border-t border-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between shadow-md animate-fade-in"
      role="status"
      aria-live="polite"
      data-testid="live-status-banner"
    >
      <span className="flex items-center">
        <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {message || 'Live updates are currently unavailable. Scores and events may be delayed.'}
      </span>
      <button
        className="ml-4 text-yellow-700 hover:text-yellow-900 focus:outline-none"
        aria-label="Dismiss live status banner"
        onClick={() => setVisible(false)}
      >
        &times;
      </button>
    </div>
  );
};
