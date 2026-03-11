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
    setCharacters(getCustomCharacters<SavedCharacter>());
  }, []);

  function handleDelete(slug: string) {
    const next = removeCustomCharacter(slug);
    setCharacters(next as SavedCharacter[]);
  }

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <section className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-14">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.28em] text-pink-300/80">
              Lovora
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              My Characters
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Your locally saved custom characters from the builder.
            </p>
          </div>

          <Link
            href="/create-character"
            className="rounded-2xl bg-pink-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-pink-400"
          >
            Create New Character
          </Link>
        </div>

        {characters.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="text-xl font-semibold">No saved characters yet</h2>
            <p className="mt-3 text-sm text-white/60">
              Create a character and save it to see it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((character, index) => {
              const tags = toDisplayList(character.tags);
              const traits = toDisplayList(character.traits);

              return (
                <div
                  key={`${character.slug}-${index}`}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
                >
                  <div className="border-b border-white/10 p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500/30 to-fuchsia-500/20" />
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {character.name ?? "Unnamed Character"}
                        </div>
                        <div className="text-sm text-pink-300/80">
                          {character.headline ?? character.slug}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-white/70">
                      {character.description ?? "No description"}
                    </p>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                        Greeting
                      </div>
                      <div className="rounded-2xl border border-pink-400/15 bg-pink-500/5 p-4 text-sm leading-6 text-white/85">
                        {character.greeting ?? "No greeting"}
                      </div>
                    </div>

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

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(character.slug)}
                        className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
                      >
                        Delete
                      </button>

                      <button
                        type="button"
                        disabled
                        className="flex-1 rounded-2xl bg-pink-500/50 px-4 py-3 text-sm font-medium text-white/80"
                      >
                        Chat Soon
                      </button>
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
