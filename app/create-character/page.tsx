"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildCharacterEngineOutput,
  type CharacterArchetype,
  type CharacterBuilderInput,
  type GenderPresentation,
  type RelationshipPace,
  type ReplyLength,
  type SpeechStyle,
} from "../../lib/character-engine";
import { convertBuilderToCharacter } from "../../lib/custom-character-adapter";
import { addCustomCharacter } from "../../lib/custom-characters-storage";

const archetypes: CharacterArchetype[] = [
  "sweetheart",
  "ice-queen",
  "confident-seducer",
  "chaotic-flirt",
  "nurturing-lover",
  "possessive-lover",
  "elegant-muse",
  "best-friend-lover",
];

const genderPresentations: GenderPresentation[] = [
  "feminine",
  "masculine",
  "androgynous",
];

const replyLengths: ReplyLength[] = ["short", "balanced", "detailed"];
const speechStyles: SpeechStyle[] = ["natural", "poetic", "witty", "bold", "soft"];
const relationshipPaces: RelationshipPace[] = ["slow-burn", "balanced", "fast"];

const initialInput: CharacterBuilderInput = {
  name: "Sable",
  archetype: "confident-seducer",
  genderPresentation: "feminine",
  ageVibe: "mid-20s",
  backgroundVibe:
    "luxury nightlife, private parties, expensive taste, magnetic social presence",
  playful: 72,
  romantic: 68,
  dominant: 81,
  affectionate: 63,
  jealous: 38,
  mysterious: 59,
  confident: 88,
  emotionalDepth: 61,
  teasing: 84,
  humor: 54,
  replyLength: "detailed",
  speechStyle: "bold",
  relationshipPace: "balanced",
  tags: ["flirty", "dominant", "luxury", "confident"],
  customNotes:
    "She should feel expensive, emotionally controlled, seductive, and highly memorable.",
};

type SliderKey =
  | "playful"
  | "romantic"
  | "dominant"
  | "affectionate"
  | "jealous"
  | "mysterious"
  | "confident"
  | "emotionalDepth"
  | "teasing"
  | "humor";

type SliderField = {
  key: SliderKey;
  label: string;
};

const sliderFields: SliderField[] = [
  { key: "playful", label: "Playful" },
  { key: "romantic", label: "Romantic" },
  { key: "dominant", label: "Dominant" },
  { key: "affectionate", label: "Affectionate" },
  { key: "jealous", label: "Jealous" },
  { key: "mysterious", label: "Mysterious" },
  { key: "confident", label: "Confident" },
  { key: "emotionalDepth", label: "Emotional Depth" },
  { key: "teasing", label: "Teasing" },
  { key: "humor", label: "Humor" },
];

function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function traitPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function toDisplayText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    const preferredKeys = [
      "label",
      "name",
      "title",
      "value",
      "text",
      "slug",
      "id",
      "key",
    ];

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

    const text = toDisplayText(value);
    return text ? [text] : [];
  }

  const text = toDisplayText(value);
  return text ? [text] : [];
}

