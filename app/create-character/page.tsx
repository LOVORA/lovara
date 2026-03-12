"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
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
] as const;

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
] as const;

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
] as const;

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
] as const;

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
] as const;

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
] as const;

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
] as const;

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
    tags: ["flirty", "dominant", "luxury", "nightlife"],
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
    tags: ["campus", "slow-burn", "soft", "best-friends"],
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
    tags: ["safe", "gentle", "hospital", "care"],
  },
] as const;

const quickScenarioPresets = [
  {
    id: "midnight-luxury",
    title: "Midnight Luxury",
    subtitle: "High-end nightlife, social dominance, instant tension",
    template: {
      backgroundVibe:
        "luxury nightlife, private parties, expensive taste, magnetic social presence",
      scenario: {
        setting: "upscale cocktail bar",
        relationshipToUser: "strangers with immediate tension",
        sceneGoal: "build attraction and chemistry",
        tone: "playful and flirtatious",
        openingState: "already watching the user closely",
      },
      tags: ["luxury", "flirty", "nightlife"],
      customNotes:
        "They should feel expensive, magnetic, and effortlessly in control.",
    },
  },
  {
    id: "campus-slowburn",
    title: "Campus Slow Burn",
    subtitle: "Youthful chemistry, awkward closeness, emotional build",
    template: {
      backgroundVibe:
        "college campus energy, youth, ambition, late-night study sessions, playful tension",
      scenario: {
        setting: "quiet university library",
        relationshipToUser: "best friends with hidden feelings",
        sceneGoal: "create a slow emotional opening",
        tone: "slow-burn and intimate",
        openingState: "guarded but curious",
      },
      tags: ["campus", "slow-burn", "soft"],
      customNotes:
        "They should feel young, emotionally real, and quietly impossible to ignore.",
    },
  },
  {
    id: "night-shift-care",
    title: "Night Shift Care",
    subtitle: "Restraint, competence, safety, quiet emotional pull",
    template: {
      backgroundVibe:
        "hospital corridors, professional discipline, emotional restraint, quiet care",
      scenario: {
        setting: "hospital night shift corridor",
        relationshipToUser: "coworkers with unresolved chemistry",
        sceneGoal: "comfort the user during a vulnerable moment",
        tone: "soft and comforting",
        openingState: "warm, attentive, and quietly affectionate",
      },
      tags: ["care", "safe", "gentle"],
      customNotes:
        "They should feel composed, competent, and deeply attentive without trying too hard.",
    },
  },
  {
    id: "command-pressure",
    title: "Command Pressure",
    subtitle: "Discipline, control, hierarchy, dangerous attraction",
    template: {
      backgroundVibe:
        "military discipline, sharp routines, command presence, controlled intensity",
      scenario: {
        setting: "military base office after hours",
        relationshipToUser: "commander and trusted subordinate",
        sceneGoal: "keep power and emotional control",
        tone: "tense and forbidden",
        openingState: "calm, composed, and emotionally unreadable",
      },
      tags: ["command", "discipline", "forbidden"],
      customNotes:
        "They should feel highly controlled, intimidating, and emotionally difficult to read.",
    },
  },
] as const;

const quickIdentityPresets = [
  {
    id: "velvet-femme",
    title: "Velvet Femme",
    subtitle: "Elegant, feminine, socially dominant",
    values: {
      archetype: "confident-seducer" as CharacterArchetype,
      genderPresentation: "feminine" as GenderPresentation,
      ageVibe: "25-year-old",
      replyLength: "balanced" as ReplyLength,
      speechStyle: "bold" as SpeechStyle,
      relationshipPace: "balanced" as RelationshipPace,
    },
  },
  {
    id: "soft-muse",
    title: "Soft Muse",
    subtitle: "Romantic, feminine, emotionally warm",
    values: {
      archetype: "elegant-muse" as CharacterArchetype,
      genderPresentation: "feminine" as GenderPresentation,
      ageVibe: "24-year-old",
      replyLength: "balanced" as ReplyLength,
      speechStyle: "soft" as SpeechStyle,
      relationshipPace: "slow-burn" as RelationshipPace,
    },
  },
  {
    id: "safe-masc",
    title: "Safe Masculine",
    subtitle: "Grounded, masculine, protective",
    values: {
      archetype: "nurturing-lover" as CharacterArchetype,
      genderPresentation: "masculine" as GenderPresentation,
      ageVibe: "30-year-old",
      replyLength: "detailed" as ReplyLength,
      speechStyle: "natural" as SpeechStyle,
      relationshipPace: "balanced" as RelationshipPace,
    },
  },
  {
    id: "cold-andro",
    title: "Cold Andro",
    subtitle: "Androgynous, unreadable, dangerously calm",
    values: {
      archetype: "ice-queen" as CharacterArchetype,
      genderPresentation: "androgynous" as GenderPresentation,
      ageVibe: "27-year-old",
      replyLength: "short" as ReplyLength,
      speechStyle: "poetic" as SpeechStyle,
      relationshipPace: "slow-burn" as RelationshipPace,
    },
  },
] as const;

