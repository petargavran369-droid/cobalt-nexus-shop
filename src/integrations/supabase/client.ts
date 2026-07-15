import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

const SUPABASE_URL = "https://supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_a116bdfb2b24b20536c4b223c72b88b0dcafb629";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
