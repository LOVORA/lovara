"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  finalizeMyCustomCharacterCreation,
  getProfileSummary,
  type DbCustomCharacter,
  type CharacterDraftInput,
} from "@/lib/account";
import { buildMonetizationSnapshot } from "@/lib/monetization";
import {
  requestImageGeneration,
  type CharacterImageSafetyInput,
} from "@/lib/image-provider";
import {
  buildCharacterDraftFromStudio,
  defaultStudioForm,
  type CoreVibeId,
  type StudioFormState,
} from "@/lib/custom-character-studio";
import { buildSelectionCompilerOutputFromStudioSource } from "@/lib/create-character/full-selection-compiler";
import { buildOpeningPack } from "@/lib/create-character/opening-composer";
import { buildStudioBuilderSummary } from "@/lib/create-character/studio-builder";
import {
  InputField,
  PresetCard,
  Section,
  SelectField,
  SegmentButton,
  TextAreaField,
} from "@/components/create-character/studio-primitives";
import { AvatarPreviewSection } from "@/components/create-character/avatar-preview-section";
import { PublishSetupSection } from "@/components/create-character/publish-setup-section";
import { StudioShellHeader } from "@/components/create-character/studio-shell-header";
import { StudioSidebar } from "@/components/create-character/studio-sidebar";
import {
  AdvancedStepSection,
  IdentityStepSection,
  PersonalityStepSection,
  ScenarioStepSection,
  VisualStepSection,
} from "@/components/create-character/studio-step-sections";
import { useAvatarGeneration } from "@/components/create-character/use-avatar-generation";
import { useCreateCharacterSubmit } from "@/components/create-character/use-create-character-submit";
import {
  ageToneLabel,
  ALL_STEPS,
  ARC_STAGE_OPTIONS,
  BannerState,
  BEHAVIOR_MODE_OPTIONS,
  calculateReadinessScore,
  CHARACTER_TEMPLATES,
  CharacterTemplate,
  cn,
  composeStructuredNotes,
  enrichDraftForBuilderV2Compat,
  getStepCompletion,
  meterTone,
  parseCsv,
  parsePipe,
  readStructuredNotes,
  REGION_OPTIONS,
  RELATIONSHIP_DYNAMIC_OPTIONS,
  ROLEPLAY_SCENARIO_TEMPLATES,
  removeStructuredLine,
  SCENE_TYPE_OPTIONS,
  SCENE_PRESETS,
  STRUCTURED_NOTE_KEYS,
  StructuredNoteKey,
  StructuredNoteMap,
  StudioStep,
  toggleListItem,
  USER_ROLE_OPTIONS_EXTENDED,
} from "@/lib/create-character/studio-editor";
import type { LegacyRebuildSourcePayload } from "@/lib/create-character/legacy-rebuild";

const AuthGuard = dynamic(() => import("@/components/auth/auth-guard"), {
  ssr: false,
});

type CreatorEntry = "women" | "man" | null;
type CreationTrack = "prompt" | "ready" | null;
type VisualWizardStep =
  | "entry"
  | "track"
  | "prompt"
  | "identity"
  | "general"
  | "face"
  | "body"
  | "details"
  | "image"
  | "review"
  | "generating"
  | "result";

type DetailTab = "personality" | "voice" | "clothes" | "relationship" | "hobby" | "fetishes";
type SelectionTone = "fuchsia" | "cyan" | "amber" | "rose" | "slate";

type VisualChoice = {
  value: string;
  title: string;
  caption: string;
  gradient: string;
  imageSrc?: string;
};

type ProfileSummary = Awaited<ReturnType<typeof getProfileSummary>>;

const READY_STEP_COPY: Record<
  Exclude<
    VisualWizardStep,
    "entry" | "track" | "prompt" | "review" | "generating" | "result"
  >,
  {
    eyebrow: string;
    title: string;
    description: string;
    continueLabel: string;
  }
> = {
  identity: {
    eyebrow: "Step 1",
    title: "Start with who she is",
    description:
      "Name, age, and origin build the identity the rest of the character follows.",
    continueLabel: "Save identity and continue",
  },
  general: {
    eyebrow: "Step 2",
    title: "Set the general look",
    description:
      "Lock the complexion and broad visual base before you refine the face.",
    continueLabel: "Save general look",
  },
  face: {
    eyebrow: "Step 3",
    title: "Build the face",
    description:
      "Eye color, hair color, and hairstyle lock the strongest face anchors.",
    continueLabel: "Save face and continue",
  },
  body: {
    eyebrow: "Step 4",
    title: "Set the body shape",
    description:
      "Body type and proportions define how the image model frames the character.",
    continueLabel: "Save body details",
  },
  details: {
    eyebrow: "Step 5",
    title: "Choose the character details",
    description:
      "Personality, clothes, relationship, hobbies, and kinks shape the character without extra clutter.",
    continueLabel: "Save details and continue",
  },
  image: {
    eyebrow: "Step 6",
    title: "Generate the final image",
    description:
      "Review the final build, generate the avatar preview, and lock the character when it feels right.",
    continueLabel: "Open final image step",
  },
};

const REGION_VISUAL_CHOICES: VisualChoice[] = [
  { value: "Asian", title: "Asian", caption: "almond eyes, softer lines, East Asian read", gradient: "from-slate-200/25 via-pink-300/20 to-rose-500/20", imageSrc: "/create-character/origin/asian.jpg" },
  { value: "Black", title: "Black", caption: "dark skin depth, strong facial contrast", gradient: "from-amber-900/35 via-rose-700/20 to-zinc-900/20", imageSrc: "/create-character/origin/black.jpg%20%20.jpeg" },
  { value: "White", title: "White", caption: "lighter skin, European-coded features", gradient: "from-zinc-100/35 via-slate-200/20 to-white/10", imageSrc: "/create-character/origin/white.jpg" },
  { value: "Latina", title: "Latina", caption: "warmer complexion, Latin beauty read", gradient: "from-rose-500/60 via-orange-400/30 to-amber-200/20", imageSrc: "/create-character/origin/latina.jpg" },
  { value: "Arab", title: "Arab", caption: "deeper olive warmth, rich dark features", gradient: "from-amber-500/30 via-zinc-900/40 to-orange-500/20", imageSrc: "/create-character/origin/arab.jpg" },
  { value: "Indian", title: "Indian", caption: "South Asian beauty with warmer skin depth", gradient: "from-amber-400/35 via-fuchsia-500/20 to-rose-600/20", imageSrc: "/create-character/origin/indian.jpg" },
  { value: "Slavic", title: "Slavic", caption: "cool elegance, sharper European read", gradient: "from-blue-200/25 via-cyan-400/20 to-white/10", imageSrc: "/create-character/origin/slavic.jpg" },
];

const SKIN_TONE_CHOICES = [
  { value: "very fair", color: "#f3e6dc" },
  { value: "fair", color: "#e7c8b0" },
  { value: "light tan", color: "#cf9a73" },
  { value: "brown", color: "#8a5638" },
  { value: "deep brown", color: "#4a2a1d" },
] as const;

const EYE_COLOR_CHOICES: VisualChoice[] = [
  { value: "blue", title: "Blue", caption: "cool, bright, striking", gradient: "from-cyan-300/30 via-blue-500/20 to-black/20", imageSrc: "/create-character/eyes/blue.jpg" },
  { value: "green", title: "Green", caption: "rare, sharp, magnetic", gradient: "from-emerald-400/30 via-lime-300/20 to-black/15", imageSrc: "/create-character/eyes/green.jpg" },
  { value: "hazel", title: "Hazel", caption: "golden shift, lively chemistry", gradient: "from-amber-500/30 via-lime-300/15 to-black/15", imageSrc: "/create-character/eyes/hazel.jpg" },
  { value: "grey", title: "Grey", caption: "cool restraint, dangerous calm", gradient: "from-slate-300/35 via-zinc-500/20 to-black/15", imageSrc: "/create-character/eyes/grey.jpg" },
  { value: "brown", title: "Brown", caption: "warm, direct, familiar", gradient: "from-amber-700/40 via-stone-600/25 to-black/20", imageSrc: "/create-character/eyes/brown.jpg" },
];

const HAIR_COLOR_CHOICES: VisualChoice[] = [
  { value: "blonde", title: "Blonde", caption: "classic warm blonde", gradient: "from-amber-200/25 via-yellow-300/20 to-black/20", imageSrc: "/create-character/hair-colors/blonde.jpg" },
  { value: "light blonde", title: "Light blonde", caption: "paler bright blonde", gradient: "from-yellow-100/30 via-amber-200/20 to-black/20", imageSrc: "/create-character/hair-colors/light-blonde.jpg" },
  { value: "grey", title: "Grey", caption: "cool silver tone", gradient: "from-slate-200/25 via-zinc-400/20 to-black/20", imageSrc: "/create-character/hair-colors/grey.jpg" },
  { value: "black", title: "Black", caption: "deep dark contrast", gradient: "from-slate-900/30 via-zinc-700/20 to-black/30", imageSrc: "/create-character/hair-colors/black.jpg" },
  { value: "white", title: "White", caption: "bright white tone", gradient: "from-zinc-100/25 via-slate-200/20 to-black/20", imageSrc: "/create-character/hair-colors/white.jpg" },
  { value: "pink", title: "Pink", caption: "soft vivid pink", gradient: "from-pink-300/30 via-rose-400/20 to-black/20", imageSrc: "/create-character/hair-colors/pink.jpg" },
  { value: "purple", title: "Purple", caption: "deep purple color", gradient: "from-violet-400/30 via-fuchsia-500/20 to-black/20", imageSrc: "/create-character/hair-colors/purple.jpg" },
  { value: "green", title: "Green", caption: "bold green dye", gradient: "from-emerald-400/30 via-lime-400/20 to-black/20", imageSrc: "/create-character/hair-colors/green.jpg" },
  { value: "blue", title: "Blue", caption: "electric blue dye", gradient: "from-cyan-300/30 via-blue-500/20 to-black/20", imageSrc: "/create-character/hair-colors/blue.jpg" },
  { value: "lilac", title: "Lilac", caption: "soft pastel violet", gradient: "from-violet-200/30 via-fuchsia-300/20 to-black/20", imageSrc: "/create-character/hair-colors/lilac.jpg" },
  { value: "orange", title: "Orange", caption: "warm copper orange", gradient: "from-orange-300/30 via-amber-400/20 to-black/20", imageSrc: "/create-character/hair-colors/orange.jpg" },
  { value: "brown", title: "Brown", caption: "natural brunette tone", gradient: "from-amber-800/30 via-stone-600/20 to-black/20", imageSrc: "/create-character/hair-colors/brown.jpg" },
];

const HAIR_STYLE_CHOICES: VisualChoice[] = [
  { value: "braids", title: "Braids", caption: "woven and defined", gradient: "from-fuchsia-500/20 via-white/5 to-cyan-500/10", imageSrc: "/create-character/hair-styles/braids.jpg" },
  { value: "long", title: "Long", caption: "classic long hair", gradient: "from-cyan-500/20 via-white/5 to-fuchsia-500/10", imageSrc: "/create-character/hair-styles/long.jpg" },
  { value: "bangs", title: "Bangs", caption: "framed forehead cut", gradient: "from-slate-500/20 via-white/5 to-blue-500/10", imageSrc: "/create-character/hair-styles/bangs.jpg" },
  { value: "ponytail", title: "Ponytail", caption: "lifted and tied back", gradient: "from-cyan-400/15 via-slate-200/10 to-black/10", imageSrc: "/create-character/hair-styles/ponytail.jpg" },
  { value: "short", title: "Short", caption: "short crop or bob", gradient: "from-amber-500/15 via-rose-500/10 to-black/10", imageSrc: "/create-character/hair-styles/short.jpg" },
  { value: "bun", title: "Bun", caption: "gathered and tied up", gradient: "from-emerald-500/15 via-white/5 to-black/10", imageSrc: "/create-character/hair-styles/bun.jpg" },
  { value: "wavy", title: "Wavy", caption: "soft loose waves", gradient: "from-rose-500/15 via-white/5 to-black/10", imageSrc: "/create-character/hair-styles/wavy.jpg" },
  { value: "custom", title: "Custom", caption: "describe the hairstyle yourself", gradient: "from-white/10 via-slate-500/10 to-black/10", imageSrc: "/create-character/hair-styles/custom.jpg" },
];

const BODY_CHOICES = {
  bodyType: [
    { value: "slim", title: "Slim", caption: "lean and narrow frame", gradient: "from-cyan-500/20 via-white/5 to-slate-500/10", imageSrc: "/create-character/body/body-slim.jpg" },
    { value: "athletic", title: "Athletic", caption: "fit, toned, sporty", gradient: "from-emerald-500/20 via-cyan-400/10 to-black/10", imageSrc: "/create-character/body/body-athletic.jpg" },
    { value: "voluptuous", title: "Voluptuous", caption: "fuller and softer", gradient: "from-rose-500/20 via-amber-400/10 to-white/5", imageSrc: "/create-character/body/body-voluptuous.jpg" },
    { value: "curvy", title: "Curvy", caption: "heavier and rounder", gradient: "from-fuchsia-400/15 via-blue-500/10 to-white/5", imageSrc: "/create-character/body/body-curvy.jpg" },
    { value: "pregnant", title: "Pregnant", caption: "pregnant body shape", gradient: "from-amber-500/20 via-rose-300/10 to-white/5", imageSrc: "/create-character/body/body-pregnant.jpg" },
  ],
  breastSize: [
    { value: "flat", title: "Flat", caption: "very small chest", gradient: "from-slate-400/15 via-white/5 to-black/10" },
    { value: "small", title: "Small", caption: "small chest", gradient: "from-cyan-400/15 via-white/5 to-black/10" },
    { value: "medium", title: "Medium", caption: "balanced chest", gradient: "from-rose-500/15 via-white/5 to-black/10" },
    { value: "large", title: "Large", caption: "visibly large chest", gradient: "from-fuchsia-500/20 via-rose-400/10 to-black/10" },
    { value: "xl", title: "XL", caption: "very large chest", gradient: "from-red-500/20 via-fuchsia-400/10 to-black/10" },
  ],
  breastType: [
    { value: "regular", title: "Regular", caption: "natural regular shape", gradient: "from-slate-500/15 via-white/5 to-black/10" },
    { value: "perky", title: "Perky", caption: "lifted and firmer", gradient: "from-cyan-500/15 via-white/5 to-black/10" },
    { value: "saggy", title: "Saggy", caption: "lower hanging shape", gradient: "from-rose-500/15 via-white/5 to-black/10" },
    { value: "torpedo", title: "Torpedo", caption: "narrow forward shape", gradient: "from-fuchsia-500/20 via-rose-400/10 to-black/10" },
    { value: "fake", title: "Fake", caption: "augmented look", gradient: "from-amber-500/20 via-white/5 to-black/10" },
  ],
  buttSize: [
    { value: "small", title: "Small", caption: "small butt", gradient: "from-slate-500/15 via-white/5 to-black/10" },
    { value: "perky", title: "Perky", caption: "lifted round butt", gradient: "from-cyan-500/15 via-white/5 to-black/10" },
    { value: "athletic", title: "Athletic", caption: "firm athletic lower body", gradient: "from-emerald-500/20 via-white/5 to-black/10" },
    { value: "medium", title: "Medium", caption: "balanced size", gradient: "from-rose-500/15 via-white/5 to-black/10" },
    { value: "big", title: "Big", caption: "very full butt", gradient: "from-fuchsia-500/20 via-rose-400/10 to-black/10" },
  ],
};

