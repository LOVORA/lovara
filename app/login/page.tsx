"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next") || searchParams.get("redirect");
    if (!raw) return "/my-characters";
    return raw.startsWith("/") ? raw : "/my-characters";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setError("Please fill in your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Login failed. Please try again.");
        return;
      }

      setSuccess("Login successful. Redirecting...");
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Something went wrong while logging in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07070c] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_480px]">
          <section className="flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/60">
              Welcome back
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Continue your character experience without losing momentum.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-white/60 sm:text-lg">
              Access your saved characters, return to active chats, and keep your
              vault in one place with a cleaner premium experience.
            </p>

            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Vault
                </div>
                <div className="mt-2 text-sm font-medium text-white/85">
                  Saved custom characters
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Chats
                </div>
                <div className="mt-2 text-sm font-medium text-white/85">
                  Continue your sessions
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Studio
                </div>
                <div className="mt-2 text-sm font-medium text-white/85">
                  Build and refine faster
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="mb-8">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-fuchsia-200/70">
                Login
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Sign in to Lovora
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/60">
                Use your email and password to access your account.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-white/80"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-[#101019] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/20 focus:bg-[#13131f]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-white/80"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-white/10 bg-[#101019] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/20 focus:bg-[#13131f]"
                  required
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <div className="mt-6 text-sm text-white/55">
              Don&apos;t have an account?{" "}
              <Link
                href={`/sign-up?next=${encodeURIComponent(nextPath)}`}
                className="font-medium text-white transition hover:text-fuchsia-200"
              >
                Sign up
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
