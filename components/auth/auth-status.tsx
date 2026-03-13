"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserState = {
  email?: string;
};

export default function AuthStatus() {
  const [user, setUser] = useState<UserState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error || !user) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        setUser({ email: user.email });
        setIsLoading(false);
      } catch {
        if (!mounted) return;
        setUser(null);
        setIsLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUser(session?.user ? { email: session.user.email } : null);
      setIsLoading(false);
      setIsLoggingOut(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setIsLoggingOut(false);
    }
  }

  if (isLoading) {
    return <div className="text-sm text-white/60">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/90 transition hover:border-white/20"
        >
          Login
        </Link>
        <Link
          href="/sign-up"
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="max-w-[180px] truncate text-sm text-white/70">
        {user.email}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/90 transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}
