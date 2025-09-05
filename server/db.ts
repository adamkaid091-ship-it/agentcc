import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Check for IPv4-compatible Supabase connection string first
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Environment variables available:", Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('POSTGRES')));
  throw new Error(
    "DATABASE_URL or POSTGRES_URL must be set. For Vercel deployment with Supabase, use POSTGRES_URL with IPv4-compatible pooler connection string.",
  );
}

// Use IPv4-compatible connection with optimized settings for serverless
const client = postgres(databaseUrl, {
  ssl: 'require',
  max: 1, // Reduced for serverless environments
  idle_timeout: 20,
  connect_timeout: 30, // Increased timeout
  prepare: false, // Disable prepared statements for pooler compatibility
  connection: {
    application_name: 'atm-service-portal',
    statement_timeout: '30s', // 30 second statement timeout
  },
});

export const db = drizzle(client, { schema });