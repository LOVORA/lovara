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

const ageOptions = [
  { label: "18", value: "18-year-old" },
  { label: "19", value: "19-year-old" },
  { label: "20", value: "20-year-old" },
  { label: "21", value: "21-year-old" },
  { label: "22", value: "22-year-old" },
  { label: "23", value: "23-year-old" },
  { label: "24", value: "24-year-old" },
  { label: "25", value: "25-year-old" },
  { label: "26", value: "26-year-old" },
  { label: "27", value: "27-year-old" },
  { label: "28", value: "28-year-old" },
  { label: "29", value: "29-year-old" },
  { label: "30", value: "30-year-old" },
  { label: "31", value: "31-year-old" },
  { label: "32", value: "32-year-old" },
  { label: "35", value: "35-year-old" },
  { label: "40", value: "40-year-old" },
  { label: "45", value: "45-year-old" },
  { label: "50", value: "50-year-old" },
  { label: "55", value: "55-year-old" },
];

const backgroundOptions = [
  "luxury nightlife, private parties, expensive taste, magnetic social presence",
  "college campus energy, youth, ambition, late-night study sessions, playful tension",
  "hospital corridors, professional discipline, emotional restraint, quiet care",
  "military discipline, sharp routines, command presence, controlled intensity",
  "high society elegance, gala nights, polished image, refined taste",
  "small-town warmth, familiar faces, cozy routines, emotional closeness",
  "corporate ambition, high standards, polished confidence, strategic mindset",
  "creative studio life, artistic chaos, expressive mood, unpredictable charm",
  "bookstore café softness, introspection, intelligence, calm emotional pull",
  "beachside freedom, sun-soaked ease, flirtation, adventurous energy",
];

const settingOptions = [
  "luxury penthouse afterparty",
  "hotel suite after a private event",
  "college campus dorm hallway at night",
  "quiet university library",
  "hospital night shift corridor",
  "military base office after hours",
  "upscale cocktail bar",
  "beach villa at sunset",
  "private art studio",
  "rainy city apartment",
];

const relationshipOptions = [
  "strangers with immediate tension",
  "best friends with hidden feelings",
  "ex-lovers meeting again",
  "coworkers with unresolved chemistry",
  "doctor and patient with emotional tension",
  "teacher and student energy without explicit labels",
  "bodyguard and protected client",
  "commander and trusted subordinate",
  "online connection meeting in person",
  "longtime rivals who secretly care",
];

const toneOptions = [
  "romantic and emotionally intense",
  "playful and flirtatious",
  "soft and comforting",
  "dark and possessive",
  "cold and elegant",
  "warm and affectionate",
  "tense and forbidden",
  "dangerous and magnetic",
  "chaotic and teasing",
  "slow-burn and intimate",
];

const sceneGoalOptions = [
  "build attraction and chemistry",
  "test boundaries with tension",
  "reconnect after distance",
  "comfort the user during a vulnerable moment",
  "seduce the user with confidence",
  "make the user chase emotionally",
  "create a slow emotional opening",
  "establish trust and closeness",
  "turn a routine moment into something intimate",
  "keep power and emotional control",
];

const openingStateOptions = [
  "already watching the user closely",
  "slightly jealous but hiding it",
  "calm, composed, and emotionally unreadable",
  "playful and already in control",
  "warm, attentive, and quietly affectionate",
  "guarded but curious",
  "intense and impossible to ignore",
  "soft on the surface, dangerous underneath",
  "emotionally distant but clearly interested",
  "confident and expecting the user to react",
];

