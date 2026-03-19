"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  createMyCustomCharacter,
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
  | "traits"
  | "face"
  | "hair"
  | "body"
  | "style"
  | "scenario"
  | "review"
  | "generating"
  | "result";

type VisualChoice = {
  value: string;
  title: string;
  caption: string;
  gradient: string;
};

type ProfileSummary = Awaited<ReturnType<typeof getProfileSummary>>;

const READY_STEP_COPY: Record<
  Exclude<
    VisualWizardStep,
    "entry" | "track" | "prompt" | "generating" | "result"
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
      "Name, age, and region create the base identity the rest of the build follows.",
    continueLabel: "Save identity and continue",
  },
  traits: {
    eyebrow: "Step 2",
    title: "Pick how she feels in chat",
    description:
      "Profession and traits shape tone, confidence, and the way she reacts to the user.",
    continueLabel: "Lock traits and continue",
  },
  face: {
    eyebrow: "Step 3",
    title: "Define the face people remember",
    description:
      "Skin tone and eyes give the strongest first impression and help identity stay stable.",
    continueLabel: "Save face details",
  },
  hair: {
    eyebrow: "Step 4",
    title: "Choose the hair silhouette",
    description:
      "Hair is one of the biggest anchors for the final avatar and later rerolls.",
    continueLabel: "Save hair and continue",
  },
  body: {
    eyebrow: "Step 5",
    title: "Set the body shape",
    description:
      "These choices guide silhouette, proportions, and how the image model frames the character.",
    continueLabel: "Save body details",
  },
  style: {
    eyebrow: "Step 6",
    title: "Dress the final look",
    description:
      "Outfit, palette, and lighting push the image from generic to premium-looking.",
    continueLabel: "Save style and continue",
  },
  scenario: {
    eyebrow: "Step 7",
    title: "Give chat a real starting scene",
    description:
      "This is where the roleplay starts to feel specific instead of random or AI-made.",
    continueLabel: "Save scenario and review",
  },
  review: {
    eyebrow: "Final step",
    title: "Check the full build before you lock it",
    description:
      "You are about to save a locked character with this image setup, opening mood, and roleplay frame.",
    continueLabel: "Create locked character",
  },
};

const ROLEPLAY_DYNAMIC_CHOICES: VisualChoice[] = [
  { value: "soft lover", title: "Soft Lover", caption: "warm, close, reassuring, emotionally easy to stay with", gradient: "from-rose-400/25 via-fuchsia-500/15 to-white/10" },
  { value: "intense lover", title: "Intense Lover", caption: "strong pull, high chemistry, harder to ignore", gradient: "from-red-500/25 via-fuchsia-500/15 to-black/10" },
  { value: "rivals", title: "Rivals", caption: "challenge, pride, banter, attraction under pressure", gradient: "from-cyan-500/20 via-slate-900/30 to-rose-500/15" },
  { value: "forbidden", title: "Forbidden", caption: "hidden tension, risk, low voice, dangerous timing", gradient: "from-amber-500/20 via-zinc-900/35 to-fuchsia-500/15" },
  { value: "dominant", title: "Dominant", caption: "leads the moment with controlled confidence", gradient: "from-zinc-900/55 via-fuchsia-500/15 to-white/5" },
  { value: "soft owner", title: "Soft Owner", caption: "protective, possessive, quietly in control", gradient: "from-amber-400/20 via-rose-500/15 to-black/10" },
  { value: "emotionally unavailable", title: "Unavailable", caption: "guarded, slower to open, harder to read", gradient: "from-slate-500/25 via-zinc-900/30 to-cyan-500/10" },
  { value: "obsessed", title: "Obsessed", caption: "focused attention, fixation, emotionally loaded memory", gradient: "from-fuchsia-600/25 via-rose-500/15 to-black/15" },
  { value: "best friend tension", title: "Best Friend Tension", caption: "comfort first, chemistry underneath, easy closeness", gradient: "from-cyan-400/20 via-white/5 to-fuchsia-400/10" },
  { value: "ex with history", title: "Ex With History", caption: "unfinished feelings, residue, old shortcuts, sharp edges", gradient: "from-indigo-500/20 via-rose-500/10 to-black/15" },
];

const ROLEPLAY_SCENE_CHOICES: VisualChoice[] = [
  { value: "first meeting", title: "First Meeting", caption: "fresh tension, strong first impression, curiosity first", gradient: "from-cyan-500/20 via-white/5 to-slate-500/10" },
  { value: "caught staring", title: "Caught Staring", caption: "charged eye contact, instant pressure, fast chemistry", gradient: "from-fuchsia-500/20 via-black/10 to-cyan-500/10" },
  { value: "late-night comfort", title: "Late-Night Comfort", caption: "quiet closeness, honesty, soft emotional pull", gradient: "from-blue-500/20 via-indigo-500/15 to-white/5" },
  { value: "aftercare / soft landing", title: "Soft Landing", caption: "gentle calm, safety, staying close after intensity", gradient: "from-rose-400/20 via-stone-300/10 to-white/5" },
  { value: "after a fight", title: "After A Fight", caption: "hurt, pressure, honesty, unresolved charge", gradient: "from-red-500/20 via-zinc-900/25 to-fuchsia-400/10" },
  { value: "jealousy scene", title: "Jealousy", caption: "possession, challenge, testing, unstable heat", gradient: "from-emerald-500/20 via-black/20 to-amber-400/10" },
  { value: "roommate night", title: "Roommate Night", caption: "shared space, domestic tension, private routine", gradient: "from-amber-300/15 via-stone-400/10 to-black/10" },
  { value: "office tension", title: "Office Tension", caption: "restraint, status, implication, polished friction", gradient: "from-slate-400/20 via-zinc-900/25 to-cyan-500/10" },
  { value: "rain scene", title: "Rain Scene", caption: "cinematic mood, wet silence, heavy atmosphere", gradient: "from-blue-600/20 via-slate-900/35 to-white/5" },
  { value: "last train ride", title: "Last Train Ride", caption: "late-night isolation, honesty, drifting closeness", gradient: "from-indigo-500/20 via-slate-900/30 to-cyan-400/10" },
];

