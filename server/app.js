import express from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./vite.js";
import { setupAuth } from "./replitAuth.js";

let initializedApp = null;

// Initialize the app once
async function initializeApp() {
  if (initializedApp) {
    return initializedApp;
  }

  try {
    console.log("Initializing app for Vercel...");
    
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }
          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }
          console.log(logLine);
        }
      });

      next();
    });
    
    // Set up authentication
    await setupAuth(app);
    
    // Register all routes
    await registerRoutes(app);

    // Set up static file serving for production
    serveStatic(app);

    // Error handler
    app.use((err, _req, res, _next) => {
      console.error("Express error handler:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ 
        error: message,
        timestamp: new Date().toISOString()
      });
    });

    initializedApp = app;
    return app;
  } catch (error) {
    console.error("Failed to initialize app:", error);
    
    // Return error handler app
    const errorApp = express();
    errorApp.use('*', (req, res) => {
      res.status(500).json({
        error: "Server initialization failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    });
    
    initializedApp = errorApp;
    return errorApp;
  }
}

// Export function that returns the initialized app
export default async function getApp() {
  return await initializeApp();
}