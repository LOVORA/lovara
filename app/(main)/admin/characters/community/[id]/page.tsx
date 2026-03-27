import Link from "next/link";
import { notFound } from "next/navigation";
import AdminNav from "@/components/admin/admin-nav";
import CommunityCharacterEditor from "@/components/admin/community-character-editor";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import {
  getAdminCommunityCharacterById,
  getCustomCharacterVisibility,
  toRecord,
} from "@/lib/character-admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCommunityCharacterPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase } = await requireAdminPageAccess();
  const character = await getAdminCommunityCharacterById(supabase as never, id);

  if (!character) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <AdminNav />

        <section className="mt-6 rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/75">
                Community editor
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {character.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
                Control public visibility, sidebar presence, Photo Studio access,
                and the visible copy for this community character.
              </p>
            </div>
            <Link
              href="/admin/characters"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
            >
              Back to character manager
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
              slug: {character.slug}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-100">
              {getCustomCharacterVisibility(character.payload).chatEnabled
                ? "chat enabled"
                : "chat disabled"}
            </span>
          </div>
        </section>

        <section className="mt-8">
          <CommunityCharacterEditor
            character={{
              ...character,
              payload: toRecord(character.payload),
              adminVisibility: getCustomCharacterVisibility(character.payload),
            }}
          />
        </section>
      </div>
    </main>
  );
}
