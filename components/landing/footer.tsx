import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative mt-16 border-t border-white/10 bg-[#07070b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.10),transparent_24%),radial-gradient(circle_at_right,rgba(168,85,247,0.08),transparent_20%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="max-w-md">
            <Link href="/" className="group inline-flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 font-bold text-white shadow-[0_10px_30px_rgba(236,72,153,0.25)] transition duration-300 group-hover:scale-[1.03]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_45%)]" />
                <span className="relative">L</span>
              </div>

              <div>
                <p className="text-base font-semibold tracking-tight text-white">
                  Lovora
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  AI companion
                </p>
              </div>
            </Link>

            <p className="mt-5 text-sm leading-7 text-white/60">
              A more private, immersive, and premium AI companion experience
              built for one-on-one conversations, emotional connection, and
              character-driven chat.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-pink-300/20 bg-pink-400/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-pink-200/85">
                Adults only
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
                Private chat
              </span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-200/80">
                Premium UI
              </span>
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-white">Navigation</p>
            <div className="space-y-3 text-sm text-white/60">
              <Link href="/" className="block transition hover:text-white">
                Home
              </Link>
              <Link href="/characters" className="block transition hover:text-white">
                Characters
              </Link>
              <Link href="/chats" className="block transition hover:text-white">
                Chats
              </Link>
              <a href="#features" className="block transition hover:text-white">
                Features
              </a>
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-white">Account</p>
            <div className="space-y-3 text-sm text-white/60">
              <Link href="/login" className="block transition hover:text-white">
                Sign in
              </Link>
              <Link href="/signup" className="block transition hover:text-white">
                Create account
              </Link>
              <a href="#pricing" className="block transition hover:text-white">
                Pricing
              </a>
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-white">Legal</p>
            <div className="space-y-3 text-sm text-white/60">
              <a href="#" className="block transition hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="block transition hover:text-white">
                Terms of Service
              </a>
              <a href="#" className="block transition hover:text-white">
                Content Policy
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-6 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Lovora. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/55">
              18+
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/55">
              Private experience
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/55">
              Character chat
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
