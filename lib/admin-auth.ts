import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function parseAdminUserIds() {
  return new Set(
    (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function isAdminUserId(userId?: string | null) {
  if (!userId) return false;
  return parseAdminUserIds().has(userId);
}

export async function requireAdminPageAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminUserId(user.id)) {
    notFound();
  }

  return { supabase, user };
}

export async function getAdminRouteAccess() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !isAdminUserId(user.id)) {
    return null;
  }

  return { supabase, user };
}
