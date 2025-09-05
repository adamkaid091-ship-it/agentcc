const express = require('express');

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add error handling for missing environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing environment variables:', missingVars);
  
  // Create a simple error app
  app.get('*', (req, res) => {
    res.status(500).json({
      error: 'Missing environment variables',
      missing: missingVars,
      message: 'Please set all required environment variables in Vercel dashboard',
      available: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('POSTGRES') || k.includes('DATABASE')),
      timestamp: new Date().toISOString()
    });
  });
} else {
  // Import and configure the actual app only if env vars are present
  try {
    // Dynamic import of server components
    const { drizzle } = require('drizzle-orm/postgres-js');
    const postgres = require('postgres');
    const { createClient } = require('@supabase/supabase-js');
    
    // Database setup using DATABASE_URL for Vercel
    let databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('DATABASE_URL not found, API will not work');
      throw new Error('DATABASE_URL is required for database operations');
    }
    
    // Add required parameters for Vercel serverless if not present
    if (!databaseUrl.includes('pgbouncer=true')) {
      const separator = databaseUrl.includes('?') ? '&' : '?';
      databaseUrl += `${separator}pgbouncer=true&connection_limit=1`;
    }
    
    const client = postgres(databaseUrl, {
      ssl: 'require',
      max: 1, // Single connection for Vercel serverless
      idle_timeout: 30,
      connect_timeout: 15,
      prepare: false, // CRITICAL: Disable for Supabase pooler
      statement_timeout: 30000,
      fetch_types: false,
    });
    
    // Supabase setup
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Simple health check route
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'ATM Service Operations Portal API',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'unknown'
      });
    });

    // Basic test route
    app.get('/', (req, res) => {
      res.json({ 
        message: 'Field Agent Management System API',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    // Catch all other routes
    app.get('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.path,
        message: 'This is a simplified API deployment. Full functionality requires complete server setup.',
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    console.error('App initialization error:', error);
    
    app.get('*', (req, res) => {
      res.status(500).json({
        error: 'App initialization failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel serverless
module.exports = app;