const ROLEPLAY_BEHAVIOR_CHOICES: VisualChoice[] = [
  { value: "teasing", title: "Teasing", caption: "playful pressure, verbal spark, chemistry through banter", gradient: "from-fuchsia-500/20 via-rose-500/10 to-white/5" },
  { value: "emotionally raw", title: "Emotionally Raw", caption: "more open, more exposed, less filtered", gradient: "from-rose-500/20 via-red-500/10 to-black/10" },
  { value: "slow burn", title: "Slow Burn", caption: "lets tension breathe before giving payoff", gradient: "from-amber-500/20 via-black/15 to-fuchsia-500/10" },
  { value: "calm dominant", title: "Calm Dominant", caption: "steady leadership, low voice, no wasted movement", gradient: "from-zinc-900/60 via-amber-400/10 to-white/5" },
  { value: "soft guiding", title: "Soft Guiding", caption: "gentle control, emotional steering, reassuring authority", gradient: "from-cyan-400/20 via-rose-300/10 to-white/5" },
  { value: "guarded", title: "Guarded", caption: "reveals selectively, keeps some distance alive", gradient: "from-slate-500/20 via-black/20 to-cyan-500/10" },
];

const ROLEPLAY_USER_ROLE_CHOICES: VisualChoice[] = [
  { value: "the one they protect", title: "Protected One", caption: "she notices your comfort and guards it closely", gradient: "from-cyan-400/20 via-white/5 to-emerald-400/10" },
  { value: "the one they test", title: "Tested One", caption: "she pushes, reads, and checks how far you will go", gradient: "from-amber-400/20 via-fuchsia-500/10 to-black/10" },
  { value: "the one they can't stay away from", title: "Can't Stay Away", caption: "constant pull, repeated returns, magnetic focus", gradient: "from-fuchsia-500/20 via-rose-500/15 to-black/10" },
  { value: "the one who makes them weak", title: "Makes Her Weak", caption: "you disrupt her control and get under the surface fast", gradient: "from-rose-500/20 via-red-500/10 to-black/10" },
  { value: "my favorite problem", title: "Favorite Problem", caption: "you create trouble she secretly wants more of", gradient: "from-cyan-500/20 via-fuchsia-500/10 to-black/10" },
  { value: "the only one who sees through them", title: "Sees Through Her", caption: "you notice what she hides from everyone else", gradient: "from-indigo-500/20 via-white/5 to-fuchsia-500/10" },
];

const ROLEPLAY_ARC_CHOICES: VisualChoice[] = [
  { value: "guarded distance", title: "Guarded Distance", caption: "watchful, controlled, not fully open yet", gradient: "from-slate-500/20 via-black/20 to-white/5" },
  { value: "visible tension", title: "Visible Tension", caption: "interest is obvious, but not resolved", gradient: "from-fuchsia-500/20 via-amber-400/10 to-black/10" },
  { value: "emotional opening", title: "Emotional Opening", caption: "more honesty, more softness, more reveal", gradient: "from-rose-400/20 via-cyan-400/10 to-white/5" },
  { value: "attachment", title: "Attachment", caption: "the bond matters now, and it shows", gradient: "from-emerald-400/20 via-cyan-400/10 to-white/5" },
  { value: "obsession / devotion / comfort", title: "Devotion", caption: "high closeness, fixation, or deeply settled comfort", gradient: "from-fuchsia-600/20 via-rose-400/10 to-amber-300/10" },
];

const REGION_VISUAL_CHOICES: VisualChoice[] = [
  { value: "Latin", title: "Latin", caption: "sun warmth, bold beauty, nightlife energy", gradient: "from-rose-500/60 via-orange-400/30 to-amber-200/20" },
  { value: "East Asian", title: "East Asian", caption: "clean elegance, balanced softness, refined style", gradient: "from-slate-200/25 via-pink-300/20 to-rose-500/20" },
  { value: "South Asian", title: "South Asian", caption: "rich color, gold accents, magnetic eyes", gradient: "from-amber-400/35 via-fuchsia-500/20 to-rose-600/20" },
  { value: "Middle Eastern", title: "Middle Eastern", caption: "dark eyes, luxury detail, strong silhouette", gradient: "from-amber-500/30 via-zinc-900/40 to-orange-500/20" },
  { value: "Slavic", title: "Slavic", caption: "cool elegance, sharp presence, winter beauty", gradient: "from-blue-200/25 via-cyan-400/20 to-white/10" },
  { value: "Mixed", title: "Mixed", caption: "layered features, versatile beauty, modern edge", gradient: "from-fuchsia-500/30 via-cyan-500/20 to-amber-300/15" },
];

