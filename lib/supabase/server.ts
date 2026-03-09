import { createClient } from "@supabase/supabase-js";

// Auth doğrulama (anon key ile)
export function supabaseAnonServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// DB yazma (service role ile, RLS bypass)
export function supabaseServiceServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}