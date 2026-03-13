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
import { buildCustomCharacterFromBuilder } from "../../lib/custom-character-adapter";
import { customCharactersStorage } from "../../lib/custom-characters-storage";

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


type RichChoiceOption = {
  value: string;
  title: string;
  subtitle: string;
  eyebrow?: string;
};

function toTitleCase(text: string) {
  return text
    .split(/[- ]+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function summarizeCsvText(text: string, count = 2) {
  return text
    .split(",")
    .map((part) => cleanText(part))
    .filter(Boolean)
    .slice(0, count)
    .join(" • ");
}

function makeChoiceOptions(items: readonly string[], kind: "setting" | "relationship" | "goal" | "tone" | "opening" | "background" | "archetype" | "gender" | "pace" | "reply" | "speech") {
  return items.map((item) => {
    if (kind === "background") {
      return {
        value: item,
        title: summarizeCsvText(item, 1) || item,
        subtitle: summarizeCsvText(item, 3) || "Builds the world this character comes from.",
        eyebrow: "World",
      } satisfies RichChoiceOption;
    }

    if (kind === "archetype") {
      return {
        value: item,
        title: toTitleCase(item.replace(/-/g, " ")),
        subtitle: `Sets the baseline chemistry and emotional rhythm around a ${toTitleCase(item.replace(/-/g, " ")).toLowerCase()} core.`,
        eyebrow: "Identity",
      } satisfies RichChoiceOption;
    }

    if (kind === "gender") {
      return {
        value: item,
        title: toTitleCase(item),
        subtitle: "Shapes surface presentation, presence, and expressive energy.",
        eyebrow: "Presentation",
      } satisfies RichChoiceOption;
    }

    if (kind === "pace") {
      return {
        value: item,
        title: toTitleCase(item.replace(/-/g, " ")),
        subtitle: `Controls how quickly closeness evolves on a ${item.replace(/-/g, " ")} track.`,
        eyebrow: "Pace",
      } satisfies RichChoiceOption;
    }

    if (kind === "reply") {
      return {
        value: item,
        title: toTitleCase(item),
        subtitle: "Changes message density, detail, and breathing room.",
        eyebrow: "Replies",
      } satisfies RichChoiceOption;
    }

    if (kind === "speech") {
      return {
        value: item,
        title: toTitleCase(item),
        subtitle: `Makes each line sound more ${item}.`,
        eyebrow: "Voice",
      } satisfies RichChoiceOption;
    }

    const kindLabel = {
      setting: "Scene",
      relationship: "Dynamic",
      goal: "Intent",
      tone: "Tone",
      opening: "Opening",
    }[kind];

    const subtitleMap = {
      setting: `Frames the conversation around ${item}.`,
      relationship: `Builds chemistry through ${item}.`,
      goal: `Pushes each exchange to ${item}.`,
      tone: `Keeps the emotional temperature ${item}.`,
      opening: `Makes the first reply feel ${item}.`,
    } as const;

    return {
      value: item,
      title: item,
      subtitle: subtitleMap[kind],
      eyebrow: kindLabel,
    } satisfies RichChoiceOption;
  });
}

const archetypeChoiceOptions = makeChoiceOptions(archetypes, "archetype");
const genderChoiceOptions = makeChoiceOptions(genderPresentations, "gender");
const backgroundChoiceOptions = makeChoiceOptions(backgroundOptions, "background");
const settingChoiceOptions = makeChoiceOptions(settingOptions, "setting");
const relationshipChoiceOptions = makeChoiceOptions(relationshipOptions, "relationship");
const toneChoiceOptions = makeChoiceOptions(toneOptions, "tone");
const sceneGoalChoiceOptions = makeChoiceOptions(sceneGoalOptions, "goal");
const openingStateChoiceOptions = makeChoiceOptions(openingStateOptions, "opening");
const replyLengthChoiceOptions = makeChoiceOptions(replyLengths, "reply");
const speechStyleChoiceOptions = makeChoiceOptions(speechStyles, "speech");
const relationshipPaceChoiceOptions = makeChoiceOptions(relationshipPaces, "pace");

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
      "They should feel expensive, controlled, seductive, and socially dominant.",
    tags: ["flirty", "dominant", "luxury", "nightlife"],
    mood: {
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
    },
    replyLength: "balanced" as ReplyLength,
    speechStyle: "bold" as SpeechStyle,
    relationshipPace: "balanced" as RelationshipPace,
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
      "They should feel youthful, emotionally real, slightly nervous, but hard to forget.",
    tags: ["campus", "slow-burn", "soft", "best-friends"],
    mood: {
      playful: 46,
      romantic: 80,
      dominant: 24,
      affectionate: 78,
      jealous: 22,
      mysterious: 36,
      confident: 49,
      emotionalDepth: 76,
      teasing: 24,
      humor: 38,
    },
    replyLength: "balanced" as ReplyLength,
    speechStyle: "soft" as SpeechStyle,
    relationshipPace: "slow-burn" as RelationshipPace,
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
      "They should feel competent, safe, observant, and emotionally restrained in a compelling way.",
    tags: ["safe", "gentle", "hospital", "care"],
    mood: {
      playful: 32,
      romantic: 66,
      dominant: 28,
      affectionate: 86,
      jealous: 18,
      mysterious: 30,
      confident: 65,
      emotionalDepth: 74,
      teasing: 18,
      humor: 28,
    },
    replyLength: "detailed" as ReplyLength,
    speechStyle: "natural" as SpeechStyle,
    relationshipPace: "balanced" as RelationshipPace,
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

const quickScenarioPresets = [
  {
    id: "midnight-luxury",
    title: "Midnight Luxury",
    subtitle: "High-end nightlife, instant chemistry, social control",
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
      customNotes: "They should feel expensive, magnetic, and effortlessly in control.",
    },
  },
  {
    id: "campus-slowburn",
    title: "Campus Slow Burn",
    subtitle: "Quiet intimacy, awkward closeness, emotional build",
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
    subtitle: "Professional restraint, safety, and quiet warmth",
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
    subtitle: "Discipline, hierarchy, dangerous attraction",
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

const quickMoodPresets = [
  {
    id: "soft",
    title: "Soft Pull",
    subtitle: "warm, affectionate, emotionally open",
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
    subtitle: "chemistry without losing realism",
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
  replyLength: "balanced",
  speechStyle: "bold",
  relationshipPace: "balanced",
  tags: ["flirty", "dominant", "luxury", "confident"],
  customNotes:
    "They should feel expensive, emotionally controlled, seductive, and highly memorable.",
  scenario: {
    setting: "upscale cocktail bar",
    relationshipToUser: "strangers with immediate tension",
    sceneGoal: "build attraction and chemistry",
    tone: "playful and flirtatious",
    openingState: "already watching the user closely",
  },
};

type BuilderMode = "quick" | "detailed";
type PreviewTab = "overview" | "opening" | "engine" | "memory";

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
  { key: "playful", label: "Playful", hint: "light, energetic, mischievous" },
  { key: "romantic", label: "Romantic", hint: "emotion, tenderness, longing" },
  { key: "dominant", label: "Dominant", hint: "lead, control, pressure" },
  { key: "affectionate", label: "Affectionate", hint: "warmth, care, closeness" },
  { key: "jealous", label: "Jealous", hint: "possessive, territorial, reactive" },
  { key: "mysterious", label: "Mysterious", hint: "distance, intrigue, concealment" },
  { key: "confident", label: "Confident", hint: "presence, certainty, gravity" },
  { key: "emotionalDepth", label: "Emotional Depth", hint: "vulnerability and layers" },
  { key: "teasing", label: "Teasing", hint: "banter, provocation, playful pressure" },
  { key: "humor", label: "Humor", hint: "cleverness, charm, levity" },
];

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function cleanText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function uniq(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function ageVibeToNumber(ageVibe: string) {
  const match = ageVibe.match(/\d+/);
  return clamp(Number(match?.[0] ?? 25), 18, 55);
}

function ageNumberToVibe(age: number) {
  return `${clamp(Math.round(age), 18, 55)}-year-old`;
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
  const text = toDisplayText(value);
  return text ? [text] : [];
}

function flattenMemorySeed(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const buckets = [record.identity, record.behavior, record.scenario];
  return buckets.flatMap((bucket) =>
    Array.isArray(bucket) ? bucket.map((item) => toDisplayText(item)).filter(Boolean) : []
  );
}

function scoreLabel(value: number) {
  if (value >= 85) return "Very High";
  if (value >= 65) return "High";
  if (value >= 45) return "Balanced";
  if (value >= 25) return "Low";
  return "Very Low";
}

function averageTraitScore(form: CharacterBuilderInput) {
  const values = sliderFields.map((field) => form[field.key]);
  return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
}

function buildCompletionScore(form: CharacterBuilderInput) {
  const scenario = form.scenario ?? {};
  const checks = [
    Boolean(cleanText(form.name)),
    Boolean(form.archetype),
    Boolean(form.genderPresentation),
    Boolean(cleanText(form.ageVibe)),
    Boolean(cleanText(form.backgroundVibe)),
    Boolean(cleanText(scenario.setting)),
    Boolean(cleanText(scenario.relationshipToUser)),
    Boolean(cleanText(scenario.sceneGoal)),
    Boolean(cleanText(scenario.tone)),
    Boolean(cleanText(scenario.openingState)),
    Boolean(cleanText(form.customNotes)),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function buildQualitySignals(form: CharacterBuilderInput) {
  const scenario = form.scenario ?? {};
  const identity = clamp(
    [
      cleanText(form.name) ? 20 : 0,
      form.archetype ? 15 : 0,
      form.genderPresentation ? 10 : 0,
      cleanText(form.ageVibe) ? 10 : 0,
      cleanText(form.backgroundVibe) ? 20 : 0,
      cleanText(form.customNotes) ? 25 : 0,
    ].reduce((a, b) => a + b, 0)
  );

  const scene = clamp(
    [
      cleanText(scenario.setting) ? 22 : 0,
      cleanText(scenario.relationshipToUser) ? 20 : 0,
      cleanText(scenario.sceneGoal) ? 20 : 0,
      cleanText(scenario.tone) ? 20 : 0,
      cleanText(scenario.openingState) ? 18 : 0,
    ].reduce((a, b) => a + b, 0)
  );

  const traitShape = clamp(
    sliderFields.reduce((acc, field) => {
      const value = form[field.key];
      if (value >= 35 && value <= 90) return acc + 10;
      if (value >= 20 && value <= 100) return acc + 7;
      return acc + 4;
    }, 0)
  );

  const polish = clamp(
    [
      (form.tags?.length ?? 0) >= 3 ? 35 : (form.tags?.length ?? 0) > 0 ? 18 : 0,
      form.replyLength ? 20 : 0,
      form.speechStyle ? 20 : 0,
      form.relationshipPace ? 25 : 0,
    ].reduce((a, b) => a + b, 0)
  );

  const total = clamp(Math.round(identity * 0.28 + scene * 0.34 + traitShape * 0.22 + polish * 0.16));

  return {
    completion: buildCompletionScore(form),
    identity,
    scene,
    traitShape,
    polish,
    total,
    label:
      total >= 88
        ? "Elite"
        : total >= 75
        ? "Strong"
        : total >= 60
        ? "Promising"
        : "Needs More Shape",
  };
}

function inferScenarioImpact(form: CharacterBuilderInput) {
  const setting = form.scenario?.setting?.toLowerCase() ?? "";
  const tone = form.scenario?.tone?.toLowerCase() ?? "";
  const relationship = form.scenario?.relationshipToUser?.toLowerCase() ?? "";

  const impacts: string[] = [];

  if (setting.includes("hospital")) {
    impacts.push("Replies should feel careful, attentive, restrained, and grounded.");
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
  if (tone.includes("soft")) {
    impacts.push("Responses should reduce aggression and increase warmth and reassurance.");
  }
  if (tone.includes("forbidden") || tone.includes("dangerous")) {
    impacts.push("Tension should stay high without losing control or scene logic.");
  }
  if (relationship.includes("best friends")) {
    impacts.push("The dynamic should carry familiarity, history, and emotional hesitation.");
  }
  if (relationship.includes("strangers")) {
    impacts.push("The opening should rely on curiosity, observation, and first-impression chemistry.");
  }
  if (relationship.includes("ex-lovers")) {
    impacts.push("Lines should carry residue, memory, and unfinished emotional weight.");
  }

  if (impacts.length === 0) {
    impacts.push("The selected scenario should visibly shape tone, rhythm, and first-message behavior.");
  }

  return impacts.slice(0, 4);
}

function buildLivePromptSnippet(systemPrompt: string, maxLength = 1200) {
  if (systemPrompt.length <= maxLength) return systemPrompt;
  return `${systemPrompt.slice(0, maxLength)}…`;
}

function parseTags(raw: string): string[] {
  return uniq(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  ).slice(0, 8);
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
          : "border-white/10 bg-white/[0.04]"
      )}
    >
      <div className="mb-5">
        {eyebrow ? (
          <div className="mb-2 text-[11px] uppercase tracking-[0.28em] text-pink-200/72">{eyebrow}</div>
        ) : null}
        <h2 className="text-[1.5rem] font-semibold tracking-tight text-white md:text-[1.9rem]">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-7 text-white/62 md:text-[15px]">{description}</p> : null}
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

function InputField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={classNames(
        "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-pink-400/40",
        props.className
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
        props.className
      )}
    />
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

function ChoiceGridField({
  value,
  onChange,
  options,
  columns = "3",
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: RichChoiceOption[];
  columns?: "2" | "3" | "4";
  compact?: boolean;
}) {
  const gridClass =
    columns === "2"
      ? "grid gap-3 md:grid-cols-2"
      : columns === "4"
      ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={gridClass}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={classNames(
              "group relative overflow-hidden rounded-[1.45rem] border text-left transition duration-200",
              compact ? "p-3.5" : "p-4",
              active
                ? "border-pink-400/40 bg-[linear-gradient(180deg,rgba(236,72,153,0.18),rgba(124,58,237,0.08))] shadow-[0_18px_50px_rgba(236,72,153,0.16)]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))]"
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div>
                {option.eyebrow ? (
                  <div className={classNames("text-[10px] uppercase tracking-[0.22em]", active ? "text-pink-100/80" : "text-white/38")}>
                    {option.eyebrow}
                  </div>
                ) : null}
                <div className={classNames("mt-2 font-medium leading-6", compact ? "text-sm" : "text-[15px]", active ? "text-white" : "text-white/92")}>
                  {option.title}
                </div>
                <div className={classNames("mt-2 pr-6 text-xs leading-6", active ? "text-pink-50/78" : "text-white/52")}>
                  {option.subtitle}
                </div>
              </div>
              <div
                className={classNames(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                  active ? "border-pink-300/50 bg-pink-400/15 text-pink-100" : "border-white/12 bg-white/[0.03] text-white/25 group-hover:border-white/25"
                )}
              >
                <span className="text-[11px]">✦</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}


function ChoiceFieldSection({
  title,
  description,
  value,
  onChange,
  options,
  columns = "3",
  compact = false,
  customPlaceholder,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  options: RichChoiceOption[];
  columns?: "2" | "3" | "4";
  compact?: boolean;
  customPlaceholder: string;
}) {
  const hasPresetMatch = options.some((option) => option.value === value);
  const [customDraft, setCustomDraft] = useState(hasPresetMatch ? "" : value);

  useEffect(() => {
    setCustomDraft(hasPresetMatch ? "" : value);
  }, [hasPresetMatch, value]);

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/80 p-5 md:p-6">
      <div className="mb-4">
        <h3 className="text-[1.2rem] font-semibold tracking-tight text-white md:text-[1.45rem]">{title}</h3>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-white/62">{description}</p>
      </div>

      <ChoiceGridField
        value={hasPresetMatch ? value : ""}
        onChange={onChange}
        options={options}
        columns={columns}
        compact={compact}
      />

      <div className="mt-4 rounded-[1.3rem] border border-dashed border-white/12 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-semibold text-white">Custom direction</div>
            <p className="mt-1 text-sm leading-6 text-white/52">
              Override the presets with your own phrasing. When you write here, the preset selection is cleared for this field.
            </p>
          </div>
          {!hasPresetMatch && value ? (
            <button
              type="button"
              onClick={() => {
                setCustomDraft("");
                onChange(options[0]?.value ?? "");
              }}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.075]"
            >
              Back to presets
            </button>
          ) : null}
        </div>

        <TextareaField
          value={customDraft}
          onChange={(e) => {
            const next = e.target.value;
            setCustomDraft(next);
            onChange(next);
          }}
          placeholder={customPlaceholder}
          rows={3}
          className="mt-3 min-h-[94px]"
        />
      </div>
    </div>
  );
}

function AgeSliderSection({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const numericAge = ageVibeToNumber(value);

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/80 p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <h3 className="text-[1.2rem] font-semibold tracking-tight text-white md:text-[1.45rem]">Age</h3>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-white/62">
            Set the character&apos;s age directly. This changes maturity, life-stage feel, and how the voice lands in conversation.
          </p>
        </div>
        <div className="rounded-[1.2rem] border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-center shadow-[0_14px_35px_rgba(236,72,153,0.16)]">
          <div className="text-[11px] uppercase tracking-[0.24em] text-pink-100/70">Selected age</div>
          <div className="mt-1 text-3xl font-semibold text-white">{numericAge}</div>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <input
          type="range"
          min={18}
          max={55}
          step={1}
          value={numericAge}
          onChange={(e) => onChange(ageNumberToVibe(Number(e.target.value)))}
          className="w-full accent-pink-500"
        />

        <div className="mt-3 flex items-center justify-between text-xs text-white/42">
          <span>18</span>
          <span>26</span>
          <span>34</span>
          <span>42</span>
          <span>55</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white">Young adult</div>
            <p className="mt-1 text-sm leading-6 text-white/52">Faster energy, more spontaneity, lighter social rhythm.</p>
          </div>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white">Mid-range balance</div>
            <p className="mt-1 text-sm leading-6 text-white/52">Balanced confidence, chemistry, and emotional realism.</p>
          </div>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white">Older presence</div>
            <p className="mt-1 text-sm leading-6 text-white/52">More grounded authority, restraint, and mature presence.</p>
          </div>
        </div>
      </div>
    </div>
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
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.075]"
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
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.075]"
      )}
    >
      <div className="text-sm font-semibold text-white">{title}</div>
      {subtitle ? <div className="mt-1 text-xs leading-6 text-white/56">{subtitle}</div> : null}
      {meta ? <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-pink-200/75">{meta}</div> : null}
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
          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/[0.075]"
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

function MeterRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-white/62">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SliderFieldRow({
  field,
  value,
  onChange,
}: {
  field: SliderField;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-white">{field.label}</div>
          <div className="mt-1 text-xs text-white/45">{field.hint}</div>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80">
          {value} • {scoreLabel(value)}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-pink-500"
      />
    </div>
  );
}

export default function CreateCharacterPage() {
  const [form, setForm] = useState<CharacterBuilderInput>(initialInput);
  const [builderMode, setBuilderMode] = useState<BuilderMode>("detailed");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("overview");
  const [saveMessage, setSaveMessage] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [tagsInput, setTagsInput] = useState((initialInput.tags ?? []).join(", "));
  const [selectedQuickTemplateId, setSelectedQuickTemplateId] = useState<string | null>(null);
  const [selectedQuickIdentityId, setSelectedQuickIdentityId] = useState<string | null>(null);
  const [selectedQuickScenarioId, setSelectedQuickScenarioId] = useState<string | null>(null);
  const [selectedQuickMoodId, setSelectedQuickMoodId] = useState<string | null>(null);
  const [selectedTraitPreset, setSelectedTraitPreset] = useState<keyof typeof traitPresets | null>(null);

  const engineOutput = useMemo(() => buildCharacterEngineOutput(form), [form]);
  const characterPreview = useMemo(() => buildCustomCharacterFromBuilder(form), [form]);
  const quality = useMemo(() => buildQualitySignals(form), [form]);
  const scenarioImpact = useMemo(() => inferScenarioImpact(form), [form]);

  const livePromptSnippet = buildLivePromptSnippet(engineOutput.systemPrompt ?? "");
  const scenario = form.scenario ?? {};
  const avgTrait = averageTraitScore(form);
  const completionScore = buildCompletionScore(form);
  const previewHeadline = characterPreview.headline || `${formatLabel(form.archetype)} energy`;
  const previewDescriptor = [
    scenario.setting || "Scene not chosen",
    scenario.relationshipToUser || "Dynamic not chosen",
    scenario.sceneGoal || "Goal not chosen",
  ]
    .filter(Boolean)
    .join(" • ");
  const displayTags = toDisplayList(characterPreview.tags);
  const displayTraits = toDisplayList(characterPreview.traitBadges);
  const displayMemory = flattenMemorySeed(characterPreview.memorySeed);

  const canSave = Boolean(
    cleanText(form.name) &&
      cleanText(form.backgroundVibe) &&
      cleanText(scenario.setting) &&
      cleanText(scenario.relationshipToUser) &&
      cleanText(scenario.sceneGoal) &&
      cleanText(scenario.tone) &&
      cleanText(scenario.openingState)
  );

  useEffect(() => {
    setTagsInput((form.tags ?? []).join(", "));
  }, [form.tags]);

  useEffect(() => {
    if (!copiedPrompt) return;
    const timer = window.setTimeout(() => setCopiedPrompt(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedPrompt]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => setSaveMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

  function updateField<K extends keyof CharacterBuilderInput>(key: K, value: CharacterBuilderInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateScenarioField(key: keyof NonNullable<CharacterBuilderInput["scenario"]>, value: string) {
    setForm((prev) => ({
      ...prev,
      scenario: {
        ...(prev.scenario ?? {}),
        [key]: value,
      },
    }));
  }

  function applyQuickTemplate(templateId: string) {
    const template = quickTemplates.find((item) => item.id === templateId);
    if (!template) return;

    setSelectedQuickTemplateId(templateId);
    setBuilderMode("quick");
    setSelectedQuickIdentityId(null);
    setSelectedQuickScenarioId(null);
    setSelectedQuickMoodId(null);
    setSelectedTraitPreset(null);

    setForm((prev) => ({
      ...prev,
      name: template.name,
      archetype: template.archetype,
      genderPresentation: template.genderPresentation,
      ageVibe: template.ageVibe,
      backgroundVibe: template.backgroundVibe,
      ...template.mood,
      replyLength: template.replyLength,
      speechStyle: template.speechStyle,
      relationshipPace: template.relationshipPace,
      tags: [...template.tags],
      customNotes: template.customNotes,
      scenario: { ...template.scenario },
    }));
  }

  function applyIdentityPreset(presetId: string) {
    const preset = quickIdentityPresets.find((item) => item.id === presetId);
    if (!preset) return;

    setSelectedQuickIdentityId(presetId);
    setForm((prev) => ({ ...prev, ...preset.values }));
  }

  function applyScenarioPreset(presetId: string) {
    const preset = quickScenarioPresets.find((item) => item.id === presetId);
    if (!preset) return;

    setSelectedQuickScenarioId(presetId);
    setForm((prev) => ({
      ...prev,
      backgroundVibe: preset.template.backgroundVibe,
      scenario: { ...preset.template.scenario },
      customNotes: preset.template.customNotes,
      tags: uniq([...(prev.tags ?? []), ...preset.template.tags]),
    }));
  }

  function applyMoodPreset(presetId: string) {
    const preset = quickMoodPresets.find((item) => item.id === presetId);
    if (!preset) return;

    setSelectedQuickMoodId(presetId);
    setForm((prev) => ({ ...prev, ...preset.values }));
  }

  function applyTraitPreset(presetKey: keyof typeof traitPresets) {
    setSelectedTraitPreset(presetKey);
    setForm((prev) => ({ ...prev, ...traitPresets[presetKey] }));
  }

  function randomizeName() {
    const next = quickNameSuggestions[Math.floor(Math.random() * quickNameSuggestions.length)] ?? "Sable";
    updateField("name", next);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(engineOutput.systemPrompt ?? "");
      setCopiedPrompt(true);
    } catch {
      setCopiedPrompt(false);
    }
  }

  function resetBuilder() {
    setForm(initialInput);
    setBuilderMode("detailed");
    setPreviewTab("overview");
    setSaveMessage("");
    setSelectedQuickTemplateId(null);
    setSelectedQuickIdentityId(null);
    setSelectedQuickScenarioId(null);
    setSelectedQuickMoodId(null);
    setSelectedTraitPreset(null);
  }

  function handleSaveCharacter() {
    if (!canSave) {
      setSaveMessage("Core identity and scenario fields need to be complete before saving.");
      return;
    }

    try {
      customCharactersStorage.save(characterPreview);
      setSaveMessage(`Saved \"${characterPreview.name}\" to My Characters.`);
    } catch {
      setSaveMessage("Character could not be saved. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#06070b] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.4)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-pink-400/25 bg-pink-500/10 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-pink-100/80">
                Lovora Character Studio
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Build custom characters with a cleaner studio flow and stronger scene logic.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/64 md:text-base">
                Quick Mode gives you a fast start. Detailed Studio separates each decision into clearer groups so the page stays readable while still feeling premium.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <MiniStatChip label="Mode" value={builderMode === "quick" ? "Quick" : "Detailed"} />
                <MiniStatChip label="Completion" value={`${completionScore}%`} />
                <MiniStatChip label="Quality" value={`${quality.total}% • ${quality.label}`} />
                <MiniStatChip label="Avg Trait" value={`${avgTrait}%`} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SegmentButton
                active={builderMode === "quick"}
                title="Quick Mode"
                subtitle="Choose a strong identity, scene, and mood preset without touching every control."
                onClick={() => setBuilderMode("quick")}
              />
              <SegmentButton
                active={builderMode === "detailed"}
                title="Detailed Studio"
                subtitle="Tune emotional sliders, scenario tension, delivery style, and notes for deeper control."
                onClick={() => setBuilderMode("detailed")}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <div className="space-y-6">
            <StudioSection
              eyebrow="Core"
              title={builderMode === "quick" ? "Quick identity" : "Identity foundation"}
              description={
                builderMode === "quick"
                  ? "Quick Mode keeps only the core decisions so you can build a strong character without feeling buried in controls."
                  : "Start with the permanent character DNA. Each group is separated clearly so the page feels more like a studio and less like a long form."
              }
              featured
            >
              {builderMode === "quick" ? (
                <div className="space-y-5">
                  <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/80 p-5 md:p-6">
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-white md:text-[1.3rem]">Character name</h3>
                        <p className="mt-2 text-sm leading-7 text-white/62 md:text-[15px]">
                          Start with a short, memorable name that already feels like part of the scene.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <InputField value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Sable" />
                        <button
                          type="button"
                          onClick={randomizeName}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.075]"
                        >
                          Random
                        </button>
                      </div>
                    </div>
                  </div>

                  <AgeSliderSection
                    value={form.ageVibe}
                    onChange={(value) => updateField("ageVibe", value)}
                  />

                  <ChoiceFieldSection
                    title="Archetype"
                    description="Pick the overall type first. This sets the emotional shape before you touch smaller details."
                    value={form.archetype}
                    onChange={(value) => updateField("archetype", value as CharacterArchetype)}
                    options={archetypeChoiceOptions}
                    columns="4"
                    customPlaceholder="Example: emotionally guarded charmer"
                  />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/80 p-5 md:p-6">
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-white md:text-[1.3rem]">Character name</h3>
                        <p className="mt-2 text-sm leading-7 text-white/62 md:text-[15px]">
                          Use a short, memorable name that feels natural inside the scene.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <InputField value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Sable" />
                        <button
                          type="button"
                          onClick={randomizeName}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.075]"
                        >
                          Random
                        </button>
                      </div>
                    </div>
                  </div>

                  <AgeSliderSection
                    value={form.ageVibe}
                    onChange={(value) => updateField("ageVibe", value)}
                  />

                  <ChoiceFieldSection
                    title="Archetype"
                    description="This is the emotional blueprint. It determines the default chemistry and presence before the scene adds pressure."
                    value={form.archetype}
                    onChange={(value) => updateField("archetype", value as CharacterArchetype)}
                    options={archetypeChoiceOptions}
                    columns="4"
                    customPlaceholder="Example: emotionally guarded charmer"
                  />

                  <ChoiceFieldSection
                    title="Presentation"
                    description="Set the outward presentation and overall surface energy of the character."
                    value={form.genderPresentation}
                    onChange={(value) => updateField("genderPresentation", value as GenderPresentation)}
                    options={genderChoiceOptions}
                    columns="3"
                    compact
                    customPlaceholder="Example: refined androgynous"
                  />

                  <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/80 p-5 md:p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold tracking-tight text-white md:text-[1.3rem]">Quick identity presets</h3>
                      <p className="mt-2 text-sm leading-7 text-white/62 md:text-[15px]">
                        These are optional starter directions. They fill multiple identity controls at once without locking you in.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {quickIdentityPresets.map((preset) => (
                        <OptionCard
                          key={preset.id}
                          active={selectedQuickIdentityId === preset.id}
                          title={preset.title}
                          subtitle={preset.subtitle}
                          meta={formatLabel(preset.values.archetype)}
                          onClick={() => applyIdentityPreset(preset.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </StudioSection>

            {builderMode === "quick" ? (
              <>
                <StudioSection
                  eyebrow="Quick scene"
                  title="Scene essentials"
                  description="Quick Mode keeps the scene simple: who they are to the user, where this starts, and what emotional tone the first messages should carry."
                >
                  <div className="space-y-5">
                    <ChoiceFieldSection
                      title="Relationship to user"
                      description="Choose the core dynamic so the chat instantly feels personal instead of generic."
                      value={scenario.relationshipToUser ?? relationshipOptions[0]}
                      onChange={(value) => updateScenarioField("relationshipToUser", value)}
                      options={relationshipChoiceOptions}
                      columns="2"
                      customPlaceholder="Example: neighbors who have been circling each other for months"
                    />

                    <ChoiceFieldSection
                      title="Setting"
                      description="Give the conversation a clear place so the character sounds grounded from the first line."
                      value={scenario.setting ?? settingOptions[0]}
                      onChange={(value) => updateScenarioField("setting", value)}
                      options={settingChoiceOptions}
                      columns="2"
                      customPlaceholder="Example: rooftop restaurant after closing"
                    />

                    <ChoiceFieldSection
                      title="Tone"
                      description="This controls the emotional temperature and keeps the opening from feeling flat."
                      value={scenario.tone ?? toneOptions[0]}
                      onChange={(value) => updateScenarioField("tone", value)}
                      options={toneChoiceOptions}
                      columns="2"
                      customPlaceholder="Example: restrained but impossible to ignore"
                    />
                  </div>
                </StudioSection>

                <StudioSection
                  eyebrow="Quick polish"
                  title="Finishing touch"
                  description="Add one short custom direction and a greeting style. Everything else can wait for Detailed Studio."
                >
                  <div className="space-y-5">
                    <ChoiceFieldSection
                      title="Greeting style"
                      description="Choose how the first messages should sound: softer, bolder, more natural, or more stylized."
                      value={form.speechStyle}
                      onChange={(value) => updateField("speechStyle", value as SpeechStyle)}
                      options={speechStyleChoiceOptions}
                      columns="3"
                      compact
                      customPlaceholder="Example: low-key, dry, and very human"
                    />

                    <FieldShell
                      label="Short custom direction"
                      hint="Use one or two sentences only. Example: confident on the outside, secretly jealous, never sounds robotic."
                    >
                      <TextareaField
                        rows={4}
                        value={form.customNotes ?? ""}
                        onChange={(e) => updateField("customNotes", e.target.value)}
                        placeholder="Give one short direction for behavior, mood, or scene chemistry."
                      />
                    </FieldShell>
                  </div>
                </StudioSection>
              </>
            ) : null}

            {builderMode === "detailed" ? (
              <>

            <StudioSection
              eyebrow="Scene"
              title="Embedded scenario"
              description="Scenario stays inside the character itself. Each choice below defines how the conversation should feel from the very first line."
            >
              <div className="space-y-5">
                <ChoiceFieldSection
                  title="Setting"
                  description="Choose where the scene is happening so the character naturally sounds like they belong there."
                  value={scenario.setting ?? settingOptions[0]}
                  onChange={(value) => updateScenarioField("setting", value)}
                  options={settingChoiceOptions}
                  columns="2"
                  customPlaceholder="Example: rooftop restaurant after closing"
                />

                <ChoiceFieldSection
                  title="Relationship to user"
                  description="Define the emotional history, tension, or familiarity between the character and the user."
                  value={scenario.relationshipToUser ?? relationshipOptions[0]}
                  onChange={(value) => updateScenarioField("relationshipToUser", value)}
                  options={relationshipChoiceOptions}
                  columns="2"
                  customPlaceholder="Example: neighbors who have been circling each other for months"
                />

                <ChoiceFieldSection
                  title="Scene goal"
                  description="Tell the builder what this interaction is trying to move toward underneath the surface."
                  value={scenario.sceneGoal ?? sceneGoalOptions[0]}
                  onChange={(value) => updateScenarioField("sceneGoal", value)}
                  options={sceneGoalChoiceOptions}
                  columns="2"
                  customPlaceholder="Example: make the user confess first"
                />

                <ChoiceFieldSection
                  title="Tone"
                  description="This controls the emotional temperature and keeps the scene from feeling flat or generic."
                  value={scenario.tone ?? toneOptions[0]}
                  onChange={(value) => updateScenarioField("tone", value)}
                  options={toneChoiceOptions}
                  columns="2"
                  customPlaceholder="Example: restrained but impossible to ignore"
                />

                <ChoiceFieldSection
                  title="Opening state"
                  description="Pick the exact feeling the character is already carrying when they send the first message."
                  value={scenario.openingState ?? openingStateOptions[0]}
                  onChange={(value) => updateScenarioField("openingState", value)}
                  options={openingStateChoiceOptions}
                  columns="2"
                  customPlaceholder="Example: acting calm while obviously jealous"
                />

                <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                  <div className="text-sm font-semibold text-white">What these scene choices will do</div>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-white/70">
                    {scenarioImpact.map((item) => (
                      <div key={item}>• {item}</div>
                    ))}
                  </div>
                </div>
              </div>
            </StudioSection>

            <StudioSection
              eyebrow="Tone shaping"
              title="World, pacing, and delivery"
              description="These groups refine how the character feels in conversation without overwhelming the page structure."
            >
              <div className="space-y-5">
                <ChoiceFieldSection
                  title="Background vibe"
                  description="Define the world the character comes from so their habits and language feel grounded."
                  value={form.backgroundVibe}
                  onChange={(value) => updateField("backgroundVibe", value)}
                  options={backgroundChoiceOptions}
                  columns="2"
                  customPlaceholder="Example: old money upbringing with soft menace under the surface"
                />

                <ChoiceFieldSection
                  title="Relationship pace"
                  description="Control how quickly closeness, trust, and chemistry should evolve over time."
                  value={form.relationshipPace}
                  onChange={(value) => updateField("relationshipPace", value as RelationshipPace)}
                  options={relationshipPaceChoiceOptions}
                  columns="3"
                  compact
                  customPlaceholder="Example: very slow, emotionally guarded build"
                />

                <ChoiceFieldSection
                  title="Reply length"
                  description="Choose whether the character should feel concise, balanced, or more expansive in each message."
                  value={form.replyLength}
                  onChange={(value) => updateField("replyLength", value as ReplyLength)}
                  options={replyLengthChoiceOptions}
                  columns="3"
                  compact
                  customPlaceholder="Example: medium with occasional long emotional replies"
                />

                <ChoiceFieldSection
                  title="Speech style"
                  description="Shape the line delivery so the voice feels authored rather than machine-made."
                  value={form.speechStyle}
                  onChange={(value) => updateField("speechStyle", value as SpeechStyle)}
                  options={speechStyleChoiceOptions}
                  columns="3"
                  compact
                  customPlaceholder="Example: low-key, dry, and very human"
                />

                <div className="rounded-[1.75rem] border border-white/10 bg-[#0b0d12]/80 p-5 md:p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold tracking-tight text-white md:text-[1.3rem]">Trait presets</h3>
                    <p className="mt-2 text-sm leading-7 text-white/62 md:text-[15px]">
                      Apply a coherent emotional curve, then fine-tune the sliders below.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {Object.keys(traitPresets).map((key) => (
                      <OptionCard
                        key={key}
                        active={selectedTraitPreset === key}
                        title={formatLabel(key)}
                        subtitle="Applies a coherent emotional trait curve"
                        onClick={() => applyTraitPreset(key as keyof typeof traitPresets)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </StudioSection>

            <StudioSection
              eyebrow="Traits"
              title="Emotional sliders"
              description="Detailed Studio uses explicit trait controls. In Quick Mode these still remain editable for final polish."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {sliderFields.map((field) => (
                  <SliderFieldRow
                    key={field.key}
                    field={field}
                    value={form[field.key]}
                    onChange={(value) => updateField(field.key, value)}
                  />
                ))}
              </div>
            </StudioSection>

            <StudioSection
              eyebrow="Polish"
              title="Tags and creative notes"
              description="Keep notes structured and specific. The goal is to help the adapter produce a stronger greeting, preview, and backstory — not to dump random lore."
            >
              <div className="grid gap-4">
                <FieldShell label="Tags" hint="comma separated, max 8 useful tags">
                  <InputField
                    value={tagsInput}
                    onChange={(e) => {
                      const next = e.target.value;
                      setTagsInput(next);
                      updateField("tags", parseTags(next));
                    }}
                    placeholder="flirty, luxury, magnetic"
                  />
                </FieldShell>

                <FieldShell label="Custom notes" hint="1–3 sentences that sharpen behavior, not random lore">
                  <TextareaField
                    rows={5}
                    value={form.customNotes ?? ""}
                    onChange={(e) => updateField("customNotes", e.target.value)}
                    placeholder="They should feel expensive, emotionally controlled, and difficult to forget."
                  />
                </FieldShell>
              </div>
            </StudioSection>

              </>
            ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <StudioSection
              eyebrow="Live preview"
              title="Character output"
              description="This panel shows how the builder is translating into an actual Lovora companion right now."
              featured
            >
              <div className="rounded-[1.8rem] border border-white/10 bg-[#0e1017] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-2xl font-semibold text-white">{characterPreview.name}</div>
                    <div className="mt-2 max-w-md text-sm leading-7 text-white/62">{previewHeadline}</div>
                  </div>
                  <div className="rounded-full border border-pink-400/25 bg-pink-500/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-pink-100/80">
                    {quality.label}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <MiniStatChip label="Archetype" value={formatLabel(form.archetype)} />
                  <MiniStatChip label="Age" value={form.ageVibe.replace("-year-old", "")} />
                  <MiniStatChip label="Pace" value={formatLabel(form.relationshipPace)} />
                  <MiniStatChip label="Speech" value={formatLabel(form.speechStyle)} />
                </div>

                <div className="mt-4 text-sm leading-7 text-white/68">{previewDescriptor}</div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(["overview", "opening", "engine", "memory"] as PreviewTab[]).map((tab) => (
                  <PillButton key={tab} active={previewTab === tab} onClick={() => setPreviewTab(tab)}>
                    {formatLabel(tab)}
                  </PillButton>
                ))}
              </div>

              <div className="mt-5 rounded-[1.8rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/72">
                {previewTab === "overview" ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Description</div>
                      <p className="mt-2">{characterPreview.description}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Scenario summary</div>
                      <p className="mt-2">{characterPreview.scenarioSummary}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Tags</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {displayTags.length ? (
                          displayTags.map((tag) => <MiniStatChip key={tag} label="#" value={tag} />)
                        ) : (
                          <span className="text-white/45">No tags yet.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {previewTab === "opening" ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Greeting</div>
                      <p className="mt-2">{characterPreview.greeting}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Preview message</div>
                      <p className="mt-2">{characterPreview.previewMessage}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Backstory</div>
                      <p className="mt-2">{characterPreview.backstory}</p>
                    </div>
                  </div>
                ) : null}

                {previewTab === "engine" ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <MeterRow label="Identity signal" value={quality.identity} />
                      <MeterRow label="Scenario signal" value={quality.scene} />
                      <MeterRow label="Trait shape" value={quality.traitShape} />
                      <MeterRow label="Polish" value={quality.polish} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Prompt preview</div>
                      <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-[1.2rem] border border-white/10 bg-[#0d0f15] p-4 text-xs leading-6 text-white/75">
                        {livePromptSnippet}
                      </pre>
                    </div>
                  </div>
                ) : null}

                {previewTab === "memory" ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Trait badges</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {displayTraits.length ? (
                          displayTraits.map((trait) => <MiniStatChip key={trait} label="Trait" value={trait} />)
                        ) : (
                          <span className="text-white/45">No trait badges yet.</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Memory seed</div>
                      <div className="mt-3 space-y-2 text-sm leading-7 text-white/70">
                        {displayMemory.length ? (
                          displayMemory.slice(0, 12).map((item) => <div key={item}>• {item}</div>)
                        ) : (
                          <span className="text-white/45">Memory seed not available.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </StudioSection>

            <StudioSection eyebrow="Actions" title="Save and continue" description="Save locally, inspect the prompt, or jump straight into your custom library.">
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleSaveCharacter}
                  className="w-full rounded-[1.4rem] bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(236,72,153,0.28)] transition hover:scale-[1.01]"
                >
                  Save to My Characters
                </button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={copyPrompt}
                    className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.075]"
                  >
                    {copiedPrompt ? "Prompt copied" : "Copy prompt preview"}
                  </button>
                  <button
                    type="button"
                    onClick={resetBuilder}
                    className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.075]"
                  >
                    Reset builder
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/my-characters"
                    className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.075]"
                  >
                    Open My Characters
                  </Link>
                  <Link
                    href={canSave ? `/chat/custom/${characterPreview.slug}` : "/my-characters"}
                    className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.075]"
                  >
                    Preview chat route
                  </Link>
                </div>

                <div className="rounded-[1.3rem] border border-white/10 bg-[#0d1016] p-4 text-sm leading-7 text-white/68">
                  <div className="text-xs uppercase tracking-[0.2em] text-pink-100/65">Builder diagnostics</div>
                  <div className="mt-3 grid gap-3">
                    <MeterRow label="Completion" value={quality.completion} />
                    <MeterRow label="Overall quality" value={quality.total} />
                  </div>
                  <p className="mt-4">
                    {quality.total >= 88
                      ? "Scene, identity, and emotional direction are all strongly defined."
                      : quality.total >= 75
                      ? "This build already feels product-grade and should preview well."
                      : quality.total >= 60
                      ? "The character has a solid base, but scene or polish can be pushed harder."
                      : "The builder still needs more specificity to avoid generic outputs."}
                  </p>
                </div>

                {saveMessage ? (
                  <div className="rounded-[1.1rem] border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm text-pink-100/90">
                    {saveMessage}
                  </div>
                ) : null}
              </div>
            </StudioSection>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}

