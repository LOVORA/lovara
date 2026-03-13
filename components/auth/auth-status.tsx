"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuthUser = {
  id?: string;
  email?: string;
};

export default function AuthStatus() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) {
            setUser(null);
          }
          return;
        }

        const data = (await response.json()) as { user?: AuthUser | null };

        if (mounted) {
          setUser(data.user ?? null);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // no-op
    } finally {
      window.location.href = "/";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-9 w-20 animate-pulse rounded-full border border-white/10 bg-white/5" />
        <div className="h-9 w-24 animate-pulse rounded-full border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
        >
          Login
        </Link>

        <Link
  href="/sign-up"
  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90"
>
  Sign up
</Link>
      </div>
    );
  }

  const label = user.email?.split("@")[0] || "Account";

  return (
    <div className="flex items-center gap-2">
      <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 lg:block">
        {label}
      </div>

      <Link
        href="/my-characters"
        className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
      >
        Dashboard
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90"
      >
        Logout
      </button>
    </div>
  );
}
