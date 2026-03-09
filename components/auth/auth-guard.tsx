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
        return;
      }

      setAllowed(true);
      setLoading(false);
    }

    checkUser();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/70">
        Checking account...
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