const quickMoodPresets = [
  {
    id: "soft",
    title: "Soft Pull",
    subtitle: "warm, affectionate, emotionally open",
    tags: ["soft", "warm", "romantic"],
    values: {
      playful: 42,
      romantic: 82,
      dominant: 28,
      affectionate: 88,
      jealous: 22,
      mysterious: 30,
      confident: 58,
      emotionalDepth: 76,
      teasing: 26,
      humor: 40,
    },
  },
  {
    id: "balanced",
    title: "Balanced Heat",
    subtitle: "chemistry without losing emotional realism",
    tags: ["balanced", "chemistry", "magnetic"],
    values: {
      playful: 58,
      romantic: 66,
      dominant: 54,
      affectionate: 62,
      jealous: 30,
      mysterious: 48,
      confident: 68,
      emotionalDepth: 60,
      teasing: 52,
      humor: 56,
    },
  },
  {
    id: "charged",
    title: "Charged Tension",
    subtitle: "dominant, teasing, high-pressure attraction",
    tags: ["charged", "dominant", "intense"],
    values: {
      playful: 66,
      romantic: 62,
      dominant: 84,
      affectionate: 48,
      jealous: 46,
      mysterious: 68,
      confident: 90,
      emotionalDepth: 54,
      teasing: 86,
      humor: 52,
    },
  },
] as const;

const quickNameSuggestions = [
  "Velvet",
  "Lina",
  "Noah",
  "Sable",
  "Iris",
  "Damian",
  "Selene",
  "Kade",
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
} as const;

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
type PreviewTab = "overview" | "opening" | "traits" | "prompt";

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

function scoreLabel(value: number) {
  if (value >= 80) return "Extreme";
  if (value >= 65) return "High";
  if (value >= 45) return "Balanced";
  if (value >= 25) return "Low";
  return "Very Low";
}

function buildCompletionScore(form: CharacterBuilderInput) {
  const scenario = form.scenario ?? {};
  const checks = [
    Boolean(form.name?.trim()),
    Boolean(form.archetype),
    Boolean(form.genderPresentation),
    Boolean(form.ageVibe),
    Boolean(form.backgroundVibe?.trim()),
    Boolean(scenario.setting?.trim()),
    Boolean(scenario.relationshipToUser?.trim()),
    Boolean(scenario.sceneGoal?.trim()),
    Boolean(scenario.tone?.trim()),
    Boolean(scenario.openingState?.trim()),
    Boolean(form.customNotes?.trim()),
  ];

  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

function averageTraitScore(form: CharacterBuilderInput) {
  const values = sliderFields.map((field) => form[field.key]);
  return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function buildQualitySignals(form: CharacterBuilderInput) {
  const scenario = form.scenario ?? {};
  const completion = buildCompletionScore(form);

  const identitySignal = clamp(
    [
      form.name?.trim() ? 22 : 0,
      form.archetype ? 18 : 0,
      form.genderPresentation ? 10 : 0,
      form.ageVibe ? 10 : 0,
      form.backgroundVibe?.trim() ? 20 : 0,
      form.customNotes?.trim() ? 20 : 0,
    ].reduce((a, b) => a + b, 0),
  );

  const scenarioSignal = clamp(
    [
      scenario.setting?.trim() ? 22 : 0,
      scenario.relationshipToUser?.trim() ? 20 : 0,
      scenario.sceneGoal?.trim() ? 20 : 0,
      scenario.tone?.trim() ? 20 : 0,
      scenario.openingState?.trim() ? 18 : 0,
    ].reduce((a, b) => a + b, 0),
  );

  const traitSignal = clamp(
    Math.round(
      sliderFields.reduce((acc, field) => {
        const value = form[field.key];
        if (value >= 35 && value <= 90) return acc + 10;
        if (value >= 20 && value <= 100) return acc + 7;
        return acc + 4;
      }, 0),
    ),
  );

  const polishSignal = clamp(
    [
      (form.tags?.length ?? 0) >= 2 ? 35 : (form.tags?.length ?? 0) > 0 ? 20 : 0,
      form.replyLength ? 20 : 0,
      form.speechStyle ? 20 : 0,
      form.relationshipPace ? 25 : 0,
    ].reduce((a, b) => a + b, 0),
  );

  const total = clamp(
    Math.round(
      identitySignal * 0.28 +
        scenarioSignal * 0.34 +
        traitSignal * 0.22 +
        polishSignal * 0.16,
    ),
  );

  const label =
    total >= 88
      ? "Elite"
      : total >= 75
      ? "Strong"
      : total >= 60
      ? "Promising"
      : "Needs More Shape";

  return {
    completion,
    identitySignal,
    scenarioSignal,
    traitSignal,
    polishSignal,
    total,
    label,
  };
}

function inferScenarioImpact(form: CharacterBuilderInput) {
  const setting = form.scenario?.setting?.toLowerCase() ?? "";
  const tone = form.scenario?.tone?.toLowerCase() ?? "";
  const relationship = form.scenario?.relationshipToUser?.toLowerCase() ?? "";

  const impacts: string[] = [];

  if (setting.includes("hospital")) {
    impacts.push("Replies should feel more careful, attentive, restrained, and grounded.");
  }
  if (setting.includes("military")) {
    impacts.push("Language should feel sharper, more disciplined, and more hierarchical.");
  }
  if (setting.includes("bar") || setting.includes("afterparty") || setting.includes("cocktail")) {
    impacts.push("The character should feel more social, teasing, and casually magnetic.");
  }
  if (setting.includes("library") || setting.includes("campus")) {
    impacts.push("The tone should carry quieter intimacy and slower emotional escalation.");
  }
  if (setting.includes("beach")) {
    impacts.push("The energy should feel freer, warmer, and more adventurous.");
  }

  if (tone.includes("soft")) {
    impacts.push("Responses should reduce aggression and increase warmth and reassurance.");
  }
  if (tone.includes("forbidden") || tone.includes("dangerous")) {
    impacts.push("Tension should stay high without losing control or scene logic.");
  }
  if (tone.includes("playful")) {
    impacts.push("Banter and flirt pressure should rise without sounding generic.");
  }

  if (relationship.includes("best friends")) {
    impacts.push("The dynamic should carry familiarity, history, and emotional hesitation.");
  }
  if (relationship.includes("strangers")) {
    impacts.push("The opening should rely more on curiosity, observation, and first-impression chemistry.");
  }
  if (relationship.includes("ex-lovers")) {
    impacts.push("Lines should carry residue, memory, and unfinished emotional weight.");
  }

  if (impacts.length === 0) {
    impacts.push("The selected scenario should visibly shape tone, rhythm, and first-message behavior.");
  }

  return impacts.slice(0, 4);
}

function buildLivePromptSnippet(
  output: ReturnType<typeof buildCharacterEngineOutput>,
  maxLength = 1100,
) {
  const text = output.systemPrompt ?? "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function StudioSection({
  eyebrow,
  title,
  description,
  children,
  featured = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  featured?: boolean;
}) {
  return (
    <section
      className={classNames(
        "rounded-[2rem] border p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur md:p-6",
        featured
          ? "border-pink-400/20 bg-gradient-to-br from-pink-500/12 via-fuchsia-500/8 to-white/5"
          : "border-white/10 bg-white/[0.04]",
      )}
    >
      <div className="mb-5">
        {eyebrow ? (
          <div className="mb-2 text-[11px] uppercase tracking-[0.28em] text-pink-200/70">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="text-xl font-semibold text-white md:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/62">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white/90">{label}</span>
        {hint ? <span className="text-xs text-white/40">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl border border-white/10 bg-[#101018] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/40"
    >
      {options.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}

function InputField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={classNames(
        "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-pink-400/40",
        props.className,
      )}
    />
  );
}

function TextareaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={classNames(
        "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-pink-400/40",
        props.className,
      )}
    />
  );
}

function SegmentButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "rounded-[1.5rem] border p-4 text-left transition",
        active
          ? "border-pink-400/35 bg-gradient-to-br from-pink-500/18 to-fuchsia-500/10 shadow-[0_14px_40px_rgba(236,72,153,0.18)]"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.075]",
      )}
    >
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs leading-6 text-white/55">{subtitle}</div>
    </button>
  );
}

