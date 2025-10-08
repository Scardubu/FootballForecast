import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { buildApiUrl, createAbortController } from '@/lib/utils';

export interface User {
  id: string;
  type: string;
}

export interface AuthStatus {
  authenticated: boolean;
  user: User | null;
  expires?: string;
  issued?: string;
}

interface AuthContextType {
  auth: AuthStatus | null;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<AuthStatus>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status and return the result
  const checkAuth = async (): Promise<AuthStatus> => {
    try {
      try {
        const { signal, cancel } = createAbortController(5000); // Increased to 5s
        const response = await fetch(buildApiUrl('/api/auth/status'), {
          credentials: 'include',
          signal
        });
        cancel();
        
        if (response.ok) {
          const status = await response.json();
          setAuth(status);
          setError(null);
          return status;
        }
        
        // Not authenticated - this is OK in production
        const unauthStatus = { authenticated: false, user: null };
        setAuth(unauthStatus);
        return unauthStatus;
      } catch (fetchErr) {
        // Auth check failed - treat as unauthenticated and allow app to continue
        console.warn('Auth check failed, continuing as unauthenticated:', fetchErr);
        const unauthStatus = { authenticated: false, user: null };
        setAuth(unauthStatus);
        return unauthStatus;
      }
    } catch (err) {
      console.error('Auth check error:', err);
      // Don't set error state - just continue as unauthenticated
      const errorStatus = { authenticated: false, user: null };
      setAuth(errorStatus);
      return errorStatus;
    }
  };

  // Auto-login for development mode
  const login = async () => {
    try {
      setError(null);
      try {
        const { signal, cancel } = createAbortController(3000);
        const response = await fetch(buildApiUrl('/api/auth/dev-login'), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          // Add a timeout to prevent hanging requests
          signal
        });
        cancel();
        
        if (response.ok) {
          await checkAuth(); // Refresh auth status
          return;
        }
        
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || 'Login failed');
      } catch (fetchErr) {
        // If server is not running, create a mock development user
        if (import.meta.env.DEV) {
          console.warn('Development server not available, using mock authentication');
          setAuth({
            authenticated: true,
            user: { id: 'dev-user', type: 'developer' }
          });
          return;
        }
        throw fetchErr;
      }
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    try {
      setError(null);
      const response = await fetch(buildApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include'
      });
      
      // Always clear auth state regardless of response
      setAuth({ authenticated: false, user: null });
    } catch (err) {
      console.error('Logout error:', err);
      setAuth({ authenticated: false, user: null });
    }
  };

  // Initialize authentication on mount - NON-BLOCKING
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get auth status directly from checkAuth return
        const authStatus = await checkAuth();
        
        // If not authenticated in development mode, auto-login
        const isDevelopment = import.meta.env.DEV === true && import.meta.env.PROD !== true;
        if (!authStatus.authenticated && isDevelopment && window.location.hostname === 'localhost') {
          await login();
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        // In development mode, try auto-login even if check failed
        const isDevelopment = import.meta.env.DEV === true && import.meta.env.PROD !== true;
        if (isDevelopment && window.location.hostname === 'localhost') {
          try {
            await login();
          } catch (loginErr) {
            console.error('Auto-login failed:', loginErr);
          }
        }
      } finally {
        // Always stop loading after a maximum of 2 seconds to prevent blocking
        setIsLoading(false);
      }
    };

    // Set a hard timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      console.warn('Auth initialization timeout - continuing without auth');
    }, 2000);

    initAuth().finally(() => clearTimeout(timeoutId));
  }, []);

  const value = {
    auth,
    isLoading,
    error,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}