const quickTemplates = [
  {
    id: "bar-flirt",
    name: "Velvet",
    archetype: "confident-seducer" as CharacterArchetype,
    genderPresentation: "feminine" as GenderPresentation,
    ageVibe: "25-year-old",
    backgroundVibe:
      "luxury nightlife, private parties, expensive taste, magnetic social presence",
    scenario: {
      setting: "upscale cocktail bar",
      relationshipToUser: "strangers with immediate tension",
      sceneGoal: "build attraction and chemistry",
      tone: "playful and flirtatious",
      openingState: "already watching the user closely",
    },
    customNotes:
      "She should feel expensive, controlled, seductive, and socially dominant.",
  },
  {
    id: "campus-crush",
    name: "Lina",
    archetype: "best-friend-lover" as CharacterArchetype,
    genderPresentation: "feminine" as GenderPresentation,
    ageVibe: "21-year-old",
    backgroundVibe:
      "college campus energy, youth, ambition, late-night study sessions, playful tension",
    scenario: {
      setting: "quiet university library",
      relationshipToUser: "best friends with hidden feelings",
      sceneGoal: "create a slow emotional opening",
      tone: "slow-burn and intimate",
      openingState: "guarded but curious",
    },
    customNotes:
      "She should feel youthful, emotionally real, slightly nervous, but hard to forget.",
  },
  {
    id: "hospital-night",
    name: "Noah",
    archetype: "nurturing-lover" as CharacterArchetype,
    genderPresentation: "masculine" as GenderPresentation,
    ageVibe: "30-year-old",
    backgroundVibe:
      "hospital corridors, professional discipline, emotional restraint, quiet care",
    scenario: {
      setting: "hospital night shift corridor",
      relationshipToUser: "coworkers with unresolved chemistry",
      sceneGoal: "comfort the user during a vulnerable moment",
      tone: "soft and comforting",
      openingState: "warm, attentive, and quietly affectionate",
    },
    customNotes:
      "He should feel competent, safe, observant, and emotionally restrained in a compelling way.",
  },
];

const traitPresets = {
  balanced: {
    playful: 58,
    romantic: 62,
    dominant: 55,
    affectionate: 60,
    jealous: 30,
    mysterious: 50,
    confident: 68,
    emotionalDepth: 60,
    teasing: 52,
    humor: 55,
  },
  seductive: {
    playful: 70,
    romantic: 65,
    dominant: 82,
    affectionate: 54,
    jealous: 44,
    mysterious: 66,
    confident: 90,
    emotionalDepth: 56,
    teasing: 86,
    humor: 58,
  },
  soft: {
    playful: 44,
    romantic: 78,
    dominant: 30,
    affectionate: 88,
    jealous: 26,
    mysterious: 34,
    confident: 56,
    emotionalDepth: 74,
    teasing: 28,
    humor: 42,
  },
  dangerous: {
    playful: 48,
    romantic: 58,
    dominant: 88,
    affectionate: 42,
    jealous: 62,
    mysterious: 84,
    confident: 86,
    emotionalDepth: 52,
    teasing: 72,
    humor: 38,
  },
};

const initialInput: CharacterBuilderInput = {
  name: "Sable",
  archetype: "confident-seducer",
  genderPresentation: "feminine",
  ageVibe: "25-year-old",
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
  scenario: {
    setting: "upscale cocktail bar",
    relationshipToUser: "strangers with immediate tension",
    sceneGoal: "build attraction and chemistry",
    tone: "playful and flirtatious",
    openingState: "already watching the user closely",
  },
};

type BuilderMode = "quick" | "detailed";

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
  hint: string;
};

