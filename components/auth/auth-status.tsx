"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type AuthUser = {
  email?: string;
};

export default function AuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser({ email: user.email });
      } else {
        setUser(null);
      }

      setLoading(false);
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ email: session.user.email });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/60 backdrop-blur-md">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 md:gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/88 transition hover:bg-white/[0.08]"
        >
          Sign in
        </Link>

        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-[0_10px_30px_rgba(255,255,255,0.08)] transition hover:scale-[1.02] hover:opacity-95"
        >
          Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-3">
      <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/78 backdrop-blur-md md:flex">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="max-w-[220px] truncate">{user.email}</span>
      </div>

      <button
        onClick={handleLogout}
        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/88 transition hover:bg-white/[0.08]"
      >
        Logout
      </button>
    </div>
  );
}
