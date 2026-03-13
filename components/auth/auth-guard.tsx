"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  const nextPath = useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    let isMounted = true;

    async function redirectToLogin() {
      if (!isMounted) return;
      setIsAuthed(false);
      setIsChecking(false);
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }

    async function checkAuth() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (error || !user) {
          await redirectToLogin();
          return;
        }

        setIsAuthed(true);
        setIsChecking(false);
      } catch {
        if (!isMounted) return;
        await redirectToLogin();
      }
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        setIsAuthed(false);
        setIsChecking(false);
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setIsAuthed(true);
      setIsChecking(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [nextPath, router]);

  if (isChecking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/70">
        Loading...
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return <>{children}</>;
}
