"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase, sanitizeNextPath } from "@/lib/supabase";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  const nextPath = useMemo(() => {
    const query = searchParams.toString();
    return sanitizeNextPath(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

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
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-white/65 backdrop-blur">
          Checking your account...
        </div>
      </div>
    );
  }

  if (!authed) {
    return null;
  }

  return <>{children}</>;
}