const FACE_CHOICES = {
  skinTone: [
    { value: "porcelain", title: "Porcelain", caption: "pale, polished, cool light catch", gradient: "from-zinc-100/40 via-rose-200/15 to-white/10" },
    { value: "warm beige", title: "Warm Beige", caption: "soft warmth, balanced glow", gradient: "from-amber-200/30 via-orange-300/20 to-rose-400/15" },
    { value: "olive", title: "Olive", caption: "mediterranean depth, luxe contrast", gradient: "from-emerald-300/20 via-amber-500/20 to-zinc-900/20" },
    { value: "golden tan", title: "Golden Tan", caption: "sun-kissed, vivid, camera-friendly", gradient: "from-amber-400/35 via-orange-500/20 to-rose-500/10" },
    { value: "deep rich brown", title: "Deep Rich Brown", caption: "depth, glow, striking highlights", gradient: "from-amber-700/30 via-rose-600/20 to-zinc-900/20" },
  ],
  eyes: [
    { value: "soft brown eyes", title: "Soft Brown", caption: "warm, easy intimacy", gradient: "from-amber-700/40 via-stone-600/25 to-black/20" },
    { value: "green eyes", title: "Green", caption: "rare, sharp, magnetic", gradient: "from-emerald-400/30 via-lime-300/20 to-black/15" },
    { value: "hazel eyes", title: "Hazel", caption: "golden shift, lively chemistry", gradient: "from-amber-500/30 via-lime-300/15 to-black/15" },
    { value: "grey eyes", title: "Grey", caption: "cool restraint, dangerous calm", gradient: "from-slate-300/35 via-zinc-500/20 to-black/15" },
    { value: "icy blue eyes", title: "Icy Blue", caption: "cold spark, high contrast", gradient: "from-cyan-300/30 via-blue-500/20 to-black/20" },
  ],
};

const HAIR_COLOR_CHOICES: VisualChoice[] = [
  { value: "black", title: "Black", caption: "dark contrast, premium drama", gradient: "from-zinc-900/70 via-zinc-700/40 to-slate-500/20" },
  { value: "dark brown", title: "Dark Brown", caption: "warm richness, natural glamour", gradient: "from-stone-800/60 via-amber-700/30 to-zinc-500/15" },
  { value: "blonde", title: "Blonde", caption: "bright, polished, high visibility", gradient: "from-amber-200/50 via-yellow-300/30 to-white/15" },
  { value: "auburn", title: "Auburn", caption: "romantic red warmth, standout frame", gradient: "from-orange-700/45 via-rose-500/25 to-amber-300/10" },
  { value: "silver ash", title: "Silver Ash", caption: "cool editorial edge", gradient: "from-slate-200/40 via-zinc-400/20 to-black/15" },
];

const HAIR_STYLE_CHOICES: VisualChoice[] = [
  { value: "long flowing hair", title: "Long Flowing", caption: "soft motion and classic allure", gradient: "from-fuchsia-500/20 via-white/5 to-cyan-500/10" },
  { value: "soft shoulder-length layers", title: "Layered", caption: "modern softness and movement", gradient: "from-cyan-500/20 via-white/5 to-fuchsia-500/10" },
  { value: "sleek straight cut", title: "Sleek Straight", caption: "clean, sharp, controlled", gradient: "from-slate-500/20 via-white/5 to-blue-500/10" },
  { value: "messy textured bob", title: "Textured Bob", caption: "playful but fashion-forward", gradient: "from-amber-500/15 via-rose-500/10 to-black/10" },
  { value: "high ponytail", title: "High Ponytail", caption: "lifted, sporty, confident", gradient: "from-cyan-400/15 via-slate-200/10 to-black/10" },
];

const BODY_CHOICES = {
  bodyType: [
    { value: "slim toned", title: "Slim Toned", caption: "lean lines, fitted silhouette", gradient: "from-cyan-500/20 via-white/5 to-slate-500/10" },
    { value: "soft curvy", title: "Soft Curvy", caption: "plush lines, warm softness", gradient: "from-rose-500/20 via-amber-400/10 to-white/5" },
    { value: "athletic", title: "Athletic", caption: "fit frame, grounded confidence", gradient: "from-emerald-500/20 via-cyan-400/10 to-black/10" },
    { value: "tall elegant", title: "Tall Elegant", caption: "long frame, poised presence", gradient: "from-fuchsia-400/15 via-blue-500/10 to-white/5" },
  ],
  bust: [
    { value: "small", title: "Small", caption: "lighter upper silhouette", gradient: "from-slate-400/15 via-white/5 to-black/10" },
    { value: "medium", title: "Medium", caption: "balanced proportions", gradient: "from-cyan-400/15 via-white/5 to-black/10" },
    { value: "full", title: "Full", caption: "fuller chest line", gradient: "from-rose-500/15 via-white/5 to-black/10" },
    { value: "very full", title: "Very Full", caption: "highly pronounced upper shape", gradient: "from-fuchsia-500/20 via-rose-400/10 to-black/10" },
  ],
  hips: [
    { value: "narrow", title: "Narrow", caption: "straighter lower line", gradient: "from-slate-500/15 via-white/5 to-black/10" },
    { value: "balanced", title: "Balanced", caption: "clean and proportional", gradient: "from-cyan-500/15 via-white/5 to-black/10" },
    { value: "wide", title: "Wide", caption: "more visible curve", gradient: "from-rose-500/15 via-white/5 to-black/10" },
    { value: "very curvy", title: "Very Curvy", caption: "strong hourglass pull", gradient: "from-fuchsia-500/20 via-rose-400/10 to-black/10" },
  ],
};

