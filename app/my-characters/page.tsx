"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getCustomCharacters,
  removeCustomCharacter,
  type StoredCustomCharacter,
} from "../../lib/custom-characters-storage";

type CustomCharacterCard = StoredCustomCharacter & {
  headline?: string;
  description?: string;
  image?: string;
  tags?: string[];
  traits?: string[];
  scenario?: {
    setting?: string;
    relationshipToUser?: string;
    sceneGoal?: string;
    tone?: string;
    openingState?: string;
  };
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizeCharacter(raw: StoredCustomCharacter): CustomCharacterCard {
  const record = raw as Record<string, unknown>;

  const scenarioRaw =
    typeof record.scenario === "object" && record.scenario !== null
      ? (record.scenario as Record<string, unknown>)
      : undefined;

  return {
    ...raw,
    headline: typeof record.headline === "string" ? record.headline : undefined,
    description:
      typeof record.description === "string" ? record.description : undefined,
    image: typeof record.image === "string" ? record.image : undefined,
    tags: isStringArray(record.tags) ? record.tags : [],
    traits: isStringArray(record.traits) ? record.traits : [],
    scenario: scenarioRaw
      ? {
          setting:
            typeof scenarioRaw.setting === "string" ? scenarioRaw.setting : undefined,
          relationshipToUser:
            typeof scenarioRaw.relationshipToUser === "string"
              ? scenarioRaw.relationshipToUser
              : undefined,
          sceneGoal:
            typeof scenarioRaw.sceneGoal === "string"
              ? scenarioRaw.sceneGoal
              : undefined,
          tone: typeof scenarioRaw.tone === "string" ? scenarioRaw.tone : undefined,
          openingState:
            typeof scenarioRaw.openingState === "string"
              ? scenarioRaw.openingState
              : undefined,
        }
      : undefined,
  };
}

function CharacterAvatar({
  name,
  image,
}: {
  name: string;
  image?: string;
}) {
  if (image) {
    return (
      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/30 to-fuchsia-500/20 text-xl font-semibold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <div className="text-sm text-white/72">
      <span className="text-white/38">{label}:</span> {value}
    </div>
  );
}

export default function MyCharactersPage() {
  const [characters, setCharacters] = useState<CustomCharacterCard[]>([]);
  const [mounted, setMounted] = useState(false);

  function refreshCharacters() {
    const stored = getCustomCharacters<StoredCustomCharacter>().map(normalizeCharacter);
    setCharacters(stored);
  }

  useEffect(() => {
    setMounted(true);
    refreshCharacters();
  }, []);

  const sortedCharacters = useMemo(() => {
  return [...characters].sort((a, b) => {
    const nameA = a.name ?? "Unnamed Character";
    const nameB = b.name ?? "Unnamed Character";
    return nameA.localeCompare(nameB);
  });
}, [characters]);


  function handleDelete(slug: string) {
    removeCustomCharacter(slug);
    refreshCharacters();
  }

  return (
    <main className="min-h-screen bg-[#05050a] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-10%] h-[26rem] w-[26rem] rounded-full bg-pink-500/12 blur-3xl" />
        <div className="absolute right-[-10%] top-[8%] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[18%] h-[22rem] w-[22rem] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="border-b border-white/10 px-5 py-6 md:px-7 md:py-8">
            <div className="mb-3 inline-flex rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-pink-200/85">
              Lovora Library
            </div>

            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                  My Characters
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-[15px]">
                  View, manage, and launch every character created in your studio.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/create-character"
                  className="rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-900/30 transition hover:opacity-95"
                >
                  Create New Character
                </Link>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-7">
            {!mounted ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/80 p-8 text-center text-white/60">
                Loading characters...
              </div>
            ) : sortedCharacters.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-[#0a0a11]/80 p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-fuchsia-500/10 text-xl font-semibold text-pink-100">
                  +
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-white">
                  No custom characters yet
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/60">
                  Start with quick mode for speed or detailed studio for full control.
                </p>
                <div className="mt-6">
                  <Link
                    href="/create-character"
                    className="inline-flex rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-900/30 transition hover:opacity-95"
                  >
                    Open Character Studio
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {sortedCharacters.map((character) => {
                  const scenario = character.scenario;

                  return (
                    <div
                      key={character.slug}
                      className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/85 shadow-2xl backdrop-blur transition hover:border-pink-400/20 hover:bg-[#0d0d15]"
                    >
                      <div className="border-b border-white/10 p-5">
                        <div className="flex items-start gap-4">
                          <CharacterAvatar
                            name={character.name || "Character"}
                            image={character.image}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xl font-semibold text-white">
                              {character.name || "Unnamed Character"}
                            </div>
                            <div className="mt-1 text-sm text-pink-200/80">
                              {character.headline || "Custom Lovora character"}
                            </div>
                          </div>
                        </div>

                        {character.description ? (
                          <p className="mt-4 line-clamp-4 text-sm leading-7 text-white/68">
                            {character.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-4 p-5">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">
                            Scene Snapshot
                          </div>
                          <div className="space-y-2">
                            <InfoRow label="Setting" value={scenario?.setting} />
                            <InfoRow
                              label="Relationship"
                              value={scenario?.relationshipToUser}
                            />
                            <InfoRow label="Goal" value={scenario?.sceneGoal} />
                            <InfoRow label="Tone" value={scenario?.tone} />
                          </div>
                        </div>

                        {character.tags && character.tags.length > 0 ? (
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Tags
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {character.tags.slice(0, 6).map((tag, index) => (
                                <span
                                  key={`${tag}-${index}`}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {character.traits && character.traits.length > 0 ? (
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              Trait Badges
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {character.traits.slice(0, 5).map((trait, index) => (
                                <span
                                  key={`${trait}-${index}`}
                                  className="rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-xs text-pink-200"
                                >
                                  {trait}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="flex gap-3 pt-2">
                          <Link
                            href={`/chat/custom/${character.slug}`}
                            className="flex-1 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-pink-900/30 transition hover:opacity-95"
                          >
                            Open Chat
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(character.slug)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
