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

    // Get or create user in our database using storage interface with timeout
    const dbOperationTimeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout')), 8000)
    );

    let dbUser: any;
    try {
      dbUser = await Promise.race([
        storage.getUser(data.user.id),
        dbOperationTimeout
      ]);
    } catch (dbError) {
      console.error('Database timeout during user fetch:', dbError);
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

    // Auto-create user if they don't exist using upsert
    if (!dbUser) {
      try {
        dbUser = await Promise.race([
          storage.upsertUser({
            id: data.user.id,
            email: data.user.email || '',
            firstName: data.user.user_metadata?.first_name || data.user.user_metadata?.name?.split(' ')[0] || '',
            lastName: data.user.user_metadata?.last_name || data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            profileImageUrl: data.user.user_metadata?.avatar_url,
            role: 'agent' // Default role as requested
          }),
          dbOperationTimeout
        ]);
      } catch (dbError) {
        console.error('Database timeout during user creation:', dbError);
        return res.status(503).json({ error: 'Service temporarily unavailable' });
      }
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