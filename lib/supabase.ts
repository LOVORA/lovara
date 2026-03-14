import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

type TypedSupabaseClient = SupabaseClient<Database>;

const globalForSupabase = globalThis as typeof globalThis & {
  __lovoraSupabase?: TypedSupabaseClient;
};

export const supabase: TypedSupabaseClient =
  globalForSupabase.__lovoraSupabase ??
  createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "lovora-auth",
    },
  });

if (!globalForSupabase.__lovoraSupabase) {
  globalForSupabase.__lovoraSupabase = supabase;
}

export function sanitizeNextPath(raw?: string | null): string {
  if (!raw || typeof raw !== "string") {
    return "/my-characters";
  }

  if (!raw.startsWith("/")) {
    return "/my-characters";
  }

  if (raw.startsWith("//")) {
    return "/my-characters";
  }

  return raw;
}

export function clearLegacyLovoraLocalData(): void {
  if (typeof window === "undefined") return;

  try {
    const keysToDelete: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;

      if (
        key.startsWith("lovora.custom-characters") ||
        key.startsWith("lovora.custom-chat.") ||
        key.startsWith("lovora.temp.") ||
        key.startsWith("lovora.draft.")
      ) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // no-op
  }
}
