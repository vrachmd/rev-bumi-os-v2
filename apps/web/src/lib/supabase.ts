import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client untuk browser (Next.js client component / SPA).
 * Env-driven: baca dari NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Backend dapat ditukar ke GCP/Alibaba dengan mengganti env endpoint tanpa
 * mengubah kode aplikasi (lihat ROADMAP.md §5).
 */
export const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const isSupabaseConfigured = (): boolean =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );