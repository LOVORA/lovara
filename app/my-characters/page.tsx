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
  tags?: unknown;
  traits?: unknown;
  __savedAt?: string;
};

function toDisplayText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = ["label", "name", "title", "value", "text", "slug", "id"];

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
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.2em] text-white/50">
              Lovora
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">My Characters</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/65">
              Your locally saved custom characters from the builder.
            </p>
          </div>

          <Link
            href="/create-character"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
          >
            Create New Character
          </Link>
        </div>

        {characters.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-xl font-semibold">No saved characters yet</h2>
            <p className="mt-2 text-sm text-white/65">
              Create a character and save it to see it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((character, index) => {
              const tags = toDisplayList(character.tags);
              const traits = toDisplayList(character.traits);

              return (
                <article
                  key={`${character.slug}-${index}`}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
                >
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold">
                      {character.name ?? "Unnamed Character"}
                    </h2>
                    <p className="mt-1 text-sm text-white/45">
                      {character.headline ?? character.slug}
                    </p>
                  </div>

                  <div className="space-y-4 text-sm text-white/80">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                        Description
                      </p>
                      <p>{character.description ?? "No description"}</p>
                    </div>

                    <div>
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                        Greeting
                      </p>
                      <p>{character.greeting ?? "No greeting"}</p>
                    </div>

                    {tags.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, tagIndex) => (
                            <span
                              key={`${character.slug}-tag-${tagIndex}`}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {traits.length > 0 ? (
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                          Traits
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {traits.map((trait, traitIndex) => (
                            <span
                              key={`${character.slug}-trait-${traitIndex}`}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => handleDelete(character.slug)}
                      className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
                    >
                      Delete
                    </button>

                    <Link
                      href={`/chat/custom/${character.slug}`}
                      className="flex-1 rounded-2xl border border-pink-400/30 bg-pink-500/10 px-4 py-3 text-center text-sm font-medium text-pink-200 transition hover:bg-pink-500/20"
                    >
                      Chat
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
