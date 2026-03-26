import { notFound } from "next/navigation";
import ChatWindow from "@/components/chat/chat-window";
import CharacterInfoPanel from "@/components/chat/character-info-panel";
import ChatShellNav from "@/components/chat/chat-shell-nav";
import ChatSidebarRail from "@/components/chat/chat-sidebar-rail";
import AuthGuard from "@/components/auth/auth-guard";
import { getCharacterBySlug } from "@/lib/characters";

type ChatPageProps = {
  params: {
    slug: string;
  };
};

export default async function ChatPage({ params }: ChatPageProps) {
  const character = getCharacterBySlug(params.slug);

  if (!character) {
    notFound();
  }

  const storySummary =
    character.description?.trim() || character.headline?.trim() || character.personality?.trim();
  const scenarioSummary = [
    character.scenario?.relationshipToUser,
    character.scenario?.setting,
    character.scenario?.tone,
    character.scenario?.sceneGoal,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" • ");
  const identityChips = [
    character.history?.origin,
    character.visualProfile?.visualAura,
    character.visualProfile?.signatureDetail,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,105,180,0.08),transparent_24%),linear-gradient(to_bottom,#07070b,#0a0a0f)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <div className="mb-4">
            <ChatShellNav />
          </div>

          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
            <AuthGuard>
              <ChatSidebarRail activeHref={`/chat/${character.slug}`} />
            </AuthGuard>

            <AuthGuard>
              <ChatWindow characterSlug={character.slug} />
            </AuthGuard>

            <CharacterInfoPanel
              avatarUrl={character.image}
              name={character.name}
              ageLabel={typeof character.age === "number" ? `${character.age}` : undefined}
              roleLabel={character.role}
              identityChips={identityChips}
              storySummary={storySummary}
              scenarioSummary={scenarioSummary}
              photoStudioHref={`/photo-studio/built-in/${character.slug}`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
