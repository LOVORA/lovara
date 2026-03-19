"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthStatus from "../auth/auth-status";

const navItems = [
  { href: "/characters", label: "Professional" },
  { href: "/community", label: "Community" },
  { href: "/create-character", label: "Create" },
  { href: "/my-characters", label: "My Characters" },
  { href: "/my-profile", label: "My Profile" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070c]/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/20 via-pink-500/10 to-white/5 text-lg font-semibold text-white shadow-[0_0_35px_rgba(217,70,239,0.16)] transition group-hover:scale-[1.03]">
            L
          </div>

          <div className="leading-tight">
            <div className="text-base font-semibold tracking-wide text-white">
              Lovora
            </div>
            <div className="text-xs text-white/45">Premium character studio</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 md:flex">
          <Link
            href="/"
            className={[
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              pathname === "/"
                ? "bg-white text-black shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            Home
          </Link>

          {navItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-white text-black shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/characters"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            Professional
          </Link>

          <Link
            href="/create-character"
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90"
          >
            Create Character
          </Link>

          <div className="ml-1">
            <AuthStatus />
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <div className="scale-95">
            <AuthStatus />
          </div>

          <Link
            href="/create-character"
            className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-black"
          >
            Create
          </Link>
        </div>
      </div>

      <div className="border-t border-white/5 md:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <Link
            href="/"
            className={[
              "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-all",
              pathname === "/"
                ? "bg-white text-black"
                : "border border-white/10 bg-white/5 text-white/75",
            ].join(" ")}
          >
            Home
          </Link>

          {navItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white/75",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
