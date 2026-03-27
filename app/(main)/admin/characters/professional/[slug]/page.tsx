import { notFound } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/admin/admin-nav";
import ProfessionalCharacterEditor from "@/components/admin/professional-character-editor";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import { getManagedBuiltInCharacterBySlug } from "@/lib/character-admin";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminProfessionalCharacterPage({ params }: PageProps) {
  const { slug } = await params;
  const { supabase } = await requireAdminPageAccess();
  const character = await getManagedBuiltInCharacterBySlug(supabase as never, slug);

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
              <div className="text-[11px] uppercase tracking-[0.2em] text-fuchsia-200/75">
                Professional editor
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {character.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
                Override the visible role, headline, description, and where this
                built-in character appears.
              </p>
            </div>
            <Link
              href="/admin/characters"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
            >
              Back to character manager
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <ProfessionalCharacterEditor character={character} />
        </section>
      </div>
    </main>
  );
}