const STYLE_CHOICES = {
  outfit: [
    { value: "old-money chic", title: "Old Money", caption: "quiet luxury, clean elegance", gradient: "from-stone-200/20 via-amber-300/10 to-black/10" },
    { value: "black dress elegance", title: "Black Dress", caption: "night-ready, timeless, sharp", gradient: "from-zinc-900/60 via-fuchsia-500/15 to-white/5" },
    { value: "street-luxury fit", title: "Street Luxury", caption: "modern, expensive, bold", gradient: "from-cyan-500/15 via-zinc-900/30 to-white/5" },
    { value: "soft knitwear intimacy", title: "Soft Knitwear", caption: "close, warm, private", gradient: "from-rose-400/15 via-stone-300/10 to-white/5" },
  ],
  lighting: [
    { value: "soft window light", title: "Soft Window", caption: "clean skin, gentle shadow", gradient: "from-white/20 via-cyan-200/10 to-black/10" },
    { value: "golden-hour warmth", title: "Golden Hour", caption: "warm glow and softness", gradient: "from-amber-400/30 via-orange-300/10 to-black/10" },
    { value: "clean luxury ambient light", title: "Luxury Ambient", caption: "premium mood and depth", gradient: "from-stone-200/15 via-fuchsia-400/10 to-black/10" },
    { value: "dim moody lamp light", title: "Moody Lamp", caption: "private, dark, intimate", gradient: "from-zinc-900/50 via-amber-500/10 to-black/15" },
  ],
};

