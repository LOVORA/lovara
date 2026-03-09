import Navbar from "../../components/landing/navbar";
import ChatsList from "../../components/chat/chats-list";
import AuthGuard from "../../components/auth/auth-guard";

export default function ChatsPage() {
  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.12),transparent_28%),radial-gradient(circle_at_right,rgba(168,85,247,0.12),transparent_24%),linear-gradient(to_bottom,#07070b,#0a0a0f)]" />
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-pink-300/20 bg-pink-400/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-pink-200/85 backdrop-blur-md">
              Lovora
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70 backdrop-blur-md">
              Private History
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200/80 backdrop-blur-md">
              Saved Conversations
            </span>
          </div>

          <div className="mb-8 max-w-3xl">
            <p className="mb-3 text-sm uppercase tracking-[0.25em] text-pink-300/70">
              Chat History
            </p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Your chats
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
              Reopen your recent conversations, continue where you left off, and
              jump back into a more personal one-on-one experience with your
              favorite characters.
            </p>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-[0_24px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4 md:px-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-pink-200/70">
                    Conversations
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-white md:text-2xl">
                    Continue a private chat
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-white/60">
                    Your latest sessions are stored here for quick access.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Synced
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 md:p-4">
              <AuthGuard>
                <ChatsList />
              </AuthGuard>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
