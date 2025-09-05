import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { queryClient } from '@/lib/queryClient';

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
      console.log('Creating user profile from Supabase data, isInitialLoad:', isInitialLoad);
      
      // First, set user immediately from Supabase data (for UI to work)
      const email = supabaseUser.email || '';
      const tempUserData = {
        id: supabaseUser.id,
        email: email,
        firstName: supabaseUser.user_metadata?.first_name || supabaseUser.user_metadata?.name?.split(' ')[0] || '',
        lastName: supabaseUser.user_metadata?.last_name || supabaseUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
        role: 'agent' as const // Default to agent initially, will be updated from backend
      };
      
      console.log('Setting initial user data:', tempUserData);
      setUser(tempUserData);
      
      // Always set loading to false immediately so UI can work
      setLoading(false);
      console.log('Loading set to false, user should see dashboard now');
      
      // Immediately try to sync with backend to get the correct role
      const syncWithBackend = async () => {
        try {
          const token = await getAccessToken();
          if (token) {
            console.log('Background: Fetching correct role from database...');
            const response = await fetch('/api/user/profile', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const backendUser = await response.json();
              console.log('Background: Backend user profile received:', backendUser);
              
              // Update user with correct role from database
              const updatedUserData = {
                id: backendUser.id,
                email: backendUser.email,
                firstName: backendUser.firstName || tempUserData.firstName,
                lastName: backendUser.lastName || tempUserData.lastName,
                role: backendUser.role as 'agent' | 'manager'
              };
              
              console.log('Background: Updating user with database role:', updatedUserData);
              setUser(updatedUserData);
            } else {
              console.log('Background: Failed to fetch from backend, keeping initial role');
            }
          }
        } catch (error) {
          console.log('Background: Backend sync failed, keeping initial role:', error);
        }
      };
      
      // Call immediately
      syncWithBackend();
      
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setLoading(false); // Always clear loading even on error
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
      
      // Clear all query cache to ensure fresh data on next login
      try {
        queryClient.clear();
        queryClient.removeQueries();
        console.log('Cleared all query cache');
      } catch (cacheError) {
        console.warn('Could not clear query cache:', cacheError);
      }
      
      // Clear all localStorage data that might persist sessions
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log('Cleared all storage');
      } catch (storageError) {
        console.warn('Could not clear storage:', storageError);
      }
      
      // Call Supabase signOut with scope: 'global' to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Error during sign out:', error);
      } else {
        console.log('Successfully signed out');
      }
      
      // Force a complete page reload to ensure clean state
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 100);
      
    } catch (error) {
      console.error('Sign out failed:', error);
      // Even if sign out fails, clear local state and reload
      setUser(null);
      setSupabaseUser(null);
      setLoading(false);
      
      try {
        queryClient.clear();
        queryClient.removeQueries();
        localStorage.clear();
        sessionStorage.clear();
      } catch (cleanupError) {
        console.warn('Could not complete cleanup:', cleanupError);
      }
      
      window.location.href = window.location.origin;
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