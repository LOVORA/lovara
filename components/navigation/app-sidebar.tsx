"use client";

import Link from "next/link";
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
  { href: "/chats", label: "Chats" },
];

const LIBRARY_ITEMS: NavItem[] = [
  { href: "/characters", label: "Professional Characters" },
  { href: "/community", label: "Community Characters" },
  { href: "/create-character", label: "Create Character" },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { href: "/my-profile", label: "My Profile" },
  { href: "/pricing", label: "Plans Preview" },
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

export default function AppSidebar() {
  return (
    <aside className="hidden w-[300px] shrink-0 border-r border-white/8 bg-[linear-gradient(180deg,rgba(7,11,24,0.96),rgba(8,13,28,0.88))] xl:flex xl:flex-col">
      <div className="border-b border-white/8 px-6 py-6">
        <Link href="/" className="block">
          <div className="text-xs uppercase tracking-[0.24em] text-fuchsia-200/80">
            Lovora
          </div>
          <div className="mt-2 text-lg font-semibold tracking-tight text-white">
            Easy navigation
          </div>
          <div className="mt-1 text-sm text-white/45">
            Jump to the parts you use most.
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-8">
          <SidebarSection title="Main" items={MAIN_ITEMS} />
          <SidebarSection title="Library" items={LIBRARY_ITEMS} />
          <SidebarSection title="Account" items={ACCOUNT_ITEMS} />

          <div className="rounded-[28px] border border-white/8 bg-gradient-to-br from-fuchsia-400/10 via-white/[0.02] to-cyan-400/10 p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/75">
              Start here
            </div>
            <div className="mt-2 text-sm leading-6 text-white/55">
              Create something new or go back to your saved chats.
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
                Manage characters
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
                Plans preview
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
