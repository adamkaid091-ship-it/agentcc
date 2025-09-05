// Vercel serverless function entry point
const path = require('path');

let cachedApp;

module.exports = async (req, res) => {
  try {
    // Check for required environment variables
    const requiredEnvVars = ['POSTGRES_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('POSTGRES') || k.includes('DATABASE')));
      
      return res.status(500).json({
        error: 'Missing environment variables',
        missing: missingVars,
        message: 'Please set all required environment variables in Vercel dashboard',
        timestamp: new Date().toISOString()
      });
    }

    // Cache the app instance to avoid re-importing on every request
    if (!cachedApp) {
      console.log('Initializing app...');
      const serverModule = require('../dist/index.js');
      cachedApp = serverModule.default || serverModule;
      console.log('App initialized successfully');
    }

    // Handle the request with the cached app
    return cachedApp(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
};