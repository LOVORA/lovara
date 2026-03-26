"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const MAIN_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/characters", label: "Professional" },
  { href: "/community", label: "Community" },
  { href: "/my-characters", label: "My Characters" },
  { href: "/photo-studio", label: "Photo Studio" },
];

const LIBRARY_ITEMS: NavItem[] = [
  { href: "/characters", label: "Professional" },
  { href: "/community", label: "Community" },
  { href: "/collection", label: "Collection" },
  { href: "/photo-studio", label: "Photo Studio" },
  { href: "/create-character", label: "Create" },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/my-profile", label: "My Profile" },
  { href: "/pricing", label: "Plans" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={
        active
          ? "flex items-center rounded-2xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-4 py-3 text-sm font-medium text-fuchsia-100 transition"
          : "flex items-center rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/72 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
      }
    >
      {item.label}
    </Link>
  );
}

function SidebarSection({
  title,
  items,
}: {
  title: string;
  items: NavItem[];
}) {
  return (
    <div>
      <div className="mb-3 px-1 text-[11px] uppercase tracking-[0.2em] text-white/35">
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <SidebarLink key={item.href + item.label} item={item} />
        ))}
      </div>
    </div>
  );
}

type ChatShortcutItem = {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  chatHref: string;
  kind: "built-in" | "custom";
  updatedAt: string;
};

function ChatShortcutRow({
  item,
  active,
}: {
  item: ChatShortcutItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.chatHref}
      className={
        active
          ? "flex items-center gap-3 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-3 text-fuchsia-100 transition"
          : "flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-white/72 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
      }
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        {item.avatarUrl ? (
          <Image
            src={item.avatarUrl}
            alt={item.name}
            fill
            unoptimized
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/82">
            {item.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.name}</div>
      </div>
    </Link>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();
  const [chatItems, setChatItems] = useState<ChatShortcutItem[]>([]);
  const isChatPage =
    pathname.startsWith("/chat/") || pathname.startsWith("/chat/custom/");

  useEffect(() => {
    let cancelled = false;

    async function loadChatItems() {
      if (!isChatPage) {
        setChatItems([]);
        return;
      }

      try {
        const response = await fetch("/api/chats/sidebar", {
          credentials: "include",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              items?: Array<{
                id?: string;
                slug?: string;
                name?: string;
                avatarUrl?: string | null;
                chatHref?: string;
                kind?: "built-in" | "custom";
                updatedAt?: string;
              }>;
            }
          | null;

        if (!response.ok || !payload?.ok || !Array.isArray(payload.items)) {
          if (!cancelled) setChatItems([]);
          return;
        }

        if (cancelled) return;

        setChatItems(
          payload.items
            .map(
              (item): ChatShortcutItem => ({
              id: typeof item.id === "string" ? item.id : "",
              slug: typeof item.slug === "string" ? item.slug : "",
              name: typeof item.name === "string" ? item.name : "Character",
              avatarUrl: typeof item.avatarUrl === "string" ? item.avatarUrl : null,
              chatHref: typeof item.chatHref === "string" ? item.chatHref : "",
              kind: item.kind === "built-in" ? "built-in" : "custom",
              updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : "",
              }),
            )
            .filter((item) => item.id && item.chatHref),
        );
      } catch {
        if (!cancelled) setChatItems([]);
      }
    }

    void loadChatItems();

    return () => {
      cancelled = true;
    };
  }, [isChatPage]);

  return (
    <aside className="hidden w-[300px] shrink-0 border-r border-white/8 bg-[linear-gradient(180deg,rgba(7,11,24,0.96),rgba(8,13,28,0.88))] xl:flex xl:flex-col">
      <div className="border-b border-white/8 px-6 py-6">
        <Link href="/" className="block">
          <div className="text-xs uppercase tracking-[0.24em] text-fuchsia-200/80">
            Lovora
          </div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-white">
            Simple navigation
          </div>
          <div className="mt-1 text-sm text-white/45">
            Go straight to the parts you use most.
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-8">
          {isChatPage ? (
            <div>
              <div className="mb-3 px-1 text-[11px] uppercase tracking-[0.2em] text-white/35">
                Chats
              </div>
              {chatItems.length > 0 ? (
                <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  {chatItems.map((item) => (
                    <ChatShortcutRow
                      key={item.id}
                      item={item}
                      active={pathname === item.chatHref}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/50">
                  No chats yet.
                </div>
              )}
            </div>
          ) : null}

          <SidebarSection title="Main" items={MAIN_ITEMS} />
          <SidebarSection title="Library" items={LIBRARY_ITEMS} />
          <SidebarSection title="Account" items={ACCOUNT_ITEMS} />

          <div className="rounded-[28px] border border-white/8 bg-gradient-to-br from-fuchsia-400/10 via-white/[0.02] to-cyan-400/10 p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/75">
              Start here
            </div>
            <div className="mt-2 text-sm leading-6 text-white/55">
              Create someone new or pick up where you left off.
            </div>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <Link
                href="/create-character"
                className="block rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                Create a character
              </Link>
              <Link
                href="/my-characters"
                className="block rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                My characters
              </Link>
              <Link
                href="/collection"
                className="block rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                View collection
              </Link>
              <Link
                href="/photo-studio"
                className="block rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                Open Photo Studio
              </Link>
              <Link
                href="/characters"
                className="block rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                Professional characters
              </Link>
              <Link
                href="/community"
                className="block rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                Community characters
              </Link>
              <Link
                href="/pricing"
                className="block rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 transition hover:border-white/15 hover:bg-white/[0.07]"
              >
                View plans
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
