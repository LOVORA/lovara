"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  email?: string;
} | null;

type MeResponse = {
  ok: boolean;
  user: AuthUser;
};

function clearLegacyLovoraLocalData() {
  if (typeof window === "undefined") return;

  const keys = [
    "lovora.favorite.characters",
    "lovora.recent.characters",
    "lovora.home.onboarding.dismissed",
  ];

  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
}

export default function AuthStatus() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | MeResponse
          | null;

        if (!active) return;

        setUser(payload?.user ?? null);
      } catch {
        if (!active) return;
        setUser(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      clearLegacyLovoraLocalData();
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/sign-in"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
        >
          Login
        </Link>
        <Link
          href="/sign-up"
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/my-profile"
        className="max-w-[220px] truncate rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
      >
        {user.email || "My profile"}
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-400/30 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}
