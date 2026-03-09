"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        const nextPath = pathname || "/";
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(true);
      setLoading(false);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (session?.user) {
        setAllowed(true);
        setLoading(false);
      } else {
        setAllowed(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-center text-white/65">
        Checking account...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-center text-white/50">
        Redirecting to login...
      </div>
    );
  }

  return <>{children}</>;
}