function OptionCard({
  active,
  title,
  subtitle,
  meta,
  onClick,
}: {
  active?: boolean;
  title: string;
  subtitle?: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "rounded-[1.35rem] border p-4 text-left transition",
        active
          ? "border-pink-400/35 bg-pink-500/10 shadow-[0_12px_30px_rgba(236,72,153,0.14)]"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.075]",
      )}
    >
      <div className="text-sm font-semibold text-white">{title}</div>
      {subtitle ? <div className="mt-1 text-xs leading-6 text-white/56">{subtitle}</div> : null}
      {meta ? (
        <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-pink-200/75">
          {meta}
        </div>
      ) : null}
    </button>
  );
}

function PillButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "rounded-full border px-3.5 py-2 text-xs font-medium transition",
        active
          ? "border-pink-400/30 bg-pink-500/12 text-pink-100"
          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/[0.075]",
      )}
    >
      {children}
    </button>
  );
}

function MiniStatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
      <span className="text-white/40">{label}</span> <span className="text-white/90">{value}</span>
    </div>
  );
}

function MeterRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-white/62">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function CreateCharacterPage() {
  const [form, setForm] = useState<CharacterBuilderInput>(initialInput);
  const [builderMode, setBuilderMode] = useState<BuilderMode>("detailed");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("overview");
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedQuickTemplateId, setSelectedQuickTemplateId] = useState<string | null>(null);
  const [selectedQuickScenarioId, setSelectedQuickScenarioId] = useState<string | null>(null);
  const [selectedQuickIdentityId, setSelectedQuickIdentityId] = useState<string | null>(null);
  const [selectedQuickMoodId, setSelectedQuickMoodId] = useState<string | null>(null);
  const [selectedTraitPreset, setSelectedTraitPreset] = useState<
    keyof typeof traitPresets | null
  >(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const output = useMemo(() => buildCharacterEngineOutput(form), [form]);
  const characterPreview = useMemo(() => convertBuilderToCharacter(form), [form]);

  const scenario = form.scenario ?? {};
  const completionScore = buildCompletionScore(form);
  const quality = useMemo(() => buildQualitySignals(form), [form]);
  const scenarioImpact = useMemo(() => inferScenarioImpact(form), [form]);
  const avgTrait = averageTraitScore(form);
  const livePromptSnippet = useMemo(() => buildLivePromptSnippet(output), [output]);

  const previewMessage = (
    characterPreview.character as unknown as { previewMessage?: unknown }
  ).previewMessage;

  const displayTags = toDisplayList(characterPreview.character.tags);
  const displayTraits = toDisplayList(characterPreview.character.traits);
  const displayMemory = toDisplayList(characterPreview.character.memory);

  const quickSummary = [
    form.ageVibe.replace("-year-old", ""),
    formatLabel(form.archetype),
    scenario.setting,
    scenario.tone,
  ]
    .filter(Boolean)
    .join(" • ");

  const previewHeadline =
    characterPreview.character.headline || `${formatLabel(form.archetype)} energy`;

  const previewDescriptor = [
    scenario.setting || "Scene not chosen",
    scenario.relationshipToUser || "Dynamic not chosen",
    scenario.sceneGoal || "Goal not chosen",
  ]
    .filter(Boolean)
    .join(" • ");

  const qualitySummary =
    quality.total >= 88
      ? "Scene, identity, and emotional direction are all strongly defined."
      : quality.total >= 75
      ? "This build already feels product-grade and should preview well."
      : quality.total >= 60
      ? "The character has a solid base, but scenario or polish can be pushed harder."
      : "The builder still needs more specificity to avoid generic outputs.";

  useEffect(() => {
    if (!copiedPrompt) return;
    const timer = window.setTimeout(() => setCopiedPrompt(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedPrompt]);

  function updateField<K extends keyof CharacterBuilderInput>(
    key: K,
    value: CharacterBuilderInput[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateScenarioField(
    key: keyof NonNullable<CharacterBuilderInput["scenario"]>,
    value: string,
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

  function resetBuilder() {
    setForm(initialInput);
    setBuilderMode("detailed");
    setPreviewTab("overview");
    setSaveMessage("");
    setSelectedQuickTemplateId(null);
    setSelectedQuickScenarioId(null);
    setSelectedQuickIdentityId(null);
    setSelectedQuickMoodId(null);
    setSelectedTraitPreset(null);
  }

  function applyQuickTemplate(template: (typeof quickTemplates)[number]) {
    setSelectedQuickTemplateId(template.id);
    setForm((prev) => ({
      ...prev,
      name: template.name,
      archetype: template.archetype,
      genderPresentation: template.genderPresentation,
      ageVibe: template.ageVibe,
      backgroundVibe: template.backgroundVibe,
      customNotes: template.customNotes,
      tags: [...template.tags],
      scenario: { ...template.scenario },
    }));
  }

  function applyQuickScenarioPreset(preset: (typeof quickScenarioPresets)[number]) {
    setSelectedQuickScenarioId(preset.id);
    setForm((prev) => ({
      ...prev,
      backgroundVibe: preset.template.backgroundVibe,
      customNotes: preset.template.customNotes,
      tags: [...preset.template.tags],
      scenario: { ...preset.template.scenario },
    }));
  }

  function applyQuickIdentityPreset(preset: (typeof quickIdentityPresets)[number]) {
    setSelectedQuickIdentityId(preset.id);
    setForm((prev) => ({
      ...prev,
      archetype: preset.values.archetype,
      genderPresentation: preset.values.genderPresentation,
      ageVibe: preset.values.ageVibe,
      replyLength: preset.values.replyLength,
      speechStyle: preset.values.speechStyle,
      relationshipPace: preset.values.relationshipPace,
    }));
  }

  function applyQuickMoodPreset(preset: (typeof quickMoodPresets)[number]) {
    setSelectedQuickMoodId(preset.id);
    setForm((prev) => ({
      ...prev,
      ...preset.values,
      tags: Array.from(new Set([...(prev.tags ?? []), ...preset.tags])),
    }));
  }

  function applyTraitPreset(preset: keyof typeof traitPresets) {
    setSelectedTraitPreset(preset);
    const selected = traitPresets[preset];
    setForm((prev) => ({
      ...prev,
      ...selected,
    }));
  }

  async function copyPromptPreview() {
    try {
      await navigator.clipboard.writeText(output.systemPrompt ?? "");
      setCopiedPrompt(true);
    } catch {
      setCopiedPrompt(false);
    }
  }

  const tagsText = form.tags?.join(", ") ?? "";
  const identityCards = [
    form.archetype ? formatLabel(form.archetype) : "Archetype",
    form.genderPresentation ? formatLabel(form.genderPresentation) : "Presentation",
    form.replyLength ? formatLabel(form.replyLength) : "Reply Length",
    form.speechStyle ? formatLabel(form.speechStyle) : "Speech Style",
  ];

  return (
    <main className="min-h-screen bg-[#07070b] text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_28%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur md:p-8">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_380px]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-pink-100/85">
                  Lovora Character Studio
                </div>

                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Build a character that feels alive before the first message.
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-8 text-white/68 md:text-base">
                  Quick Mode is for fast premium creation. Detailed Studio is for scene-aware,
                  high-control character design. Scenario stays embedded inside the character,
                  so chat quality starts before the conversation even opens.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <MiniStatChip label="Modes" value="Quick + Detailed" />
                  <MiniStatChip label="Scenario" value="Embedded Core" />
                  <MiniStatChip label="Preview" value="Live + Prompt" />
                  <MiniStatChip label="Quality" value={`${quality.total}%`} />
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                  Current Build
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-pink-500/35 to-fuchsia-500/20 text-xl font-semibold text-white">
                    {form.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-white">{form.name}</div>
                    <div className="mt-1 text-sm text-pink-200/80">{previewHeadline}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-white/68">
                  {quickSummary || "Choose a direction and the studio will shape the rest live."}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">
                      Completion
                    </div>
                    <div className="mt-1 text-xl font-semibold text-white">{completionScore}%</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">
                      Quality Tier
                    </div>
                    <div className="mt-1 text-xl font-semibold text-pink-100">
                      {quality.label}
                    </div>
                  </div>
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
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-3 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-2">
              <SegmentButton
                active={builderMode === "quick"}
                title="Quick Mode"
                subtitle="Preset-first flow with fewer inputs and stronger default composition."
                onClick={() => setBuilderMode("quick")}
              />
              <SegmentButton
                active={builderMode === "detailed"}
                title="Detailed Studio"
                subtitle="Full control over identity, scenario, behavior, polish, and final output."
                onClick={() => setBuilderMode("detailed")}
              />
            </div>
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
            <div className="space-y-6">
              {builderMode === "quick" ? (
                <>
                  <StudioSection
                    eyebrow="Fast Start"
                    title="Choose a full starting fantasy"
                    description="Quick Mode should never feel cheap. Start from a complete direction, then refine only what changes the final experience most."
                  >
                    <div className="grid gap-4 lg:grid-cols-3">
                      {quickTemplates.map((template) => (
                        <OptionCard
                          key={template.id}
                          active={selectedQuickTemplateId === template.id}
                          title={template.name}
                          subtitle={`${formatLabel(template.archetype)} • ${template.scenario.setting}`}
                          meta={template.scenario.tone}
                          onClick={() => applyQuickTemplate(template)}
                        />
                      ))}
                    </div>
                  </StudioSection>

                  <StudioSection
                    eyebrow="Scenario Core"
                    title="Lock the world and relationship first"
                    description="Scenario is not a separate starter UX. It is the strongest quality driver inside the character itself."
                    featured
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      {quickScenarioPresets.map((preset) => (
                        <OptionCard
                          key={preset.id}
                          active={selectedQuickScenarioId === preset.id}
                          title={preset.title}
                          subtitle={preset.subtitle}
                          meta={preset.template.scenario.tone}
                          onClick={() => applyQuickScenarioPreset(preset)}
                        />
                      ))}
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <FieldShell label="Setting">
                        <SelectField
                          value={scenario.setting ?? ""}
                          onChange={(value) => updateScenarioField("setting", value)}
                          options={settingOptions}
                        />
                      </FieldShell>

                      <FieldShell label="Relationship to User">
                        <SelectField
                          value={scenario.relationshipToUser ?? ""}
                          onChange={(value) => updateScenarioField("relationshipToUser", value)}
                          options={relationshipOptions}
                        />
                      </FieldShell>

                      <FieldShell label="Scene Goal">
                        <SelectField
                          value={scenario.sceneGoal ?? ""}
                          onChange={(value) => updateScenarioField("sceneGoal", value)}
                          options={sceneGoalOptions}
                        />
                      </FieldShell>

                      <FieldShell label="Tone">
                        <SelectField
                          value={scenario.tone ?? ""}
                          onChange={(value) => updateScenarioField("tone", value)}
                          options={toneOptions}
                        />
                      </FieldShell>

                      <div className="md:col-span-2">
                        <FieldShell label="Opening State">
                          <SelectField
                            value={scenario.openingState ?? ""}
                            onChange={(value) => updateScenarioField("openingState", value)}
                            options={openingStateOptions}
                          />
                        </FieldShell>
                      </div>
                    </div>
                  </StudioSection>

                  <StudioSection
                    eyebrow="Identity"
                    title="Pick the character silhouette"
                    description="Quick Mode stays selective and curated. Presets do the heavy lifting so the page still feels like a studio, not a form."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      {quickIdentityPresets.map((preset) => (
                        <OptionCard
                          key={preset.id}
                          active={selectedQuickIdentityId === preset.id}
                          title={preset.title}
                          subtitle={preset.subtitle}
                          meta={`${formatLabel(preset.values.archetype)} • ${formatLabel(
                            preset.values.genderPresentation,
                          )}`}
                          onClick={() => applyQuickIdentityPreset(preset)}
                        />
                      ))}
                    </div>

                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <FieldShell label="Character Name" hint="pick or type">
                        <div className="space-y-3">
                          <InputField
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            placeholder="Character name"
                          />
                          <div className="flex flex-wrap gap-2">
                            {quickNameSuggestions.map((name) => (
                              <PillButton
                                key={name}
                                active={form.name === name}
                                onClick={() => updateField("name", name)}
                              >
                                {name}
                              </PillButton>
                            ))}
                          </div>
                        </div>
                      </FieldShell>

                      <FieldShell label="Background Vibe">
                        <SelectField
                          value={form.backgroundVibe}
                          onChange={(value) => updateField("backgroundVibe", value)}
                          options={backgroundOptions}
                        />
                      </FieldShell>
                    </div>
                  </StudioSection>

                  <StudioSection
                    eyebrow="Mood"
                    title="Choose how the character lands emotionally"
                    description="Instead of exposing the full slider grid, Quick Mode compresses behavior into emotionally meaningful presets."
                  >
                    <div className="grid gap-4 md:grid-cols-3">
                      {quickMoodPresets.map((preset) => (
                        <OptionCard
                          key={preset.id}
                          active={selectedQuickMoodId === preset.id}
                          title={preset.title}
                          subtitle={preset.subtitle}
                          meta={preset.tags.join(" • ")}
                          onClick={() => applyQuickMoodPreset(preset)}
                        />
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <MiniStatChip label="Archetype" value={formatLabel(form.archetype)} />
                      <MiniStatChip
                        label="Presentation"
                        value={formatLabel(form.genderPresentation)}
                      />
                      <MiniStatChip label="Age" value={form.ageVibe.replace("-year-old", "")} />
                      <MiniStatChip label="Style" value={formatLabel(form.speechStyle)} />
                      <MiniStatChip label="Pace" value={formatLabel(form.relationshipPace)} />
                    </div>
                  </StudioSection>

                  <StudioSection
                    eyebrow="Polish"
                    title="Keep the final 10% intentional"
                    description="Free-text stays limited. This last layer is for nuance, not for carrying the whole builder."
                  >
                    <div className="grid gap-5">
                      <FieldShell label="Tags" hint="comma separated">
                        <InputField
                          value={tagsText}
                          onChange={(e) =>
                            updateField(
                              "tags",
                              e.target.value
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean),
                            )
                          }
                          placeholder="flirty, elegant, safe, dangerous"
                        />
                      </FieldShell>

                      <FieldShell label="Creator Note" hint="optional">
                        <TextareaField
                          rows={4}
                          value={form.customNotes}
                          onChange={(e) => updateField("customNotes", e.target.value)}
                          placeholder="Add the one quality the character must always preserve."
                        />
                      </FieldShell>
                    </div>
                  </StudioSection>
                </>
              ) : (
                <>
                  <StudioSection
                    eyebrow="Identity"
                    title="Build the identity layer"
                    description="Define who the character is first, then shape how they behave inside the chosen scene."
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <FieldShell label="Character Name">
                        <InputField
                          value={form.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          placeholder="Character name"
                        />
                      </FieldShell>

                      <FieldShell label="Archetype">
                        <SelectField
                          value={form.archetype}
                          onChange={(value) =>
                            updateField("archetype", value as CharacterArchetype)
                          }
                          options={archetypes}
                        />
                      </FieldShell>

                      <FieldShell label="Gender Presentation">
                        <SelectField
                          value={form.genderPresentation}
                          onChange={(value) =>
                            updateField("genderPresentation", value as GenderPresentation)
                          }
                          options={genderPresentations}
                        />
                      </FieldShell>

                      <FieldShell label="Age Vibe">
                        <select
                          value={form.ageVibe}
                          onChange={(e) => updateField("ageVibe", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#101018] px-4 py-3 text-sm text-white outline-none transition focus:border-pink-400/40"
                        >
                          {ageOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </FieldShell>

                      <FieldShell label="Reply Length">
                        <SelectField
                          value={form.replyLength}
                          onChange={(value) => updateField("replyLength", value as ReplyLength)}
                          options={replyLengths}
                        />
                      </FieldShell>

                      <FieldShell label="Speech Style">
                        <SelectField
                          value={form.speechStyle}
                          onChange={(value) => updateField("speechStyle", value as SpeechStyle)}
                          options={speechStyles}
                        />
                      </FieldShell>

                      <FieldShell label="Relationship Pace">
                        <SelectField
                          value={form.relationshipPace}
                          onChange={(value) =>
                            updateField("relationshipPace", value as RelationshipPace)
                          }
                          options={relationshipPaces}
                        />
                      </FieldShell>

                      <FieldShell label="Background Vibe">
                        <SelectField
                          value={form.backgroundVibe}
                          onChange={(value) => updateField("backgroundVibe", value)}
                          options={backgroundOptions}
                        />
                      </FieldShell>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {identityCards.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </StudioSection>

                  <StudioSection
                    eyebrow="Scenario"
                    title="Scenario is the main quality driver"
                    description="This is not a separate starter flow. It is part of the character’s DNA and should directly shape response tone, rhythm, and opening behavior."
                    featured
                  >
                    <div className="grid gap-5 md:grid-cols-2">
                      <FieldShell label="Setting">
                        <SelectField
                          value={scenario.setting ?? ""}
                          onChange={(value) => updateScenarioField("setting", value)}
                          options={settingOptions}
                        />
                      </FieldShell>

                      <FieldShell label="Relationship to User">
                        <SelectField
                          value={scenario.relationshipToUser ?? ""}
                          onChange={(value) => updateScenarioField("relationshipToUser", value)}
                          options={relationshipOptions}
                        />
                      </FieldShell>

                      <FieldShell label="Scene Goal">
                        <SelectField
                          value={scenario.sceneGoal ?? ""}
                          onChange={(value) => updateScenarioField("sceneGoal", value)}
                          options={sceneGoalOptions}
                        />
                      </FieldShell>

                      <FieldShell label="Tone">
                        <SelectField
                          value={scenario.tone ?? ""}
                          onChange={(value) => updateScenarioField("tone", value)}
                          options={toneOptions}
                        />
                      </FieldShell>

                      <div className="md:col-span-2">
                        <FieldShell label="Opening State">
                          <SelectField
                            value={scenario.openingState ?? ""}
                            onChange={(value) => updateScenarioField("openingState", value)}
                            options={openingStateOptions}
                          />
                        </FieldShell>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.35rem] border border-pink-400/15 bg-black/20 p-4">
                      <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-pink-100/70">
                        Scenario Impact
                      </div>
                      <div className="space-y-2">
                        {scenarioImpact.map((item, index) => (
                          <div
                            key={`${item}-${index}`}
                            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm leading-7 text-white/74"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </StudioSection>

                  <StudioSection
                    eyebrow="Behavior"
                    title="Shape how the character feels in motion"
                    description="Use behavior presets for fast emotional direction, then tune the sliders where precision matters."
                  >
                    <div className="mb-5 flex flex-wrap gap-2">
                      <PillButton
                        active={selectedTraitPreset === "balanced"}
                        onClick={() => applyTraitPreset("balanced")}
                      >
                        Balanced
                      </PillButton>
                      <PillButton
                        active={selectedTraitPreset === "seductive"}
                        onClick={() => applyTraitPreset("seductive")}
                      >
                        Seductive
                      </PillButton>
                      <PillButton
                        active={selectedTraitPreset === "soft"}
                        onClick={() => applyTraitPreset("soft")}
                      >
                        Soft
                      </PillButton>
                      <PillButton
                        active={selectedTraitPreset === "dangerous"}
                        onClick={() => applyTraitPreset("dangerous")}
                      >
                        Dangerous
                      </PillButton>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {sliderFields.map((field) => (
                        <div
                          key={field.key}
                          className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {field.label}
                              </div>
                              <div className="mt-1 text-xs leading-6 text-white/48">
                                {field.hint}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-pink-100">
                                {form[field.key]}
                              </div>
                              <div className="text-[11px] uppercase tracking-[0.16em] text-white/38">
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
                            className="mt-4 w-full accent-pink-400"
                          />
                        </div>
                      ))}
                    </div>
                  </StudioSection>

                  <StudioSection
                    eyebrow="Polish"
                    title="Add the final creator layer"
                    description="Use tags and a single note to sharpen output without turning the builder back into a text-heavy form."
                  >
                    <div className="grid gap-5">
                      <FieldShell label="Tags" hint="comma separated">
                        <InputField
                          value={tagsText}
                          onChange={(e) =>
                            updateField(
                              "tags",
                              e.target.value
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean),
                            )
                          }
                          placeholder="flirty, elegant, dominant, mysterious"
                        />
                      </FieldShell>

                      <FieldShell label="Creator Note">
                        <TextareaField
                          rows={5}
                          value={form.customNotes}
                          onChange={(e) => updateField("customNotes", e.target.value)}
                          placeholder="What must make this character unforgettable?"
                        />
                      </FieldShell>
                    </div>
                  </StudioSection>
                </>
              )}
            </div>

            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
              <div className="overflow-hidden rounded-[2rem] border border-pink-400/15 bg-gradient-to-br from-pink-500/10 via-fuchsia-500/6 to-white/[0.03] shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="border-b border-white/10 p-5 md:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-pink-100/70">
                        Live Preview
                      </div>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        {characterPreview.character.name}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-white/60">
                        {previewHeadline}
                      </p>
                    </div>

                    <div className="flex h-14 w-14 items-center justify-center rounded-[1.3rem] border border-white/10 bg-white/10 text-lg font-semibold text-white">
                      {form.name.slice(0, 1).toUpperCase()}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {displayTags.slice(0, 5).map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPreviewTab("overview")}
                      className={classNames(
                        "rounded-2xl border px-4 py-3 text-left transition",
                        previewTab === "overview"
                          ? "border-pink-400/30 bg-pink-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      <div className="text-sm font-medium">Overview</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab("opening")}
                      className={classNames(
                        "rounded-2xl border px-4 py-3 text-left transition",
                        previewTab === "opening"
                          ? "border-pink-400/30 bg-pink-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      <div className="text-sm font-medium">Opening</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab("traits")}
                      className={classNames(
                        "rounded-2xl border px-4 py-3 text-left transition",
                        previewTab === "traits"
                          ? "border-pink-400/30 bg-pink-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      <div className="text-sm font-medium">Traits</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab("prompt")}
                      className={classNames(
                        "rounded-2xl border px-4 py-3 text-left transition",
                        previewTab === "prompt"
                          ? "border-pink-400/30 bg-pink-500/10 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20",
                      )}
                    >
                      <div className="text-sm font-medium">Prompt</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-5 p-5 md:p-6">
                  <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Quality Meter
                        </div>
                        <div className="mt-1 text-lg font-semibold text-pink-100">
                          {quality.label} · {quality.total}%
                        </div>
                      </div>
                      <div className="rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-xs text-pink-100">
                        Avg Trait {avgTrait}%
                      </div>
                    </div>

                    <div className="space-y-3">
                      <MeterRow label="Identity" value={quality.identitySignal} />
                      <MeterRow label="Scenario" value={quality.scenarioSignal} />
                      <MeterRow label="Behavior" value={quality.traitSignal} />
                      <MeterRow label="Polish" value={quality.polishSignal} />
                    </div>

                    <p className="mt-4 text-sm leading-7 text-white/64">{qualitySummary}</p>
                  </div>

                  {previewTab === "overview" ? (
                    <>
                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Character Snapshot
                        </div>
                        <div className="text-sm leading-7 text-white/78">
                          {characterPreview.character.description}
                        </div>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Scenario Summary
                        </div>
                        <div className="space-y-2 text-sm text-white/74">
                          <div>
                            <span className="text-white/40">Setting:</span> {scenario.setting || "—"}
                          </div>
                          <div>
                            <span className="text-white/40">Relationship:</span>{" "}
                            {scenario.relationshipToUser || "—"}
                          </div>
                          <div>
                            <span className="text-white/40">Goal:</span> {scenario.sceneGoal || "—"}
                          </div>
                          <div>
                            <span className="text-white/40">Tone:</span> {scenario.tone || "—"}
                          </div>
                          <div>
                            <span className="text-white/40">Opening:</span>{" "}
                            {scenario.openingState || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Studio Read
                        </div>
                        <div className="text-sm leading-7 text-white/78">{previewDescriptor}</div>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Scenario Impact
                        </div>
                        <div className="space-y-2">
                          {scenarioImpact.map((item, index) => (
                            <div
                              key={`${item}-${index}`}
                              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/74"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {previewTab === "opening" ? (
                    <>
                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Greeting Preview
                        </div>
                        <div className="text-sm leading-7 text-white/82">
                          {characterPreview.character.greeting}
                        </div>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Preview Message
                        </div>
                        <div className="text-sm leading-7 text-white/78">
                          {toDisplayText(previewMessage) || "No preview message yet."}
                        </div>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Memory Seed
                        </div>
                        <div className="space-y-2">
                          {displayMemory.map((item, index) => (
                            <div
                              key={`${item}-${index}`}
                              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/74"
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Backstory
                        </div>
                        <div className="text-sm leading-7 text-white/76">
                          {toDisplayText(characterPreview.character.backstory)}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {previewTab === "traits" ? (
                    <>
                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Trait Badges
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {displayTraits.map((trait, index) => (
                            <span
                              key={`${trait}-${index}`}
                              className="rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-xs text-pink-100"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Engine Output
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {Object.entries(output.traits).map(([key, value]) => (
                            <div
                              key={key}
                              className="rounded-2xl border border-white/10 bg-white/5 p-3"
                            >
                              <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">
                                {key}
                              </div>
                              <div className="mt-1 text-base font-semibold text-pink-100">
                                {Math.round(value * 100)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {previewTab === "prompt" ? (
                    <>
                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                              Live Prompt Preview
                            </div>
                            <div className="mt-1 text-sm text-white/58">
                              This shows how the builder is conditioning downstream behavior.
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={copyPromptPreview}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:border-white/20 hover:bg-white/10"
                          >
                            {copiedPrompt ? "Copied" : "Copy"}
                          </button>
                        </div>

                        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#07070d] p-4 text-sm leading-7 text-white/76">
                          {livePromptSnippet}
                        </pre>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Why This Matters
                        </div>
                        <div className="text-sm leading-7 text-white/72">
                          Strong scenario conditioning helps prevent generic AI behavior, scene loss,
                          tone drift, and weak roleplay rhythm.
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6 lg:px-8">
            <div className="pointer-events-auto mx-auto max-w-7xl">
              <div className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-[#09090f]/88 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium text-white">
                    {characterPreview.character.name} is ready to save.
                  </div>
                  <div className="mt-1 text-sm text-white/56">
                    {saveMessage || "Refine the preview, check the prompt, then save with confidence."}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={resetBuilder}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    Reset Builder
                  </button>
                  <Link
                    href="/my-characters"
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    My Characters
                  </Link>
                  <button
                    type="button"
                    onClick={handleSaveCharacter}
                    className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(236,72,153,0.32)] transition hover:scale-[1.01]"
                  >
                    Save Character
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
