import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import { insertSubmissionSchema } from "@shared/schema";
import { z } from "zod";

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

  // Create submission
  app.post('/api/submissions', async (req, res) => {
    try {
      const submissionData = insertSubmissionSchema.parse(req.body);
      const agentId = 'demo-agent'; // TODO: Replace with actual user ID from session
      
      const submission = await storage.createSubmission({
        ...submissionData,
        agentId
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

  // Get all submissions (for managers)
  app.get('/api/submissions', async (req, res) => {
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

  // Get agent submissions
  app.get('/api/submissions/agent/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const submissions = await storage.getSubmissionsByAgent(agentId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching agent submissions:", error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch agent submissions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get submission stats
  app.get('/api/stats', async (req, res) => {
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
