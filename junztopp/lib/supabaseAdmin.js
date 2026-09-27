import { createClient } from "@supabase/supabase-js";

// PENTING: file ini hanya boleh di-import dari kode yang jalan di server
// (app/api/**/route.js). JANGAN pernah di-import dari komponen client,
// karena service role key bisa bypass semua RLS di Supabase.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
