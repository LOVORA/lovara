import Link from "next/link";
import AuthStatus from "../auth/auth-status";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070b]/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/" className="group flex items-center gap-3">
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

        <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2 py-2 text-sm text-white/72 backdrop-blur-md md:flex">
          <Link
            href="/characters"
            className="rounded-full px-4 py-2 transition hover:bg-white/8 hover:text-white"
          >
            Characters
          </Link>

          <Link
            href="/chats"
            className="rounded-full px-4 py-2 transition hover:bg-white/8 hover:text-white"
          >
            Chats
          </Link>

          <a
            href="#pricing"
            className="rounded-full px-4 py-2 transition hover:bg-white/8 hover:text-white"
          >
            Pricing
          </a>

          <a
            href="#features"
            className="rounded-full px-4 py-2 transition hover:bg-white/8 hover:text-white"
          >
            Features
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-emerald-200/80 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live
          </div>

          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
