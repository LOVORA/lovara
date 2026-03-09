"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !user) {
        const nextPath = pathname || "/chats";
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        setAllowed(false);
        setChecking(false);
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white/70">
        Checking your account...
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
