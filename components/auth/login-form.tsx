"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type BannerState =
  | { type: "error"; message: string }
  | { type: "success"; message: string }
  | null;

type LoginResponse = {
  ok: boolean;
  error?: string;
  user?: {
    id: string;
    email?: string;
  };
};

export default function LoginForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setBanner(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        setBanner({
          type: "error",
          message: "Email and password are required.",
        });
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | LoginResponse
        | null;

      if (!response.ok || !payload?.ok) {
        setBanner({
          type: "error",
          message: payload?.error || "Invalid email or password.",
        });
        return;
      }

      setBanner({
        type: "success",
        message: "Login successful. Redirecting...",
      });

      const next =
        searchParams.get("next") ||
        searchParams.get("redirectTo") ||
        "/my-characters";

      window.location.href = next;
    } catch (error) {
      setBanner({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to sign in.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {banner ? (
        <div
          className={
            banner.type === "success"
              ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
              : "rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
          }
        >
          {banner.message}
        </div>
      ) : null}

      <label className="block">
        <div className="mb-2 text-sm text-white/75">Email</div>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-pink-400/30 focus:bg-black/40"
        />
      </label>

      <label className="block">
        <div className="mb-2 text-sm text-white/75">Password</div>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-pink-400/30 focus:bg-black/40"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Signing in..." : "Sign in"}
      </button>

      <div className="text-center text-sm text-white/55">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-white underline underline-offset-4">
          Create one
        </Link>
      </div>
    </form>
  );
}
