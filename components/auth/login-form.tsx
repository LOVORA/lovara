"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginForm() {
  const router = useRouter();

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
    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full">
      <div className="rounded-[30px] border border-white/10 bg-[#0b0b12]/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-7">
        <div className="mb-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-pink-300/20 bg-pink-400/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-pink-200/85">
              Welcome back
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
              Secure login
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Sign in to Lovora
          </h1>

          <p className="mt-3 text-sm leading-7 text-white/60">
            Log in to continue your saved chats and access your private account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-white/72">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/30 focus:bg-black/40"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-white/72">
              Password
            </label>
            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/30 focus:bg-black/40"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center rounded-[18px] bg-white px-4 text-sm font-semibold text-black transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
            {message}
          </div>
        )}

        <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/60">
            Don’t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-pink-300 transition hover:text-pink-200"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
