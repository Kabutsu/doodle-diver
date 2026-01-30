// client-side Supabase helper
import { createClient } from '@supabase/supabase-js';
import '../envConfig.ts';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);