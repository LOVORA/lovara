import Link from "next/link";
import AdminNav from "@/components/admin/admin-nav";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import {
  listAdminCommunityCharacters,
  listManagedBuiltInCharacters,
  toRecord,
} from "@/lib/character-admin";

export default async function AdminOverviewPage() {
  const { supabase, user } = await requireAdminPageAccess();
  const [professionalCharacters, communityCharacters] = await Promise.all([
    listManagedBuiltInCharacters(supabase as never),
    listAdminCommunityCharacters(supabase as never, 120),
  ]);

  const publicCommunityCount = communityCharacters.filter((item) => {
    const payload = toRecord(item.payload);
    return payload?.visibility === "public";
  }).length;

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <AdminNav />

        <section className="mt-6 rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(255,255,255,0.05),rgba(217,70,239,0.08))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.26)]">
          <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-cyan-200">
            Admin
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            Character control panel
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62 md:text-base">
            Manage Lovora&apos;s professional lineup and public community visibility
            from one internal surface.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
              Signed in as {user.email ?? user.id}
            </span>
            <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-2 text-fuchsia-100">
              {professionalCharacters.length} professional characters
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-100">
              {publicCommunityCount} public community characters
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">
              Professional
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Built-in lineup controls
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/62">
              Override role copy, card text, chat availability, sidebar presence,
              and Photo Studio visibility without moving built-in characters out of code.
            </p>
            <Link
              href="/admin/characters"
              className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
            >
              Open character manager
            </Link>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">
              Community
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Public surface controls
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/62">
              Edit naming, teaser copy, public visibility, sidebar samples, chat
              availability, and Photo Studio presence for community characters.
            </p>
            <Link
              href="/admin/characters"
              className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
            >
              Review community catalog
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
