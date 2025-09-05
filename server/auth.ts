import { Request, Response, NextFunction } from 'express';
import { isAuthenticated } from './replitAuth';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'agent' | 'manager';
  };
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Check if user is authenticated via Replit OAuth session
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sessionUser = req.user as any;
    
    // Get user claims from Replit OAuth
    const claims = sessionUser.claims;
    if (!claims || !claims.sub || !claims.email) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get or create user in our database
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, claims.sub)
    });

    // Auto-create user if they don't exist
    if (!dbUser) {
      const [newUser] = await db.insert(users).values({
        id: claims.sub,
        email: claims.email,
        firstName: claims.first_name || '',
        lastName: claims.last_name || '',
        profileImageUrl: claims.profile_image_url,
        role: 'agent' // Default role
      }).returning();
      
      dbUser = newUser;
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

export const requireManager = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager role required' });
  }
  
  next();
};