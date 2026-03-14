"use client";

import dynamic from "next/dynamic";

const AuthGuard = dynamic(() => import("../../components/auth/auth-guard"), {
  ssr: false,
});

const ChatsList = dynamic(() => import("../../components/chat/chats-list"), {
  ssr: false,
  loading: () => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/60 backdrop-blur">
      Loading chats...
    </div>
  ),
});

export default function ChatsPageClient() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <AuthGuard>
        <section className="mb-8 flex flex-col gap-4 rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-3">
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
                Reopen your recent conversations, continue where you left off,
                and jump back into a more personal one-on-one experience with your
                favorite characters.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Conversations
              </p>
              <h2 className="mt-2 text-base font-semibold text-white">
                Continue a private chat
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Your latest sessions are stored here for quick access.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Synced
              </p>
              <h2 className="mt-2 text-base font-semibold text-white">
                Account-linked history
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Your saved chats stay connected to your Lovora account.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/5 p-4 backdrop-blur md:p-6">
          <ChatsList />
        </section>
      </AuthGuard>
    </main>
  );
}
