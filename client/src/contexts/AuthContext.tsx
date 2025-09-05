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
      
      // CRITICAL: Immediately fetch correct role from database
      const syncWithBackend = async () => {
        try {
          const token = await getAccessToken();
          if (token) {
            console.log('Background: Fetching correct role from database...');
            
            // Retry mechanism for role fetching
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
              try {
                const response = await fetch('/api/user/profile', {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  cache: 'no-cache'
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
                  return; // Success, exit retry loop
                } else {
                  console.warn(`Background: Failed to fetch from backend (attempt ${attempts + 1}):`, response.status);
                }
              } catch (fetchError) {
                console.warn(`Background: Network error (attempt ${attempts + 1}):`, fetchError);
              }
              
              attempts++;
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              }
            }
            
            console.error('Background: All attempts failed to fetch role from backend');
          }
        } catch (error) {
          console.error('Background: Critical error in role sync:', error);
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
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.error('Loading timeout reached, forcing loading to false');
        setLoading(false);
        setUser(null);
      }
    }, 3000);
    
    // FORCE CLEAR ALL SESSIONS ON APP START - this ensures users start logged out
    const clearAllSessions = async () => {
      try {
        // Clear all browser storage first
        localStorage.clear();
        sessionStorage.clear();
        
        // Force sign out any existing session
        await supabase.auth.signOut({ scope: 'global' });
        
        console.log('Forced session clear on app start');
      } catch (error) {
        console.warn('Error clearing sessions on start:', error);
      }
    };
    
    // Clear sessions first, then check for session
    clearAllSessions().then(() => {
      if (!mounted) return;
      
      // Now check for session after clearing
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        
        console.log('Initial session check after clear:', session?.user ? 'User found' : 'No user');
        setSupabaseUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserProfile(session.user, true);
        } else {
          console.log('No session found, showing login page');
          setLoading(false);
        }
        
        clearTimeout(loadingTimeout);
      }).catch((error) => {
        if (!mounted) return;
        console.error('Error getting session after clear:', error);
        setLoading(false);
        clearTimeout(loadingTimeout);
      });
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