const sliderFields: SliderField[] = [
  { key: "playful", label: "Playful", hint: "Light, energetic, mischievous" },
  { key: "romantic", label: "Romantic", hint: "Emotion, tenderness, longing" },
  { key: "dominant", label: "Dominant", hint: "Lead, control, pressure" },
  { key: "affectionate", label: "Affectionate", hint: "Warmth, care, closeness" },
  { key: "jealous", label: "Jealous", hint: "Possessive, territorial, reactive" },
  { key: "mysterious", label: "Mysterious", hint: "Distance, intrigue, concealment" },
  { key: "confident", label: "Confident", hint: "Presence, certainty, gravity" },
  {
    key: "emotionalDepth",
    label: "Emotional Depth",
    hint: "Vulnerability, sincerity, layered feeling",
  },
  { key: "teasing", label: "Teasing", hint: "Banter, provocation, playful pressure" },
  { key: "humor", label: "Humor", hint: "Cleverness, charm, levity" },
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

function scoreLabel(value: number) {
  if (value >= 80) return "Extreme";
  if (value >= 65) return "High";
  if (value >= 45) return "Balanced";
  if (value >= 25) return "Low";
  return "Very Low";
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

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white/80">{label}</span>
        {hint ? <span className="text-[11px] text-white/35">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl px-4 py-2.5 text-sm font-medium transition",
        active
          ? "bg-white text-[#0a0a10] shadow-lg"
          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-xs transition",
        active
          ? "border-pink-400/40 bg-pink-500/15 text-pink-100"
          : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function CreateCharacterPage() {
  const [form, setForm] = useState<CharacterBuilderInput>(initialInput);
  const [builderMode, setBuilderMode] = useState<BuilderMode>("detailed");
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

  function handleSaveCharacter() {
    const savedPayload = {
      ...characterPreview.character,
      __source: "builder",
      __savedAt: new Date().toISOString(),
    };

    addCustomCharacter(savedPayload);
    setSaveMessage(`Saved "${characterPreview.character.name}" to My Characters.`);
  }

  function applyQuickTemplate(template: (typeof quickTemplates)[number]) {
    setForm((prev) => ({
      ...prev,
      name: template.name,
      archetype: template.archetype,
      genderPresentation: template.genderPresentation,
      ageVibe: template.ageVibe,
      backgroundVibe: template.backgroundVibe,
      customNotes: template.customNotes,
      scenario: template.scenario,
    }));
  }

  function applyTraitPreset(preset: keyof typeof traitPresets) {
    const selected = traitPresets[preset];
    setForm((prev) => ({
      ...prev,
      ...selected,
    }));
  }

  const tagsText = form.tags?.join(", ") ?? "";
  const scenario = form.scenario ?? {};
  const quickSummary = [
    form.ageVibe.replace("-year-old", ""),
    formatLabel(form.archetype),
    scenario.setting,
    scenario.tone,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <main className="min-h-screen bg-[#05050a] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-pink-500/12 blur-3xl" />
        <div className="absolute right-[-10%] top-[8%] h-[34rem] w-[34rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[18%] h-[24rem] w-[24rem] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="grid gap-6 border-b border-white/10 px-5 py-6 md:grid-cols-[1.2fr_0.8fr] md:px-7 md:py-8">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-pink-200/85">
                Lovora Character Studio
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Create a character people will want to talk to
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-[15px]">
                This is your premium character builder. Use detailed mode for full
                control, or quick mode to create strong characters in a few guided
                choices.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <SegmentButton
                  active={builderMode === "quick"}
                  onClick={() => setBuilderMode("quick")}
                >
                  Quick Mode
                </SegmentButton>
                <SegmentButton
                  active={builderMode === "detailed"}
                  onClick={() => setBuilderMode("detailed")}
                >
                  Detailed Studio
                </SegmentButton>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0b12]/80 p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                Current Character Snapshot
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/30 to-fuchsia-500/20 text-lg font-semibold text-pink-100">
                  {form.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">{form.name}</div>
                  <div className="text-sm text-pink-200/80">
                    {characterPreview.character.headline}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/85">{quickSummary || "No summary yet"}</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {displayTags.slice(0, 4).map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/my-characters"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10"
                >
                  My Characters
                </Link>
                <button
                  type="button"
                  onClick={handleSaveCharacter}
                  className="rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-900/30 transition hover:opacity-95"
                >
                  Save Character
                </button>
              </div>
            </div>
          </div>

          {saveMessage ? (
            <div className="border-b border-white/10 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-200 md:px-7">
              {saveMessage}
            </div>
          ) : null}

          <div className="grid gap-8 p-5 md:p-7 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              {builderMode === "quick" ? (
                <>
                  <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/80 p-5 md:p-6">
                    <div className="mb-5">
                      <h2 className="text-xl font-semibold text-white">Quick Character Start</h2>
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        Choose a strong starting direction, then refine only the parts
                        that matter.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {quickTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => applyQuickTemplate(template)}
                          className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-left transition hover:border-pink-400/20 hover:bg-white/10"
                        >
                          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-pink-200/70">
                            Template
                          </div>
                          <div className="text-lg font-semibold text-white">{template.name}</div>
                          <div className="mt-1 text-sm text-white/55">
                            {formatLabel(template.archetype)}
                          </div>
                          <div className="mt-4 text-sm leading-6 text-white/65">
                            {template.scenario.setting} • {template.scenario.tone}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/80 p-5 md:p-6">
                    <h2 className="text-xl font-semibold text-white">Quick Essentials</h2>
                    <p className="mt-2 text-sm text-white/60">
                      Keep it simple. You can still get a high-quality result fast.
                    </p>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                      <FieldShell label="Name">
                        <input
                          value={form.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/50"
                          placeholder="Character name"
                        />
                      </FieldShell>

                      <FieldShell label="Archetype">
                        <select
                          value={form.archetype}
                          onChange={(e) =>
                            updateField("archetype", e.target.value as CharacterArchetype)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {archetypes.map((item) => (
                            <option key={item} value={item}>
                              {formatLabel(item)}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Age">
                        <select
                          value={form.ageVibe}
                          onChange={(e) => updateField("ageVibe", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {ageOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Tone">
                        <select
                          value={scenario.tone ?? ""}
                          onChange={(e) => updateScenarioField("tone", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {toneOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Setting" hint="scene">
                        <select
                          value={scenario.setting ?? ""}
                          onChange={(e) => updateScenarioField("setting", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {settingOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Relationship" hint="dynamic">
                        <select
                          value={scenario.relationshipToUser ?? ""}
                          onChange={(e) =>
                            updateScenarioField("relationshipToUser", e.target.value)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {relationshipOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FieldShell>
                    </div>

                    <div className="mt-6">
                      <FieldShell label="Character vibe">
                        <select
                          value={form.backgroundVibe}
                          onChange={(e) => updateField("backgroundVibe", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {backgroundOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FieldShell>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/80 p-5 md:p-6">
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-white">Detailed Character Studio</h2>
                        <p className="mt-2 text-sm leading-6 text-white/60">
                          Build identity, tone, scene, and behavioral shape in one place.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <PillButton onClick={() => applyTraitPreset("balanced")}>
                          Balanced Traits
                        </PillButton>
                        <PillButton onClick={() => applyTraitPreset("seductive")}>
                          Seductive
                        </PillButton>
                        <PillButton onClick={() => applyTraitPreset("soft")}>
                          Soft
                        </PillButton>
                        <PillButton onClick={() => applyTraitPreset("dangerous")}>
                          Dangerous
                        </PillButton>
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <FieldShell label="Name">
                        <input
                          value={form.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/50"
                          placeholder="Character name"
                        />
                      </FieldShell>

                      <FieldShell label="Archetype">
                        <select
                          value={form.archetype}
                          onChange={(e) =>
                            updateField("archetype", e.target.value as CharacterArchetype)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {archetypes.map((item) => (
                            <option key={item} value={item}>
                              {formatLabel(item)}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Gender Presentation">
                        <select
                          value={form.genderPresentation}
                          onChange={(e) =>
                            updateField(
                              "genderPresentation",
                              e.target.value as GenderPresentation
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {genderPresentations.map((item) => (
                            <option key={item} value={item}>
                              {formatLabel(item)}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Age">
                        <select
                          value={form.ageVibe}
                          onChange={(e) => updateField("ageVibe", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {ageOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Reply Length">
                        <select
                          value={form.replyLength}
                          onChange={(e) =>
                            updateField("replyLength", e.target.value as ReplyLength)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {replyLengths.map((item) => (
                            <option key={item} value={item}>
                              {formatLabel(item)}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Speech Style">
                        <select
                          value={form.speechStyle}
                          onChange={(e) =>
                            updateField("speechStyle", e.target.value as SpeechStyle)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {speechStyles.map((item) => (
                            <option key={item} value={item}>
                              {formatLabel(item)}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Relationship Pace">
                        <select
                          value={form.relationshipPace}
                          onChange={(e) =>
                            updateField(
                              "relationshipPace",
                              e.target.value as RelationshipPace
                            )
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {relationshipPaces.map((item) => (
                            <option key={item} value={item}>
                              {formatLabel(item)}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <div className="md:col-span-2">
                        <FieldShell label="Background Vibe" hint="world and aura">
                          <select
                            value={form.backgroundVibe}
                            onChange={(e) => updateField("backgroundVibe", e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                          >
                            {backgroundOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </FieldShell>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/80 p-5 md:p-6">
                    <div className="mb-5">
                      <h2 className="text-xl font-semibold text-white">Scenario Context</h2>
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        The character should not only have a personality. They should feel
                        right for the exact scene and dynamic.
                      </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <FieldShell label="Setting">
                        <select
                          value={scenario.setting ?? ""}
                          onChange={(e) => updateScenarioField("setting", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {settingOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Relationship To User">
                        <select
                          value={scenario.relationshipToUser ?? ""}
                          onChange={(e) =>
                            updateScenarioField("relationshipToUser", e.target.value)
                          }
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {relationshipOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Scene Goal">
                        <select
                          value={scenario.sceneGoal ?? ""}
                          onChange={(e) => updateScenarioField("sceneGoal", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {sceneGoalOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Tone">
                        <select
                          value={scenario.tone ?? ""}
                          onChange={(e) => updateScenarioField("tone", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                        >
                          {toneOptions.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <div className="md:col-span-2">
                        <FieldShell label="Opening State" hint="how the scene begins">
                          <select
                            value={scenario.openingState ?? ""}
                            onChange={(e) =>
                              updateScenarioField("openingState", e.target.value)
                            }
                            className="w-full rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/50"
                          >
                            {openingStateOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </FieldShell>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/80 p-5 md:p-6">
                    <div className="mb-5">
                      <h2 className="text-xl font-semibold text-white">Behavioral Control Grid</h2>
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        Shape how the character feels in motion, not just in description.
                      </p>
                    </div>

                    <div className="grid gap-4">
                      {sliderFields.map((field) => (
                        <label
                          key={field.key}
                          className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm font-medium text-white">{field.label}</div>
                              <div className="text-xs text-white/45">{field.hint}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-pink-200">
                                {form[field.key]}
                              </div>
                              <div className="text-[11px] text-white/40">
                                {scoreLabel(form[field.key])}
                              </div>
                            </div>
                          </div>

                          <input
                            type="range"
                            min={0}
                            max={100}
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

                  <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/80 p-5 md:p-6">
                    <div className="mb-5">
                      <h2 className="text-xl font-semibold text-white">Final Polish</h2>
                      <p className="mt-2 text-sm leading-6 text-white/60">
                        Add creator-facing intent without cluttering the main flow.
                      </p>
                    </div>

                    <div className="grid gap-5">
                      <FieldShell label="Tags" hint="comma separated">
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
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/50"
                          placeholder="flirty, elegant, dominant, mysterious"
                        />
                      </FieldShell>

                      <FieldShell label="Custom Notes" hint="creator-only direction">
                        <textarea
                          value={form.customNotes ?? ""}
                          onChange={(e) => updateField("customNotes", e.target.value)}
                          rows={5}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-pink-400/50"
                          placeholder="What should make this character unforgettable?"
                        />
                      </FieldShell>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.75rem] border border-pink-400/15 bg-gradient-to-br from-pink-500/10 to-fuchsia-500/5 p-5 shadow-2xl backdrop-blur md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Compiled Trait Output</h2>
                    <p className="mt-2 text-sm text-white/60">
                      The invisible behavior engine generated from your choices.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-pink-100/85">
                    Live
                  </div>
                </div>

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

              <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/80 shadow-2xl backdrop-blur">
                <div className="border-b border-white/10 p-5 md:p-6">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/30 to-fuchsia-500/20 text-lg font-semibold text-white">
                      {form.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xl font-semibold text-white">
                        {characterPreview.character.name}
                      </div>
                      <div className="text-sm text-pink-300/80">
                        {characterPreview.character.headline}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-white/70">
                    {characterPreview.character.description}
                  </p>
                </div>

                <div className="space-y-5 p-5 md:p-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Greeting Preview
                    </div>
                    <div className="text-sm leading-7 text-white/85">
                      {characterPreview.character.greeting}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                        Archetype
                      </div>
                      <div className="text-sm text-white/85">
                        {toDisplayText(characterPreview.character.archetype)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                        Personality
                      </div>
                      <div className="text-sm text-white/85">
                        {characterPreview.character.personality}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Scenario Summary
                    </div>
                    <div className="grid gap-3 text-sm text-white/75">
                      <div>
                        <span className="text-white/40">Setting:</span>{" "}
                        {scenario.setting || "—"}
                      </div>
                      <div>
                        <span className="text-white/40">Relationship:</span>{" "}
                        {scenario.relationshipToUser || "—"}
                      </div>
                      <div>
                        <span className="text-white/40">Goal:</span>{" "}
                        {scenario.sceneGoal || "—"}
                      </div>
                      <div>
                        <span className="text-white/40">Tone:</span>{" "}
                        {scenario.tone || "—"}
                      </div>
                      <div>
                        <span className="text-white/40">Opening:</span>{" "}
                        {scenario.openingState || "—"}
                      </div>
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
                    <div className="text-sm leading-7 text-white/80">
                      {toDisplayText(previewMessage) || "No preview message"}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Backstory
                    </div>
                    <div className="text-sm leading-7 text-white/75">
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

              <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0a11]/80 p-5 shadow-2xl backdrop-blur md:p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-white">Generated System Prompt</h2>
                  <p className="mt-2 text-sm text-white/60">
                    Live compiled prompt from the builder.
                  </p>
                </div>

                <pre className="max-h-[720px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#05050a] p-4 text-sm leading-7 text-white/80">
                  {output.systemPrompt}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
