import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const status = await response.json();
        setAuth(status);
        setError(null);
        return status;
      }
      
      // Not authenticated
      const unauthStatus = { authenticated: false, user: null };
      setAuth(unauthStatus);
      return unauthStatus;
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Failed to check authentication status');
      const errorStatus = { authenticated: false, user: null };
      setAuth(errorStatus);
      return errorStatus;
    }
  };

  // Auto-login for development mode
  const login = async () => {
    try {
      setError(null);
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await checkAuth(); // Refresh auth status
        return;
      }
      
      const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(errorData.message || 'Login failed');
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
      const response = await fetch('/api/auth/logout', {
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

  // Initialize authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        // Get auth status directly from checkAuth return
        const authStatus = await checkAuth();
        
        // If not authenticated in development mode, auto-login
        // Check both import.meta.env.DEV and NODE_ENV to be extra safe
        // Explicitly prevent this in production
        const isDevelopment = import.meta.env.DEV === true && import.meta.env.PROD !== true;
        if (!authStatus.authenticated && isDevelopment && window.location.hostname === 'localhost') {
          await login();
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        // In development mode, try auto-login even if check failed
        // Check both import.meta.env.DEV and NODE_ENV to be extra safe
        // Explicitly prevent this in production
        const isDevelopment = import.meta.env.DEV === true && import.meta.env.PROD !== true;
        if (isDevelopment && window.location.hostname === 'localhost') {
          try {
            await login();
          } catch (loginErr) {
            console.error('Auto-login failed:', loginErr);
          }
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
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