const PROFESSION_OPTIONS = [
  "Architect",
  "Attorney",
  "Bartender",
  "Chef",
  "Content Creator",
  "Creative Director",
  "Dancer",
  "Doctor",
  "Entrepreneur",
  "Fashion Stylist",
  "Fitness Coach",
  "Journalist",
  "Musician",
  "Nightclub Owner",
  "Nurse",
  "Photographer",
  "Professor",
  "Real Estate Agent",
  "Therapist",
  "Travel Consultant",
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
}: {
  title: string;
  subtitle: string;
  active?: boolean;
  soon?: boolean;
  gradient: string;
  onClick?: () => void;
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
  const skinTone = structuredValues["Skin tone"];
  const hair = structuredValues.Hair;
  const hairTexture = structuredValues["Hair texture"];
  const eyes = structuredValues.Eyes;
  const eyeShape = structuredValues["Eye shape"];
  const makeupStyle = structuredValues["Makeup style"];
  const accessoryVibe = structuredValues["Accessory vibe"];
  const outfit = structuredValues.Outfit;
  const palette = structuredValues.Palette;
  const bodyType = structuredValues["Body type"];
  const bustSize = structuredValues["Bust size"];
  const hipsType = structuredValues["Hip shape"];
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
  const profession = structuredValues.Profession;
  const traitStack = structuredValues["Trait stack"];

  const bodyNotes = useMemo(() => {
    let result = form.customNotes;
    STRUCTURED_NOTE_KEYS.forEach((prefix) => {
      result = removeStructuredLine(result, prefix);
    });
    return result.trim();
  }, [form.customNotes]);

  const parsedAge = Number(form.age);
  const ageValue = Number.isFinite(parsedAge)
    ? Math.min(55, Math.max(18, parsedAge))
    : 25;

  const isKnownRegion = REGION_OPTIONS.includes(
    form.region as (typeof REGION_OPTIONS)[number],
  );
  const selectedRegion = isKnownRegion ? form.region : "";
  const customRegion = isKnownRegion ? "" : form.region;

  const selectedInterests = useMemo(() => parseCsv(interestNote), [interestNote]);
  const selectedBoundaries = useMemo(() => parsePipe(boundaries), [boundaries]);
  const selectedTraits = useMemo(() => parseCsv(traitStack), [traitStack]);
  const monetization = useMemo(() => {
    if (!profileSummary) return null;

    return buildMonetizationSnapshot({
      user: profileSummary.user,
      usage: {
        characterCount: profileSummary.characterCount,
        conversationCount: profileSummary.conversationCount,
        publicCharacterCount: profileSummary.publicCharacterCount,
        rerollsThisMonth: profileSummary.rerollsThisMonth,
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
      tone: form.tone,
      setting: form.setting,
      relationshipToUser: form.relationshipToUser,
      sceneGoal: form.sceneGoal,
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
    form.tone,
    form.setting,
    form.relationshipToUser,
    form.sceneGoal,
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
    avatarStyle,
    skinTone,
    hair,
    hairTexture,
    eyes,
    eyeShape,
    makeupStyle,
    accessoryVibe,
    bodyType,
    bustSize,
    hipsType,
    waistDefinition,
    heightImpression,
    outfit,
    palette,
    exposureLevel,
    camera,
    lightingMood,
    signatureDetail,
  ]
    .filter(Boolean)
    .join(" • ");
  const visualTags = [
    avatarStyle,
    skinTone,
    hair,
    hairTexture,
    eyes,
    eyeShape,
    makeupStyle,
    accessoryVibe,
    bodyType,
    bustSize,
    hipsType,
    waistDefinition,
    heightImpression,
    outfit,
    palette,
    exposureLevel,
    camera,
    lightingMood,
    photoPack,
    signatureDetail,
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
    lastAvatarNegativePrompt,
    lastAvatarPromptInput,
    lastAvatarResolvedPrompt,
  } = useAvatarGeneration({
    form,
    safety: avatarSafetyInput,
    setBanner,
    setActiveStep,
  });

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
    avatarProvider,
    avatarSafetyInput,
    draft,
    form,
    generatedAvatarUrl,
    lastAvatarNegativePrompt,
    lastAvatarPromptInput,
    lastAvatarResolvedPrompt,
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
    { label: "Region", value: form.region.trim() },
    { label: "Profession", value: profession },
    { label: "Traits", value: selectedTraits.join(" • ") },
    { label: "Skin", value: skinTone },
    { label: "Eyes", value: [eyes, eyeShape].filter(Boolean).join(" • ") },
    { label: "Hair", value: [hair, hairTexture].filter(Boolean).join(" • ") },
    { label: "Body", value: [bodyType, bustSize, hipsType].filter(Boolean).join(" • ") },
    { label: "Style", value: [outfit, lightingMood, palette].filter(Boolean).join(" • ") },
    { label: "Scenario", value: form.customScenario.trim() || [form.setting.trim(), form.sceneGoal.trim(), form.tone.trim()].filter(Boolean).join(" • ") },
  ].filter((item) => item.value);

  const resultPreviewUrl = resultImageUrl || generatedAvatarUrl;
  const readyVisualSteps: VisualWizardStep[] = [
    "identity",
    "traits",
    "face",
    "hair",
    "body",
    "style",
    "scenario",
    "review",
  ];
  const readyVisualStepIndex = readyVisualSteps.indexOf(visualWizardStep);
  const canAdvanceVisualStep =
    visualWizardStep === "prompt"
      ? Boolean(form.name.trim() && form.age.trim() && promptIdea.trim())
      : visualWizardStep === "identity"
        ? Boolean(form.name.trim() && form.age.trim() && form.region.trim())
        : visualWizardStep === "traits"
          ? Boolean(profession && selectedTraits.length > 0)
        : visualWizardStep === "face"
          ? Boolean(skinTone && eyes)
          : visualWizardStep === "hair"
            ? Boolean(hair.trim())
            : visualWizardStep === "body"
              ? Boolean(bodyType && bustSize && hipsType)
              : visualWizardStep === "style"
                ? Boolean(outfit && lightingMood)
                : visualWizardStep === "scenario"
                  ? Boolean(form.sceneGoal.trim() && (form.customScenario.trim() || form.setting.trim()))
                : true;
  const currentBanner = banner;
  const currentReadyStepCopy =
    creationTrack === "ready" &&
    readyVisualSteps.includes(visualWizardStep as (typeof readyVisualSteps)[number])
      ? READY_STEP_COPY[
          visualWizardStep as Exclude<
            VisualWizardStep,
            "entry" | "track" | "prompt" | "generating" | "result"
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
      setField("setting", form.setting || "private luxury interior");
      setField("relationshipToUser", form.relationshipToUser || "new attraction");
      setField("sceneGoal", form.sceneGoal || "build chemistry slowly");
      setField("tone", form.tone || "cinematic, intimate, premium");
      rebuildCustomNotes({
        "Image prompt": promptIdea,
        "Visual aura": visualNote || "clean luxury",
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
      const created = await createMyCustomCharacter(draft);

      if (generatedAvatarUrl && lastAvatarPromptInput) {
        await requestImageGeneration({
          provider: avatarProvider,
          kind: "avatar",
          characterId: created.id,
          userId: created.user_id,
          promptInput: lastAvatarPromptInput,
          safety: avatarSafetyInput,
          previewImageUrl: generatedAvatarUrl,
          previewResolvedPrompt: lastAvatarResolvedPrompt,
          previewNegativePrompt: lastAvatarNegativePrompt,
        });
      }

      setCreatedCharacter(created);
      setResultImageUrl(generatedAvatarUrl);
      setVisualWizardStep("result");
      setBanner({
        type: "success",
        message: `"${created.name}" is ready.`,
      });
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
      setVisualWizardStep("review");
    } finally {
      setSaving(false);
      setPendingCharacterCreation(false);
    }
  }, [
    avatarProvider,
    avatarSafetyInput,
    draft,
    generatedAvatarUrl,
    lastAvatarNegativePrompt,
    lastAvatarPromptInput,
    lastAvatarResolvedPrompt,
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
      setField("setting", "private luxury interior");
    }

    if (!form.relationshipToUser.trim()) {
      setField("relationshipToUser", "new attraction");
    }

    if (!form.sceneGoal.trim()) {
      setField("sceneGoal", creationTrack === "prompt" ? "turn the prompt into a vivid first impression" : "build chemistry slowly");
    }

    if (!form.tone.trim()) {
      setField("tone", creationTrack === "prompt" ? "cinematic, intimate, premium" : "stylish, magnetic, intimate");
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
      const result = await requestImageGeneration({
        provider: avatarProvider,
        kind: "avatar",
        characterId: createdCharacter.id,
        userId: createdCharacter.user_id,
        promptInput: lastAvatarPromptInput,
        safety: avatarSafetyInput,
        consistencySourceImageUrl: resultImageUrl ?? generatedAvatarUrl ?? null,
        consistencyStrength: "strict",
      });

      if (!result.ok || !result.imageUrl) {
        throw new Error(result.errorMessage || "Could not regenerate image.");
      }

      setResultImageUrl(result.imageUrl);
      setBanner({
        type: "success",
        message: "A fresh image was generated with the same selections.",
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
      setVisualWizardStep("review");
    }
  }, [avatarJobStatus, pendingCharacterCreation]);

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

            {visualWizardStep === "entry" ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <VisualHeroCard
                  title="Woman"
                  subtitle="Build a visual-first female character with region, face, hair, body, style, AI image generation, and direct chat handoff."
                  gradient="from-fuchsia-500/45 via-rose-400/20 to-cyan-500/20"
                  active={creatorEntry === "women"}
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
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
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
                      max={55}
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
                      placeholder="luxury brunette woman, dangerous eye contact, fitted black dress, soft gold light, premium editorial portrait, intense but elegant..."
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
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Current opening preview</div>
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

            {["identity", "traits", "face", "hair", "body", "style", "scenario", "review"].includes(visualWizardStep) && creationTrack === "ready" ? (
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3 px-2">
                      <div className="text-xs uppercase tracking-[0.2em] text-white/45">Build progress</div>
                      <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/65">
                        Step {["identity", "traits", "face", "hair", "body", "style", "scenario", "review"].indexOf(visualWizardStep) + 1} / 8
                      </div>
                    </div>
                    <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 transition-all"
                        style={{
                          width: `${((["identity", "traits", "face", "hair", "body", "style", "scenario", "review"].indexOf(visualWizardStep) + 1) / 8) * 100}%`,
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
                        {step}
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
                          max={55}
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

                  {visualWizardStep === "traits" ? (
                    <Section title="Traits and profession" description="Pick a job and the personality traits that should shape how she behaves." accent="cyan">
                      <div className="grid gap-4 md:grid-cols-2">
                        <SelectField
                          label="Profession"
                          value={profession || ""}
                          onChange={(value) => rebuildCustomNotes({ Profession: value })}
                          options={[
                            { value: "", label: "Select a profession" },
                            ...PROFESSION_OPTIONS.map((value) => ({ value, label: value })),
                          ]}
                        />
                        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                            Selected traits
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedTraits.length > 0 ? (
                              selectedTraits.map((trait) => (
                                <button
                                  key={trait}
                                  type="button"
                                  onClick={() => toggleTrait(trait)}
                                  className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-100"
                                >
                                  {TRAIT_EMOJI[trait as keyof typeof TRAIT_EMOJI]} {trait}
                                </button>
                              ))
                            ) : (
                              <span className="text-sm text-white/55">
                                Pick at least one trait.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">
                          Personality traits
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
                              <button
                                key={trait}
                                type="button"
                                onClick={() => toggleTrait(trait)}
                                className={cn(
                                  "rounded-[20px] border px-4 py-3 text-left text-sm transition",
                                  active
                                    ? "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100"
                                    : disabled
                                      ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/25"
                                      : "border-white/10 bg-white/[0.03] text-white/78 hover:border-white/20 hover:bg-white/[0.05]",
                                )}
                              >
                                <span className="mr-2">
                                  {TRAIT_EMOJI[trait as keyof typeof TRAIT_EMOJI]}
                                </span>
                                {trait}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </Section>
                  ) : null}

                  {visualWizardStep === "face" ? (
                    <Section title="Face and eyes" description="Choose the face anchors before hair and body." accent="cyan">
                      <div>
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Skin tone</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {FACE_CHOICES.skinTone.map((option) => (
                            <VisualChoiceCard
                              key={option.value}
                              option={option}
                              active={skinTone === option.value}
                              onClick={() => rebuildCustomNotes({ "Skin tone": option.value })}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-6">
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Eye color</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {FACE_CHOICES.eyes.map((option) => (
                            <VisualChoiceCard
                              key={option.value}
                              option={option}
                              active={eyes === option.value}
                              onClick={() => rebuildCustomNotes({ Eyes: option.value })}
                            />
                          ))}
                        </div>
                      </div>
                    </Section>
                  ) : null}

                  {visualWizardStep === "hair" ? (
                    <Section title="Hair" description="Color, model, and texture set the strongest visual frame." accent="fuchsia">
                      <div>
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Hair color</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {HAIR_COLOR_CHOICES.map((option) => (
                            <VisualChoiceCard
                              key={option.value}
                              option={option}
                              active={hair.toLowerCase().includes(option.value)}
                              onClick={() =>
                                rebuildCustomNotes({
                                  Hair: `${option.value} ${hair.replace(/^(black|dark brown|blonde|auburn|silver ash)\s*/i, "").trim() || "long flowing hair"}`.trim(),
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-6">
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Hair model</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {HAIR_STYLE_CHOICES.map((option) => (
                            <VisualChoiceCard
                              key={option.value}
                              option={option}
                              active={hair.toLowerCase().includes(option.value)}
                              onClick={() =>
                                rebuildCustomNotes({
                                  Hair: `${(hair.match(/^(black|dark brown|blonde|auburn|silver ash)/i)?.[0] || "black")} ${option.value}`.trim(),
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </Section>
                  ) : null}

                  {visualWizardStep === "body" ? (
                    <Section title="Body features" description="These choices stay visual-first and feed a deeper hidden prompt." accent="cyan">
                      <div className="grid gap-6">
                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Body type</div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {BODY_CHOICES.bodyType.map((option) => (
                              <VisualChoiceCard key={option.value} option={option} active={bodyType === option.value} onClick={() => rebuildCustomNotes({ "Body type": option.value })} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Bust type</div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {BODY_CHOICES.bust.map((option) => (
                              <VisualChoiceCard key={option.value} option={option} active={bustSize === option.value} onClick={() => rebuildCustomNotes({ "Bust size": option.value })} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Hip type</div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {BODY_CHOICES.hips.map((option) => (
                              <VisualChoiceCard key={option.value} option={option} active={hipsType === option.value} onClick={() => rebuildCustomNotes({ "Hip shape": option.value })} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </Section>
                  ) : null}

                  {visualWizardStep === "style" ? (
                    <Section title="Style and final mood" description="Outfit and lighting decide how premium the result feels." accent="fuchsia">
                      <div>
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Outfit</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          {STYLE_CHOICES.outfit.map((option) => (
                            <VisualChoiceCard key={option.value} option={option} active={outfit === option.value} onClick={() => rebuildCustomNotes({ Outfit: option.value })} />
                          ))}
                        </div>
                      </div>
                      <div className="mt-6">
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Lighting mood</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          {STYLE_CHOICES.lighting.map((option) => (
                            <VisualChoiceCard key={option.value} option={option} active={lightingMood === option.value} onClick={() => rebuildCustomNotes({ "Lighting mood": option.value })} />
                          ))}
                        </div>
                      </div>
                    </Section>
                  ) : null}

                  {visualWizardStep === "scenario" ? (
                    <Section title="Scenario" description="Choose the situation first, then write your own scene note if you want." accent="cyan">
                      <div>
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Scenario examples</div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {ROLEPLAY_SCENARIO_TEMPLATES.map((template) => {
                            const active =
                              form.customScenario === template.customScenario &&
                              form.setting === template.setting;

                            return (
                              <button
                                key={template.title}
                                type="button"
                                onClick={() => applyRoleplayScenarioTemplate(template)}
                                className={cn(
                                  "rounded-[24px] border p-4 text-left transition",
                                  active
                                    ? "border-fuchsia-400/25 bg-fuchsia-400/10"
                                    : "border-white/10 bg-black/25 hover:border-cyan-400/25 hover:bg-black/35",
                                )}
                              >
                                <div className="text-sm font-medium text-white">
                                  {template.title}
                                </div>
                                <div className="mt-2 text-xs leading-6 text-white/55">
                                  {template.summary}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <InputField
                          label="Setting"
                          value={form.setting}
                          onChange={(value) => setField("setting", value)}
                          placeholder="private penthouse after an event"
                        />
                        <InputField
                          label="Relationship"
                          value={form.relationshipToUser}
                          onChange={(value) => setField("relationshipToUser", value)}
                          placeholder="forbidden attraction"
                        />
                        <InputField
                          label="Scene goal"
                          value={form.sceneGoal}
                          onChange={(value) => setField("sceneGoal", value)}
                          placeholder="keep control while tension grows"
                        />
                        <InputField
                          label="Tone"
                          value={form.tone}
                          onChange={(value) => setField("tone", value)}
                          placeholder="restrained, intimate, expensive"
                        />
                      </div>

                      <div className="mt-6">
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Relationship dynamic</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {ROLEPLAY_DYNAMIC_CHOICES.map((option) => (
                            <VisualChoiceCard
                              key={option.value}
                              option={option}
                              active={relationshipDynamic === option.value}
                              onClick={() => rebuildCustomNotes({ "Relationship dynamic": option.value })}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Scene type</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {ROLEPLAY_SCENE_CHOICES.map((option) => (
                            <VisualChoiceCard
                              key={option.value}
                              option={option}
                              active={sceneType === option.value}
                              onClick={() => rebuildCustomNotes({ "Scene type": option.value })}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-6 xl:grid-cols-2">
                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Behavior mode</div>
                          <div className="grid gap-4 md:grid-cols-2">
                            {ROLEPLAY_BEHAVIOR_CHOICES.map((option) => (
                              <VisualChoiceCard
                                key={option.value}
                                option={option}
                                active={behaviorMode === option.value}
                                onClick={() => rebuildCustomNotes({ "Behavior mode": option.value })}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Arc stage</div>
                          <div className="grid gap-4 md:grid-cols-2">
                            {ROLEPLAY_ARC_CHOICES.map((option) => (
                              <VisualChoiceCard
                                key={option.value}
                                option={option}
                                active={arcStage === option.value}
                                onClick={() => rebuildCustomNotes({ "Arc stage": option.value })}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">How she sees the user</div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {ROLEPLAY_USER_ROLE_CHOICES.map((option) => (
                            <VisualChoiceCard
                              key={option.value}
                              option={option}
                              active={userRole === option.value}
                              onClick={() => rebuildCustomNotes({ "User role": option.value })}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-6">
                        <TextAreaField
                          label="Custom scenario"
                          value={form.customScenario}
                          onChange={(value) => setField("customScenario", value)}
                          placeholder="Write the exact moment you want. Example: She closes the penthouse door, keeps her voice low, and finally admits she has been watching you all night."
                          rows={6}
                        />
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <SelectField
                          label="User role"
                          value={userRole || USER_ROLE_OPTIONS_EXTENDED[0]}
                          onChange={(value) => rebuildCustomNotes({ "User role": value })}
                          options={USER_ROLE_OPTIONS_EXTENDED.map((value) => ({ value, label: value }))}
                        />
                        <SelectField
                          label="Behavior mode"
                          value={behaviorMode || BEHAVIOR_MODE_OPTIONS[0]}
                          onChange={(value) => rebuildCustomNotes({ "Behavior mode": value })}
                          options={BEHAVIOR_MODE_OPTIONS.map((value) => ({ value, label: value }))}
                        />
                      </div>
                    </Section>
                  ) : null}

                  {visualWizardStep === "review" ? (
                    <Section title="Final review" description="These are the selected visual anchors the AI will use." accent="cyan">
                      <div className="mb-5 rounded-[24px] border border-emerald-400/15 bg-emerald-400/10 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-100/85">
                          What happens next
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                            1. We turn your choices into a locked image prompt.
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                            2. We generate the avatar and save the full profile.
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/78">
                            3. You can reroll the image or go straight into chat.
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                          Once this character is created, it becomes locked. You will be able to
                          open it and chat with it later, but you will not be able to edit its
                          identity, roleplay setup, or visual profile.
                        </p>
                      </div>

                      {monetization ? (
                        <div className="mt-5 rounded-[24px] border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/85">
                                Current plan
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

                  {visualWizardStep !== "review" ? (
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
                      <button type="button" onClick={handleVisualCreate} disabled={saving || avatarGenerating} className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60">
                        {saving || avatarGenerating ? "Creating your locked character..." : "Create locked character"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <Section title="Live summary" description="The current look and opening feel update live." accent="cyan">
                    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/40">Chosen look</div>
                      <p className="mt-3 text-sm leading-7 text-white/80">{visualSummary || "Selections will appear here."}</p>
                    </div>
                    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/40">Opening line</div>
                      <p className="mt-3 text-sm leading-7 text-white/80">{openingPack.greeting}</p>
                    </div>
                    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/40">Scenario focus</div>
                      <p className="mt-3 text-sm leading-7 text-white/80">
                        {form.customScenario.trim() || openingPack.openingSummary}
                      </p>
                    </div>
                    {monetization ? (
                      <div className="rounded-[26px] border border-fuchsia-400/20 bg-fuchsia-400/10 p-5">
                        <div className="text-xs uppercase tracking-[0.18em] text-fuchsia-100/80">Plan status</div>
                        <p className="mt-3 text-sm leading-7 text-white/82">
                          {monetization.currentPlan.label} gives you {monetization.currentPlan.customCharacterSlots} locked character slots and{" "}
                          {monetization.currentPlan.monthlyRerolls} image rerolls each month.
                        </p>
                        <p className="mt-3 text-xs leading-6 text-white/60">
                          {monetization.slotUsageLabel} • {monetization.rerollUsageLabel}
                        </p>
                      </div>
                    ) : null}
                    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/40">Personality build</div>
                      <p className="mt-3 text-sm leading-7 text-white/80">
                        {[profession, selectedTraits.join(", ")].filter(Boolean).join(" • ") || "Profession and traits will appear here."}
                      </p>
                    </div>
                    <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                      <div className="text-xs uppercase tracking-[0.18em] text-white/40">Selected stack</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {visualTags.slice(0, 8).map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <RoleplaySummaryCard
                        label="User role"
                        value={userRole}
                        helper="How she frames the user emotionally."
                      />
                      <RoleplaySummaryCard
                        label="Dynamic"
                        value={relationshipDynamic}
                        helper="The main emotional pattern of the connection."
                      />
                      <RoleplaySummaryCard
                        label="Scene type"
                        value={sceneType}
                        helper="The situation that shapes her replies."
                      />
                      <RoleplaySummaryCard
                        label="Behavior"
                        value={behaviorMode}
                        helper="How direct, teasing, guarded, or controlling she feels."
                      />
                      <RoleplaySummaryCard
                        label="Arc stage"
                        value={arcStage}
                        helper="How far the bond has already developed."
                      />
                    </div>
                  </Section>
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
                      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resultPreviewUrl} alt={createdCharacter.name} className="h-[520px] w-full object-cover" />
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
