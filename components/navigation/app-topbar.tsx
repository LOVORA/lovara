"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TopbarProps = {
  focusMode?: boolean;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TopLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-4 py-2 text-sm text-fuchsia-100 transition"
          : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
      }
    >
      {label}
    </Link>
  );
}

export default function AppTopbar({ focusMode = false }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#050816]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="mr-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-sm font-semibold tracking-[0.26em] text-pink-100 shadow-[0_0_30px_rgba(244,114,182,0.16)]">
              L
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-white">
                LOVORA
              </div>
              <div className="text-[11px] text-white/45">
                Better character chat
              </div>
            </div>
          </Link>

          <div className="hidden flex-wrap gap-2 md:flex">
            <TopLink href="/" label="Home" />
            <TopLink href="/characters" label="Professional" />
            <TopLink href="/community" label="Community" />
            <TopLink href="/my-characters" label="My Characters" />
            <TopLink href="/chats" label="Chats" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!focusMode ? (
            <>
              <TopLink href="/create-character" label="Create Character" />
              <TopLink href="/my-profile" label="My Profile" />
              <TopLink href="/characters" label="Professional" />
              <TopLink href="/community" label="Community" />
            </>
          ) : (
            <>
              <TopLink href="/" label="Home" />
              <TopLink href="/my-characters" label="My Characters" />
              <TopLink href="/my-profile" label="My Profile" />
              <TopLink href="/characters" label="Professional" />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
