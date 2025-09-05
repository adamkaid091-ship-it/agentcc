import { Request, Response, NextFunction } from 'express';
import { supabase } from './supabase';
import { storage } from './storage';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'agent' | 'manager';
  };
}

export async function authenticateToken(req: any, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get or create user in our database with optimized approach
    let dbUser: any;
    try {
      // First try to get existing user quickly
      dbUser = await storage.getUser(data.user.id);
      
      // If user doesn't exist, create with default role
      if (!dbUser) {
        dbUser = await storage.upsertUser({
          id: data.user.id,
          email: data.user.email || '',
          firstName: data.user.user_metadata?.first_name || data.user.user_metadata?.name?.split(' ')[0] || '',
          lastName: data.user.user_metadata?.last_name || data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
          profileImageUrl: data.user.user_metadata?.avatar_url,
          role: 'agent' // Default role for new users
        });
      } else {
        // User exists, optionally update metadata without changing role
        dbUser = await storage.upsertUser({
          id: data.user.id,
          email: data.user.email || '',
          firstName: data.user.user_metadata?.first_name || data.user.user_metadata?.name?.split(' ')[0] || dbUser.firstName || '',
          lastName: data.user.user_metadata?.last_name || data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || dbUser.lastName || '',
          profileImageUrl: data.user.user_metadata?.avatar_url || dbUser.profileImageUrl,
          role: dbUser.role // Preserve existing role
        });
      }
    } catch (dbError) {
      console.error('Database error during user handling:', dbError);
      
      // Fallback: create a temporary user object from Supabase data
      console.log('Using fallback authentication with Supabase data only');
      dbUser = {
        id: data.user.id,
        email: data.user.email || '',
        firstName: data.user.user_metadata?.first_name || data.user.user_metadata?.name?.split(' ')[0] || '',
        lastName: data.user.user_metadata?.last_name || data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
        role: 'agent' // Default role when database is unavailable
      };
    }

    // Add user info to request
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName || undefined,
      lastName: dbUser.lastName || undefined,
      role: dbUser.role as 'agent' | 'manager'
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export const requireManager = async (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager role required' });
  }
  
  next();
};