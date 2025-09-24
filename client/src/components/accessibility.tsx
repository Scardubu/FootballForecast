import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

// Skip to main content link for screen readers
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 focus-ring"
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  );
}

// Announce live updates to screen readers
export function LiveRegion({ children, priority = 'polite' }: { 
  children: React.ReactNode; 
  priority?: 'polite' | 'assertive' | 'off';
}) {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}

// Focus management for modals and overlays
export function useFocusTrap(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }

    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);
}

// Keyboard navigation helper
export function useKeyboardNavigation(onEscape?: () => void, onEnter?: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          onEscape?.();
          break;
        case 'Enter':
          onEnter?.();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onEnter]);
}

// Screen reader announcements
export function useScreenReaderAnnouncement() {
  const [announcement, setAnnouncement] = useState('');

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement(message);
    // Clear after announcement
    setTimeout(() => setAnnouncement(''), 1000);
  };

  return {
    announce,
    AnnouncementRegion: () => (
      <LiveRegion priority="assertive">
        {announcement}
      </LiveRegion>
    )
  };
}

// High contrast mode detection
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isHighContrast;
}

// Reduced motion detection
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Accessible button with proper ARIA attributes
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon' | null | undefined;
}

export function AccessibleButton({
  children,
  onClick,
  ariaLabel,
  ariaDescribedBy,
  disabled = false,
  variant = 'default',
  size = 'default'
}: AccessibleButtonProps) {
  return (
    <Button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      variant={variant}
      size={size}
      className="focus-ring"
    >
      {children}
    </Button>
  );
}
