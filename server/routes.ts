import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { insertSubmissionSchema } from "@shared/schema";
import { z } from "zod";
import { isAuthenticated } from "./replitAuth";
import type { Request, Response, NextFunction } from "express";

// Define the authenticated request type for Replit Auth
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'agent' | 'manager';
  };
}

// Middleware to require manager role
const requireManager = async (req: Request, res: Response, next: NextFunction) => {
  // Get user data from session/passport user object
  const sessionUser = (req as any).user;
  if (!sessionUser || !sessionUser.claims) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // For now, assume all authenticated users are agents
  // You can implement role assignment logic based on email domain or other criteria
  const claims = sessionUser.claims;
  const userRole = claims.email?.includes('@manager.') ? 'manager' : 'agent';
  
  if (userRole !== 'manager') {
    return res.status(403).json({ error: 'Manager role required' });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Field Agent System API' });
  });

  // Database initialization endpoint
  app.post('/api/init-db', async (req, res) => {
    try {
      console.log("Initializing database tables...");
      
      // Create sessions table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sessions (
          sid VARCHAR PRIMARY KEY,
          sess JSONB NOT NULL,
          expire TIMESTAMP NOT NULL
        )
      `);
      
      // Create index for sessions
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)
      `);
      
      // Create users table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR UNIQUE,
          first_name VARCHAR,
          last_name VARCHAR,
          profile_image_url VARCHAR,
          role VARCHAR DEFAULT 'agent' CHECK (role IN ('agent', 'manager')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create submissions table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS submissions (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          client_name TEXT NOT NULL,
          government VARCHAR NOT NULL,
          atm_code VARCHAR NOT NULL,
          service_type VARCHAR NOT NULL CHECK (service_type IN ('feeding', 'maintenance')),
          agent_id VARCHAR NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log("Database tables created successfully!");
      
      // Test connection by running a simple query
      const result = await db.execute(sql`SELECT NOW() as current_time`);
      console.log("Database connection test successful:", result);
      
      res.json({ 
        status: 'success', 
        message: 'Database initialized successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Error initializing database:", error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Database initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get current user profile
  app.get('/api/user/profile', isAuthenticated, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    try {
      // Get user data from session/passport user object
      const sessionUser = (req as any).user;
      if (!sessionUser || !sessionUser.claims) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Extract user info from Replit OAuth claims
      const claims = sessionUser.claims;
      const userData = {
        id: claims.sub,
        email: claims.email,
        firstName: claims.first_name,
        lastName: claims.last_name,
        role: 'agent' as const // Default role, you can implement role assignment logic
      };
      
      res.json(userData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // Create submission (authenticated)
  app.post('/api/submissions', isAuthenticated, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    try {
      const submissionData = insertSubmissionSchema.parse(req.body);
      
      if (!authReq.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const submission = await storage.createSubmission({
        ...submissionData,
        agentId: authReq.user.id
      });
      
      res.json(submission);
    } catch (error) {
      console.error("Error creating submission:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Validation error',
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to create submission',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Get all submissions (for managers only)
  app.get('/api/submissions', isAuthenticated, requireManager, async (req, res) => {
    try {
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch submissions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get current user's submissions
  app.get('/api/submissions/my', isAuthenticated, async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    try {
      if (!authReq.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const submissions = await storage.getSubmissionsByAgent(authReq.user.id);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching user submissions:", error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch user submissions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get submission stats (managers only)
  app.get('/api/stats', isAuthenticated, requireManager, async (req, res) => {
    try {
      const stats = await storage.getSubmissionStats();
      const activeAgents = await storage.getActiveAgentsCount();
      res.json({ ...stats, activeAgents });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // User creation is now handled automatically by Replit OAuth
  // No manual user creation endpoint needed

  // Create demo user for testing
  app.post('/api/create-demo-user', async (req, res) => {
    try {
      const demoUser = await storage.upsertUser({
        id: 'demo-agent',
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'Agent',
        role: 'agent'
      });
      res.json(demoUser);
    } catch (error) {
      console.error("Error creating demo user:", error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to create demo user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
