"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getIdentitySummary,
  getVisibilityFromPayload,
} from "@/lib/custom-character-studio";

type PublicCharacter = {
  id: string;
  slug: string;
  name: string;
  archetype: string;
  headline: string;
  description: string;
  greeting: string;
  preview_message: string;
  backstory: string;
  tags: string[];
  trait_badges: Array<{ label: string; tone?: string }>;
  scenario: {
    setting?: string;
    relationshipToUser?: string;
    sceneGoal?: string;
    tone?: string;
    openingState?: string;
  } | null;
  payload: Record<string, unknown> | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function StatCard({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 text-sm leading-6 text-white/75">{value}</div>
    </div>
  );
}

export default function PublicCharacterSharePage({
  params,
}: {
  params: { shareId: string };
}) {
  const [character, setCharacter] = useState<PublicCharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCharacter() {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("custom_characters")
          .select("*")
          .contains("payload", {
            publicShareId: params.shareId,
            visibility: "public",
          })
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (!data) {
          throw new Error("NOT_FOUND");
        }

        if (!cancelled) {
          setCharacter(data as PublicCharacter);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not load character.";
        if (!cancelled) {
          setError(
            message === "NOT_FOUND"
              ? "This public character page does not exist."
              : message,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCharacter();

    return () => {
      cancelled = true;
    };
  }, [params.shareId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-sm text-white/65">
          Loading public character...
        </div>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
          <h1 className="text-2xl font-semibold text-white">Public page unavailable</h1>
          <p className="mt-3 text-sm leading-7 text-white/60">
            {error || "This character could not be loaded."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
          >
            Go home
          </Link>
        </div>
      </main>
    );
  }

  const payload =
    typeof character.payload === "object" && character.payload
      ? (character.payload as Record<string, unknown>)
      : {};

  const identitySummary = getIdentitySummary(payload);
  const visibility = getVisibilityFromPayload(payload);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/5 to-cyan-400/10 p-8">
          <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/80">
            Public Character Page
          </div>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {character.name}
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/62">
            {character.headline || character.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                visibility === "public"
                  ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border border-white/10 bg-white/5 text-white/70",
              )}
            >
              {visibility}
            </span>

            {identitySummary.map((item) => (
              <span
                key={item}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Description
              </div>
              <p className="mt-3 text-sm leading-7 text-white/75">
                {character.description}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Greeting
              </div>
              <p className="mt-3 text-sm leading-7 text-white/75">
                {character.greeting}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Backstory
              </div>
              <p className="mt-3 text-sm leading-7 text-white/75">
                {character.backstory}
              </p>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Roleplay profile
              </div>

              <div className="mt-4 grid gap-3">
                <StatCard label="Archetype" value={character.archetype} />
                <StatCard label="Setting" value={character.scenario?.setting} />
                <StatCard
                  label="Relationship"
                  value={character.scenario?.relationshipToUser}
                />
                <StatCard label="Tone" value={character.scenario?.tone} />
                <StatCard label="Scene goal" value={character.scenario?.sceneGoal} />
                <StatCard label="Opening state" value={character.scenario?.openingState} />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Trait badges
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(character.trait_badges ?? []).map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                Tags
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {(character.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6">
              <h2 className="text-lg font-semibold text-white">
                Want your own version?
              </h2>
              <p className="mt-2 text-sm leading-7 text-white/60">
                Sign in and create your own custom character with the studio builder.
              </p>
              <Link
                href="/create-character"
                className="mt-4 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
              >
                Create your character
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
