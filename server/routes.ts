import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertSubmissionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Submission routes
  app.post('/api/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertSubmissionSchema.parse(req.body);
      
      const submission = await storage.createSubmission({
        ...validatedData,
        agentId: userId,
      });
      
      res.json(submission);
    } catch (error) {
      console.error("Error creating submission:", error);
      res.status(500).json({ message: "Failed to create submission" });
    }
  });

  app.get('/api/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let submissions;
      if (user.role === 'manager') {
        submissions = await storage.getAllSubmissions();
      } else {
        submissions = await storage.getSubmissionsByAgent(userId);
      }
      
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get('/api/submissions/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getSubmissionStats();
      const activeAgents = await storage.getActiveAgentsCount();
      
      res.json({
        ...stats,
        activeAgents,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/submissions/agent/:agentId', isAuthenticated, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only managers can view other agents' submissions
      if (user?.role !== 'manager' && agentId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const submissions = await storage.getSubmissionsByAgent(agentId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching agent submissions:", error);
      res.status(500).json({ message: "Failed to fetch agent submissions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
