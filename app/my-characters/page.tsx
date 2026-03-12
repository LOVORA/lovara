"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCustomCharacters,
  removeCustomCharacter,
} from "../../lib/custom-characters-storage";

type SavedCharacter = {
  slug: string;
  name?: string;
  headline?: string;
  description?: string;
  greeting?: string;
  image?: string;
  role?: string;
  archetype?: string;
  backstory?: string;
  previewMessage?: unknown;
  tags?: unknown;
  traits?: unknown;
  memory?: unknown;
  scenario?: {
    setting?: string;
    relationshipToUser?: string;
    sceneGoal?: string;
    tone?: string;
    openingState?: string;
  };
  __savedAt?: string;
};

function toDisplayText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = ["label", "name", "title", "value", "text", "slug", "id", "key"];

    for (const key of preferredKeys) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function toDisplayList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayText(item)).filter(Boolean);
  }

  if (value == null) return [];

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidateArrays = [
      record.items,
      record.entries,
      record.memories,
      record.list,
      record.values,
      record.lines,
    ];

    for (const candidate of candidateArrays) {
      if (Array.isArray(candidate)) {
        return candidate.map((item) => toDisplayText(item)).filter(Boolean);
      }
    }
  }

  const text = toDisplayText(value);
  return text ? [text] : [];
}

function formatSavedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export default function MyCharactersPage() {
  const [characters, setCharacters] = useState<SavedCharacter[]>([]);

  useEffect(() => {
    setCharacters(getCustomCharacters() as SavedCharacter[]);
  }, []);

  function handleDelete(slug: string) {
    const next = removeCustomCharacter(slug);
    setCharacters(next as SavedCharacter[]);
  }

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.28em] text-pink-300/70">
              Lovora
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              My Characters
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Your locally saved custom characters from the builder.
            </p>
          </div>

          <Link
            href="/create-character"
            className="inline-flex rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95"
          >
            Create New Character
          </Link>
        </div>

        {characters.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur">
            <h2 className="text-2xl font-semibold">No saved characters yet</h2>
            <p className="mt-3 text-sm text-white/60">
              Create a character and save it to see it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {characters.map((character, index) => {
              const tags = toDisplayList(character.tags);
              const traits = toDisplayList(character.traits);
              const memory = toDisplayList(character.memory);
              const previewMessage = toDisplayText(character.previewMessage);
              const savedAt = formatSavedAt(character.__savedAt);

              return (
                <div
                  key={`${character.slug}-${index}`}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur"
                >
                  <div className="border-b border-white/10 p-5">
                    <div className="mb-4 flex items-start gap-4">
                      {character.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={character.image}
                          alt={character.name ?? "Character"}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/25 to-fuchsia-500/20 text-xl font-semibold text-pink-200">
                          {character.name?.charAt(0) ?? "C"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-2xl font-semibold">
                          {character.name ?? "Unnamed Character"}
                        </h2>
                        <p className="mt-1 text-sm text-pink-300/80">
                          {character.headline ?? character.slug}
                        </p>

                        {savedAt ? (
                          <p className="mt-2 text-xs text-white/40">
                            Saved: {savedAt}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {character.role ? (
                      <div className="mb-2 text-sm text-white/70">
                        <span className="text-white/45">Role:</span> {character.role}
                      </div>
                    ) : null}

                    {character.archetype ? (
                      <div className="text-sm text-white/70">
                        <span className="text-white/45">Archetype:</span>{" "}
                        {character.archetype}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-5 p-5">
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                        Description
                      </div>
                      <p className="text-sm leading-6 text-white/75">
                        {character.description ?? "No description"}
                      </p>
                    </div>

                    {previewMessage ? (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          Preview Message
                        </div>
                        <div className="rounded-2xl border border-pink-400/15 bg-pink-500/5 p-4 text-sm leading-6 text-white/85">
                          {previewMessage}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                        Greeting
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80">
                        {character.greeting ?? "No greeting"}
                      </div>
                    </div>

                    {character.scenario ? (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          Scenario
                        </div>

                        <div className="space-y-2">
                          {character.scenario.setting ? (
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                              <span className="text-white/45">Setting:</span>{" "}
                              {character.scenario.setting}
                            </div>
                          ) : null}

                          {character.scenario.relationshipToUser ? (
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                              <span className="text-white/45">Relationship:</span>{" "}
                              {character.scenario.relationshipToUser}
                            </div>
                          ) : null}

                          {character.scenario.sceneGoal ? (
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                              <span className="text-white/45">Goal:</span>{" "}
                              {character.scenario.sceneGoal}
                            </div>
                          ) : null}

                          {character.scenario.tone ? (
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                              <span className="text-white/45">Tone:</span>{" "}
                              {character.scenario.tone}
                            </div>
                          ) : null}

                          {character.scenario.openingState ? (
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                              <span className="text-white/45">Opening:</span>{" "}
                              {character.scenario.openingState}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {tags.length > 0 ? (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          Tags
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, tagIndex) => (
                            <span
                              key={`${tag}-${tagIndex}`}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {traits.length > 0 ? (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          Traits
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {traits.map((trait, traitIndex) => (
                            <span
                              key={`${trait}-${traitIndex}`}
                              className="rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-xs text-pink-200"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {memory.length > 0 ? (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          Memory Seed
                        </div>
                        <div className="space-y-2">
                          {memory.map((item, memoryIndex) => (
                            <div
                              key={`${item}-${memoryIndex}`}
                              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {character.backstory ? (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                          Backstory
                        </div>
                        <p className="text-sm leading-6 text-white/75">
                          {character.backstory}
                        </p>
                      </div>
                    ) : null}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleDelete(character.slug)}
                        className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
                      >
                        Delete
                      </button>

                      <Link
                        href={`/chat/custom/${character.slug}`}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3 text-center text-sm font-medium text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95"
                      >
                        Chat
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
