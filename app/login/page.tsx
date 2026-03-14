import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07070b] px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_30%)]" />

            <div className="relative space-y-6">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.28em] text-white/55">
                Lovora Access
              </div>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  Your account is now the center of your private world
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                  Sign in to access your account-linked characters, private conversations,
                  and synced identity across devices.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/40">
                    Sync
                  </div>
                  <div className="mt-3 text-sm text-white/80">
                    Same account, same characters, any device.
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/40">
                    Security
                  </div>
                  <div className="mt-3 text-sm text-white/80">
                    Session-based access with protected routes.
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/40">
                    Continuity
                  </div>
                  <div className="mt-3 text-sm text-white/80">
                    Your private data lives in your account, not the browser only.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[36px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur md:p-8">
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
              <p className="text-sm leading-6 text-white/60">
                Enter your email and password to continue into your account.
              </p>
            </div>

            <LoginForm />
          </section>
        </div>
      </div>
    </main>
  );
}
