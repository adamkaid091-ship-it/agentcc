import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Use Supabase credentials to construct database connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Environment variables available:", Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Please provide your Supabase credentials.",
  );
}

// Extract project reference from Supabase URL
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
const databaseUrl = `postgresql://postgres.${projectRef}:${supabaseServiceRoleKey}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`;

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