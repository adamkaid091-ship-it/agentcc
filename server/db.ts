import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Use Supabase database connection string
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Environment variables available:", Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('POSTGRES')));
  throw new Error(
    "DATABASE_URL or POSTGRES_URL must be set. For Vercel deployment with Supabase, use POSTGRES_URL with IPv4-compatible pooler connection string.",
  );
}

// Create a simpler, more reliable connection configuration
const client = postgres(databaseUrl, {
  ssl: 'require',
  max: 1, // Single connection to avoid pool issues
  idle_timeout: 10,
  connect_timeout: 3,
  prepare: false, // Disable prepared statements for pooler compatibility
  connection: {
    application_name: 'atm-service-portal',
    statement_timeout: 3000, // 3 second timeout
  },
  onnotice: () => {}, // Suppress notices
  transform: {
    undefined: null,
  },
});

export const db = drizzle(client, { schema });

// Test connection function
export async function testConnection() {
  try {
    await client`SELECT 1 as test`;
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}