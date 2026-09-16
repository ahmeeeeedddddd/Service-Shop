import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mypnzaztsvlprgairctk.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15cG56YXp0c3ZscHJnYWlyY3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyNDE2MjcsImV4cCI6MjEwNDgxNzYyN30.W9ngUsFw5kYukI60s1DnaWiMtjseXMRw2hx_H9Jd2eQ';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Browser / Public Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin Client (Server-side & Migrations only)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