const CLOTHES_CHOICES = [
  "Lingerie",
  "Lace set",
  "Silk robe",
  "Oversized shirt",
  "Bodysuit",
  "Mini dress",
  "Club dress",
  "Corset",
  "Leather set",
  "Latex set",
  "Fantasy set",
  "School uniform",
  "Office outfit",
  "Teacher outfit",
  "Boss suit",
  "Babydoll",
  "Stockings",
  "High heels",
  "Swimwear",
  "Bikini",
  "Crop top",
  "Crop top and skirt",
  "Jeans look",
  "Sleepwear",
  "Hoodie",
  "Gymwear",
  "Towel look",
  "Maid outfit",
] as const;

const RELATIONSHIP_CHOICES = [
  "Wife",
  "Stepmom",
  "Step Sister",
  "College Roommate",
  "Your Friend's Girlfriend",
  "First Date",
  "Neighbor",
  "Your Teacher",
  "Your Boss",
  "Crush",
  "Ex",
  "Babysitter",
  "College Bully",
  "Custom",
] as const;

const HOBBY_CHOICES = [
  { value: "baking", emoji: "🧁", caption: "sweet kitchen time" },
  { value: "football", emoji: "⚽", caption: "plays or watches" },
  { value: "dart", emoji: "🎯", caption: "precision game nights" },
  { value: "gaming", emoji: "🎮", caption: "late night gaming" },
  { value: "reading", emoji: "📚", caption: "books and quiet" },
  { value: "cooking", emoji: "🍳", caption: "loves cooking" },
  { value: "travel", emoji: "✈️", caption: "wants new places" },
  { value: "gym", emoji: "🏋️", caption: "fitness routine" },
  { value: "yoga", emoji: "🧘", caption: "soft movement" },
  { value: "dancing", emoji: "💃", caption: "club or studio" },
  { value: "singing", emoji: "🎤", caption: "likes to sing" },
  { value: "photography", emoji: "📸", caption: "camera hobby" },
  { value: "painting", emoji: "🎨", caption: "visual art" },
  { value: "fashion", emoji: "👠", caption: "style obsessed" },
  { value: "shopping", emoji: "🛍️", caption: "retail therapy" },
  { value: "anime", emoji: "🌸", caption: "likes anime" },
  { value: "movies", emoji: "🎬", caption: "film lover" },
  { value: "coffee", emoji: "☕", caption: "cafe person" },
  { value: "wine", emoji: "🍷", caption: "wine nights" },
  { value: "hiking", emoji: "🥾", caption: "nature walks" },
  { value: "swimming", emoji: "🏊", caption: "water time" },
  { value: "tennis", emoji: "🎾", caption: "court energy" },
  { value: "music", emoji: "🎵", caption: "always listening" },
  { value: "cars", emoji: "🚗", caption: "car obsessed" },
  { value: "pets", emoji: "🐾", caption: "animal lover" },
  { value: "gardening", emoji: "🪴", caption: "plants and care" },
  { value: "astrology", emoji: "✨", caption: "sign talk" },
  { value: "nightlife", emoji: "🌙", caption: "late night vibe" },
  { value: "beach", emoji: "🏖️", caption: "sun and ocean" },
  { value: "podcasts", emoji: "🎧", caption: "always listening" },
] as const;

const FETISH_CHOICES = [
  { value: "Vanilla", emoji: "🤍", caption: "soft and simple" },
  { value: "Roleplay", emoji: "🎭", caption: "acting out scenes" },
  { value: "Lingerie", emoji: "🎀", caption: "sexy underwear" },
  { value: "High Heels", emoji: "👠", caption: "heels and posture" },
  { value: "Stockings", emoji: "🧦", caption: "thigh-high appeal" },
  { value: "Uniform", emoji: "🧥", caption: "costume authority" },
  { value: "Leather", emoji: "🖤", caption: "dark material kink" },
  { value: "Latex", emoji: "✨", caption: "shiny tight look" },
  { value: "Corset", emoji: "🎗️", caption: "tight waist wear" },
  { value: "Feet", emoji: "🦶", caption: "foot focused" },
  { value: "Hair", emoji: "💇", caption: "hair play" },
  { value: "FemDom", emoji: "👑", caption: "female control" },
  { value: "Dom", emoji: "🪢", caption: "leading energy" },
  { value: "Sub", emoji: "🔗", caption: "submissive energy" },
  { value: "Collar", emoji: "📿", caption: "ownership symbol" },
  { value: "Blindfold", emoji: "🙈", caption: "blocked vision" },
  { value: "Gag", emoji: "🫦", caption: "mouth restraint" },
  { value: "Bondage", emoji: "🪢", caption: "restraint play" },
  { value: "Shibari", emoji: "🎀", caption: "rope art" },
  { value: "Spanking", emoji: "✋", caption: "impact on skin" },
  { value: "Impact Play", emoji: "⚡", caption: "striking play" },
  { value: "Sensory Play", emoji: "🫧", caption: "touch and tease" },
  { value: "Temperature Play", emoji: "🧊", caption: "hot and cold" },
  { value: "Wax Play", emoji: "🕯️", caption: "dripping wax" },
  { value: "Praise", emoji: "🌟", caption: "approval kink" },
  { value: "Degradation", emoji: "😈", caption: "humiliation play" },
  { value: "Tease and Denial", emoji: "⏳", caption: "almost but wait" },
  { value: "Edging", emoji: "📈", caption: "holding the peak" },
  { value: "Chastity", emoji: "🔒", caption: "locked control" },
  { value: "Service", emoji: "🧎", caption: "doing for partner" },
  { value: "Obedience", emoji: "✅", caption: "following commands" },
  { value: "Possession", emoji: "🫶", caption: "belonging feeling" },
  { value: "Submission", emoji: "⬇️", caption: "yielding control" },
  { value: "Romantic Control", emoji: "💞", caption: "soft dominance" },
  { value: "Polyamory", emoji: "💗", caption: "multiple lovers" },
  { value: "Compersion", emoji: "🫂", caption: "joy in sharing" },
  { value: "Tickling", emoji: "🤭", caption: "laughing touch" },
  { value: "Food Play", emoji: "🍓", caption: "food involvement" },
  { value: "Wet and Messy", emoji: "💦", caption: "messy texture" },
  { value: "Body Paint", emoji: "🎨", caption: "painting skin" },
  { value: "Masks", emoji: "🎭", caption: "hidden face" },
  { value: "Smoking", emoji: "🚬", caption: "smoke aesthetic" },
  { value: "Toy Play", emoji: "🧸", caption: "toy use" },
] as const;

const TRAIT_OPTIONS = [
  "Ambitious",
  "Calm",
  "Caring",
  "Charming",
  "Cold",
  "Confident",
  "Coy",
  "Cruel",
  "Curious",
  "Dedicated",
  "Disciplined",
  "Dominant",
  "Dreamy",
  "Easygoing",
  "Elegant",
  "Emotional",
  "Flirtatious",
  "Focused",
  "Funny",
  "Gentle",
  "Guarded",
  "Honest",
  "Impulsive",
  "Independent",
  "Intense",
  "Jealous",
  "Kind",
  "Loyal",
  "Mischievous",
  "Mysterious",
  "Nurturing",
  "Obsessive",
  "Open-hearted",
  "Patient",
  "Playful",
  "Possessive",
  "Protective",
  "Reserved",
  "Romantic",
  "Sarcastic",
  "Secure",
  "Selfish",
  "Serious",
  "Sharp",
  "Shy",
  "Soft-spoken",
  "Spontaneous",
  "Submissive",
  "Teasing",
  "Warm",
] as const;

const TRAIT_EMOJI: Record<(typeof TRAIT_OPTIONS)[number], string> = {
  Ambitious: "🏆",
  Calm: "🫧",
  Caring: "🤍",
  Charming: "✨",
  Cold: "❄️",
  Confident: "👠",
  Coy: "🙈",
  Cruel: "🗡️",
  Curious: "🔎",
  Dedicated: "🧭",
  Disciplined: "📏",
  Dominant: "👑",
  Dreamy: "🌙",
  Easygoing: "🌿",
  Elegant: "💎",
  Emotional: "💧",
  Flirtatious: "💋",
  Focused: "🎯",
  Funny: "😏",
  Gentle: "🕊️",
  Guarded: "🛡️",
  Honest: "🫱",
  Impulsive: "⚡",
  Independent: "🚬",
  Intense: "🔥",
  Jealous: "💚",
  Kind: "🌸",
  Loyal: "🤝",
  Mischievous: "😈",
  Mysterious: "🌒",
  Nurturing: "🫶",
  Obsessive: "🕯️",
  "Open-hearted": "💞",
  Patient: "⏳",
  Playful: "🎲",
  Possessive: "🔐",
  Protective: "🖤",
  Reserved: "🤐",
  Romantic: "🌹",
  Sarcastic: "😼",
  Secure: "🏡",
  Selfish: "🪞",
  Serious: "📓",
  Sharp: "⚔️",
  Shy: "🥺",
  "Soft-spoken": "🎐",
  Spontaneous: "🎇",
  Submissive: "🫦",
  Teasing: "😉",
  Warm: "☀️",
};

const TRAIT_CONFLICTS: Record<string, string[]> = {
  Ambitious: ["Easygoing"],
  Calm: ["Impulsive"],
  Caring: ["Selfish"],
  Cold: ["Warm", "Kind"],
  Confident: ["Shy"],
  Coy: ["Direct"],
  Cruel: ["Gentle", "Kind", "Caring"],
  Dedicated: ["Spontaneous"],
  Disciplined: ["Impulsive", "Spontaneous"],
  Dominant: ["Submissive"],
  Dreamy: ["Focused"],
  Easygoing: ["Ambitious", "Intense"],
  Emotional: ["Reserved"],
  Flirtatious: ["Reserved"],
  Focused: ["Dreamy", "Impulsive"],
  Gentle: ["Cruel", "Sharp"],
  Guarded: ["Open-hearted"],
  Honest: ["Mischievous"],
  Impulsive: ["Calm", "Disciplined", "Focused", "Patient"],
  Independent: ["Obsessive"],
  Intense: ["Easygoing", "Patient"],
  Jealous: ["Secure"],
  Kind: ["Cruel", "Cold", "Selfish"],
  Loyal: ["Selfish"],
  Mischievous: ["Honest", "Serious"],
  Nurturing: ["Selfish"],
  Obsessive: ["Independent", "Secure"],
  "Open-hearted": ["Guarded", "Reserved"],
  Patient: ["Impulsive", "Intense"],
  Playful: ["Serious"],
  Possessive: ["Secure"],
  Protective: ["Selfish"],
  Reserved: ["Flirtatious", "Open-hearted", "Emotional"],
  Romantic: ["Cold"],
  Sarcastic: ["Gentle"],
  Secure: ["Jealous", "Possessive", "Obsessive"],
  Selfish: ["Caring", "Kind", "Loyal", "Nurturing", "Protective"],
  Serious: ["Playful", "Mischievous"],
  Sharp: ["Gentle", "Soft-spoken"],
  Shy: ["Confident"],
  "Soft-spoken": ["Sharp"],
  Spontaneous: ["Dedicated", "Disciplined"],
  Submissive: ["Dominant"],
  Warm: ["Cold"],
};

function VisualHeroCard({
  title,
  subtitle,
  active,
  soon = false,
  gradient,
  onClick,
  imageSrc,
}: {
  title: string;
  subtitle: string;
  active?: boolean;
  soon?: boolean;
  gradient: string;
  onClick?: () => void;
  imageSrc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group relative min-h-[360px] overflow-hidden rounded-[34px] border p-8 text-left transition duration-300 lg:min-h-[520px]",
        active
          ? "border-white/30 shadow-[0_30px_100px_rgba(244,114,182,0.18)]"
          : "border-white/10 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
        !onClick && "cursor-default",
      )}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={title}
          fill
          unoptimized
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-center"
        />
      ) : null}
      <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_30%),linear-gradient(180deg,transparent,rgba(0,0,0,0.7))]" />
      <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.2),transparent_65%)]" />
      <div className="absolute right-6 top-6 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/80">
        {soon ? "Soon" : "Open"}
      </div>
      <div className="relative flex h-full flex-col justify-end">
        <div className="text-xs uppercase tracking-[0.24em] text-white/70">
          Character path
        </div>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">
          {title}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-7 text-white/75 md:text-base">
          {subtitle}
        </p>
      </div>
    </button>
  );
}

function VisualChoiceCard({
  option,
  active,
  onClick,
}: {
  option: VisualChoice;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative min-h-[180px] overflow-hidden rounded-[28px] border p-5 text-left transition duration-300",
        active
          ? "border-fuchsia-400/35 shadow-[0_24px_70px_rgba(217,70,239,0.14)]"
          : "border-white/10 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_60px_rgba(0,0,0,0.24)]",
      )}
    >
      {option.imageSrc ? (
        <Image
          src={option.imageSrc}
          alt={option.title}
          fill
          unoptimized
          sizes="(max-width: 1280px) 50vw, 33vw"
          className="object-cover object-center"
        />
      ) : null}
      <div className={cn("absolute inset-0 bg-gradient-to-br", option.gradient)} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_35%,rgba(0,0,0,0.55))]" />
      <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_26%)]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex justify-end">
          <div
            className={cn(
              "rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
              active
                ? "border border-fuchsia-300/30 bg-fuchsia-400/15 text-fuchsia-100"
                : "border border-white/15 bg-black/20 text-white/65",
            )}
          >
            {active ? "Selected" : "Pick"}
          </div>
        </div>
        <div>
          <div className="text-xl font-semibold text-white">{option.title}</div>
          <div className="mt-2 text-sm leading-6 text-white/75">{option.caption}</div>
        </div>
      </div>
    </button>
  );
}

