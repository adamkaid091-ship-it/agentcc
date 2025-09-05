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

// Create a new connection for each request to avoid pool hanging
function createFreshConnection() {
  return postgres(databaseUrl!, {
    ssl: 'require',
    max: 1, // Single connection
    idle_timeout: 5,
    connect_timeout: 2,
    prepare: false, // Disable prepared statements for pooler compatibility
    connection: {
      application_name: 'atm-service-portal',
      statement_timeout: 2000, // 2 second timeout
    },
    onnotice: () => {}, // Suppress notices
    transform: {
      undefined: null,
    },
    // Auto-end connection after use
    max_lifetime: 30, // 30 seconds max lifetime
  });
}

// Main connection
const client = createFreshConnection();
export const db = drizzle(client, { schema });

// Function to get a fresh database connection when needed
export function getFreshDb() {
  const freshClient = createFreshConnection();
  return drizzle(freshClient, { schema });
}

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