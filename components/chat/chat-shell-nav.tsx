"use client";

import Link from "next/link";

const CHAT_SHELL_LINKS = [
  { href: "/", label: "Home" },
  { href: "/my-characters", label: "My Characters" },
  { href: "/community", label: "Community" },
  { href: "/my-profile", label: "My Profile" },
] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ChatShellNav({ activeHref }: { activeHref?: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.2)]">
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-black/20 p-2">
        {CHAT_SHELL_LINKS.map((item) => {
          const active = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2.5 text-sm transition",
                active
                  ? "bg-white text-black"
                  : "text-white/68 hover:bg-white/8 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
