"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Account created. Check your email for confirmation.");
    setEmail("");
    setPassword("");
    setLoading(false);
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-200">
          Create account
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-white">
          Start your Lovora account
        </h2>
        <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
          Save chats, return to favorite characters, and unlock the full private
          companion experience.
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
            className="h-12 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-fuchsia-400/30 focus:bg-black/40"
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
            className="h-12 w-full rounded-[18px] border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-fuchsia-400/30 focus:bg-black/40"
            placeholder="At least 6 characters"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-[18px] bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        {message && (
          <div className="rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75">
            {message}
          </div>
        )}

        <div className="text-sm text-white/55">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-white hover:text-fuchsia-200">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
