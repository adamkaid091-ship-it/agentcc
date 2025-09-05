import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Lazy database connection initialization
let _db: any = null;

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

// Create a new connection for each request to avoid pool hanging
function createFreshConnection() {
  const databaseUrl = getDatabaseUrl();
  return postgres(databaseUrl, {
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

// Lazy database connection getter
export const db = new Proxy({} as any, {
  get(target, prop) {
    if (!_db) {
      console.log("Initializing database connection...");
      const client = createFreshConnection();
      _db = drizzle(client, { schema });
    }
    return _db[prop];
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