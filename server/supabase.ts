import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Available environment variables:", Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  throw new Error(`Missing Supabase environment variables: URL=${!!supabaseUrl}, ANON_KEY=${!!supabaseAnonKey}`);
}

if (!supabaseServiceKey) {
  console.error("Available environment variables:", Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Regular client for auth verification
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Admin client for user management (server-side only)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);