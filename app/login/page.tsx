import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-6xl flex-col justify-center gap-10 px-4 py-12 md:flex-row md:items-center md:gap-16">
      <section className="max-w-xl space-y-6">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.25em] text-white/60">
          Lovora Access
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Your account is now the center of your private world
          </h1>

          <p className="max-w-2xl text-base leading-7 text-white/65 md:text-lg">
            Sign in to access your account-linked characters, private conversations,
            and synced identity across devices.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-200/80">
              Sync
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Same account, same characters, any device.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-200/80">
              Security
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Session-based access with protected routes.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-200/80">
              Continuity
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Your private data lives in your account, not the browser only.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Sign in</p>
          <h2 className="text-2xl font-semibold text-white">
            Enter your email and password to continue into your account.
          </h2>
        </div>

        <Suspense fallback={<div className="text-sm text-white/60">Loading login...</div>}>
          <LoginForm />
        </Suspense>
      </section>
    </div>
  );
}
