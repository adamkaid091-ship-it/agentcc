import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Field Agent System API' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
