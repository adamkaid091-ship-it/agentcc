import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'agent' | 'manager';
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const getAccessToken = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const fetchUserProfile = async (supabaseUser: SupabaseUser, isInitialLoad: boolean = false) => {
    try {
      console.log('Fetching user profile from backend database, isInitialLoad:', isInitialLoad);
      
      const token = await getAccessToken();
      if (!token) {
        console.error('No access token available');
        setLoading(false);
        return;
      }

      // Get user profile from backend database (which includes the correct role)
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const backendUser = await response.json();
      console.log('Backend user profile received:', backendUser);
      
      // Use the role from the database, not email-based detection
      const userData = {
        id: backendUser.id,
        email: backendUser.email,
        firstName: backendUser.firstName || '',
        lastName: backendUser.lastName || '',
        role: backendUser.role as 'agent' | 'manager' // Use database role
      };
      
      console.log('Setting user data with database role:', userData);
      setUser(userData);
      
      // Always set loading to false after setting user
      setLoading(false);
      console.log('Loading set to false, user should see dashboard now');
      
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      // Fallback: if backend fails, still create user but with agent role for safety
      const email = supabaseUser.email || '';
      const fallbackUser = {
        id: supabaseUser.id,
        email: email,
        firstName: supabaseUser.user_metadata?.first_name || '',
        lastName: supabaseUser.user_metadata?.last_name || '',
        role: 'agent' as const // Default to agent if backend fails
      };
      console.log('Using fallback user data (agent role):', fallbackUser);
      setUser(fallbackUser);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let isInitialLoad = true;
    
    // Set a timeout to prevent infinite loading - reduced to 2 seconds
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.error('Loading timeout reached, forcing loading to false');
        setLoading(false);
        setUser(null); // Clear user if stuck loading
      }
    }, 2000); // 2 second timeout
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      console.log('Initial session check:', session?.user ? 'User found' : 'No user');
      setSupabaseUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user, true); // Initial load
      } else {
        console.log('No session found, showing login page');
        setLoading(false);
      }
      
      clearTimeout(loadingTimeout);
    }).catch((error) => {
      if (!mounted) return;
      console.error('Error getting initial session:', error);
      setLoading(false);
      clearTimeout(loadingTimeout);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user ? 'User found' : 'No user');
        setSupabaseUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Only show loading for the first sign-in, not subsequent token refreshes
          await fetchUserProfile(session.user, isInitialLoad);
          isInitialLoad = false;
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
          isInitialLoad = true; // Reset for next login
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Handle token refresh without showing loading
          await fetchUserProfile(session.user, false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error: error.message };
      }
      
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('Signing out user...');
      
      // Clear user state immediately
      setUser(null);
      setSupabaseUser(null);
      setLoading(false);
      
      // Call Supabase signOut
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during sign out:', error);
      } else {
        console.log('Successfully signed out');
      }
      
      // Force a page reload to clear any cached state
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error('Sign out failed:', error);
      // Even if sign out fails, clear local state
      setUser(null);
      setSupabaseUser(null);
      setLoading(false);
      window.location.reload();
    }
  };

  const value: AuthContextType = {
    user,
    supabaseUser,
    loading,
    signIn,
    signOut,
    getAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}