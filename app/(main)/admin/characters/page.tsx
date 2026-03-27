import Link from "next/link";
import AdminNav from "@/components/admin/admin-nav";
import { requireAdminPageAccess } from "@/lib/admin-auth";
import {
  getCustomCharacterVisibility,
  listAdminCommunityCharacters,
  listManagedBuiltInCharacters,
} from "@/lib/character-admin";

export default async function AdminCharactersPage() {
  const { supabase } = await requireAdminPageAccess();
  const [professionalCharacters, communityCharacters] = await Promise.all([
    listManagedBuiltInCharacters(supabase as never),
    listAdminCommunityCharacters(supabase as never, 120),
  ]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <AdminNav />

        <section className="mt-6 rounded-[34px] border border-white/10 bg-white/[0.03] p-6">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/38">
            Characters
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Professional and community controls
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
            Open any row to change visible copy, role text, public visibility,
            chat access, sidebar presence, and Photo Studio access.
          </p>
        </section>

        <section className="mt-8 space-y-6">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-200/75">
                  Professional
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Built-in characters
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/55">
                {professionalCharacters.length} rows
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-3 border-b border-white/10 bg-black/20 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-white/42">
                <div>Character</div>
                <div>Listed</div>
                <div>Chat / Studio</div>
                <div />
              </div>
              {professionalCharacters.map((character) => (
                <div
                  key={character.slug}
                  className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-3 border-b border-white/8 px-4 py-4 last:border-b-0"
                >
                  <div>
                    <div className="text-sm font-medium text-white">{character.name}</div>
                    <div className="mt-1 text-sm text-white/55">{character.role}</div>
                  </div>
                  <div className="text-sm text-white/72">
                    {character.adminVisibility.showInProfessionalList ? "Visible" : "Hidden"}
                  </div>
                  <div className="text-sm text-white/72">
                    {character.adminVisibility.chatEnabled ? "Chat on" : "Chat off"} •{" "}
                    {character.adminVisibility.showInPhotoStudio ? "Studio on" : "Studio off"}
                  </div>
                  <div>
                    <Link
                      href={`/admin/characters/professional/${character.slug}`}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/75">
                  Community
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Custom / public characters
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/55">
                {communityCharacters.length} rows
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10">
              <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-3 border-b border-white/10 bg-black/20 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-white/42">
                <div>Character</div>
                <div>Public</div>
                <div>Chat / Studio</div>
                <div />
              </div>
              {communityCharacters.map((character) => {
                const visibility = getCustomCharacterVisibility(character.payload);
                const payload =
                  typeof character.payload === "object" && character.payload
                    ? (character.payload as Record<string, unknown>)
                    : {};

                return (
                  <div
                    key={character.id}
                    className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-3 border-b border-white/8 px-4 py-4 last:border-b-0"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{character.name}</div>
                      <div className="mt-1 text-sm text-white/55">{character.archetype}</div>
                    </div>
                    <div className="text-sm text-white/72">
                      {payload.visibility === "public" ? "Public" : "Private"} •{" "}
                      {visibility.showInCommunityList ? "Listed" : "Hidden"}
                    </div>
                    <div className="text-sm text-white/72">
                      {visibility.chatEnabled ? "Chat on" : "Chat off"} •{" "}
                      {visibility.showInPhotoStudio ? "Studio on" : "Studio off"}
                    </div>
                    <div>
                      <Link
                        href={`/admin/characters/community/${character.id}`}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
