"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type SignUpResponse = {
  ok?: boolean;
  error?: string;
};

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agree) {
      setError("You need to accept the terms to continue.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          password,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as SignUpResponse;

      if (!response.ok) {
        setError(data.error || "Sign up failed. Please try again.");
        return;
      }

      setSuccess("Account created successfully. Redirecting...");
      router.push("/my-characters");
      router.refresh();
    } catch {
      setError("Something went wrong while creating your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07070c] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_500px]">
          <section className="flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/60">
              Start here
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Create your Lovora account and start building better characters.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-white/60 sm:text-lg">
              Save custom characters, keep your vault organized, and move from
              creation to conversation with a smoother premium flow.
            </p>

            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Create
                </div>
                <div className="mt-2 text-sm font-medium text-white/85">
                  Build custom personalities
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Save
                </div>
                <div className="mt-2 text-sm font-medium text-white/85">
                  Keep your favorites ready
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Chat
                </div>
                <div className="mt-2 text-sm font-medium text-white/85">
                  Enter richer character scenes
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="mb-8">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-fuchsia-200/70">
                Sign up
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Create your account
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/60">
                Use a valid email and a secure password to get started.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-white/80"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-white/10 bg-[#101019] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/20 focus:bg-[#13131f]"
                />
              </div>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-2xl border border-white/10 bg-[#101019] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/20 focus:bg-[#13131f]"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-white/80"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-2xl border border-white/10 bg-[#101019] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/20 focus:bg-[#13131f]"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-white/65">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(event) => setAgree(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                />
                <span>I agree to create an account and use Lovora responsibly.</span>
              </label>

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
                {loading ? "Creating account..." : "Sign up"}
              </button>
            </form>

            <div className="mt-6 text-sm text-white/55">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-white transition hover:text-fuchsia-200"
              >
                Login
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
