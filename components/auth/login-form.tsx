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
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex rounded-full border border-pink-400/20 bg-pink-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-pink-200">
          Welcome back
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white">
          Sign in to Lovora
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
          Continue your saved chats, return to your favorite characters, and pick
          up your private conversations instantly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">
            Email
          </label>
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
          <label className="mb-2 block text-sm font-medium text-white/80">
            Password
          </label>
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
          className="h-12 w-full rounded-[18px] bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {message && (
          <div className="rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75">
            {message}
          </div>
        )}

        <div className="text-sm text-white/55">
          Don’t have an account?{" "}
          <Link href="/signup" className="font-medium text-white hover:text-pink-200">
            Create one
          </Link>
        </div>
      </form>
    </div>
  );
}
