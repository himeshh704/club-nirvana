import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Warn if keys are missing but do not crash immediately so build step can complete
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("WARNING: Supabase URL or Service Role Key is missing in environment variables.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
