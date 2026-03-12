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
  name: "",
  archetype: "sweetheart",
  genderPresentation: "feminine",
  ageVibe: "",
  backgroundVibe: "",

  playful: 50,
  romantic: 50,
  dominant: 50,
  affectionate: 50,
  jealous: 20,
  mysterious: 40,
  confident: 50,
  emotionalDepth: 50,
  teasing: 45,
  humor: 45,

  replyLength: "balanced",
  speechStyle: "natural",
  relationshipPace: "balanced",

  tags: [],
  customNotes: "",

  scenario: {
    setting: "",
    relationshipToUser: "",
    sceneGoal: "",
    tone: "",
    openingState: "",
  },

  history: {
    origin: "",
    occupation: "",
    publicMask: "",
    privateSelf: "",
    definingDesire: "",
    emotionalWound: "",
    secret: "",
    manualBackstory: "",
  },
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

    const text = toDisplayText(value);
    return text ? [text] : [];
  }

  const text = toDisplayText(value);
  return text ? [text] : [];
}

export default function CreateCharacterPage() {
  const [form, setForm] = useState(initialInput);
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

  function updateScenarioField(
    key: keyof NonNullable<CharacterBuilderInput["scenario"]>,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      scenario: {
        ...(prev.scenario ?? {}),
        [key]: value,
      },
    }));
  }

  function updateHistoryField(
    key: keyof NonNullable<CharacterBuilderInput["history"]>,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      history: {
        ...(prev.history ?? {}),
        [key]: value,
      },
    }));
  }

  function handleSaveCharacter() {
    const safeName = form.name.trim() || "Unnamed Character";

    const normalizedForm: CharacterBuilderInput = {
      ...form,
      name: safeName,
    };

    const savedPreview = convertBuilderToCharacter(normalizedForm);

    const savedPayload = {
      ...savedPreview.character,
      __source: "builder",
      __savedAt: new Date().toISOString(),
    };

    addCustomCharacter(savedPayload);
    setSaveMessage(`Saved "${savedPreview.character.name}" to My Characters.`);
  }

  const tagsText = form.tags?.join(", ") ?? "";

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.28em] text-pink-300/70">
              Lovora Character Engine
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Create Character
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Build a deeper character with personality sliders, active scenario, and
              a real emotional history instead of a fixed template.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/my-characters"
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
            >
              My Characters
            </Link>

            <button
              onClick={handleSaveCharacter}
              className="rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95"
            >
              Save Character
            </button>
          </div>
        </div>

        {saveMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {saveMessage}
          </div>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur md:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Character Builder</h2>
              <p className="mt-2 text-sm text-white/60">
                Start from neutral defaults and shape the character into someone
                genuinely distinct.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-white/70">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                  placeholder="Character name"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-white/70">Archetype</span>
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

              <label className="space-y-2">
                <span className="text-sm text-white/70">Gender Presentation</span>
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

              <label className="space-y-2">
                <span className="text-sm text-white/70">Age Vibe</span>
                <input
                  value={form.ageVibe}
                  onChange={(e) => updateField("ageVibe", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                  placeholder="mid-20s, early 30s, ageless..."
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-white/70">Background Vibe</span>
                <input
                  value={form.backgroundVibe}
                  onChange={(e) => updateField("backgroundVibe", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                  placeholder="Urban nightlife, academic pressure, quiet clinic corridors..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-white/70">Reply Length</span>
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

              <label className="space-y-2">
                <span className="text-sm text-white/70">Speech Style</span>
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

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-white/70">Relationship Pace</span>
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

            <div className="mt-8">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Scenario</h3>
                <p className="mt-2 text-sm text-white/55">
                  Define the active scene so the character behaves like they are already
                  inside a moment, not starting from nowhere.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-white/70">Setting</span>
                  <input
                    value={form.scenario?.setting ?? ""}
                    onChange={(e) => updateScenarioField("setting", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="Military base lounge, hospital night shift, campus library..."
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-white/70">Relationship to User</span>
                  <input
                    value={form.scenario?.relationshipToUser ?? ""}
                    onChange={(e) =>
                      updateScenarioField("relationshipToUser", e.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="Former lover, commander, classmate, patient, stranger..."
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-white/70">Scene Goal</span>
                  <input
                    value={form.scenario?.sceneGoal ?? ""}
                    onChange={(e) => updateScenarioField("sceneGoal", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="Test loyalty, comfort them, build forbidden tension..."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-white/70">Tone</span>
                  <input
                    value={form.scenario?.tone ?? ""}
                    onChange={(e) => updateScenarioField("tone", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="Cold, intimate, clinical, dangerous..."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-white/70">Opening State</span>
                  <input
                    value={form.scenario?.openingState ?? ""}
                    onChange={(e) =>
                      updateScenarioField("openingState", e.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="Already irritated, quietly curious, emotionally guarded..."
                  />
                </label>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Character History</h3>
                <p className="mt-2 text-sm text-white/55">
                  This section gives the character a lived past, internal contradictions,
                  and a real emotional center.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-white/70">Origin</span>
                  <input
                    value={form.history?.origin ?? ""}
                    onChange={(e) => updateHistoryField("origin", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="Where they come from, what kind of world shaped them"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-white/70">Occupation / Role</span>
                  <input
                    value={form.history?.occupation ?? ""}
                    onChange={(e) => updateHistoryField("occupation", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="Doctor, student, intelligence officer, bartender..."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-white/70">Public Mask</span>
                  <input
                    value={form.history?.publicMask ?? ""}
                    onChange={(e) => updateHistoryField("publicMask", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="How they appear to most people"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-white/70">Private Self</span>
                  <input
                    value={form.history?.privateSelf ?? ""}
                    onChange={(e) => updateHistoryField("privateSelf", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="Who they really are underneath"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-white/70">Defining Desire</span>
                  <input
                    value={form.history?.definingDesire ?? ""}
                    onChange={(e) =>
                      updateHistoryField("definingDesire", e.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="What they want most, deep down"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-white/70">Emotional Wound</span>
                  <input
                    value={form.history?.emotionalWound ?? ""}
                    onChange={(e) =>
                      updateHistoryField("emotionalWound", e.target.value)
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="What hurt them and still shapes how they love, trust, or pull away"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-white/70">Secret</span>
                  <input
                    value={form.history?.secret ?? ""}
                    onChange={(e) => updateHistoryField("secret", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="What they hide from almost everyone"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-white/70">
                    Manual Backstory (optional)
                  </span>
                  <textarea
                    value={form.history?.manualBackstory ?? ""}
                    onChange={(e) =>
                      updateHistoryField("manualBackstory", e.target.value)
                    }
                    rows={6}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                    placeholder="Write the exact backstory yourself. If this is filled, it becomes the strongest source for the character's past."
                  />
                </label>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Behavior Sliders</h3>
                <p className="mt-2 text-sm text-white/55">
                  These visible controls still matter, but now they sit on top of a
                  deeper psychological history.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {sliderFields.map((field) => (
                  <label
                    key={field.key}
                    className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/75">{field.label}</span>
                      <span className="text-sm font-medium text-pink-200">
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
            </div>

            <div className="mt-8 grid gap-5">
              <label className="space-y-2">
                <span className="text-sm text-white/70">Tags (comma separated)</span>
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
                  placeholder="cold, dangerous, loyal, wounded..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-white/70">Creator Notes</span>
                <textarea
                  value={form.customNotes ?? ""}
                  onChange={(e) => updateField("customNotes", e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-pink-400/60"
                  placeholder="Extra instructions that should shape the character's behavior"
                />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-pink-400/20 bg-gradient-to-br from-pink-500/10 to-fuchsia-500/5 p-5 shadow-2xl backdrop-blur md:p-6">
              <h2 className="text-xl font-semibold">Compiled Trait Output</h2>
              <p className="mt-2 text-sm text-white/60">
                Internal traits generated from sliders, scenario, and character history.
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
                This is the generated character object your builder currently creates.
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
                      Scenario
                    </div>
                    <div className="space-y-2">
                      {form.scenario?.setting ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Setting:</span>{" "}
                          {form.scenario.setting}
                        </div>
                      ) : null}

                      {form.scenario?.relationshipToUser ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Relationship:</span>{" "}
                          {form.scenario.relationshipToUser}
                        </div>
                      ) : null}

                      {form.scenario?.sceneGoal ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Goal:</span>{" "}
                          {form.scenario.sceneGoal}
                        </div>
                      ) : null}

                      {form.scenario?.tone ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Tone:</span>{" "}
                          {form.scenario.tone}
                        </div>
                      ) : null}

                      {form.scenario?.openingState ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Opening:</span>{" "}
                          {form.scenario.openingState}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      History
                    </div>
                    <div className="space-y-2">
                      {form.history?.origin ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Origin:</span>{" "}
                          {form.history.origin}
                        </div>
                      ) : null}

                      {form.history?.occupation ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Occupation:</span>{" "}
                          {form.history.occupation}
                        </div>
                      ) : null}

                      {form.history?.publicMask ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Public Mask:</span>{" "}
                          {form.history.publicMask}
                        </div>
                      ) : null}

                      {form.history?.privateSelf ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Private Self:</span>{" "}
                          {form.history.privateSelf}
                        </div>
                      ) : null}

                      {form.history?.definingDesire ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Desire:</span>{" "}
                          {form.history.definingDesire}
                        </div>
                      ) : null}

                      {form.history?.emotionalWound ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Wound:</span>{" "}
                          {form.history.emotionalWound}
                        </div>
                      ) : null}

                      {form.history?.secret ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Secret:</span>{" "}
                          {form.history.secret}
                        </div>
                      ) : null}

                      {form.history?.manualBackstory ? (
                        <div className="rounded-2xl border border-pink-400/15 bg-pink-500/5 px-3 py-2 text-sm leading-6 text-white/80">
                          <span className="text-white/45">Manual Backstory:</span>{" "}
                          {form.history.manualBackstory}
                        </div>
                      ) : null}
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
                  The final prompt now includes scenario and lived history, not only
                  vibe sliders.
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
