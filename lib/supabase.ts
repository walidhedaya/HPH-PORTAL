import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL in environment variables");
}

if (!supabaseAnonKey) {
  throw new Error("Missing SUPABASE_ANON_KEY in environment variables");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables");
}

// Server client only: bypasses RLS.
// Never use this in client components.
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Normal client using anon key.
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
