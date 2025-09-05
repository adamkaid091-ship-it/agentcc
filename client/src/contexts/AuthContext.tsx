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
      console.log('Fetching user profile, isInitialLoad:', isInitialLoad);
      
      // Only show loading spinner for initial load, not for token refreshes
      if (isInitialLoad) {
        setLoading(true);
      }
      
      const token = await getAccessToken();
      if (!token) {
        console.error('No access token available');
        setUser(null);
        setLoading(false); // Always set loading false on error
        return;
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        console.log('User profile loaded successfully:', userData);
        setLoading(false); // Always set loading false on success
      } else {
        console.error('Failed to fetch user profile:', response.status, await response.text());
        setUser(null);
        setLoading(false); // Always set loading false on error
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
      setLoading(false); // Always set loading false on error
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
      }
    }, 10000); // 10 second timeout
    
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
    await supabase.auth.signOut();
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