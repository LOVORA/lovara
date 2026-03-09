"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Login successful. Redirecting...");
    setLoading(false);

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-pink-200/85">
          Welcome back
          <span className="text-white/35">•</span>
          Secure login
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Sign in to Lovora
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-7 text-white/60">
          Log in to continue your saved chats and access your private account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-white/75">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/30 focus:bg-black/40"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-white/75">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/30 focus:bg-black/40"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center rounded-[18px] bg-white px-5 text-sm font-semibold text-black transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {message && (
          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
            {message}
          </div>
        )}
      </form>

      <p className="mt-5 text-sm text-white/55">
        Don’t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-pink-200 transition hover:text-white"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