export default function CreateCharacterPage() {
  const [form, setForm] = useState<CharacterBuilderInput>(initialInput);
  const [saveMessage, setSaveMessage] = useState("");

  const output = useMemo(() => buildCharacterEngineOutput(form), [form]);
  const characterPreview = useMemo(() => convertBuilderToCharacter(form), [form]);

  const previewMessage = (
    characterPreview.character as unknown as { previewMessage?: unknown }
  ).previewMessage;

  const displayTags = toDisplayList(characterPreview.character.tags);
  const displayTraits = toDisplayList(characterPreview.character.traits);
  const displayMemory = toDisplayList(characterPreview.character.memory);

  function updateField<K extends keyof CharacterBuilderInput>(
    key: K,
    value: CharacterBuilderInput[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSaveCharacter() {
    const savedPayload = {
      ...characterPreview.character,
      __source: "builder",
      __savedAt: new Date().toISOString(),
    };

    addCustomCharacter(savedPayload);
    setSaveMessage(`Saved "${characterPreview.character.name}" to My Characters.`);
  }

  const tagsText = form.tags?.join(", ") ?? "";

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.28em] text-pink-300/80">
              Lovora Character Engine
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Create Character
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70 md:text-base">
              Build a character using high-level controls while the system compiles
              a much deeper behavioral prompt in the background.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/my-characters"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-pink-400/40 hover:bg-white/10"
            >
              My Characters
            </Link>
            <button
              type="button"
              onClick={handleSaveCharacter}
              className="rounded-2xl bg-pink-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-pink-400"
            >
              Save Character
            </button>
          </div>
        </div>

        {saveMessage ? (
          <div className="mb-6 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm text-pink-100">
            {saveMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur md:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Character Builder</h2>
              <p className="mt-2 text-sm text-white/60">
                Adjust the visible inputs. The internal traits, preview card, and
                compiled system prompt update instantly.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                  placeholder="Character name"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Archetype</span>
                <select
                  value={form.archetype}
                  onChange={(e) =>
                    updateField("archetype", e.target.value as CharacterArchetype)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                >
                  {archetypes.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">
                  Gender Presentation
                </span>
                <select
                  value={form.genderPresentation}
                  onChange={(e) =>
                    updateField(
                      "genderPresentation",
                      e.target.value as GenderPresentation
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                >
                  {genderPresentations.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Age Vibe</span>
                <input
                  value={form.ageVibe}
                  onChange={(e) => updateField("ageVibe", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                  placeholder="mid-20s"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm text-white/70">
                  Background Vibe
                </span>
                <input
                  value={form.backgroundVibe}
                  onChange={(e) => updateField("backgroundVibe", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                  placeholder="Describe the world and aura of this character"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Reply Length</span>
                <select
                  value={form.replyLength}
                  onChange={(e) =>
                    updateField("replyLength", e.target.value as ReplyLength)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                >
                  {replyLengths.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Speech Style</span>
                <select
                  value={form.speechStyle}
                  onChange={(e) =>
                    updateField("speechStyle", e.target.value as SpeechStyle)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                >
                  {speechStyles.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm text-white/70">
                  Relationship Pace
                </span>
                <select
                  value={form.relationshipPace}
                  onChange={(e) =>
                    updateField(
                      "relationshipPace",
                      e.target.value as RelationshipPace
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                >
                  {relationshipPaces.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {sliderFields.map((field) => (
                <label
                  key={field.key}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-white/75">{field.label}</span>
                    <span className="text-sm font-medium text-pink-300">
                      {form[field.key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={form[field.key]}
                    onChange={(e) =>
                      updateField(field.key, Number(e.target.value) as never)
                    }
                    className="w-full accent-pink-400"
                  />
                </label>
              ))}
            </div>

            <div className="mt-8 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm text-white/70">
                  Tags (comma separated)
                </span>
                <input
                  value={tagsText}
                  onChange={(e) =>
                    updateField(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                  placeholder="flirty, dominant, luxury"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">
                  Custom Notes
                </span>
                <textarea
                  value={form.customNotes ?? ""}
                  onChange={(e) => updateField("customNotes", e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                  placeholder="Extra behavior or creator notes..."
                />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-pink-400/20 bg-gradient-to-br from-pink-500/10 to-fuchsia-500/5 p-5 shadow-2xl backdrop-blur md:p-6">
              <h2 className="text-xl font-semibold">Compiled Trait Output</h2>
              <p className="mt-2 text-sm text-white/60">
                These are the internal traits generated behind the visible builder
                inputs.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Object.entries(output.traits).map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      {key}
                    </div>
                    <div className="text-lg font-semibold text-pink-200">
                      {traitPercent(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur md:p-6">
              <h2 className="text-xl font-semibold">Lovora Character Preview</h2>
              <p className="mt-2 text-sm text-white/60">
                This is how the generated builder data maps into a real Lovora
                character object.
              </p>

              <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b12]">
                <div className="border-b border-white/10 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500/30 to-fuchsia-500/20" />
                    <div>
                      <div className="text-lg font-semibold text-white">
                        {characterPreview.character.name}
                      </div>
                      <div className="text-sm text-pink-300/80">
                        {characterPreview.character.headline}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-white/70">
                    {characterPreview.character.description}
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Archetype
                    </div>
                    <div className="text-sm text-white/85">
                      {toDisplayText(characterPreview.character.archetype)}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Personality
                    </div>
                    <div className="text-sm text-white/85">
                      {characterPreview.character.personality}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Greeting
                    </div>
                    <div className="rounded-2xl border border-pink-400/15 bg-pink-500/5 p-4 text-sm leading-6 text-white/85">
                      {characterPreview.character.greeting}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {displayTags.map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Trait Badges
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {displayTraits.map((trait, index) => (
                        <span
                          key={`${trait}-${index}`}
                          className="rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-xs text-pink-200"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Preview Message
                    </div>
                    <div className="text-sm text-white/80">
                      {toDisplayText(previewMessage) || "No preview message"}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Backstory
                    </div>
                    <div className="text-sm leading-6 text-white/75">
                      {toDisplayText(characterPreview.character.backstory)}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Memory Seed
                    </div>
                    <div className="space-y-2">
                      {displayMemory.map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur md:p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Generated System Prompt</h2>
                <p className="mt-2 text-sm text-white/60">
                  This is the live prompt compiled from the character builder.
                </p>
              </div>

              <pre className="max-h-[900px] overflow-auto rounded-2xl border border-white/10 bg-[#0b0b12] p-4 text-sm leading-7 whitespace-pre-wrap text-white/80">
                {output.systemPrompt}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