function getSelectionToneClasses(tone: SelectionTone) {
  switch (tone) {
    case "cyan":
      return {
        active:
          "border-cyan-400/30 bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(255,255,255,0.04))] text-cyan-50 shadow-[0_24px_80px_rgba(34,211,238,0.10)]",
        badge: "border-cyan-300/25 bg-cyan-400/15 text-cyan-100",
        accent: "bg-cyan-300",
        softText: "text-cyan-100/80",
      };
    case "amber":
      return {
        active:
          "border-amber-400/30 bg-[linear-gradient(180deg,rgba(251,191,36,0.14),rgba(255,255,255,0.04))] text-amber-50 shadow-[0_24px_80px_rgba(251,191,36,0.10)]",
        badge: "border-amber-300/25 bg-amber-400/15 text-amber-100",
        accent: "bg-amber-300",
        softText: "text-amber-100/80",
      };
    case "rose":
      return {
        active:
          "border-rose-400/30 bg-[linear-gradient(180deg,rgba(251,113,133,0.14),rgba(255,255,255,0.04))] text-rose-50 shadow-[0_24px_80px_rgba(251,113,133,0.10)]",
        badge: "border-rose-300/25 bg-rose-400/15 text-rose-100",
        accent: "bg-rose-300",
        softText: "text-rose-100/80",
      };
    case "slate":
      return {
        active:
          "border-slate-300/20 bg-[linear-gradient(180deg,rgba(148,163,184,0.16),rgba(255,255,255,0.04))] text-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.22)]",
        badge: "border-slate-300/20 bg-slate-400/10 text-slate-100",
        accent: "bg-slate-300",
        softText: "text-slate-100/80",
      };
    case "fuchsia":
    default:
      return {
        active:
          "border-fuchsia-400/30 bg-[linear-gradient(180deg,rgba(217,70,239,0.14),rgba(255,255,255,0.04))] text-fuchsia-50 shadow-[0_24px_80px_rgba(217,70,239,0.10)]",
        badge: "border-fuchsia-300/25 bg-fuchsia-400/15 text-fuchsia-100",
        accent: "bg-fuchsia-300",
        softText: "text-fuchsia-100/80",
      };
  }
}

function DetailDeckCard({
  label,
  eyebrow,
  description,
  summary,
  countLabel,
  active,
  tone,
  onClick,
}: {
  label: string;
  eyebrow: string;
  description: string;
  summary: string;
  countLabel: string;
  active: boolean;
  tone: SelectionTone;
  onClick: () => void;
}) {
  const toneClasses = getSelectionToneClasses(tone);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-[26px] border p-5 text-left transition duration-300",
        active
          ? toneClasses.active
          : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-white/85 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-[0_20px_80px_rgba(0,0,0,0.22)]",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_26%)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/48">
              {eyebrow}
            </div>
            <div className="mt-3 text-lg font-semibold text-white">{label}</div>
          </div>
          <div
            className={cn(
              "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
              active
                ? toneClasses.badge
                : "border-white/10 bg-black/20 text-white/60",
            )}
          >
            {countLabel}
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/62">{description}</p>
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/42">
            Current direction
          </div>
          <div className="mt-2 text-sm leading-6 text-white/82">{summary}</div>
        </div>
      </div>
    </button>
  );
}

function SelectionPill({
  label,
  tone = "fuchsia",
}: {
  label: string;
  tone?: SelectionTone;
}) {
  const toneClasses = getSelectionToneClasses(tone);

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs",
        toneClasses.badge,
      )}
    >
      {label}
    </span>
  );
}

function PremiumSelectionTile({
  title,
  subtitle,
  emoji,
  tone,
  active,
  metaLabel,
  disabled = false,
  onClick,
}: {
  title: string;
  subtitle: string;
  emoji?: string;
  tone: SelectionTone;
  active: boolean;
  metaLabel: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClasses = getSelectionToneClasses(tone);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border p-4 text-left transition duration-300",
        active
          ? toneClasses.active
          : disabled
            ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/25"
            : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] text-white/82 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-[0_20px_80px_rgba(0,0,0,0.22)]",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%)]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="text-base font-semibold text-white">
            {emoji ? `${emoji} ` : ""}
            {title}
          </div>
          <div
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
              active
                ? toneClasses.badge
                : "border-white/10 bg-black/20 text-white/55",
            )}
          >
            {metaLabel}
          </div>
        </div>
        <div className="mt-3 text-xs leading-6 text-white/58">{subtitle}</div>
      </div>
    </button>
  );
}

function RoleplaySummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value?: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value || "Not set yet"}</div>
      <div className="mt-2 text-xs leading-6 text-white/55">{helper}</div>
    </div>
  );
}

