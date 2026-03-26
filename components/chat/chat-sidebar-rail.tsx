"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type SidebarItem = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  chatHref: string;
  kind: "built-in" | "custom";
};

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/my-characters", label: "My Characters" },
  { href: "/photo-studio", label: "Photo Studio" },
  { href: "/collection", label: "Collection" },
] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ChatSidebarRail({ activeHref }: { activeHref: string }) {
  const [items, setItems] = useState<SidebarItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/chats/sidebar", {
          credentials: "include",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              items?: Array<{
                id?: string;
                name?: string;
                avatarUrl?: string | null;
                chatHref?: string;
                kind?: "built-in" | "custom";
              }>;
            }
          | null;

        if (!response.ok || !payload?.ok || !Array.isArray(payload.items) || cancelled) {
          return;
        }

        setItems(
          payload.items
            .map((item) => ({
              id: typeof item.id === "string" ? item.id : "",
              name: typeof item.name === "string" ? item.name : "Character",
              avatarUrl: typeof item.avatarUrl === "string" ? item.avatarUrl : null,
              chatHref: typeof item.chatHref === "string" ? item.chatHref : "",
              kind: (item.kind === "custom" ? "custom" : "built-in") as
                | "custom"
                | "built-in",
            }))
            .filter((item) => item.id && item.chatHref),
        );
      } catch {
        return;
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
      <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
            Started Chats
          </div>
          <div className="mt-1 text-sm text-white/58">
            Jump back into any live thread.
          </div>
        </div>

        <div className="space-y-2">
          {items.length > 0 ? (
            items.map((item) => {
              const active = item.chatHref === activeHref;

              return (
                <Link
                  key={item.id}
                  href={item.chatHref}
                  className={cn(
                    "flex items-center gap-3 rounded-[22px] border px-3 py-3 transition",
                    active
                      ? "border-fuchsia-400/20 bg-fuchsia-400/12 shadow-[0_10px_30px_rgba(244,114,182,0.12)]"
                      : "border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]",
                  )}
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                    {item.avatarUrl ? (
                      <Image
                        src={item.avatarUrl}
                        alt={item.name}
                        fill
                        unoptimized
                        sizes="44px"
                        className="object-contain object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/80">
                        {item.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className={cn("truncate text-sm font-medium", active ? "text-white" : "text-white/78")}>
                      {item.name}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/35">
                      {item.kind === "custom" ? "Custom" : "Character"}
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/48">
              Chats will appear here after you start talking.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
          Quick Links
        </div>
        <div className="mt-3 grid gap-2">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/78 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
