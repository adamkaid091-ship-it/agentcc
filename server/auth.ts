import { Request, Response, NextFunction } from 'express';
import { supabase } from './supabase';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'agent' | 'manager' | 'admin';
  };
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

    // Get or create user in our database
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, data.user.id)
    });

    // Auto-create user if they don't exist
    if (!dbUser) {
      const [newUser] = await db.insert(users).values({
        id: data.user.id,
        email: data.user.email || '',
        firstName: data.user.user_metadata?.first_name || data.user.user_metadata?.name?.split(' ')[0] || '',
        lastName: data.user.user_metadata?.last_name || data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: data.user.user_metadata?.avatar_url,
        role: 'agent' // Default role as requested
      }).returning();
      
      dbUser = newUser;
    }

    // Add user info to request
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName || undefined,
      lastName: dbUser.lastName || undefined,
      role: dbUser.role as 'agent' | 'manager' | 'admin'
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export const requireManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Manager or admin role required' });
  }
  
  next();
};

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  
  next();
};