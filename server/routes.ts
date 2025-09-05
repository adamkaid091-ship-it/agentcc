import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { insertSubmissionSchema } from "@shared/schema";
import { z } from "zod";
import { authenticateToken, requireManager, type AuthenticatedRequest } from "./auth";
import { supabaseAdmin } from "./supabase";

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
          role VARCHAR DEFAULT 'agent' CHECK (role IN ('agent', 'manager', 'admin')),
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
  app.get('/api/user/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // Create submission (authenticated)
  app.post('/api/submissions', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const submissionData = insertSubmissionSchema.parse(req.body);
      
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const submission = await storage.createSubmission({
        ...submissionData,
        agentId: req.user.id
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
  app.get('/api/submissions', authenticateToken, requireManager, async (req: AuthenticatedRequest, res) => {
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
  app.get('/api/submissions/my', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const submissions = await storage.getSubmissionsByAgent(req.user.id);
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
  app.get('/api/stats', authenticateToken, requireManager, async (req: AuthenticatedRequest, res) => {
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

  // Create user (admin only - for setting up the system)
  app.post('/api/admin/create-user', async (req, res) => {
    try {
      const { email, password, firstName, lastName, role = 'agent' } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          name: `${firstName} ${lastName}`.trim()
        }
      });
      
      if (authError) {
        console.error('Error creating user in Supabase Auth:', authError);
        return res.status(400).json({ error: authError.message });
      }
      
      // Create user in our database
      if (authUser.user) {
        await storage.upsertUser({
          id: authUser.user.id,
          email: authUser.user.email || email,
          firstName: firstName || '',
          lastName: lastName || '',
          role: role as 'agent' | 'manager' | 'admin'
        });
      }
      
      res.json({ 
        message: 'User created successfully',
        user: {
          id: authUser.user?.id,
          email: authUser.user?.email,
          role
        }
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ 
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update user role (admin endpoint for initial setup)
  app.post('/api/admin/update-role', async (req, res) => {
    try {
      const { email, role } = req.body;
      
      if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required' });
      }
      
      if (!['agent', 'manager', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be agent, manager, or admin' });
      }
      
      // Update user role in database
      const updatedUser = await storage.updateUserRole(email, role);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ 
        message: 'User role updated successfully',
        user: {
          email: updatedUser.email,
          role: updatedUser.role
        }
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ 
        error: 'Failed to update user role',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get current user (authentication test endpoint)
  app.get('/api/user', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

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
