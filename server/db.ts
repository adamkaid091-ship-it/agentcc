import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("Environment variables available:", Object.keys(process.env).filter(key => key.includes('DATABASE')));
    throw new Error(
      "DATABASE_URL must be set. Please provide your database connection string.",
    );
  }
  
  return databaseUrl;
}

// Create a fresh connection with better settings for Supabase pooler
function createFreshConnection() {
  const databaseUrl = getDatabaseUrl();
  return postgres(databaseUrl, {
    ssl: 'require',
    max: 1, // Single connection for pooler
    idle_timeout: 20, // Longer idle timeout
    connect_timeout: 10, // Longer connect timeout
    prepare: false, // Required for pooler compatibility
    connection: {
      application_name: 'atm-service-portal',
    },
    onnotice: () => {}, // Suppress notices
    transform: {
      undefined: null,
    },
  });
}

// Always create fresh database connections - no caching
export const db = new Proxy({} as any, {
  get(target, prop) {
    // Always create a fresh connection and drizzle instance
    const client = createFreshConnection();
    const freshDb = drizzle(client, { schema });
    return freshDb[prop];
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