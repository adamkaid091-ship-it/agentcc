import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

function getDatabaseUrl(): string {
  // Check for both DATABASE_URL and POSTGRES_URL (Vercel standard)
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    console.error("Environment variables available:", Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('POSTGRES')));
    throw new Error(
      "DATABASE_URL or POSTGRES_URL must be set. Please provide your database connection string.",
    );
  }
  
  return databaseUrl;
}

// Create a fresh connection optimized for Vercel serverless
function createFreshConnection() {
  let databaseUrl = getDatabaseUrl();
  
  // Add required parameters for Vercel serverless if not present
  if (!databaseUrl.includes('pgbouncer=true')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl += `${separator}pgbouncer=true&connection_limit=1`;
  }
  
  return postgres(databaseUrl, {
    ssl: 'require',
    max: 1, // Single connection for serverless
    idle_timeout: 30, // Longer timeout for Vercel
    connect_timeout: 15, // Longer connect timeout for Vercel
    prepare: false, // CRITICAL: Disable prepared statements for Supabase pooler
    connection: {
      application_name: 'atm-service-portal',
    },
    onnotice: () => {}, // Suppress notices
    transform: {
      undefined: null,
    },
    // Vercel-specific optimizations
    fetch_types: false,
  });
}

// Always create fresh database connections - no caching
export const db = new Proxy({} as any, {
  get(target, prop: string | symbol) {
    // Always create a fresh connection and drizzle instance
    const client = createFreshConnection();
    const freshDb = drizzle(client, { schema });
    return (freshDb as any)[prop];
  }
});

// Function to get a fresh database connection when needed
export function getFreshDb() {
  const freshClient = createFreshConnection();
  return drizzle(freshClient, { schema });
}

// Test connection function
export async function testConnection() {
  try {
    const freshClient = createFreshConnection();
    await freshClient`SELECT 1 as test`;
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}