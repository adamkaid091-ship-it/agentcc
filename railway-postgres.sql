-- Railway PostgreSQL Database Setup
-- This file contains the database schema for the ATM Service Portal

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  role VARCHAR DEFAULT 'agent' CHECK (role IN ('agent', 'manager')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Create index for sessions
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  government VARCHAR NOT NULL,
  atm_code VARCHAR NOT NULL,
  service_type VARCHAR NOT NULL CHECK (service_type IN ('feeding', 'maintenance')),
  agent_id VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_agent_id ON submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_service_type ON submissions(service_type);

-- Insert a demo manager user (optional - remove in production)
-- INSERT INTO users (id, email, first_name, last_name, role) 
-- VALUES ('demo-manager-id', 'manager@company.com', 'Demo', 'Manager', 'manager')
-- ON CONFLICT (id) DO NOTHING;