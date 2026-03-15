"use client";

import dynamic from "next/dynamic";

const AuthGuard = dynamic(() => import("@/components/auth/auth-guard"), {
  ssr: false,
});

const ChatsList = dynamic(() => import("@/components/chat/chats-list"), {
  ssr: false,
  loading: () => (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-sm text-white/60 backdrop-blur">
      Loading your conversations...
    </div>
  ),
});

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/38">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2 text-sm leading-6 text-white/55">{helper}</div>
    </div>
  );
}

export default function ChatsPageClient() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/[0.04] to-cyan-400/10 p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.24em] text-white/55">
                  Lovora • Private History • Saved Conversations
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-pink-200/70">
                    Chat History
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Your chats
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                    Reopen recent conversations, continue exactly where you left
                    off, and keep your favorite private dynamics alive across
                    sessions.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Continue
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-white">
                    Re-enter a saved session
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Your latest conversations stay linked to your account.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    History
                  </p>
                  <h2 className="mt-2 text-base font-semibold text-white">
                    Built-in and custom chats
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    View both built-in character sessions and your custom character chats.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Library"
              value="Saved"
              helper="Your conversations stay accessible in one place."
            />
            <StatCard
              label="Flow"
              value="Continue"
              helper="Reopen the same dynamic without rebuilding context."
            />
            <StatCard
              label="Types"
              value="Built-in + Custom"
              helper="Both character systems are supported."
            />
            <StatCard
              label="Access"
              value="Private"
              helper="Chats remain tied to the signed-in account."
            />
          </section>

          <section className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-4 backdrop-blur md:p-6">
            <ChatsList />
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
