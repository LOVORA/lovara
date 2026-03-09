import SignupForm from "../../components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07070b] text-white">
      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.14),transparent_28%),radial-gradient(circle_at_right,rgba(168,85,247,0.12),transparent_24%),linear-gradient(to_bottom,#07070b,#0a0a0f)]" />
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-12 md:px-6 md:py-16">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-pink-200/85 backdrop-blur-md">
                  Lovora
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
                  Create Account
                </span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200/80 backdrop-blur-md">
                  Premium Access
                </span>
              </div>

              <p className="mb-4 text-sm uppercase tracking-[0.28em] text-pink-200/70">
                Join Lovora
              </p>

              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl md:leading-[1.05]">
                Create your account and start chatting
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
                Sign up to save your conversations, return to your favorite
                characters anytime, and unlock a more personal premium AI
                companion experience.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Setup
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/90">
                    Fast account creation
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Features
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/90">
                    Saved private chats
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Experience
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/90">
                    Premium companion UI
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.05] shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4 md:px-6">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-pink-200/70">
                    Sign up
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Create your account
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-white/60">
                    Start your private chat experience in a few seconds.
                  </p>
                </div>

                <div className="p-5 md:p-6">
                  <SignupForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
