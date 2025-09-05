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

    // Get or create user in our database - ALWAYS get fresh data
    let dbUser: any;
    try {
      console.log('Auth: Getting user from database for ID:', data.user.id);
      
      // ALWAYS get fresh user data to ensure correct role
      dbUser = await storage.getUser(data.user.id);
      console.log('Auth: Database user found:', dbUser ? `Role: ${dbUser.role}` : 'No user found');
      
      // If user doesn't exist, create with default agent role
      if (!dbUser) {
        console.log('Auth: Creating new user with agent role');
        dbUser = await storage.upsertUser({
          id: data.user.id,
          email: data.user.email || '',
          firstName: data.user.user_metadata?.first_name || data.user.user_metadata?.name?.split(' ')[0] || '',
          lastName: data.user.user_metadata?.last_name || data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
          profileImageUrl: data.user.user_metadata?.avatar_url,
          role: 'agent' // Default role for new users
        });
      }
      
      // User exists - NEVER update existing role, just metadata
      // This ensures manager role is preserved
      console.log('Auth: User exists with role:', dbUser.role, '- preserving role');
      
    } catch (dbError) {
      console.error('Database error during user handling:', dbError);
      
      // Fallback: Use default agent role when database fails
      console.log('Using fallback authentication with agent role');
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