export default function CreateCharacterPage() {
  const router = useRouter();
  const [form, setForm] = useState<StudioFormState>(defaultStudioForm());
  const [creatorEntry, setCreatorEntry] = useState<CreatorEntry>(null);
  const [creationTrack, setCreationTrack] = useState<CreationTrack>(null);
  const [visualWizardStep, setVisualWizardStep] =
    useState<VisualWizardStep>("entry");
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("personality");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [lastName, setLastName] = useState("");
  const [promptIdea, setPromptIdea] = useState("");
  const [pendingCharacterCreation, setPendingCharacterCreation] = useState(false);
  const [createdCharacter, setCreatedCharacter] =
    useState<DbCustomCharacter | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [dynamism, setDynamism] = useState(68);
  const [activeStep, setActiveStep] = useState<StudioStep>("identity");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [legacyRebuildNotice, setLegacyRebuildNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [hydratedRebuildId, setHydratedRebuildId] = useState<string | null>(null);
  const [rebuildRequest] = useState(() => {
    if (typeof window === "undefined") {
      return {
        id: "",
        source: "",
      };
    }

    const params = new URLSearchParams(window.location.search);
    return {
      id: params.get("rebuild")?.trim() ?? "",
      source: params.get("source")?.trim() ?? "",
    };
  });
  const rebuildId = rebuildRequest.id;
  const rebuildSource = rebuildRequest.source;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (detailModalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [detailModalOpen]);

  const isQuickMode = form.mode === "quick";
  const structuredValues = useMemo(
    () => readStructuredNotes(form.customNotes),
    [form.customNotes],
  );
  const regionNote = structuredValues["Region note"];
  const visualNote = structuredValues["Visual aura"];
  const interestNote = structuredValues["Interest anchors"];
  const responseDirective = structuredValues["Response directive"];
  const keyMemories = structuredValues["Key memories"];
  const exampleMessage = structuredValues["Example message"];
  const userRole = structuredValues["User role"];
  const nickname = structuredValues["Nickname for user"];
  const boundaries = structuredValues["Boundaries"];
  const relationshipDynamic = structuredValues["Relationship dynamic"];
  const sceneType = structuredValues["Scene type"];
  const behaviorMode = structuredValues["Behavior mode"];
  const arcStage = structuredValues["Arc stage"];
  const replyObjective = structuredValues["Reply objective"];
  const sceneFocus = structuredValues["Scene focus"];
  const attentionHook = structuredValues["Attention hook"];
  const sensoryPalette = structuredValues["Sensory palette"];
  const greetingStyle = structuredValues["Greeting style"];
  const chatMode = structuredValues["Chat mode"];
  const avatarStyle = structuredValues["Avatar style"];
  const origin = structuredValues.Origin || form.region;
  const skinTone = structuredValues["Skin tone"];
  const eyeColor = structuredValues["Eye color"] || structuredValues.Eyes;
  const hair = structuredValues.Hair;
  const hairColor = structuredValues["Hair color"];
  const hairStyle = structuredValues["Hair style"];
  const customHairStyle = structuredValues["Custom hairstyle"];
  const hairTexture = structuredValues["Hair texture"];
  const eyes = structuredValues.Eyes;
  const eyeShape = structuredValues["Eye shape"];
  const makeupStyle = structuredValues["Makeup style"];
  const accessoryVibe = structuredValues["Accessory vibe"];
  const outfit = structuredValues.Outfit;
  const palette = structuredValues.Palette;
  const bodyType = structuredValues["Body type"];
  const bustSize = structuredValues["Bust size"];
  const breastType = structuredValues["Breast type"];
  const hipsType = structuredValues["Hip shape"];
  const buttSize = structuredValues["Butt size"];
  const waistDefinition = structuredValues["Waist definition"];
  const heightImpression = structuredValues["Height impression"];
  const exposureLevel = structuredValues["Exposure level"];
  const camera = structuredValues.Camera;
  const lightingMood = structuredValues["Lighting mood"];
  const photoPack = structuredValues["Photo pack"];
  const signatureDetail = structuredValues["Signature detail"];
  const imagePrompt = structuredValues["Image prompt"];
  const relationshipStage = structuredValues["Relationship stage"];
  const jealousy = structuredValues.Jealousy;
  const attachment = structuredValues.Attachment;
  const protectiveness = structuredValues.Protectiveness;
  const conversationInitiative = structuredValues["Conversation initiative"];
  const affectionStyle = structuredValues["Affection style"];
  const conflictStyle = structuredValues["Conflict style"];
  const emotionalAvailability = structuredValues["Emotional availability"];
  const messageFormat = structuredValues["Message format"];
  const linguisticFlavor = structuredValues["Linguistic flavor"];
  const chemistryTemplate = structuredValues["Chemistry template"];
  const currentEnergy = structuredValues["Current energy"];
  const publicTagline = structuredValues["Public tagline"];
  const publicTeaser = structuredValues["Public teaser"];
  const publicTags = structuredValues["Public tags"];
  const traitStack = structuredValues["Trait stack"];
  const hobbies = structuredValues.Hobbies;
  const fetishes = structuredValues.Fetishes;
  const extraPersonalityDetails = structuredValues["Extra personality details"];
  const extraPhysicalDetails = structuredValues["Extra physical details"];

  const bodyNotes = useMemo(() => {
    let result = form.customNotes;
    STRUCTURED_NOTE_KEYS.forEach((prefix) => {
      result = removeStructuredLine(result, prefix);
    });
    return result.trim();
  }, [form.customNotes]);

  const parsedAge = Number(form.age);
  const ageValue = Number.isFinite(parsedAge)
    ? Math.min(70, Math.max(18, parsedAge))
    : 25;

  const isKnownRegion = REGION_OPTIONS.includes(
    form.region as (typeof REGION_OPTIONS)[number],
  );
  const selectedRegion = isKnownRegion ? form.region : "";
  const customRegion = isKnownRegion ? "" : form.region;

  const selectedInterests = useMemo(() => parseCsv(interestNote), [interestNote]);
  const selectedBoundaries = useMemo(() => parsePipe(boundaries), [boundaries]);
  const selectedTraits = useMemo(() => parseCsv(traitStack), [traitStack]);
  const selectedHobbies = useMemo(() => parseCsv(hobbies), [hobbies]);
  const selectedFetishes = useMemo(() => parseCsv(fetishes), [fetishes]);
  const relationshipPresetChoices = useMemo<string[]>(
    () => RELATIONSHIP_CHOICES.filter((item) => item !== "Custom"),
    [],
  );
  const hasCustomRelationship =
    Boolean(form.relationshipToUser.trim()) &&
    !relationshipPresetChoices.includes(form.relationshipToUser);
  const detailTabCards = [
    {
      id: "personality" as const,
      label: "Personality",
      eyebrow: "Core tone",
      description: "Pick the emotional and social signal this character carries into every reply.",
      summary:
        selectedTraits.slice(0, 3).join(" • ") ||
        "No traits locked yet.",
      countLabel: selectedTraits.length
        ? `${selectedTraits.length} traits`
        : "Open",
      tone: "fuchsia" as const,
    },
    {
      id: "voice" as const,
      label: "Voice (Soon)",
      eyebrow: "Delivery",
      description: "Reserved for future voice and cadence tuning.",
      summary: "This card is visible now so the structure stays ready.",
      countLabel: "Soon",
      tone: "slate" as const,
    },
    {
      id: "clothes" as const,
      label: "Clothes",
      eyebrow: "Look",
      description: "Choose one clear outfit direction instead of building a long wardrobe spec.",
      summary: outfit || "No outfit selected yet.",
      countLabel: outfit ? "Locked" : "Pick one",
      tone: "rose" as const,
    },
    {
      id: "relationship" as const,
      label: "Scenario/Relationship",
      eyebrow: "Setup",
      description: "Define the connection that frames the first scene and early chemistry.",
      summary:
        form.relationshipToUser.trim() || "No relationship selected yet.",
      countLabel: form.relationshipToUser.trim() ? "Locked" : "Pick one",
      tone: "amber" as const,
    },
    {
      id: "hobby" as const,
      label: "Hobby",
      eyebrow: "Lifestyle",
      description: "Add a few leisure anchors so the character feels lived-in.",
      summary:
        selectedHobbies.slice(0, 3).join(" • ") ||
        "No hobbies selected yet.",
      countLabel: selectedHobbies.length
        ? `${selectedHobbies.length} picked`
        : "Optional",
      tone: "cyan" as const,
    },
    {
      id: "fetishes" as const,
      label: "Fetishes",
      eyebrow: "Adult tone",
      description: "Set intimacy preferences with a few direct presets instead of long notes.",
      summary:
        selectedFetishes.slice(0, 3).join(" • ") ||
        "No adult preferences selected yet.",
      countLabel: selectedFetishes.length
        ? `${selectedFetishes.length} picked`
        : "Optional",
      tone: "fuchsia" as const,
    },
  ];
  const monetization = useMemo(() => {
    if (!profileSummary) return null;

    return buildMonetizationSnapshot({
      user: profileSummary.user,
      usage: {
        characterCount: profileSummary.characterCount,
        conversationCount: profileSummary.conversationCount,
        publicCharacterCount: profileSummary.publicCharacterCount,
        rerollsThisMonth: profileSummary.rerollsThisMonth,
        messagesThisMonth: profileSummary.messagesThisMonth,
      },
    });
  }, [profileSummary]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileSummary() {
      try {
        const nextSummary = await getProfileSummary();
        if (!cancelled) {
          setProfileSummary(nextSummary);
        }
      } catch {
        if (!cancelled) {
          setProfileSummary(null);
        }
      }
    }

    loadProfileSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  const readinessScore = useMemo(
    () =>
      calculateReadinessScore(
        form,
        {
          regionNote,
          visualNote,
          interestNote,
          responseDirective,
          keyMemories,
          exampleMessage,
          userRole,
          nickname,
          boundaries,
          relationshipDynamic,
          sceneType,
          behaviorMode,
          arcStage,
          replyObjective,
          sceneFocus,
          attentionHook,
          sensoryPalette,
          greetingStyle,
          chatMode,
          avatarStyle,
          skinTone,
          hair,
          hairTexture,
          eyes,
          eyeShape,
          makeupStyle,
          accessoryVibe,
          outfit,
          palette,
          bodyType,
          bustSize,
          hipsType,
          waistDefinition,
          heightImpression,
          exposureLevel,
          camera,
          lightingMood,
          photoPack,
          signatureDetail,
          imagePrompt,
          relationshipStage,
          jealousy,
          attachment,
          protectiveness,
          conversationInitiative,
          affectionStyle,
          conflictStyle,
          emotionalAvailability,
          messageFormat,
          linguisticFlavor,
          chemistryTemplate,
          currentEnergy,
          publicTagline,
          publicTeaser,
          publicTags,
        },
        isQuickMode,
      ),
    [
      form,
      regionNote,
      visualNote,
      interestNote,
      responseDirective,
      keyMemories,
      exampleMessage,
      userRole,
      nickname,
      boundaries,
      relationshipDynamic,
      sceneType,
      behaviorMode,
      arcStage,
      replyObjective,
      sceneFocus,
      attentionHook,
      sensoryPalette,
      greetingStyle,
      chatMode,
      avatarStyle,
      skinTone,
      hair,
      hairTexture,
      eyes,
      eyeShape,
      makeupStyle,
      accessoryVibe,
      outfit,
      palette,
      bodyType,
      bustSize,
      hipsType,
      waistDefinition,
      heightImpression,
      exposureLevel,
      camera,
      lightingMood,
      photoPack,
      signatureDetail,
      imagePrompt,
      relationshipStage,
      jealousy,
      attachment,
      protectiveness,
      conversationInitiative,
      affectionStyle,
      conflictStyle,
      emotionalAvailability,
      messageFormat,
      linguisticFlavor,
      chemistryTemplate,
      currentEnergy,
      publicTagline,
      publicTeaser,
      publicTags,
      isQuickMode,
    ],
  );

  const builderV2Summary = useMemo(() => {
    return buildStudioBuilderSummary({
      mode: form.mode,
      name: form.name,
      age: form.age,
      region: form.region,
      archetype: form.archetype,
      genderPresentation: form.genderPresentation,
      visibility: form.visibility,
      coreVibes: form.coreVibes,
      warmth: form.warmth,
      assertiveness: form.assertiveness,
      mystery: form.mystery,
      playfulness: form.playfulness,
      replyLength: form.replyLength,
      speechStyle: form.speechStyle,
      relationshipPace: form.relationshipPace,
      tone: form.tone,
      setting: form.setting,
      relationshipToUser: form.relationshipToUser,
      sceneGoal: form.sceneGoal,
      openingState: form.openingState,
      customScenario: form.customScenario,
      customNotes: form.customNotes,
    });
  }, [
    form.mode,
    form.name,
    form.age,
    form.region,
    form.archetype,
    form.genderPresentation,
    form.visibility,
    form.coreVibes,
    form.warmth,
    form.assertiveness,
    form.mystery,
    form.playfulness,
    form.replyLength,
    form.speechStyle,
    form.relationshipPace,
    form.tone,
    form.setting,
    form.relationshipToUser,
    form.sceneGoal,
    form.openingState,
    form.customScenario,
    form.customNotes,
  ]);

  function rebuildCustomNotes(
    next: Partial<Record<StructuredNoteKey, string>>,
    nextBodyNotes?: string,
  ) {
    const currentValues: StructuredNoteMap = {
      ...structuredValues,
      Dynamism: String(dynamism),
      ...next,
    };

    setField(
      "customNotes",
      composeStructuredNotes(
        currentValues,
        typeof nextBodyNotes === "string" ? nextBodyNotes : bodyNotes,
      ),
    );
  }

  const mergedCustomNotes = useMemo(
    () =>
      composeStructuredNotes(
        {
          ...structuredValues,
          Dynamism: String(dynamism),
        },
        bodyNotes,
      ),
    [bodyNotes, dynamism, structuredValues],
  );

  const draft = useMemo<CharacterDraftInput>(() => {
    const baseDraft = buildCharacterDraftFromStudio({
      ...form,
      customNotes: mergedCustomNotes,
    });

    return enrichDraftForBuilderV2Compat(baseDraft, {
      form: {
        mode: form.mode,
        name: form.name,
        age: form.age,
        region: form.region,
        archetype: form.archetype,
        genderPresentation: form.genderPresentation,
        visibility: form.visibility,
        coreVibes: form.coreVibes,
        warmth: form.warmth,
        assertiveness: form.assertiveness,
        mystery: form.mystery,
        playfulness: form.playfulness,
        tone: form.tone,
        setting: form.setting,
        relationshipToUser: form.relationshipToUser,
        sceneGoal: form.sceneGoal,
        customNotes: mergedCustomNotes,
      },
    });
  }, [form, mergedCustomNotes]);

  const dynamicSummary = [
    `warmth ${meterTone(form.warmth)}`,
    `assertiveness ${meterTone(form.assertiveness)}`,
    `mystery ${meterTone(form.mystery)}`,
    `playfulness ${meterTone(form.playfulness)}`,
  ].join(" • ");

  const visualSummary = [
    origin,
    skinTone,
    eyeColor,
    hairColor,
    hairStyle === "custom" ? customHairStyle : hairStyle,
    bodyType,
    bustSize,
    breastType,
    buttSize,
    outfit,
    form.relationshipToUser,
  ]
    .filter(Boolean)
    .join(" • ");
  const visualTags = [
    origin,
    skinTone,
    eyeColor,
    hairColor,
    hairStyle === "custom" ? customHairStyle : hairStyle,
    bodyType,
    bustSize,
    breastType,
    buttSize,
    outfit,
    ...selectedTraits,
    ...selectedHobbies,
  ].filter(Boolean);
  const publicTagsList = parseCsv(publicTags);

  const memoryAnchorPreview = [
    form.region ? `region: ${form.region}` : "",
    relationshipStage ? `stage: ${relationshipStage}` : "",
    relationshipDynamic ? `dynamic: ${relationshipDynamic}` : "",
    sceneType ? `scene type: ${sceneType}` : "",
    behaviorMode ? `behavior: ${behaviorMode}` : "",
    arcStage ? `arc: ${arcStage}` : "",
    form.relationshipToUser ? `relationship: ${form.relationshipToUser}` : "",
    replyObjective ? `objective: ${replyObjective}` : "",
    attentionHook ? `hook: ${attentionHook}` : "",
    form.setting ? `setting: ${form.setting}` : "",
    visualNote ? `aura: ${visualNote}` : "",
    selectedInterests.length ? `interests: ${selectedInterests.join(", ")}` : "",
    keyMemories ? `memories: ${keyMemories}` : "",
    userRole ? `user role: ${userRole}` : "",
  ].filter(Boolean);

  const selectionCompiler = useMemo(
    () =>
      buildSelectionCompilerOutputFromStudioSource({
        name: form.name,
        age: form.age,
        region: form.region,
        archetype: form.archetype,
        genderPresentation: form.genderPresentation,
        coreVibes: form.coreVibes,
        warmth: form.warmth,
        assertiveness: form.assertiveness,
        mystery: form.mystery,
        playfulness: form.playfulness,
        replyLength: form.replyLength,
        speechStyle: form.speechStyle,
        relationshipPace: form.relationshipPace,
        setting: form.setting,
        relationshipToUser: form.relationshipToUser,
        sceneGoal: form.sceneGoal,
        tone: form.tone,
        openingState: form.openingState,
        customScenario: form.customScenario,
        customNotes: mergedCustomNotes,
      }),
    [
      form.age,
      form.archetype,
      form.assertiveness,
      form.coreVibes,
      form.customScenario,
      form.genderPresentation,
      form.mystery,
      form.name,
      form.openingState,
      form.playfulness,
      form.region,
      form.relationshipPace,
      form.relationshipToUser,
      form.replyLength,
      form.sceneGoal,
      form.setting,
      form.speechStyle,
      form.tone,
      form.warmth,
      mergedCustomNotes,
    ],
  );

  const openingPack = useMemo(
    () =>
      buildOpeningPack({
        name: form.name,
        setting: form.setting,
        relationshipToUser: form.relationshipToUser,
        sceneGoal: form.sceneGoal,
        tone: form.tone,
        openingState: form.openingState,
        customScenario: form.customScenario,
        greetingStyle,
        nickname,
        userRole,
        relationshipDynamic,
        sceneType,
        behaviorMode,
        arcStage,
        replyObjective,
        currentEnergy,
        attentionHook,
        sensoryPalette,
        chemistryTemplate,
        visualAura: visualNote,
        eyes,
        hair,
        signatureDetail,
        initiativePattern: selectionCompiler.openingSignals.initiativePattern,
        conflictBehavior: selectionCompiler.openingSignals.conflictBehavior,
        affectionStyle: selectionCompiler.openingSignals.affectionStyle,
        paceOfWarmth: selectionCompiler.openingSignals.paceOfWarmth,
      }),
    [
      attentionHook,
      chemistryTemplate,
      currentEnergy,
      eyes,
      form.customScenario,
      form.name,
      form.openingState,
      form.relationshipToUser,
      form.sceneGoal,
      form.setting,
      form.tone,
      greetingStyle,
      hair,
      nickname,
      replyObjective,
      selectionCompiler.openingSignals.affectionStyle,
      selectionCompiler.openingSignals.conflictBehavior,
      selectionCompiler.openingSignals.initiativePattern,
      selectionCompiler.openingSignals.paceOfWarmth,
      relationshipDynamic,
      signatureDetail,
      sceneType,
      behaviorMode,
      arcStage,
      sensoryPalette,
      userRole,
      visualNote,
    ],
  );

  const firstReplySoft = useMemo(() => {
    const name = form.name || "This character";
    const nick = nickname || "you";
    const tone = form.tone || "soft and attentive";
    return `${name} lets the moment settle before speaking, voice colored by ${tone}. “You don’t have to say everything at once, ${nick}. I’m already here.”`;
  }, [form.name, nickname, form.tone]);

  const firstReplyFlirty = useMemo(() => {
    const name = form.name || "This character";
    const nick = nickname || "you";
    const setting = form.setting || "this moment";
    return `${name} studies ${nick} with a small, dangerous smile. “You always make ${setting} feel a little less innocent than it should.”`;
  }, [form.name, nickname, form.setting]);

  const firstReplyCold = useMemo(() => {
    const name = form.name || "This character";
    const nick = nickname || "you";
    return `${name} keeps their composure perfectly intact, but the attention on ${nick} is unmistakable. “If you’re going to stay, try not to waste my patience.”`;
  }, [form.name, nickname]);

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!form.name.trim()) issues.push("Character name is missing");
    if (!form.age.trim()) issues.push("Age is missing");
    if (!form.region.trim()) issues.push("Region is missing");
    if (form.coreVibes.length < 2) issues.push("Pick at least 2 core vibes");
    if (!form.setting.trim()) issues.push("Setting is missing");
    if (!form.relationshipToUser.trim())
      issues.push("Relationship to user is missing");
    if (!form.sceneGoal.trim()) issues.push("Scene goal is missing");
    return issues;
  }, [form]);

  const visibleSteps = useMemo(() => {
    if (isQuickMode) {
      return ALL_STEPS.filter((step) =>
        ["identity", "personality", "scenario", "publish"].includes(step.id),
      );
    }
    return ALL_STEPS;
  }, [isQuickMode]);

  const activeStepIndex = visibleSteps.findIndex((step) => step.id === activeStep);
  const previousStep =
    activeStepIndex > 0 ? visibleSteps[activeStepIndex - 1] : null;
  const nextStep =
    activeStepIndex >= 0 && activeStepIndex < visibleSteps.length - 1
      ? visibleSteps[activeStepIndex + 1]
      : null;

  const avatarSafetyInput = useMemo<CharacterImageSafetyInput>(
    () => ({
      isAdultOnly: true,
      subjectDeclared18Plus: true,
      consentConfirmed: true,
      depictsRealPerson: false,
      depictsPublicFigure: false,
      depictsFranchiseCharacter: false,
      depictsProtectedStyleRequest: false,
      lookalikeRiskFlag: false,
      namedCharacterReferenceFlag: false,
      blockedRequestReason: null,
      nonConsensualFlag: false,
      underageRiskFlag: false,
      illegalContentFlag: false,
    }),
    [],
  );

  const {
    avatarGenerating,
    avatarJobStatus,
    avatarProvider,
    avatarQueuedExternalJobId,
    avatarResultMessage,
    clearAvatarPreview,
    generatedAvatarUrl,
    handleGenerateAvatar,
    lastAvatarPromptInput,
  } = useAvatarGeneration({
    form,
    safety: avatarSafetyInput,
    setBanner,
    setActiveStep,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadLegacyRebuild() {
      if (!rebuildId) return;
      if (rebuildSource && rebuildSource !== "legacy") return;
      if (hydratedRebuildId === rebuildId) return;

      try {
        const response = await fetch(
          `/api/characters/rebuild-source?id=${encodeURIComponent(rebuildId)}`,
          {
            credentials: "same-origin",
          },
        );
        const data = (await response.json().catch(() => null)) as
          | ({ ok: true } & LegacyRebuildSourcePayload)
          | { ok?: false; error?: string }
          | null;

        if (!response.ok || !data || data.ok !== true) {
          const errorMessage =
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Could not load the legacy rebuild.";
          throw new Error(errorMessage);
        }

        if (cancelled) return;

        const nameParts = data.form.name.trim().split(/\s+/).filter(Boolean);
        const rebuiltNotes = readStructuredNotes(data.form.customNotes);
        const nextDynamism = Number(rebuiltNotes.Dynamism);

        setForm(data.form);
        setDynamism(Number.isFinite(nextDynamism) ? nextDynamism : 68);
        setCreatorEntry("women");
        setCreationTrack("ready");
        setVisualWizardStep("review");
        setActiveStep("identity");
        setSelectedTemplateId("");
        setCreatedCharacter(null);
        setResultImageUrl(null);
        setPromptIdea("");
        setLastName(nameParts.slice(1).join(" "));
        clearAvatarPreview();
        setLegacyRebuildNotice({
          title: data.noticeTitle,
          message: data.noticeMessage,
        });
        setHydratedRebuildId(rebuildId);
        setBanner(null);
        router.replace("/create-character", { scroll: false });
      } catch (error) {
        if (cancelled) return;

        setBanner({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not load the legacy rebuild.",
        });
      }
    }

    void loadLegacyRebuild();

    return () => {
      cancelled = true;
    };
  }, [
    clearAvatarPreview,
    hydratedRebuildId,
    rebuildId,
    rebuildSource,
    router,
  ]);

  function setField<K extends keyof StudioFormState>(
    key: K,
    value: StudioFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setAgeFromSlider(value: number) {
    setField("age", String(value));
  }

  function resetStudio() {
    setForm(defaultStudioForm());
    setBanner(null);
    setLegacyRebuildNotice(null);
    setDynamism(68);
    setActiveStep("identity");
    setSelectedTemplateId("");
    clearAvatarPreview();
  }

  function applyCharacterTemplate(template: CharacterTemplate) {
    setSelectedTemplateId(template.id);
    clearAvatarPreview();

    setForm((current) => ({
      ...current,
      mode: template.mode,
      region: template.values.region,
      age: String(template.values.age),
      archetype: template.values.archetype,
      coreVibes: [...template.values.coreVibes],
      warmth: template.values.warmth,
      assertiveness: template.values.assertiveness,
      mystery: template.values.mystery,
      playfulness: template.values.playfulness,
      speechStyle: template.values.speechStyle,
      replyLength: template.values.replyLength,
      relationshipPace: template.values.relationshipPace,
      tone: template.values.tone,
      setting: template.values.setting,
      relationshipToUser: template.values.relationshipToUser,
      sceneGoal: template.values.sceneGoal,
    }));

    if (template.mode === "quick") {
      setActiveStep("identity");
    }

    rebuildCustomNotes({
      "Visual aura": template.values.visualAura || "",
      "Interest anchors": (template.values.interests || []).join(", "),
      "Avatar style": template.values.avatarStyle || "",
      Hair: template.values.hair || "",
      Eyes: template.values.eyes || "",
      Outfit: template.values.outfit || "",
      Palette: template.values.palette || "",
      Camera: template.values.camera || "",
      "Photo pack": template.values.photoPack || "",
      "Public tagline": template.values.publicTagline || "",
      "Public teaser": template.values.publicTeaser || "",
      "Public tags": (template.values.publicTags || []).join(", "),
    });
  }

  function applyRandomTemplate() {
    const random =
      CHARACTER_TEMPLATES[
        Math.floor(Math.random() * CHARACTER_TEMPLATES.length)
      ];
    applyCharacterTemplate(random);
  }

  function handleRegionSelect(region: string) {
    setField("region", region);
  }

  function handleCustomRegionChange(value: string) {
    setField("region", value);
  }

  function toggleCoreVibe(id: CoreVibeId) {
    setForm((current) => {
      const exists = current.coreVibes.includes(id);
      if (exists) {
        if (current.coreVibes.length === 1) return current;
        return {
          ...current,
          coreVibes: current.coreVibes.filter((item) => item !== id),
        };
      }
      if (current.coreVibes.length >= 4) {
        return {
          ...current,
          coreVibes: [...current.coreVibes.slice(1), id],
        };
      }
      return {
        ...current,
        coreVibes: [...current.coreVibes, id],
      };
    });
  }

  function toggleInterest(item: string) {
    const next = toggleListItem(selectedInterests, item, 5);
    rebuildCustomNotes({ "Interest anchors": next.join(", ") });
  }

  function toggleBoundary(item: string) {
    const next = toggleListItem(selectedBoundaries, item, 8);
    rebuildCustomNotes({ Boundaries: next.join(" | ") });
  }

  function toggleTrait(item: string) {
    const conflicts = new Set(TRAIT_CONFLICTS[item] ?? []);
    const blockingTrait = selectedTraits.find((selected) =>
      conflicts.has(selected) ||
      (TRAIT_CONFLICTS[selected] ?? []).includes(item),
    );

    if (blockingTrait) {
      setBanner({
        type: "error",
        message: `${item} conflicts with ${blockingTrait}. Remove the opposite trait first.`,
      });
      return;
    }

    const next = toggleListItem(selectedTraits, item, 8);
    rebuildCustomNotes({ "Trait stack": next.join(", ") });
    setBanner(null);
  }

  function setSkinTone(value: string) {
    rebuildCustomNotes({ "Skin tone": value });
  }

  function setEyeColor(value: string) {
    rebuildCustomNotes({
      "Eye color": value,
      Eyes: value,
    });
  }

  function setHairColor(value: string) {
    const nextStyle =
      hairStyle || customHairStyle || "long";

    rebuildCustomNotes({
      "Hair color": value,
      Hair: `${value} ${nextStyle}`.trim(),
    });
  }

  function setHairStyleValue(value: string) {
    const nextHairColor = hairColor || "black";

    rebuildCustomNotes({
      "Hair style": value,
      "Custom hairstyle": value === "custom" ? customHairStyle : "",
      Hair: `${nextHairColor} ${value === "custom" ? customHairStyle || "custom hairstyle" : value}`.trim(),
    });
  }

  function setCustomHairStyleValue(value: string) {
    const nextHairColor = hairColor || "black";
    rebuildCustomNotes({
      "Hair style": "custom",
      "Custom hairstyle": value,
      Hair: `${nextHairColor} ${value}`.trim(),
    });
  }

  function setBodyChoice(key: "Body type" | "Bust size" | "Breast type" | "Butt size", value: string) {
    const nextValues: Partial<StructuredNoteMap> = { [key]: value } as Partial<StructuredNoteMap>;

    if (key === "Butt size") {
      nextValues["Hip shape"] = value;
    }

    rebuildCustomNotes(nextValues);
  }

  function toggleMultiChoice(
    key: "Hobbies" | "Fetishes",
    current: string[],
    value: string,
    limit = 12,
  ) {
    const next = toggleListItem(current, value, limit);
    rebuildCustomNotes({ [key]: next.join(", ") } as Partial<StructuredNoteMap>);
  }

  function setRelationshipChoice(value: string) {
    if (value === "Custom") {
      rebuildCustomNotes({ "Relationship dynamic": "" });
      setField("relationshipToUser", "");
      return;
    }

    setField("relationshipToUser", value);
  }

  function openDetailModal(tab: DetailTab) {
    if (tab === "voice") return;
    setActiveDetailTab(tab);
    setDetailModalOpen(true);
  }

  function closeDetailModal() {
    setDetailModalOpen(false);
  }

  function applyScenePreset(preset: (typeof SCENE_PRESETS)[number]) {
    setForm((current) => ({
      ...current,
      setting: preset.setting,
      tone: preset.tone,
      openingState: preset.openingState,
    }));
  }

  function applyRoleplayScenarioTemplate(
    template: (typeof ROLEPLAY_SCENARIO_TEMPLATES)[number],
  ) {
    setForm((current) => ({
      ...current,
      setting: template.setting,
      relationshipToUser: template.relationshipToUser,
      sceneGoal: template.sceneGoal,
      tone: template.tone,
      openingState: template.openingState,
      customScenario: template.customScenario,
    }));
  }

  function goToStep(step: StudioStep) {
    setActiveStep(step);
    setBanner(null);
  }

  function goNextStep() {
    if (nextStep) {
      setActiveStep(nextStep.id);
      setBanner(null);
    }
  }

  function goPreviousStep() {
    if (previousStep) {
      setActiveStep(previousStep.id);
      setBanner(null);
    }
  }

  const { handleSubmit } = useCreateCharacterSubmit({
    draft,
    form,
    generatedAvatarUrl,
    lastAvatarPromptInput,
    saving,
    setActiveStep,
    setBanner,
    setSaving,
  });

  const identitySummary = [
    `${ageValue}`,
    form.region.trim(),
    form.archetype,
    form.visibility === "public" ? "public" : "private",
  ].filter(Boolean);
  const selectedTemplateTitle =
    CHARACTER_TEMPLATES.find((item) => item.id === selectedTemplateId)?.title ??
    null;

  const activeStepComplete = getStepCompletion(
    activeStep,
    form,
    readinessScore,
    isQuickMode,
  );
  const visibleStepItems = visibleSteps.map((step) => ({
    ...step,
    complete: getStepCompletion(step.id, form, readinessScore, isQuickMode),
  }));

  const canGenerateAvatar = Boolean(
    form.name.trim() && form.region.trim() && form.age.trim(),
  );

  const visualReviewItems = [
    { label: "Name", value: form.name.trim() },
    { label: "Age", value: form.age.trim() },
    { label: "Origin", value: form.region.trim() },
    { label: "Skin tone", value: skinTone },
    { label: "Eye color", value: eyeColor },
    { label: "Hair", value: [hairColor, hairStyle === "custom" ? customHairStyle : hairStyle].filter(Boolean).join(" • ") },
    { label: "Traits", value: selectedTraits.join(" • ") },
    { label: "Clothes", value: outfit },
    { label: "Relationship", value: form.relationshipToUser.trim() || "Custom relationship not added" },
    { label: "Hobbies", value: selectedHobbies.join(" • ") },
    { label: "Fetishes", value: selectedFetishes.join(" • ") },
    { label: "Extra personality", value: extraPersonalityDetails },
    { label: "Extra physical", value: extraPhysicalDetails },
    { label: "Body", value: [bodyType, bustSize, breastType, buttSize].filter(Boolean).join(" • ") },
  ].filter((item) => item.value);
  const compactImageReviewItems = visualReviewItems.slice(0, 8);

  const resultPreviewUrl = resultImageUrl || generatedAvatarUrl;
  const readyVisualSteps: VisualWizardStep[] = [
    "identity",
    "general",
    "face",
    "body",
    "details",
    "image",
  ];
  const readyVisualStepLabels: Partial<Record<VisualWizardStep, string>> = {
    identity: "Identity",
    general: "General",
    face: "Face",
    body: "Body",
    details: "Details",
    image: "Image",
  };
  const readyVisualStepIndex = readyVisualSteps.indexOf(visualWizardStep);
  const canAdvanceVisualStep =
    visualWizardStep === "prompt"
      ? Boolean(form.name.trim() && form.age.trim() && promptIdea.trim())
      : visualWizardStep === "identity"
        ? Boolean(form.name.trim() && form.age.trim() && form.region.trim())
        : visualWizardStep === "general"
          ? Boolean(skinTone)
        : visualWizardStep === "face"
          ? Boolean(eyeColor && hairColor && (hairStyle !== "custom" ? hairStyle : customHairStyle))
            : visualWizardStep === "body"
              ? Boolean(bodyType && bustSize && breastType && buttSize)
              : visualWizardStep === "details"
                ? Boolean(selectedTraits.length > 0 && outfit && form.relationshipToUser.trim())
                : true;
  const currentBanner = banner;
  const currentReadyStepCopy =
    creationTrack === "ready" &&
    readyVisualSteps.includes(visualWizardStep as (typeof readyVisualSteps)[number])
        ? READY_STEP_COPY[
          visualWizardStep as Exclude<
            VisualWizardStep,
            "entry" | "track" | "prompt" | "review" | "generating" | "result"
          >
        ]
      : null;

  function updateFullName(firstName: string, familyName: string) {
    const composedName = [firstName.trim(), familyName.trim()].filter(Boolean).join(" ");
    setField("name", composedName);
    setLastName(familyName);
  }

  function applyWomenDefaults(track: Exclude<CreationTrack, null>) {
    setField("genderPresentation", "feminine");
    setField("mode", "deep");
    if (!form.coreVibes.length) {
      setForm((current) => ({
        ...current,
        coreVibes: ["soft", "mysterious"],
        warmth: 62,
        assertiveness: 56,
        mystery: 64,
        playfulness: 48,
        genderPresentation: "feminine",
        mode: "deep",
      }));
    }

    if (track === "prompt") {
      setField("region", "Global");
      setField("setting", form.setting || "natural indoor lifestyle setting");
      setField("relationshipToUser", form.relationshipToUser || "new attraction");
      setField("sceneGoal", form.sceneGoal || "build chemistry slowly");
      setField("tone", form.tone || "natural, grounded, softly intimate");
      rebuildCustomNotes({
        "Image prompt": promptIdea,
        "Visual aura": visualNote || "natural realism",
      }, promptIdea);
    }
  }

  function selectWomenTrack(track: Exclude<CreationTrack, null>) {
    setCreatorEntry("women");
    setCreationTrack(track);
    setCreatedCharacter(null);
    setResultImageUrl(null);
    setBanner(null);
    clearAvatarPreview();
    applyWomenDefaults(track);
    setVisualWizardStep(track === "prompt" ? "prompt" : "identity");
  }

  function selectHeroPath(next: CreatorEntry) {
    setCreatorEntry(next);
    setBanner(null);
    if (next === "man") {
      setCreationTrack(null);
      setVisualWizardStep("track");
      return;
    }
    setField("genderPresentation", "feminine");
    setVisualWizardStep("track");
  }

  function goToNextVisualStep() {
    if (!canAdvanceVisualStep) return;

    if (creationTrack === "prompt") {
      if (visualWizardStep === "prompt") {
        setVisualWizardStep("review");
      }
      return;
    }

    const index = readyVisualSteps.indexOf(visualWizardStep);
    if (index >= 0 && index < readyVisualSteps.length - 1) {
      setVisualWizardStep(readyVisualSteps[index + 1]);
    }
  }

  function goToPreviousVisualStep() {
    if (visualWizardStep === "track") {
      setCreatorEntry(null);
      setCreationTrack(null);
      setVisualWizardStep("entry");
      return;
    }

    if (creationTrack === "prompt") {
      if (visualWizardStep === "review") setVisualWizardStep("prompt");
      return;
    }

    const index = readyVisualSteps.indexOf(visualWizardStep);
    if (index > 0) {
      setVisualWizardStep(readyVisualSteps[index - 1]);
    } else {
      setVisualWizardStep("track");
    }
  }

  const finalizeVisualCharacterCreation = useCallback(async () => {
    if (saving) return;

    setSaving(true);
    setBanner(null);

    try {
      if (!generatedAvatarUrl || !lastAvatarPromptInput) {
        throw new Error("Generate the avatar first before creating this character.");
      }

      const created = await finalizeMyCustomCharacterCreation({
        draft,
        imageUrl: generatedAvatarUrl,
      });

      setCreatedCharacter(created);
      setResultImageUrl(generatedAvatarUrl);
      setVisualWizardStep("result");
      setBanner({
        type: "success",
        message: `"${created.name}" is ready.`,
      });
      router.push("/my-characters");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create character.";
      setBanner({
        type: "error",
        message:
          message === "AUTH_REQUIRED"
            ? "You need to log in before creating a character."
            : message,
      });
      setVisualWizardStep(creationTrack === "prompt" ? "review" : "image");
    } finally {
      setSaving(false);
      setPendingCharacterCreation(false);
    }
  }, [
    draft,
    generatedAvatarUrl,
    lastAvatarPromptInput,
    creationTrack,
    router,
    saving,
  ]);

  async function handleVisualCreate() {
    if (saving || avatarGenerating) return;

    if (!form.name.trim() || !form.age.trim()) {
      setBanner({ type: "error", message: "Name and age are required." });
      return;
    }

    if (!form.region.trim()) {
      setField("region", "Global");
    }

    if (!form.setting.trim()) {
      setField("setting", "natural indoor lifestyle setting");
    }

    if (!form.relationshipToUser.trim()) {
      setField("relationshipToUser", "new attraction");
    }

    if (!form.sceneGoal.trim()) {
      setField("sceneGoal", creationTrack === "prompt" ? "turn the prompt into a vivid first impression" : "build chemistry slowly");
    }

    if (!form.tone.trim()) {
      setField(
        "tone",
        creationTrack === "prompt"
          ? "natural, grounded, softly intimate"
          : "natural, realistic, softly intimate",
      );
    }

    setVisualWizardStep("generating");
    setPendingCharacterCreation(true);

    if (generatedAvatarUrl) {
      void finalizeVisualCharacterCreation();
      return;
    }

    await handleGenerateAvatar();
  }

  async function handleResultRegenerate() {
    if (!createdCharacter || !lastAvatarPromptInput || regeneratingImage) return;

    setRegeneratingImage(true);
    setBanner(null);

    try {
      const refreshedPromptInput = { ...lastAvatarPromptInput };

      const result = await requestImageGeneration({
        provider: avatarProvider,
        kind: "avatar",
        characterId: createdCharacter.id,
        userId: createdCharacter.user_id,
        promptInput: refreshedPromptInput,
        safety: avatarSafetyInput,
        baseSeed: Math.floor(Math.random() * 2_000_000_000),
        generationProfile: "identity_locked_avatar",
        qualityTier: "max",
        referenceStrategy: "single_avatar_lock",
      });

      if (!result.ok || !result.imageUrl) {
        throw new Error(result.errorMessage || "Could not regenerate image.");
      }

      setResultImageUrl(result.imageUrl);
      setBanner({
        type: "success",
        message: "A fresh image was generated with the same prompt and framing lock.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not regenerate image.";
      setBanner({ type: "error", message });
    } finally {
      setRegeneratingImage(false);
    }
  }

  useEffect(() => {
    if (!pendingCharacterCreation) return;

    if (avatarJobStatus === "failed") {
      setPendingCharacterCreation(false);
      setVisualWizardStep(creationTrack === "prompt" ? "review" : "image");
    }
  }, [avatarJobStatus, creationTrack, pendingCharacterCreation]);

  useEffect(() => {
    if (!pendingCharacterCreation || !generatedAvatarUrl) return;
    void finalizeVisualCharacterCreation();
  }, [finalizeVisualCharacterCreation, generatedAvatarUrl, pendingCharacterCreation]);

  const avatarStatusLabel =
    avatarJobStatus === "queued"
      ? "Queued"
      : avatarJobStatus === "processing"
        ? "Processing"
        : avatarJobStatus === "completed"
          ? "Completed"
          : avatarJobStatus === "failed"
            ? "Failed"
            : "Idle";

  if (true) {
    return (
      <AuthGuard>
        <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.12),transparent_22%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_20%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.04),transparent_18%)]" />
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-fuchsia-100">
                  Visual character creator
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                  Build the look first. Let the system handle the hidden prompt.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                  This flow is designed around fast visual choices, strong first impressions, and a cleaner path into chat.
                </p>
              </div>

              {(creatorEntry || creationTrack) && visualWizardStep !== "result" ? (
                <button
                  type="button"
                  onClick={() => {
                    setCreatorEntry(null);
                    setCreationTrack(null);
                    setVisualWizardStep("entry");
                    setCreatedCharacter(null);
                    setResultImageUrl(null);
                    setPromptIdea("");
                    setLegacyRebuildNotice(null);
                    resetStudio();
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                >
                  Start again
                </button>
              ) : null}
            </div>

            {currentBanner ? (
              <div
                className={cn(
                  "mb-6 rounded-2xl border px-4 py-3 text-sm",
                  currentBanner.type === "success"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                    : "border-rose-400/20 bg-rose-400/10 text-rose-100",
                )}
              >
                {currentBanner.message}
                </div>
              ) : null}

            {legacyRebuildNotice ? (
              <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-4 text-sm text-cyan-50">
                <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/80">
                  {legacyRebuildNotice.title}
                </div>
                <p className="mt-2 max-w-3xl leading-7 text-cyan-50/92">
                  {legacyRebuildNotice.message}
                </p>
              </div>
            ) : null}

            {visualWizardStep === "entry" ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <VisualHeroCard
                  title="Woman"
                  subtitle="Build a visual-first female character with region, face, hair, body, style, AI image generation, and direct chat handoff."
                  gradient="from-fuchsia-500/45 via-rose-400/20 to-cyan-500/20"
                  active={creatorEntry === "women"}
                  imageSrc="/create-character/woman/woman-cover.jpg"
                  onClick={() => selectHeroPath("women")}
                />
                <VisualHeroCard
                  title="Man"
                  subtitle="Male creator is planned next. The layout is reserved and will open with the same visual-first system."
                  gradient="from-slate-700/45 via-zinc-700/20 to-cyan-700/20"
                  soon
                  active={creatorEntry === "man"}
                  onClick={() => selectHeroPath("man")}
                />
              </div>
            ) : null}

            {visualWizardStep === "track" && creatorEntry === "man" ? (
              <div className="rounded-[34px] border border-white/10 bg-white/[0.03] p-10 text-center">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">Soon</div>
                <h2 className="mt-4 text-3xl font-semibold text-white">Male creator comes next</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
                  The women flow is being built first. The man path is reserved and will use the same large-card, visual-first onboarding.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCreatorEntry(null);
                    setVisualWizardStep("entry");
                  }}
                  className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
                >
                  Back
                </button>
              </div>
            ) : null}

            {visualWizardStep === "track" && creatorEntry === "women" ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <VisualHeroCard
                  title="Generate with prompt"
                  subtitle="Add the name, age, and prompt in one screen. The system turns it into a richer character and image."
                  gradient="from-cyan-500/35 via-sky-400/20 to-fuchsia-500/15"
                  active={creationTrack === "prompt"}
                  onClick={() => selectWomenTrack("prompt")}
                />
                <VisualHeroCard
                  title="Ready builder"
                  subtitle="Build the character step by step with region, face, hair, body, and style choices."
                  gradient="from-fuchsia-500/35 via-rose-400/20 to-amber-400/15"
                  active={creationTrack === "ready"}
                  onClick={() => selectWomenTrack("ready")}
                />
              </div>
            ) : null}

            {visualWizardStep === "prompt" ? (
              <div className="mx-auto grid max-w-4xl gap-6">
                <Section title="Prompt studio" description="Name, age, and one strong visual prompt are enough here." accent="fuchsia">
                  <div className="mb-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">Fast path</span>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100">Prompt-led</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="First name"
                      value={form.name.split(" ")[0] || ""}
                      onChange={(value) => updateFullName(value, lastName)}
                      placeholder="Alina"
                    />
                    <InputField
                      label="Last name"
                      value={lastName}
                      onChange={(value) => updateFullName(form.name.split(" ")[0] || "", value)}
                      placeholder="Vale"
                    />
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 text-sm text-white/75">Age: {ageValue}</div>
                    <input
                      type="range"
                      min={18}
                      max={70}
                      value={ageValue}
                      onChange={(event) => setAgeFromSlider(Number(event.target.value))}
                      className="w-full accent-fuchsia-400"
                    />
                    <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.18em] text-white/35">
                      <span>18</span>
                      <span>55</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <TextAreaField
                      label="Prompt text"
                      value={promptIdea}
                      onChange={(value) => {
                        setPromptIdea(value);
                        rebuildCustomNotes({ "Image prompt": value }, value);
                      }}
                      placeholder="dark-haired woman, dangerous eye contact, fitted black dress, soft gold light, realistic upper-body photo, intense but elegant..."
                      rows={7}
                    />
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={goToNextVisualStep}
                      disabled={!canAdvanceVisualStep}
                      className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Continue to final review
                    </button>
                    <button
                      type="button"
                      onClick={goToPreviousVisualStep}
                      className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/80"
                    >
                      Back
                    </button>
                  </div>
                </Section>

                <Section title="What the system will do" description="Your short prompt becomes a deeper hidden prompt stack." accent="cyan">
                  <div className="space-y-4 text-sm leading-7 text-white/70">
                    <p>Name, age and your prompt stay visible. The engine expands them into richer visual identity, opening beat, greeting, and image prompt structure.</p>
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Current opening</div>
                      <p className="mt-3 text-sm leading-7 text-white/80">{openingPack.greeting}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField
                        label="User role"
                        value={userRole || USER_ROLE_OPTIONS_EXTENDED[0]}
                        onChange={(value) => rebuildCustomNotes({ "User role": value })}
                        options={USER_ROLE_OPTIONS_EXTENDED.map((value) => ({ value, label: value }))}
                      />
                      <SelectField
                        label="Relationship dynamic"
                        value={relationshipDynamic || RELATIONSHIP_DYNAMIC_OPTIONS[0]}
                        onChange={(value) => rebuildCustomNotes({ "Relationship dynamic": value })}
                        options={RELATIONSHIP_DYNAMIC_OPTIONS.map((value) => ({ value, label: value }))}
                      />
                      <SelectField
                        label="Scene type"
                        value={sceneType || SCENE_TYPE_OPTIONS[0]}
                        onChange={(value) => rebuildCustomNotes({ "Scene type": value })}
                        options={SCENE_TYPE_OPTIONS.map((value) => ({ value, label: value }))}
                      />
                      <SelectField
                        label="Behavior mode"
                        value={behaviorMode || BEHAVIOR_MODE_OPTIONS[0]}
                        onChange={(value) => rebuildCustomNotes({ "Behavior mode": value })}
                        options={BEHAVIOR_MODE_OPTIONS.map((value) => ({ value, label: value }))}
                      />
                      <SelectField
                        label="Arc stage"
                        value={arcStage || ARC_STAGE_OPTIONS[0]}
                        onChange={(value) => rebuildCustomNotes({ "Arc stage": value })}
                        options={ARC_STAGE_OPTIONS.map((value) => ({ value, label: value }))}
                      />
                    </div>
                  </div>
                </Section>
              </div>
            ) : null}

            {["identity", "general", "face", "body", "details", "image"].includes(visualWizardStep) && creationTrack === "ready" ? (
              <div className="mx-auto max-w-5xl">
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3 px-2">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">Build progress</div>
                      <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/65">
                        Step {readyVisualSteps.indexOf(visualWizardStep) + 1} / {readyVisualSteps.length}
                      </div>
                    </div>
                    <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 transition-all"
                        style={{
                          width: `${((readyVisualSteps.indexOf(visualWizardStep) + 1) / readyVisualSteps.length) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                    {readyVisualSteps.map((step, index) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => {
                          if (index <= readyVisualStepIndex) {
                            setVisualWizardStep(step);
                          }
                        }}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm capitalize transition",
                          visualWizardStep === step
                            ? "bg-white text-black"
                            : index > readyVisualStepIndex
                              ? "cursor-not-allowed border border-white/5 bg-white/[0.02] text-white/30"
                              : "border border-white/10 bg-white/5 text-white/70",
                        )}
                      >
                        {readyVisualStepLabels[step]}
                      </button>
                    ))}
                    </div>
                  </div>

                  {currentReadyStepCopy ? (
                    <div className="rounded-[28px] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0.03),rgba(217,70,239,0.08))] p-5">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/75">
                        {currentReadyStepCopy.eyebrow}
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold text-white">
                        {currentReadyStepCopy.title}
                      </h2>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">
                        {currentReadyStepCopy.description}
                      </p>
                    </div>
                  ) : null}

                  {visualWizardStep === "identity" ? (
                    <Section title="Identity" description="Start with name, age, and region." accent="fuchsia">
                      <div className="grid gap-4 md:grid-cols-2">
                        <InputField
                          label="First name"
                          value={form.name.split(" ")[0] || ""}
                          onChange={(value) => updateFullName(value, lastName)}
                          placeholder="Alina"
                        />
                        <InputField
                          label="Last name"
                          value={lastName}
                          onChange={(value) => updateFullName(form.name.split(" ")[0] || "", value)}
                          placeholder="Vale"
                        />
                      </div>
                      <div className="mt-4">
                        <div className="mb-2 text-sm text-white/75">Age: {ageValue}</div>
                        <input
                          type="range"
                          min={18}
                          max={70}
                          value={ageValue}
                          onChange={(event) => setAgeFromSlider(Number(event.target.value))}
                          className="w-full accent-fuchsia-400"
                        />
                        <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.18em] text-white/35">
                          <span>18</span>
                          <span>55</span>
                        </div>
                      </div>
                      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {REGION_VISUAL_CHOICES.map((option) => (
                          <VisualChoiceCard
                            key={option.value}
                            option={option}
                            active={form.region === option.value}
                            onClick={() => handleRegionSelect(option.value)}
                          />
                        ))}
                      </div>
                    </Section>
                  ) : null}

                  {visualWizardStep === "general" ? (
                    <Section title="General" description="Keep this step simple: set the core complexion before the face and body." accent="cyan">
                      <div>
                        <div className="mb-4 text-center">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/72">
                            Skin tone
                          </div>
                          <p className="mt-2 text-sm leading-7 text-white/62">
                            Choose the overall complexion first so the next steps stay visually consistent.
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4">
                        {SKIN_TONE_CHOICES.map((option) => {
                          const active = skinTone === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-label={option.value}
                              onClick={() => setSkinTone(option.value)}
                              className={cn(
                                "h-20 w-20 rounded-full border-4 transition",
                                active
                                  ? "border-white shadow-[0_0_0_4px_rgba(34,211,238,0.25)]"
                                  : "border-white/10",
                              )}
                              style={{ backgroundColor: option.color }}
                            >
                              <span className="sr-only">{option.value}</span>
                            </button>
                          );
                        })}
                        </div>
                      </div>
                    </Section>
                  ) : null}

                  {visualWizardStep === "face" ? (
                    <Section title="Face" description="Choose eyes, hair color, and hairstyle." accent="cyan">
                      <div>
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Eye color</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {EYE_COLOR_CHOICES.map((option) => (
                            <VisualChoiceCard
                              key={option.value}
                              option={option}
                              active={eyeColor === option.value}
                              onClick={() => setEyeColor(option.value)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-6">
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Hair color</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {HAIR_COLOR_CHOICES.map((option) => {
                            return (
                              <VisualChoiceCard
                                key={option.value}
                                option={option}
                                active={hairColor === option.value}
                                onClick={() => setHairColor(option.value)}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-6">
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Hairstyle</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {HAIR_STYLE_CHOICES.map((option) => (
                            <VisualChoiceCard
                              key={option.value}
                              option={option}
                              active={hairStyle === option.value}
                              onClick={() => setHairStyleValue(option.value)}
                            />
                          ))}
                        </div>
                      </div>

                      {hairStyle === "custom" ? (
                        <div className="mt-6">
                          <InputField
                            label="Custom hairstyle"
                            value={customHairStyle}
                            onChange={setCustomHairStyleValue}
                            placeholder="Describe the hairstyle you want"
                          />
                        </div>
                      ) : null}
                    </Section>
                  ) : null}

                  {visualWizardStep === "body" ? (
                    <Section title="Body" description="Choose the body shape and proportions." accent="cyan">
                      <div className="grid gap-6">
                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Body type</div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {BODY_CHOICES.bodyType.map((option) => (
                              <VisualChoiceCard key={option.value} option={option} active={bodyType === option.value} onClick={() => setBodyChoice("Body type", option.value)} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Breast size</div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {BODY_CHOICES.breastSize.map((option) => (
                              <VisualChoiceCard key={option.value} option={option} active={bustSize === option.value} onClick={() => setBodyChoice("Bust size", option.value)} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Breast type</div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {BODY_CHOICES.breastType.map((option) => (
                              <VisualChoiceCard key={option.value} option={option} active={breastType === option.value} onClick={() => setBodyChoice("Breast type", option.value)} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Butt size</div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {BODY_CHOICES.buttSize.map((option) => (
                              <VisualChoiceCard key={option.value} option={option} active={buttSize === option.value} onClick={() => setBodyChoice("Butt size", option.value)} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </Section>
                  ) : null}

                  {visualWizardStep === "details" ? (
                    <Section title="Details" description="Open a category, make the picks, and keep the builder clean." accent="fuchsia">
                      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 md:p-6">
                        <div className="text-center">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                            Details selection
                          </div>
                          <h3 className="mt-3 text-2xl font-semibold text-white">
                            Choose only what matters
                          </h3>
                          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-white/62">
                            Tap a card to open a focused modal. The selection stays simple, centered, and easy to scan.
                          </p>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {detailTabCards.map((item) => (
                            <DetailDeckCard
                              key={item.id}
                              label={item.label}
                              eyebrow={item.eyebrow}
                              description={item.description}
                              summary={item.summary}
                              countLabel={item.countLabel}
                              active={activeDetailTab === item.id}
                              tone={item.tone}
                              onClick={() => openDetailModal(item.id)}
                            />
                          ))}
                        </div>
                      </div>

                      <details className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 md:p-6">
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/76">
                                Extras
                              </div>
                              <div className="mt-2 text-xl font-semibold text-white">
                                Optional polish notes
                              </div>
                            </div>
                            <SelectionPill
                              label={
                                [extraPersonalityDetails, extraPhysicalDetails].filter(Boolean)
                                  .length
                                  ? "Notes added"
                                  : "Optional"
                              }
                              tone="cyan"
                            />
                          </div>
                        </summary>
                        <div className="mt-6 grid gap-5 xl:grid-cols-2">
                          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                            <TextAreaField
                              label="Extra personality details"
                              value={extraPersonalityDetails}
                              onChange={(value) =>
                                rebuildCustomNotes({
                                  "Extra personality details": value,
                                })
                              }
                              placeholder="Add quirks, attitude, favorite phrases, or other final personality details"
                              rows={5}
                            />
                          </div>
                          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                            <TextAreaField
                              label="Extra physical details"
                              value={extraPhysicalDetails}
                              onChange={(value) =>
                                rebuildCustomNotes({
                                  "Extra physical details": value,
                                })
                              }
                              placeholder="Add tattoos, piercings, scars, freckles, jewelry, or other physical details"
                              rows={5}
                            />
                          </div>
                        </div>
                      </details>
                    </Section>
                  ) : null}

                  {visualWizardStep === "details" && detailModalOpen ? (
                    <div
                      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/72 px-4 py-6 backdrop-blur-sm md:py-8"
                      onClick={closeDetailModal}
                    >
                      <div
                        className="mt-4 flex h-[72vh] w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#171821] shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:mt-6 xl:max-w-[42vw]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 md:px-8">
                          <div className="w-10" />
                          <div className="text-center">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                              Detail selection
                            </div>
                            <h3 className="mt-2 text-3xl font-semibold text-white">
                              {detailTabCards.find((item) => item.id === activeDetailTab)?.label}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={closeDetailModal}
                            aria-label="Close detail selection"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-white/72 transition hover:border-white/20 hover:bg-white/10"
                          >
                            ×
                          </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-scroll overscroll-contain px-6 py-6 md:px-8 md:py-8">
                          {activeDetailTab === "personality" ? (
                            <div>
                              <div className="mb-5 flex flex-wrap gap-2">
                                {selectedTraits.length > 0 ? selectedTraits.map((trait) => (
                                  <SelectionPill key={trait} label={`${TRAIT_EMOJI[trait as keyof typeof TRAIT_EMOJI]} ${trait}`} tone="fuchsia" />
                                )) : <span className="text-sm text-white/55">No traits selected yet.</span>}
                              </div>
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {TRAIT_OPTIONS.map((trait) => {
                                  const active = selectedTraits.includes(trait);
                                  const disabled =
                                    !active &&
                                    selectedTraits.some(
                                      (selected) =>
                                        (TRAIT_CONFLICTS[trait] ?? []).includes(selected) ||
                                        (TRAIT_CONFLICTS[selected] ?? []).includes(trait),
                                    );
                                  return (
                                    <PremiumSelectionTile
                                      key={trait}
                                      title={trait}
                                      subtitle={disabled ? "Conflicts with a selected trait." : "Adds a strong behavior anchor."}
                                      emoji={TRAIT_EMOJI[trait as keyof typeof TRAIT_EMOJI]}
                                      tone="fuchsia"
                                      active={active}
                                      disabled={disabled}
                                      metaLabel={active ? "Selected" : disabled ? "Locked" : "Add"}
                                      onClick={() => toggleTrait(trait)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {activeDetailTab === "clothes" ? (
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {CLOTHES_CHOICES.map((item) => (
                                <PremiumSelectionTile
                                  key={item}
                                  title={item}
                                  subtitle="Single look anchor for image and roleplay tone."
                                  tone="rose"
                                  active={outfit === item}
                                  metaLabel={outfit === item ? "Locked" : "Pick"}
                                  onClick={() => rebuildCustomNotes({ Outfit: item })}
                                />
                              ))}
                            </div>
                          ) : null}

                          {activeDetailTab === "relationship" ? (
                            <div>
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {RELATIONSHIP_CHOICES.map((item) => {
                                  const active =
                                    item === "Custom"
                                      ? hasCustomRelationship
                                      : form.relationshipToUser === item;
                                  return (
                                    <PremiumSelectionTile
                                      key={item}
                                      title={item}
                                      subtitle={item === "Custom" ? "Describe your own setup below." : "Preset relationship anchor."}
                                      tone="amber"
                                      active={active}
                                      metaLabel={active ? "Locked" : "Pick"}
                                      onClick={() => setRelationshipChoice(item)}
                                    />
                                  );
                                })}
                              </div>
                              {(hasCustomRelationship || !form.relationshipToUser.trim()) ? (
                                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5">
                                  <InputField
                                    label="Custom relationship or scenario"
                                    value={form.relationshipToUser}
                                    onChange={(value) => setField("relationshipToUser", value)}
                                    placeholder="Describe the relationship or setup"
                                  />
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {activeDetailTab === "hobby" ? (
                            <div>
                              <div className="mb-5 flex flex-wrap gap-2">
                                {selectedHobbies.length > 0 ? selectedHobbies.map((item) => (
                                  <SelectionPill key={item} label={item} tone="cyan" />
                                )) : <span className="text-sm text-white/55">No hobbies selected yet.</span>}
                              </div>
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {HOBBY_CHOICES.map((item) => {
                                  const active = selectedHobbies.includes(item.value);
                                  return (
                                    <PremiumSelectionTile
                                      key={item.value}
                                      title={item.value}
                                      subtitle={item.caption}
                                      emoji={item.emoji}
                                      tone="cyan"
                                      active={active}
                                      metaLabel={active ? "Selected" : "Add"}
                                      onClick={() => toggleMultiChoice("Hobbies", selectedHobbies, item.value, 10)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}

                          {activeDetailTab === "fetishes" ? (
                            <div>
                              <div className="mb-5 flex flex-wrap gap-2">
                                {selectedFetishes.length > 0 ? selectedFetishes.map((item) => (
                                  <SelectionPill key={item} label={item} tone="fuchsia" />
                                )) : <span className="text-sm text-white/55">No adult preferences selected yet.</span>}
                              </div>
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {FETISH_CHOICES.map((item) => {
                                  const active = selectedFetishes.includes(item.value);
                                  return (
                                    <PremiumSelectionTile
                                      key={item.value}
                                      title={item.value}
                                      subtitle={item.caption}
                                      emoji={item.emoji}
                                      tone="fuchsia"
                                      active={active}
                                      metaLabel={active ? "Selected" : "Add"}
                                      onClick={() => toggleMultiChoice("Fetishes", selectedFetishes, item.value, 16)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4 md:px-8">
                          <div className="text-sm text-white/48">
                            Scroll to explore more options
                          </div>
                          <button
                            type="button"
                            onClick={closeDetailModal}
                            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
                          >
                            Save selection
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {visualWizardStep === "image" ? (
                    <Section title="Image" description="Review the final build, generate the avatar, and lock the character." accent="cyan">
                  <div className="mb-5 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
                    This step creates the final locked avatar. Refresh if you want a better shot before saving.
                  </div>

                      <div className="mt-5 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(2,8,20,0.82))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_80px_rgba(0,0,0,0.22)] sm:p-5">
                        <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
                          <div className="space-y-4">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                                Avatar preview
                              </div>
                              <div className="mt-2 text-sm text-white/68">
                                Status: {avatarStatusLabel}
                              </div>
                            </div>

                            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(4,10,22,0.92))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.22)]">
                              <div className="grid min-h-[clamp(400px,64vh,600px)] place-items-center overflow-hidden rounded-[20px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.34))] px-3 py-4">
                              {resultPreviewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={resultPreviewUrl}
                                  alt={form.name || "Character preview"}
                                  className="max-h-[clamp(392px,60vh,584px)] w-full object-contain object-center drop-shadow-[0_18px_40px_rgba(0,0,0,0.32)]"
                                />
                              ) : (
                                <div className="flex min-h-[clamp(400px,64vh,600px)] items-center justify-center px-8 py-12 text-center text-sm leading-7 text-white/52">
                                  Your avatar preview will appear here after you generate the final image.
                                </div>
                              )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-[24px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(8,38,55,0.78))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                              <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/85">
                                Short build review
                              </div>
                              <p className="mt-2 text-sm leading-7 text-white/72">
                                Current identity, body, clothes, and relationship setup.
                              </p>
                            </div>

                            <div className="grid gap-3">
                              {compactImageReviewItems.slice(0, 6).map((item, index) => (
                                <div
                                  key={`${item.label}-${index}-compact`}
                                  className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                                >
                                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                    {item.label}
                                  </div>
                                  <div className="mt-2 text-sm leading-7 text-white/80">
                                    {item.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                          <button
                            type="button"
                            onClick={handleGenerateAvatar}
                            disabled={avatarGenerating || saving}
                            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {avatarGenerating ? "Generating preview..." : generatedAvatarUrl ? "Refresh preview" : "Generate preview"}
                          </button>
                          <button
                            type="button"
                            onClick={handleVisualCreate}
                            disabled={saving || avatarGenerating}
                            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {saving || avatarGenerating ? "Creating your locked character..." : "Create locked character"}
                          </button>
                        </div>
                      </div>

                      {monetization ? (
                        <div className="mt-5 rounded-[24px] border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/85">
                                Plan
                              </div>
                              <div className="mt-2 text-lg font-semibold text-white">
                                {monetization.currentPlan.label}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => router.push("/pricing")}
                              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                            >
                              View plans
                            </button>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                              {monetization.slotUsageLabel}
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                              {monetization.rerollUsageLabel}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </Section>
                  ) : null}

                  {visualWizardStep !== "image" ? (
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={goToPreviousVisualStep} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/80">
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={goToNextVisualStep}
                        disabled={!canAdvanceVisualStep}
                        className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {currentReadyStepCopy?.continueLabel ?? "Continue"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={goToPreviousVisualStep} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/80">
                        Back
                      </button>
                      <div className="text-sm text-white/55">
                        Use the buttons under the preview to refresh or create.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {visualWizardStep === "review" && creationTrack === "prompt" ? (
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <Section title="Final prompt review" description="Your prompt, opening line, and current identity are ready to generate." accent="fuchsia">
                  <div className="mb-5 rounded-[24px] border border-emerald-400/15 bg-emerald-400/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-100/85">
                      What happens next
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                        1. Your prompt is expanded into a richer hidden character profile.
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                        2. The avatar is generated and attached automatically.
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                        3. You land on a ready-to-chat locked character.
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {visualReviewItems.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{item.label}</div>
                        <div className="mt-2 text-sm leading-7 text-white/80">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-amber-100/85">
                      Before you create
                    </div>
                    <p className="mt-2 text-sm leading-7 text-amber-50/90">
                      Once this character is created, it becomes locked. You can reopen and use it
                      later, but you will not be able to change the prompt, roleplay setup, or
                      final identity.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={goToPreviousVisualStep} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/80">
                      Back
                    </button>
                    <button type="button" onClick={handleVisualCreate} disabled={saving || avatarGenerating} className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60">
                      {saving || avatarGenerating ? "Creating your locked character..." : "Create locked character"}
                    </button>
                  </div>
                </Section>
                <Section title="Prompt to character" description="The system will turn this into a richer visual identity and starter greeting." accent="cyan">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/78">
                    {promptIdea}
                  </div>
                  <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/78">
                    {openingPack.openingSummary}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {ROLEPLAY_SCENARIO_TEMPLATES.map((template) => (
                      <button
                        key={template.title}
                        type="button"
                        onClick={() => applyRoleplayScenarioTemplate(template)}
                        className={cn(
                          "rounded-[22px] border p-4 text-left transition",
                          form.customScenario === template.customScenario
                            ? "border-fuchsia-400/25 bg-fuchsia-400/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                        )}
                      >
                        <div className="text-sm font-medium text-white">{template.title}</div>
                        <div className="mt-2 text-xs leading-6 text-white/55">{template.summary}</div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <TextAreaField
                      label="Custom scenario"
                      value={form.customScenario}
                      onChange={(value) => setField("customScenario", value)}
                      placeholder="Add your own scene direction here before generating."
                      rows={5}
                    />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <RoleplaySummaryCard
                      label="User role"
                      value={userRole}
                      helper="How she sees the user when chat begins."
                    />
                    <RoleplaySummaryCard
                      label="Dynamic"
                      value={relationshipDynamic}
                      helper="The connection pattern the prompt engine will protect."
                    />
                    <RoleplaySummaryCard
                      label="Scene type"
                      value={sceneType}
                      helper="The active roleplay frame for the first exchange."
                    />
                    <RoleplaySummaryCard
                      label="Behavior"
                      value={behaviorMode}
                      helper="The reply style and emotional delivery mode."
                    />
                    <RoleplaySummaryCard
                      label="Arc stage"
                      value={arcStage}
                      helper="The current closeness level before the first reply."
                    />
                  </div>
                </Section>
              </div>
            ) : null}

            {visualWizardStep === "generating" ? (
              <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
                <Section title="Building your character" description="Everything is being saved in the order needed for a clean first chat." accent="fuchsia">
                  <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_25%),rgba(0,0,0,0.2)] p-8">
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400" />
                    </div>
                    <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/72">
                      This usually takes only a short moment. When it finishes, your character will be saved, locked, and ready to open in chat.
                    </div>
                    <div className="mt-6 space-y-3 text-sm leading-7 text-white/70">
                      <p>1. Your selections are being turned into a detailed visual prompt.</p>
                      <p>2. The avatar is being generated with the current look and identity lock.</p>
                      <p>3. The greeting, roleplay setup, and profile are being saved for chat.</p>
                    </div>
                  </div>
                </Section>
                <Section title="Current build" description="These are the selections being used right now." accent="cyan">
                  <div className="grid gap-3 md:grid-cols-2">
                    {visualReviewItems.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{item.label}</div>
                        <div className="mt-2 text-sm text-white/80">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            ) : null}

            {visualWizardStep === "result" && createdCharacter ? (
              <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
                <Section title="Character ready" description="The profile is saved, the image is attached, and chat can start right away." accent="fuchsia">
                  <div className="grid gap-6">
                    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.22))] p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/40">Saved locked character</div>
                      <h2 className="mt-3 text-3xl font-semibold text-white">{createdCharacter.name}</h2>
                      <p className="mt-3 text-sm leading-7 text-white/70">{draft.greeting}</p>
                    </div>
                    <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-400/10 p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/85">
                        You can do two things now
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                          Generate again if you want the same character with a fresh image.
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                          Start chat if this look already feels right.
                        </div>
                      </div>
                    </div>
                    {monetization ? (
                      <div className="rounded-[24px] border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/85">
                          Plan and rerolls
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                            {monetization.slotUsageLabel}
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                            {monetization.rerollUsageLabel}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {resultPreviewUrl ? (
                      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(3,10,19,0.92))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_72px_rgba(0,0,0,0.22)]">
                        <div className="grid min-h-[clamp(380px,60vh,560px)] place-items-center overflow-hidden rounded-[22px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.34))] px-3 py-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resultPreviewUrl}
                            alt={createdCharacter.name}
                            className="max-h-[clamp(368px,56vh,540px)] w-full object-contain object-center drop-shadow-[0_18px_40px_rgba(0,0,0,0.32)]"
                          />
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleResultRegenerate}
                        disabled={regeneratingImage || !lastAvatarPromptInput}
                        className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/85 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {regeneratingImage ? "Generating a fresh version..." : "Generate a fresh version"}
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/chat/custom/${createdCharacter.slug}`)}
                        className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
                      >
                        Start chat
                      </button>
                    </div>
                  </div>
                </Section>

                <Section title="Selected features" description="A compact recap of the look you built." accent="cyan">
                  <div className="grid gap-3 md:grid-cols-2">
                    {visualReviewItems.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{item.label}</div>
                        <div className="mt-2 text-sm leading-7 text-white/80">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            ) : null}
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <StudioShellHeader
            activeStep={activeStep}
            activeStepComplete={activeStepComplete}
            hasNextStep={Boolean(nextStep)}
            hasPreviousStep={Boolean(previousStep)}
            isQuickMode={isQuickMode}
            onApplyRandomTemplate={applyRandomTemplate}
            onGoBack={goPreviousStep}
            onGoNext={goNextStep}
            onGoToStep={goToStep}
            onResetStudio={resetStudio}
            readinessScore={readinessScore}
            steps={visibleStepItems}
          />

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <form onSubmit={handleSubmit} className="space-y-6">
              {currentBanner ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    currentBanner?.type === "success"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-100",
                  )}
                >
                  {currentBanner?.message}
                </div>
              ) : null}

              <Section
                title="Template library"
                description="Start with a ready-made character, then make it your own."
                accent="fuchsia"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-white/60">
                    Templates give you a strong starting point without locking you in.
                  </div>
                  <button
                    type="button"
                    onClick={applyRandomTemplate}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    Pick one for me
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {CHARACTER_TEMPLATES.map((template) => (
                    <PresetCard
                      key={template.id}
                      title={template.title}
                      badge={template.badge}
                      description={template.description}
                      active={selectedTemplateId === template.id}
                      onClick={() => applyCharacterTemplate(template)}
                    />
                  ))}
                </div>
              </Section>

              <Section
                title="Build mode"
                description="Use Quick mode for speed. Use Deep mode when you want more control."
              >
                <div className="flex flex-wrap gap-3">
                  <SegmentButton
                    active={form.mode === "quick"}
                    onClick={() => {
                      setField("mode", "quick");
                      if (
                        !["identity", "personality", "scenario", "publish"].includes(
                          activeStep,
                        )
                      ) {
                        setActiveStep("identity");
                      }
                    }}
                  >
                    Quick Mode
                  </SegmentButton>
                  <SegmentButton
                    active={form.mode === "deep"}
                    onClick={() => {
                      setField("mode", "deep");
                    }}
                  >
                    Deep Mode
                  </SegmentButton>
                </div>
              </Section>

              {activeStep === "identity" && (
                <IdentityStepSection
                  ageValue={ageValue}
                  customRegion={customRegion}
                  form={form}
                  isQuickMode={isQuickMode}
                  regionNote={regionNote}
                  selectedRegion={selectedRegion}
                  onCustomRegionChange={handleCustomRegionChange}
                  onFieldChange={setField}
                  onRegionSelect={handleRegionSelect}
                  onRebuildCustomNotes={rebuildCustomNotes}
                  onSetAgeFromSlider={setAgeFromSlider}
                />
              )}

              {activeStep === "personality" && (
                <PersonalityStepSection
                  currentEnergy={currentEnergy}
                  dynamicSummary={dynamicSummary}
                  dynamism={dynamism}
                  form={form}
                  isQuickMode={isQuickMode}
                  linguisticFlavor={linguisticFlavor}
                  messageFormat={messageFormat}
                  selectedInterests={selectedInterests}
                  visualNote={visualNote}
                  onFieldChange={setField}
                  onRebuildCustomNotes={rebuildCustomNotes}
                  onSetDynamism={(value) => {
                    setDynamism(value);
                    rebuildCustomNotes({ Dynamism: String(value) });
                  }}
                  onToggleCoreVibe={toggleCoreVibe}
                  onToggleInterest={toggleInterest}
                />
              )}

              {activeStep === "scenario" && (
                <ScenarioStepSection
                  affectionStyle={affectionStyle}
                  attachment={attachment}
                  arcStage={arcStage}
                  behaviorMode={behaviorMode}
                  chatMode={chatMode}
                  chemistryTemplate={chemistryTemplate}
                  conflictStyle={conflictStyle}
                  conversationInitiative={conversationInitiative}
                  emotionalAvailability={emotionalAvailability}
                  form={form}
                  greetingStyle={greetingStyle}
                  isQuickMode={isQuickMode}
                  jealousy={jealousy}
                  nickname={nickname}
                  protectiveness={protectiveness}
                  relationshipDynamic={relationshipDynamic}
                  relationshipStage={relationshipStage}
                  sceneType={sceneType}
                  userRole={userRole}
                  onApplyScenePreset={applyScenePreset}
                  onFieldChange={setField}
                  onRebuildCustomNotes={rebuildCustomNotes}
                />
              )}

              {!isQuickMode && activeStep === "advanced" && (
                <AdvancedStepSection
                  attentionHook={attentionHook}
                  bodyNotes={bodyNotes}
                  exampleMessage={exampleMessage}
                  form={form}
                  keyMemories={keyMemories}
                  replyObjective={replyObjective}
                  responseDirective={responseDirective}
                  sceneFocus={sceneFocus}
                  selectedBoundaries={selectedBoundaries}
                  sensoryPalette={sensoryPalette}
                  onFieldChange={setField}
                  onRebuildCustomNotes={rebuildCustomNotes}
                  onToggleBoundary={toggleBoundary}
                />
              )}

              {!isQuickMode && activeStep === "visual" && (
                <VisualStepSection
                  accessoryVibe={accessoryVibe}
                  avatarStyle={avatarStyle}
                  breastType={breastType}
                  buttSize={buttSize}
                  camera={camera}
                  bodyType={bodyType}
                  bustSize={bustSize}
                  eyeShape={eyeShape}
                  eyes={eyes}
                  exposureLevel={exposureLevel}
                  hair={hair}
                  hairTexture={hairTexture}
                  heightImpression={heightImpression}
                  hipsType={hipsType}
                  imagePrompt={imagePrompt}
                  lightingMood={lightingMood}
                  makeupStyle={makeupStyle}
                  outfit={outfit}
                  palette={palette}
                  photoPack={photoPack}
                  signatureDetail={signatureDetail}
                  skinTone={skinTone}
                  waistDefinition={waistDefinition}
                  onRebuildCustomNotes={rebuildCustomNotes}
                />
              )}

              {(activeStep === "visual" || activeStep === "publish") && (
                <AvatarPreviewSection
                  avatarGenerating={avatarGenerating}
                  avatarQueuedExternalJobId={avatarQueuedExternalJobId}
                  avatarResultMessage={avatarResultMessage}
                  avatarStatusLabel={avatarStatusLabel}
                  canGenerateAvatar={canGenerateAvatar}
                  generatedAvatarUrl={generatedAvatarUrl}
                  onGenerateAvatar={handleGenerateAvatar}
                />
              )}

              {activeStep === "publish" && (
                <PublishSetupSection
                  isQuickMode={isQuickMode}
                  publicTagline={publicTagline}
                  publicTags={publicTags}
                  publicTeaser={publicTeaser}
                  visibility={form.visibility}
                  onPublicTaglineChange={(value) =>
                    rebuildCustomNotes({ "Public tagline": value })
                  }
                  onPublicTagsChange={(value) =>
                    rebuildCustomNotes({ "Public tags": value })
                  }
                  onPublicTeaserChange={(value) =>
                    rebuildCustomNotes({ "Public teaser": value })
                  }
                  onVisibilityChange={(value) => setField("visibility", value)}
                />
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black shadow-[0_16px_50px_rgba(255,255,255,0.12)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Creating..." : "Save character"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/my-characters")}
                  className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Open my characters
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-amber-100/85">
                  Locked after creation
                </div>
                <p className="mt-2 text-sm leading-7 text-amber-50/90">
                  Saving creates a locked character. After that, you can reopen it from your
                  library and chat with it, but you will not be able to edit it.
                </p>
              </div>
            </form>

            <StudioSidebar
              ageToneLabel={ageToneLabel(ageValue)}
              ageValue={ageValue}
              canonicalPrompt={builderV2Summary.promptEngineOutput.canonicalPrompt}
              draft={draft}
              dynamicSummary={dynamicSummary}
              firstReplyCold={firstReplyCold}
              firstReplyFlirty={firstReplyFlirty}
              firstReplySoft={firstReplySoft}
              generatedAvatarUrl={generatedAvatarUrl}
              greeting={draft.greeting}
              identitySummary={identitySummary}
              imagePrompt={imagePrompt}
              isQuickMode={isQuickMode}
              memoryAnchorPreview={memoryAnchorPreview}
              negativePrompt={builderV2Summary.promptEngineOutput.negativePrompt}
              openingBeat={openingPack.openingBeat}
              openingSummary={openingPack.openingSummary}
              previewMessage={draft.previewMessage}
              promptSummary={builderV2Summary.promptEngineOutput.promptSummary}
              publicTagline={publicTagline}
              publicTagsList={publicTagsList}
              publicTeaser={publicTeaser}
              readinessScore={readinessScore}
              selectedTemplateTitle={selectedTemplateTitle}
              validationIssues={validationIssues}
              visualSummary={visualSummary}
              visualTags={visualTags}
            />
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
