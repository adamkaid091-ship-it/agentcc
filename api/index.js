const express = require('express');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { createClient } = require('@supabase/supabase-js');

// Database setup
function createDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL must be set');
  }

  let connectionString = databaseUrl;
  if (!connectionString.includes('pgbouncer=true')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString += `${separator}pgbouncer=true&connection_limit=1`;
  }

  return postgres(connectionString, {
    ssl: 'require',
    max: 1,
    idle_timeout: 30,
    connect_timeout: 15,
    prepare: false,
    fetch_types: false,
  });
}

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

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ATM Service Operations Portal API',
    timestamp: new Date().toISOString()
  });
});

// Database connection test
app.get('/api/test-db', async (req, res) => {
  try {
    const client = createDatabaseConnection();
    await client`SELECT 1 as test`;
    res.json({ status: 'success', message: 'Database connection working' });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// Get user profile (simplified)
app.get('/api/user/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user from database
    const client = createDatabaseConnection();
    const db = drizzle(client, { schema: {} });
    
    const dbUser = await client`
      SELECT id, email, first_name, last_name, role 
      FROM users 
      WHERE id = ${user.id}
    `;

    if (dbUser.length === 0) {
      // Create user if doesn't exist
      await client`
        INSERT INTO users (id, email, first_name, last_name, role)
        VALUES (${user.id}, ${user.email}, ${user.user_metadata.first_name || ''}, ${user.user_metadata.last_name || ''}, 'agent')
        ON CONFLICT (id) DO NOTHING
      `;
      
      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata.first_name || '',
        lastName: user.user_metadata.last_name || '',
        role: 'agent'
      });
    }

    const userData = dbUser[0];
    res.json({
      id: userData.id,
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      role: userData.role
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get submissions
app.get('/api/submissions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const client = createDatabaseConnection();
    const submissions = await client`
      SELECT s.*, u.first_name, u.last_name 
      FROM submissions s
      LEFT JOIN users u ON s.agent_id = u.id
      ORDER BY s.created_at DESC
    `;

    res.json(submissions.map(s => ({
      id: s.id,
      clientName: s.client_name,
      government: s.government,
      atmCode: s.atm_code,
      serviceType: s.service_type,
      agentId: s.agent_id,
      agentName: `${s.first_name} ${s.last_name}`,
      createdAt: s.created_at
    })));

  } catch (error) {
    console.error('Submissions error:', error);
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

// Get user's submissions
app.get('/api/submissions/my', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const client = createDatabaseConnection();
    const submissions = await client`
      SELECT * FROM submissions 
      WHERE agent_id = ${user.id}
      ORDER BY created_at DESC
    `;

    res.json(submissions.map(s => ({
      id: s.id,
      clientName: s.client_name,
      government: s.government,
      atmCode: s.atm_code,
      serviceType: s.service_type,
      agentId: s.agent_id,
      createdAt: s.created_at
    })));

  } catch (error) {
    console.error('My submissions error:', error);
    res.status(500).json({ error: 'Failed to get my submissions' });
  }
});

// Create submission
app.post('/api/submissions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { clientName, government, atmCode, serviceType } = req.body;

    if (!clientName || !government || !atmCode || !serviceType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client = createDatabaseConnection();
    const result = await client`
      INSERT INTO submissions (client_name, government, atm_code, service_type, agent_id)
      VALUES (${clientName}, ${government}, ${atmCode}, ${serviceType}, ${user.id})
      RETURNING *
    `;

    const submission = result[0];
    res.json({
      id: submission.id,
      clientName: submission.client_name,
      government: submission.government,
      atmCode: submission.atm_code,
      serviceType: submission.service_type,
      agentId: submission.agent_id,
      createdAt: submission.created_at
    });

  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const client = createDatabaseConnection();
    
    const totalResult = await client`SELECT COUNT(*) as count FROM submissions`;
    const feedingResult = await client`SELECT COUNT(*) as count FROM submissions WHERE service_type = 'feeding'`;
    const maintenanceResult = await client`SELECT COUNT(*) as count FROM submissions WHERE service_type = 'maintenance'`;
    const todayResult = await client`SELECT COUNT(*) as count FROM submissions WHERE DATE(created_at) = CURRENT_DATE`;
    const agentsResult = await client`SELECT COUNT(DISTINCT agent_id) as count FROM submissions`;

    res.json({
      total: parseInt(totalResult[0].count),
      feeding: parseInt(feedingResult[0].count),
      maintenance: parseInt(maintenanceResult[0].count),
      todayCount: parseInt(todayResult[0].count),
      activeAgents: parseInt(agentsResult[0].count)
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app;