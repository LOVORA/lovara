"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { supabase, sanitizeNextPath } from "@/lib/supabase";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [currentSearch, setCurrentSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentSearch(window.location.search ?? "");
    }
  }, []);

  const nextPath = useMemo(() => {
    const query = currentSearch.startsWith("?")
      ? currentSearch.slice(1)
      : currentSearch;

    return sanitizeNextPath(query ? `${pathname}?${query}` : pathname);
  }, [pathname, currentSearch]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session?.user) {
        setAuthed(false);
        setReady(true);
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setAuthed(false);
        setReady(true);
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setAuthed(true);
      setReady(true);
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setAuthed(false);
        setReady(true);
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setAuthed(true);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [nextPath, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-white/70">
        Checking your account...
      </div>
    );
  }

  if (!authed) {
    return null;
  }

  return <>{children}</>;
}
