import Link from "next/link";

const productLinks = [
  { href: "/", label: "Home" },
  { href: "/characters", label: "Professional Characters" },
  { href: "/community", label: "Community Characters" },
  { href: "/create-character", label: "Create Character" },
  { href: "/my-characters", label: "My Characters" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#08080e]">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/20 via-pink-500/10 to-white/5 text-lg font-semibold text-white shadow-[0_0_35px_rgba(217,70,239,0.16)]">
                L
              </div>

              <div>
                <div className="text-base font-semibold text-white">Lovora</div>
                <div className="text-xs text-white/45">
                  Premium AI character experiences
                </div>
              </div>
            </div>

            <p className="text-sm leading-7 text-white/60 sm:text-base">
              A more immersive AI character product built around better
              conversations, stronger scenario design, and a cleaner premium
              experience from discovery to chat.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/65">
                Adults only
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/65">
                Private chat
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/65">
                Character studio
              </span>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/40">
                Product
              </h3>

              <div className="flex flex-col gap-3">
                {productLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm text-white/65 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/40">
                Start here
              </h3>

              <div className="flex flex-col gap-3">
                <Link
                  href="/create-character"
                  className="text-sm text-white/65 transition hover:text-white"
                >
                  Build a custom character
                </Link>
                <Link
                  href="/characters"
                  className="text-sm text-white/65 transition hover:text-white"
                >
                  Browse professional characters
                </Link>
                <Link
                  href="/community"
                  className="text-sm text-white/65 transition hover:text-white"
                >
                  Explore community creations
                </Link>
                <Link
                  href="/my-characters"
                  className="text-sm text-white/65 transition hover:text-white"
                >
                  Open your vault
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Lovora. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>
            <Link href="/characters" className="transition hover:text-white">
              Professional
            </Link>
            <Link href="/community" className="transition hover:text-white">
              Community
            </Link>
            <Link href="/create-character" className="transition hover:text-white">
              Create
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
