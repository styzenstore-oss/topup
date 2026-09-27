import { createClient } from "@supabase/supabase-js";

// Client ini dipakai di sisi browser (frontend).
// Aman dipakai di client karena hanya pakai anon/publishable key.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
