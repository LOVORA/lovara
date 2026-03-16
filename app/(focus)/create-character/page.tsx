"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  createMyCustomCharacter,
  type CharacterDraftInput,
} from "@/lib/account";
import {
  createCharacterImageJob,
  markCharacterImageJobCompleted,
  uploadGeneratedCharacterImage,
} from "@/lib/character-images";
import {
  getDefaultImageProvider,
  requestImageGeneration,
  type CharacterImagePromptInput as ProviderCharacterImagePromptInput,
  type CharacterImageSafetyInput,
  type ImageProvider,
} from "@/lib/image-provider";
import {
  ARCHETYPE_OPTIONS,
  CORE_VIBE_OPTIONS,
  GENDER_OPTIONS,
  RELATIONSHIP_PACE_OPTIONS,
  REPLY_LENGTH_OPTIONS,
  SPEECH_STYLE_OPTIONS,
  buildCharacterDraftFromStudio,
  defaultStudioForm,
  type CoreVibeId,
  type StudioFormState,
} from "@/lib/custom-character-studio";
import {
  buildLegacyAvatarPromptInputCompat,
  buildLegacyBuilderV2Summary,
} from "@/lib/create-character/builder-v2-compat";

const AuthGuard = dynamic(() => import("@/components/auth/auth-guard"), {
  ssr: false,
});

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

type StudioStep =
  | "identity"
  | "personality"
  | "scenario"
  | "advanced"
  | "visual"
  | "publish";

type TemplateMode = "quick" | "deep";

type AvatarJobLifecycle =
  | "idle"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

type ProviderJobStatusResponse = {
  ok: boolean;
  status?: "queued" | "processing" | "completed" | "failed";
  imageUrl?: string | null;
  externalJobId?: string | null;
  errorMessage?: string | null;
  revisedPrompt?: string | null;
  revisedNegativePrompt?: string | null;
};

type CharacterTemplate = {
  id: string;
  title: string;
  badge: string;
  description: string;
  mode: TemplateMode;
  values: {
    region: string;
    age: number;
    archetype: StudioFormState["archetype"];
    coreVibes: CoreVibeId[];
    warmth: number;
    assertiveness: number;
    mystery: number;
    playfulness: number;
    speechStyle: StudioFormState["speechStyle"];
    replyLength: StudioFormState["replyLength"];
    relationshipPace: StudioFormState["relationshipPace"];
    tone: string;
    setting: string;
    relationshipToUser: string;
    sceneGoal: string;
    visualAura?: string;
    interests?: string[];
    avatarStyle?: string;
    hair?: string;
    eyes?: string;
    outfit?: string;
    palette?: string;
    camera?: string;
    photoPack?: string;
    publicTagline?: string;
    publicTeaser?: string;
    publicTags?: string[];
  };
};

const REGION_OPTIONS = [
  "Latin",
  "Mediterranean",
  "Middle Eastern",
  "Slavic",
  "Nordic",
  "East Asian",
  "South Asian",
  "Southeast Asian",
  "African",
  "Mixed",
  "Global",
] as const;

const VISUAL_AURA_OPTIONS = [
  "clean luxury",
  "soft natural beauty",
  "old-money elegance",
  "dangerous charm",
  "girl-next-door warmth",
  "high-fashion edge",
  "dark feminine aura",
  "quiet intellectual",
  "sporty confidence",
  "artsy mystery",
] as const;

const INTEREST_ANCHOR_OPTIONS = [
  "late-night drives",
  "jazz bars",
  "poetry",
  "boxing",
  "fashion",
  "coffee rituals",
  "vinyl records",
  "photography",
  "books",
  "gaming",
  "travel",
  "fitness",
  "cooking",
  "art museums",
  "beach nights",
] as const;

const RELATIONSHIP_PRESETS = [
  "best friends with tension",
  "emotionally guarded co-worker",
  "ex who never fully left",
  "strangers with instant chemistry",
  "rivals with attraction",
  "protective older presence",
  "sweet but dangerous obsession",
  "soft slow-burn partner energy",
] as const;

const RELATIONSHIP_STAGE_OPTIONS = [
  "strangers",
  "new attraction",
  "friends",
  "close friends",
  "exes",
  "rivals",
  "lovers",
  "forbidden tension",
] as const;

const USER_ROLE_OPTIONS = [
  "the one they secretly want",
  "close friend",
  "new obsession",
  "trusted confidant",
  "dangerous temptation",
  "co-worker they can't ignore",
  "ex they never got over",
  "rival they keep watching",
] as const;

const GREETING_STYLE_OPTIONS = [
  "soft first message",
  "flirty first message",
  "cold and intriguing",
  "playful chaos opener",
  "emotionally loaded opener",
] as const;

const CHAT_MODE_OPTIONS = [
  "companion",
  "roleplay",
  "narrative",
  "romance",
  "slow-burn",
] as const;

const INITIATIVE_OPTIONS = ["reactive", "balanced", "proactive"] as const;

const AFFECTION_STYLE_OPTIONS = [
  "verbal",
  "teasing",
  "protective",
  "subtle",
  "clingy-coded",
  "physical-coded",
] as const;

const CONFLICT_STYLE_OPTIONS = [
  "avoids conflict",
  "calm but sharp",
  "sarcastic",
  "emotionally intense",
  "withdraws first",
  "apologizes late",
] as const;

const EMOTIONAL_AVAILABILITY_OPTIONS = [
  "guarded",
  "slow to open",
  "balanced",
  "emotionally open",
  "intensely transparent",
] as const;

const MESSAGE_FORMAT_OPTIONS = [
  "plain dialogue",
  "short chat messages",
  "descriptive roleplay",
  "mixed action + dialogue",
] as const;

const LINGUISTIC_FLAVOR_OPTIONS = [
  "polished",
  "soft feminine",
  "elegant masculine",
  "street-smart",
  "intellectual",
  "playful casual",
] as const;

const BOUNDARY_OPTIONS = [
  "avoid instant attachment",
  "avoid robotic reassurance",
  "avoid overly explicit exposition",
  "avoid repetitive pet names",
  "avoid sounding too submissive",
  "avoid sounding too cold for too long",
  "avoid therapist-like replies",
  "avoid generic flattery",
] as const;

const CHEMISTRY_TEMPLATE_OPTIONS = [
  "forbidden attraction",
  "soft comfort",
  "playful tension",
  "obsession arc",
  "enemies to lovers",
  "emotionally damaged but attached",
] as const;

const CURRENT_ENERGY_OPTIONS = [
  "calm",
  "playful",
  "guarded",
  "tired",
  "jealous",
  "emotionally fragile",
  "needy",
  "composed but intense",
] as const;

const AVATAR_STYLE_OPTIONS = [
  "cinematic realism",
  "luxury portrait",
  "soft natural",
  "editorial fashion",
  "dark moody",
  "romantic glow",
  "anime-inspired realism",
  "minimal clean studio",
] as const;

const HAIR_OPTIONS = [
  "long dark hair",
  "soft brown waves",
  "blonde sleek look",
  "short sharp cut",
  "messy layered hair",
  "curly textured hair",
  "black silky hair",
  "auburn romantic hair",
] as const;

const EYE_OPTIONS = [
  "dark eyes",
  "hazel eyes",
  "grey eyes",
  "green eyes",
  "soft brown eyes",
  "icy blue eyes",
] as const;

const OUTFIT_OPTIONS = [
  "old-money chic",
  "black dress elegance",
  "street-luxury fit",
  "oversized hoodie comfort",
  "tailored office look",
  "sporty fitted look",
  "artsy layered fashion",
  "soft knitwear intimacy",
] as const;

const PALETTE_OPTIONS = [
  "black / silver",
  "cream / gold",
  "wine red / black",
  "white / beige",
  "navy / gold",
  "emerald / black",
  "rose / ivory",
  "charcoal / blue",
] as const;

const CAMERA_OPTIONS = [
  "close-up portrait",
  "waist-up portrait",
  "full body pose",
  "over-the-shoulder glance",
  "soft candid angle",
  "editorial front-facing shot",
] as const;

const PHOTO_PACK_OPTIONS = [
  "luxury portraits",
  "mirror selfies",
  "daily lifestyle set",
  "romantic candid set",
  "night-out set",
  "soft home set",
] as const;

const SCENE_PRESETS = [
  {
    title: "Midnight luxury",
    setting: "private suite overlooking a city skyline",
    tone: "controlled, intimate, luxurious",
    openingState: "the night feels expensive, quiet, and slightly dangerous",
  },
  {
    title: "After-hours tension",
    setting: "empty office after everyone has left",
    tone: "restrained, charged, emotionally alert",
    openingState:
      "both of you are tired enough to be honest and careful at the same time",
  },
  {
    title: "Cozy vulnerability",
    setting: "dim apartment living room during a quiet night in",
    tone: "soft, close, emotionally open",
    openingState: "the mood is gentle, private, and unguarded",
  },
  {
    title: "Flirt-first chaos",
    setting: "late-night walk after a messy, funny day",
    tone: "playful, chemistry-driven, quick",
    openingState:
      "the conversation is already alive with teasing and unfinished tension",
  },
] as const;

const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    id: "soft-latin-muse",
    title: "Soft Latin Muse",
    badge: "Premium slow-burn",
    description:
      "Warm, teasing, emotionally magnetic, premium slow-burn energy.",
    mode: "quick",
    values: {
      region: "Latin",
      age: 24,
      archetype: "elegant-muse",
      coreVibes: ["soft", "teasing", "intense"],
      warmth: 68,
      assertiveness: 56,
      mystery: 58,
      playfulness: 62,
      speechStyle: "soft",
      replyLength: "balanced",
      relationshipPace: "slow-burn",
      tone: "warm, sensual, emotionally aware",
      setting: "upscale lounge after midnight",
      relationshipToUser:
        "someone familiar enough to tease, distant enough to intrigue",
      sceneGoal:
        "intensify emotional tension without collapsing into blunt confession",
      visualAura: "clean luxury",
      interests: ["jazz bars", "fashion", "late-night drives"],
      avatarStyle: "luxury portrait",
      hair: "long dark hair",
      eyes: "hazel eyes",
      outfit: "black dress elegance",
      palette: "wine red / black",
      camera: "close-up portrait",
      photoPack: "luxury portraits",
      publicTagline: "Warmth, luxury, and dangerous intimacy in one character.",
      publicTeaser:
        "A polished romantic character with softness, tension, and upscale emotional pull.",
      publicTags: ["slow burn", "luxury", "romantic", "teasing"],
    },
  },
  {
    id: "witty-bestfriend",
    title: "Witty Best-Friend",
    badge: "Fast chemistry",
    description:
      "Fast chemistry, banter-heavy, cozy but flirt-forward and addictive.",
    mode: "quick",
    values: {
      region: "Mediterranean",
      age: 22,
      archetype: "best-friend-lover",
      coreVibes: ["witty", "teasing", "soft"],
      warmth: 72,
      assertiveness: 46,
      mystery: 30,
      playfulness: 84,
      speechStyle: "witty",
      replyLength: "balanced",
      relationshipPace: "balanced",
      tone: "quick, playful, naturally intimate",
      setting: "late-night walk after a chaotic day",
      relationshipToUser: "best friend with unresolved tension",
      sceneGoal: "keep flirting alive while pretending it means nothing",
      visualAura: "girl-next-door warmth",
      interests: ["coffee rituals", "gaming", "beach nights"],
      avatarStyle: "soft natural",
      hair: "soft brown waves",
      eyes: "soft brown eyes",
      outfit: "oversized hoodie comfort",
      palette: "white / beige",
      camera: "soft candid angle",
      photoPack: "daily lifestyle set",
      publicTagline: "Banter, comfort, and chemistry that feels instant.",
      publicTeaser:
        "A playful best-friend energy template built for teasing, comfort, and emotional closeness.",
      publicTags: ["banter", "best friend", "soft", "playful"],
    },
  },
  {
    id: "cold-luxury",
    title: "Cold Luxury",
    badge: "High-status tension",
    description:
      "Controlled, hard-to-read, premium elegance with slow-burn dominance.",
    mode: "deep",
    values: {
      region: "Nordic",
      age: 29,
      archetype: "ice-queen",
      coreVibes: ["mysterious", "dominant", "slowburn"],
      warmth: 36,
      assertiveness: 76,
      mystery: 86,
      playfulness: 28,
      speechStyle: "poetic",
      replyLength: "detailed",
      relationshipPace: "slow-burn",
      tone: "controlled, elegant, restrained",
      setting: "private suite overlooking a city skyline",
      relationshipToUser: "someone she tests before she trusts",
      sceneGoal: "make tension feel expensive, earned, and hard to read",
      visualAura: "old-money elegance",
      interests: ["art museums", "vinyl records", "travel"],
      avatarStyle: "editorial fashion",
      hair: "blonde sleek look",
      eyes: "grey eyes",
      outfit: "old-money chic",
      palette: "cream / gold",
      camera: "editorial front-facing shot",
      photoPack: "night-out set",
      publicTagline: "Elegant, unreadable, and impossible to forget.",
      publicTeaser:
        "Luxury-coded emotional tension with cold restraint, selective warmth, and slow-burn dominance.",
      publicTags: ["luxury", "cold", "slow burn", "elite"],
    },
  },
  {
    id: "dangerous-obsession",
    title: "Dangerous Obsession",
    badge: "Dark fantasy",
    description:
      "Possessive tension, magnetic danger, and obsession-driven chemistry.",
    mode: "deep",
    values: {
      region: "Middle Eastern",
      age: 28,
      archetype: "ice-queen",
      coreVibes: ["intense", "dominant", "mysterious"],
      warmth: 34,
      assertiveness: 82,
      mystery: 78,
      playfulness: 24,
      speechStyle: "poetic",
      replyLength: "balanced",
      relationshipPace: "slow-burn",
      tone: "dangerous, intimate, quietly possessive",
      setting: "private car ride through the city at night",
      relationshipToUser: "someone they protect too intensely",
      sceneGoal: "build dark attachment without losing elegance",
      visualAura: "dangerous charm",
      interests: ["boxing", "late-night drives", "poetry"],
      avatarStyle: "dark moody",
      hair: "black silky hair",
      eyes: "dark eyes",
      outfit: "street-luxury fit",
      palette: "black / silver",
      camera: "over-the-shoulder glance",
      photoPack: "night-out set",
      publicTagline: "Obsessive protection with premium dark chemistry.",
      publicTeaser:
        "A dark, possessive, emotionally intense character with controlled danger and private loyalty.",
      publicTags: ["dark", "obsession", "protective", "dangerous"],
    },
  },
  {
    id: "soft-comfort",
    title: "Soft Comfort",
    badge: "Companion energy",
    description:
      "Gentle reassurance, emotional safety, and warm relationship depth.",
    mode: "quick",
    values: {
      region: "Global",
      age: 25,
      archetype: "elegant-muse",
      coreVibes: ["soft", "teasing", "intense"],
      warmth: 84,
      assertiveness: 38,
      mystery: 24,
      playfulness: 50,
      speechStyle: "soft",
      replyLength: "balanced",
      relationshipPace: "balanced",
      tone: "safe, kind, emotionally available",
      setting: "quiet apartment during a rainy evening",
      relationshipToUser: "someone they care for deeply and calmly",
      sceneGoal: "create comfort and trust quickly",
      visualAura: "soft natural beauty",
      interests: ["books", "coffee rituals", "cooking"],
      avatarStyle: "romantic glow",
      hair: "auburn romantic hair",
      eyes: "soft brown eyes",
      outfit: "soft knitwear intimacy",
      palette: "rose / ivory",
      camera: "soft candid angle",
      photoPack: "soft home set",
      publicTagline: "A gentle emotional presence built for comfort and trust.",
      publicTeaser:
        "Warm, loyal, and emotionally steady companion energy for softer chats and slower closeness.",
      publicTags: ["comfort", "soft", "gentle", "companion"],
    },
  },
  {
    id: "elite-rival",
    title: "Elite Rival",
    badge: "Sharp tension",
    description:
      "Competitive attraction, high-status rivalry, and sharp emotional control.",
    mode: "deep",
    values: {
      region: "Slavic",
      age: 31,
      archetype: "best-friend-lover",
      coreVibes: ["witty", "dominant", "slowburn"],
      warmth: 42,
      assertiveness: 80,
      mystery: 62,
      playfulness: 54,
      speechStyle: "witty",
      replyLength: "balanced",
      relationshipPace: "slow-burn",
      tone: "sharp, elegant, competitive",
      setting: "exclusive event where both of you are pretending not to care",
      relationshipToUser: "rival they watch too closely",
      sceneGoal: "turn rivalry into addictive attraction",
      visualAura: "high-fashion edge",
      interests: ["fashion", "travel", "art museums"],
      avatarStyle: "editorial fashion",
      hair: "short sharp cut",
      eyes: "green eyes",
      outfit: "tailored office look",
      palette: "navy / gold",
      camera: "waist-up portrait",
      photoPack: "luxury portraits",
      publicTagline:
        "Luxury rivalry with controlled flirtation and elite tension.",
      publicTeaser:
        "A polished rival template designed for status games, chemistry, and restrained attraction.",
      publicTags: ["rival", "elite", "luxury", "sharp"],
    },
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ageToneLabel(age: number) {
  if (age <= 21) return "younger energy";
  if (age <= 27) return "prime young-adult";
  if (age <= 35) return "confident adult";
  if (age <= 45) return "mature presence";
  return "seasoned presence";
}

function meterTone(value: number) {
  if (value <= 25) return "low";
  if (value <= 50) return "balanced-low";
  if (value <= 75) return "balanced-high";
  return "high";
}

function extractStructuredLine(source: string, prefix: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^${escaped}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function removeStructuredLine(source: string, prefix: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`^${escaped}:\\s*.+$(\\n)?`, "m"), "").trim();
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePipe(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toggleListItem(list: string[], item: string, max = 5) {
  if (list.includes(item)) {
    return list.filter((value) => value !== item);
  }
  if (list.length >= max) {
    return [...list.slice(1), item];
  }
  return [...list, item];
}

function calculateReadinessScore(
  form: StudioFormState,
  extras: Record<string, string>,
  isQuickMode: boolean,
) {
  let score = 0;

  if (form.name.trim()) score += 10;
  if (form.region.trim()) score += 8;
  if (form.age.trim()) score += 8;
  if (form.archetype.trim()) score += 10;
  if (form.coreVibes.length >= 2) score += 10;
  if (form.setting.trim()) score += 8;
  if (form.relationshipToUser.trim()) score += 8;
  if (form.sceneGoal.trim()) score += 8;

  if (!isQuickMode) {
    if (form.tone.trim()) score += 4;
    if (form.openingState.trim()) score += 4;
    if (form.tags.trim()) score += 3;
    if (form.customNotes.trim()) score += 3;
    Object.values(extras).forEach((value) => {
      if (value.trim()) score += 2;
    });
  }

  return Math.min(100, score);
}

function getStepCompletion(
  step: StudioStep,
  form: StudioFormState,
  readinessScore: number,
  isQuickMode: boolean,
) {
  switch (step) {
    case "identity":
      return Boolean(form.name.trim() && form.age.trim() && form.region.trim());
    case "personality":
      return form.coreVibes.length >= 2;
    case "scenario":
      return Boolean(
        form.setting.trim() &&
          form.relationshipToUser.trim() &&
          form.sceneGoal.trim(),
      );
    case "advanced":
      return isQuickMode ? true : readinessScore >= 60;
    case "visual":
      return isQuickMode ? true : Boolean(form.customNotes.trim());
    case "publish":
      return readinessScore >= (isQuickMode ? 45 : 70);
    default:
      return false;
  }
}

function enrichDraftForBuilderV2Compat(
  draft: CharacterDraftInput,
  args: {
    form: Pick<
      StudioFormState,
      | "mode"
      | "name"
      | "age"
      | "region"
      | "archetype"
      | "genderPresentation"
      | "visibility"
      | "coreVibes"
      | "warmth"
      | "assertiveness"
      | "mystery"
      | "playfulness"
      | "tone"
      | "setting"
      | "relationshipToUser"
      | "sceneGoal"
      | "customNotes"
    >;
  },
): CharacterDraftInput {
  const { hiddenPromptInput, promptEngineOutput, notes } =
    buildLegacyBuilderV2Summary(args.form);

  const safePayload =
    draft.payload &&
    typeof draft.payload === "object" &&
    !Array.isArray(draft.payload)
      ? draft.payload
      : {};

  return {
    ...draft,
    payload: {
      ...safePayload,
      builderV2: true,
      styleType: hiddenPromptInput.styleType,
      builderMode: hiddenPromptInput.builderMode,
      promptVersion: "v1",
      promptSummary: promptEngineOutput.promptSummary,
      canonicalPrompt: promptEngineOutput.canonicalPrompt,
      negativePrompt: promptEngineOutput.negativePrompt,
      identityLock: promptEngineOutput.identityLock,
      generationHints: promptEngineOutput.generationHints,
      moderationFlags: promptEngineOutput.moderationFlags,
      visualProfile: {
        visualAura: notes["Visual aura"] || "",
        avatarStyle: notes["Avatar style"] || "",
        hair: notes["Hair"] || "",
        eyes: notes["Eyes"] || "",
        outfit: notes["Outfit"] || "",
        palette: notes["Palette"] || "",
        camera: notes["Camera"] || "",
        photoPack: notes["Photo pack"] || "",
      },
      publicProfile: {
        tagline: notes["Public tagline"] || "",
        teaser: notes["Public teaser"] || "",
        tags: (notes["Public tags"] || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    },
  };
}

function Section({
  title,
  description,
  accent = "default",
  children,
}: {
  title: string;
  description?: string;
  accent?: "default" | "fuchsia" | "cyan";
  children: ReactNode;
}) {
  const accentClass =
    accent === "fuchsia"
      ? "from-fuchsia-400/8"
      : accent === "cyan"
        ? "from-cyan-400/8"
        : "from-white/[0.04]";

  return (
    <section
      className={cn(
        "rounded-[30px] border border-white/10 bg-gradient-to-br to-transparent p-5 md:p-6",
        accentClass,
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-white/60">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-white/75">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30 focus:bg-black/40"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-white/75">{label}</div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30 focus:bg-black/40"
      />
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm transition",
        active
          ? "bg-white text-black"
          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function OptionCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[24px] border p-4 text-left transition",
        active
          ? "border-fuchsia-400/40 bg-fuchsia-400/10 shadow-[0_0_0_1px_rgba(217,70,239,0.12)]"
          : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-black/35",
      )}
    >
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>
    </button>
  );
}

function VibeChip({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[22px] border px-4 py-3 text-left transition",
        active
          ? "border-cyan-400/35 bg-cyan-400/10"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      <div className="text-sm font-medium text-white">{label}</div>
      <div className="mt-1 text-xs leading-5 text-white/55">{description}</div>
    </button>
  );
}

function MiniChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-xs transition",
        active
          ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      {label}
    </button>
  );
}

function RegionChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-sm transition",
        active
          ? "border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-100"
          : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      {label}
    </button>
  );
}

function PresetCard({
  title,
  badge,
  description,
  active,
  onClick,
}: {
  title: string;
  badge: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-[26px] border p-4 text-left transition",
        active
          ? "border-fuchsia-400/35 bg-gradient-to-br from-fuchsia-400/12 to-cyan-400/12 shadow-[0_0_0_1px_rgba(217,70,239,0.12)]"
          : "border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] hover:border-fuchsia-400/25 hover:from-fuchsia-400/10 hover:to-cyan-400/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45 transition group-hover:text-fuchsia-100">
          {badge}
        </div>
      </div>
      <div className="mt-2 text-sm leading-6 text-white/60">{description}</div>
      <div className="mt-4 text-xs uppercase tracking-[0.18em] text-fuchsia-200/80">
        {active ? "Applied" : "Apply template"}
      </div>
    </button>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-white/75">{label}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/55">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-fuchsia-400"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm text-white/75">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition focus:border-fuchsia-400/30 focus:bg-black/40"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#0d1020]"
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-1 text-sm text-white/80">{value}</div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function TopNavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2 text-sm text-fuchsia-100 transition"
          : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10"
      }
    >
      {label}
    </Link>
  );
}

function StepPill({
  title,
  active,
  complete,
  onClick,
}: {
  title: string;
  active: boolean;
  complete: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-xs transition",
        active
          ? "border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-100"
          : complete
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
            : "border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10",
      )}
    >
      {title}
    </button>
  );
}

function DividerLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
        {label}
      </div>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

export default function CreateCharacterPage() {
  const router = useRouter();
  const [form, setForm] = useState<StudioFormState>(defaultStudioForm());
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [dynamism, setDynamism] = useState(68);
  const [activeStep, setActiveStep] = useState<StudioStep>("identity");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const [avatarGenerating, setAvatarGenerating] = useState(false);
  const [avatarProvider, setAvatarProvider] = useState<ImageProvider>(
    getDefaultImageProvider(),
  );
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(
    null,
  );
  const [avatarResultMessage, setAvatarResultMessage] = useState<string | null>(
    null,
  );
  const [avatarQueuedExternalJobId, setAvatarQueuedExternalJobId] = useState<
    string | null
  >(null);
  const [queuedJobProvider, setQueuedJobProvider] =
    useState<ImageProvider | null>(null);
  const [avatarJobStatus, setAvatarJobStatus] =
    useState<AvatarJobLifecycle>("idle");
  const [lastAvatarPromptInput, setLastAvatarPromptInput] =
    useState<ProviderCharacterImagePromptInput | null>(null);
  const [lastAvatarResolvedPrompt, setLastAvatarResolvedPrompt] = useState<
    string | null
  >(null);
  const [lastAvatarNegativePrompt, setLastAvatarNegativePrompt] = useState<
    string | null
  >(null);

  const isQuickMode = form.mode === "quick";

  const structuredKeys = [
    "Region note",
    "Visual aura",
    "Interest anchors",
    "Response directive",
    "Key memories",
    "Example message",
    "User role",
    "Nickname for user",
    "Boundaries",
    "Greeting style",
    "Chat mode",
    "Avatar style",
    "Hair",
    "Eyes",
    "Outfit",
    "Palette",
    "Camera",
    "Photo pack",
    "Image prompt",
    "Dynamism",
    "Relationship stage",
    "Jealousy",
    "Attachment",
    "Protectiveness",
    "Conversation initiative",
    "Affection style",
    "Conflict style",
    "Emotional availability",
    "Message format",
    "Linguistic flavor",
    "Chemistry template",
    "Current energy",
    "Public tagline",
    "Public teaser",
    "Public tags",
  ] as const;

  function getStructured(prefix: (typeof structuredKeys)[number]) {
    return extractStructuredLine(form.customNotes, prefix);
  }

  const regionNote = useMemo(
    () => getStructured("Region note"),
    [form.customNotes],
  );
  const visualNote = useMemo(
    () => getStructured("Visual aura"),
    [form.customNotes],
  );
  const interestNote = useMemo(
    () => getStructured("Interest anchors"),
    [form.customNotes],
  );
  const responseDirective = useMemo(
    () => getStructured("Response directive"),
    [form.customNotes],
  );
  const keyMemories = useMemo(
    () => getStructured("Key memories"),
    [form.customNotes],
  );
  const exampleMessage = useMemo(
    () => getStructured("Example message"),
    [form.customNotes],
  );
  const userRole = useMemo(() => getStructured("User role"), [form.customNotes]);
  const nickname = useMemo(
    () => getStructured("Nickname for user"),
    [form.customNotes],
  );
  const boundaries = useMemo(
    () => getStructured("Boundaries"),
    [form.customNotes],
  );
  const greetingStyle = useMemo(
    () => getStructured("Greeting style"),
    [form.customNotes],
  );
  const chatMode = useMemo(() => getStructured("Chat mode"), [form.customNotes]);
  const avatarStyle = useMemo(
    () => getStructured("Avatar style"),
    [form.customNotes],
  );
  const hair = useMemo(() => getStructured("Hair"), [form.customNotes]);
  const eyes = useMemo(() => getStructured("Eyes"), [form.customNotes]);
  const outfit = useMemo(() => getStructured("Outfit"), [form.customNotes]);
  const palette = useMemo(() => getStructured("Palette"), [form.customNotes]);
  const camera = useMemo(() => getStructured("Camera"), [form.customNotes]);
  const photoPack = useMemo(
    () => getStructured("Photo pack"),
    [form.customNotes],
  );
  const imagePrompt = useMemo(
    () => getStructured("Image prompt"),
    [form.customNotes],
  );
  const relationshipStage = useMemo(
    () => getStructured("Relationship stage"),
    [form.customNotes],
  );
  const jealousy = useMemo(() => getStructured("Jealousy"), [form.customNotes]);
  const attachment = useMemo(
    () => getStructured("Attachment"),
    [form.customNotes],
  );
  const protectiveness = useMemo(
    () => getStructured("Protectiveness"),
    [form.customNotes],
  );
  const conversationInitiative = useMemo(
    () => getStructured("Conversation initiative"),
    [form.customNotes],
  );
  const affectionStyle = useMemo(
    () => getStructured("Affection style"),
    [form.customNotes],
  );
  const conflictStyle = useMemo(
    () => getStructured("Conflict style"),
    [form.customNotes],
  );
  const emotionalAvailability = useMemo(
    () => getStructured("Emotional availability"),
    [form.customNotes],
  );
  const messageFormat = useMemo(
    () => getStructured("Message format"),
    [form.customNotes],
  );
  const linguisticFlavor = useMemo(
    () => getStructured("Linguistic flavor"),
    [form.customNotes],
  );
  const chemistryTemplate = useMemo(
    () => getStructured("Chemistry template"),
    [form.customNotes],
  );
  const currentEnergy = useMemo(
    () => getStructured("Current energy"),
    [form.customNotes],
  );
  const publicTagline = useMemo(
    () => getStructured("Public tagline"),
    [form.customNotes],
  );
  const publicTeaser = useMemo(
    () => getStructured("Public teaser"),
    [form.customNotes],
  );
  const publicTags = useMemo(
    () => getStructured("Public tags"),
    [form.customNotes],
  );

  const bodyNotes = useMemo(() => {
    let result = form.customNotes;
    structuredKeys.forEach((prefix) => {
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
          greetingStyle,
          chatMode,
          avatarStyle,
          hair,
          eyes,
          outfit,
          palette,
          camera,
          photoPack,
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
      greetingStyle,
      chatMode,
      avatarStyle,
      hair,
      eyes,
      outfit,
      palette,
      camera,
      photoPack,
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
    return buildLegacyBuilderV2Summary({
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

  function clearAvatarPreview() {
    setGeneratedAvatarUrl(null);
    setAvatarResultMessage(null);
    setAvatarQueuedExternalJobId(null);
    setQueuedJobProvider(null);
    setAvatarJobStatus("idle");
    setLastAvatarPromptInput(null);
    setLastAvatarResolvedPrompt(null);
    setLastAvatarNegativePrompt(null);
  }

  async function fetchProviderJobStatus(args: {
    provider: ImageProvider;
    externalJobId: string;
  }): Promise<ProviderJobStatusResponse> {
    const response = await fetch(
      `/api/image/status?provider=${encodeURIComponent(args.provider)}&jobId=${encodeURIComponent(args.externalJobId)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | ProviderJobStatusResponse
      | null;

    if (!response.ok) {
      throw new Error(
        payload?.errorMessage || "Could not refresh avatar generation status.",
      );
    }

    if (!payload) {
      throw new Error("Invalid status response from image provider.");
    }

    return payload;
  }

  useEffect(() => {
    if (
      avatarQueuedExternalJobId === null ||
      queuedJobProvider === null ||
      generatedAvatarUrl
    ) {
      return;
    }

    const safeExternalJobId: string = avatarQueuedExternalJobId;
    const safeProvider: ImageProvider = queuedJobProvider;

    let cancelled = false;

    async function pollOnce(provider: ImageProvider, externalJobId: string) {
      try {
        const result = await fetchProviderJobStatus({
          provider,
          externalJobId,
        });

        if (cancelled) return;

        if (!result.ok) {
          throw new Error(result.errorMessage || "Avatar polling failed.");
        }

        if (result.revisedPrompt) {
          setLastAvatarResolvedPrompt(result.revisedPrompt);
        }

        if (typeof result.revisedNegativePrompt === "string") {
          setLastAvatarNegativePrompt(result.revisedNegativePrompt);
        }

        if (result.status === "queued") {
          setAvatarJobStatus("queued");
          setAvatarResultMessage(
            "Avatar request is queued. Waiting for provider response...",
          );
          return;
        }

        if (result.status === "processing") {
          setAvatarJobStatus("processing");
          setAvatarResultMessage(
            "Avatar is being generated. Preview will appear automatically.",
          );
          return;
        }

        if (result.status === "completed") {
          setAvatarJobStatus("completed");

          if (result.imageUrl) {
            setGeneratedAvatarUrl(result.imageUrl);
            setAvatarQueuedExternalJobId(null);
            setQueuedJobProvider(null);
            setAvatarResultMessage("Avatar preview generated successfully.");
            setBanner({
              type: "success",
              message:
                "Avatar preview is ready. It will be attached when you create the character.",
            });
            return;
          }

          setAvatarQueuedExternalJobId(null);
          setQueuedJobProvider(null);
          setAvatarResultMessage(
            "Generation completed, but no preview image URL was returned.",
          );
          setBanner({
            type: "error",
            message:
              "The provider completed the job without returning a preview image.",
          });
          return;
        }

        if (result.status === "failed") {
          setAvatarJobStatus("failed");
          setAvatarQueuedExternalJobId(null);
          setQueuedJobProvider(null);
          setAvatarResultMessage(null);
          setBanner({
            type: "error",
            message:
              result.errorMessage || "Avatar generation failed at the provider.",
          });
        }
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "Could not refresh avatar status.";

        setBanner({
          type: "error",
          message,
        });
      }
    }

    void pollOnce(safeProvider, safeExternalJobId);

    const intervalId = window.setInterval(() => {
      void pollOnce(safeProvider, safeExternalJobId);
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [avatarQueuedExternalJobId, queuedJobProvider, generatedAvatarUrl]);

  function rebuildCustomNotes(
    next: Partial<Record<(typeof structuredKeys)[number], string>>,
    nextBodyNotes?: string,
  ) {
    const currentValues: Record<(typeof structuredKeys)[number], string> = {
      "Region note": next["Region note"] ?? regionNote,
      "Visual aura": next["Visual aura"] ?? visualNote,
      "Interest anchors": next["Interest anchors"] ?? interestNote,
      "Response directive": next["Response directive"] ?? responseDirective,
      "Key memories": next["Key memories"] ?? keyMemories,
      "Example message": next["Example message"] ?? exampleMessage,
      "User role": next["User role"] ?? userRole,
      "Nickname for user": next["Nickname for user"] ?? nickname,
      Boundaries: next["Boundaries"] ?? boundaries,
      "Greeting style": next["Greeting style"] ?? greetingStyle,
      "Chat mode": next["Chat mode"] ?? chatMode,
      "Avatar style": next["Avatar style"] ?? avatarStyle,
      Hair: next.Hair ?? hair,
      Eyes: next.Eyes ?? eyes,
      Outfit: next.Outfit ?? outfit,
      Palette: next.Palette ?? palette,
      Camera: next.Camera ?? camera,
      "Photo pack": next["Photo pack"] ?? photoPack,
      "Image prompt": next["Image prompt"] ?? imagePrompt,
      Dynamism: next.Dynamism ?? String(dynamism),
      "Relationship stage": next["Relationship stage"] ?? relationshipStage,
      Jealousy: next.Jealousy ?? jealousy,
      Attachment: next.Attachment ?? attachment,
      Protectiveness: next.Protectiveness ?? protectiveness,
      "Conversation initiative":
        next["Conversation initiative"] ?? conversationInitiative,
      "Affection style": next["Affection style"] ?? affectionStyle,
      "Conflict style": next["Conflict style"] ?? conflictStyle,
      "Emotional availability":
        next["Emotional availability"] ?? emotionalAvailability,
      "Message format": next["Message format"] ?? messageFormat,
      "Linguistic flavor": next["Linguistic flavor"] ?? linguisticFlavor,
      "Chemistry template": next["Chemistry template"] ?? chemistryTemplate,
      "Current energy": next["Current energy"] ?? currentEnergy,
      "Public tagline": next["Public tagline"] ?? publicTagline,
      "Public teaser": next["Public teaser"] ?? publicTeaser,
      "Public tags": next["Public tags"] ?? publicTags,
    };

    const final = [
      ...structuredKeys.map((key) =>
        currentValues[key]?.trim() ? `${key}: ${currentValues[key].trim()}` : "",
      ),
      typeof nextBodyNotes === "string" ? nextBodyNotes.trim() : bodyNotes,
    ]
      .filter(Boolean)
      .join("\n");

    setField("customNotes", final);
  }

  const draft = useMemo<CharacterDraftInput>(() => {
    const mergedNotes = structuredKeys
      .map((key) => {
        const value = extractStructuredLine(
          [
            `Region note: ${regionNote}`,
            `Visual aura: ${visualNote}`,
            `Interest anchors: ${interestNote}`,
            `Response directive: ${responseDirective}`,
            `Key memories: ${keyMemories}`,
            `Example message: ${exampleMessage}`,
            `User role: ${userRole}`,
            `Nickname for user: ${nickname}`,
            `Boundaries: ${boundaries}`,
            `Greeting style: ${greetingStyle}`,
            `Chat mode: ${chatMode}`,
            `Avatar style: ${avatarStyle}`,
            `Hair: ${hair}`,
            `Eyes: ${eyes}`,
            `Outfit: ${outfit}`,
            `Palette: ${palette}`,
            `Camera: ${camera}`,
            `Photo pack: ${photoPack}`,
            `Image prompt: ${imagePrompt}`,
            `Dynamism: ${dynamism}`,
            `Relationship stage: ${relationshipStage}`,
            `Jealousy: ${jealousy}`,
            `Attachment: ${attachment}`,
            `Protectiveness: ${protectiveness}`,
            `Conversation initiative: ${conversationInitiative}`,
            `Affection style: ${affectionStyle}`,
            `Conflict style: ${conflictStyle}`,
            `Emotional availability: ${emotionalAvailability}`,
            `Message format: ${messageFormat}`,
            `Linguistic flavor: ${linguisticFlavor}`,
            `Chemistry template: ${chemistryTemplate}`,
            `Current energy: ${currentEnergy}`,
            `Public tagline: ${publicTagline}`,
            `Public teaser: ${publicTeaser}`,
            `Public tags: ${publicTags}`,
          ].join("\n"),
          key,
        );
        return value ? `${key}: ${value}` : "";
      })
      .filter(Boolean)
      .concat(bodyNotes ? [bodyNotes] : [])
      .join("\n");

    const baseDraft = buildCharacterDraftFromStudio({
      ...form,
      customNotes: mergedNotes,
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
        customNotes: mergedNotes,
      },
    });
  }, [
    form,
    bodyNotes,
    regionNote,
    visualNote,
    interestNote,
    responseDirective,
    keyMemories,
    exampleMessage,
    userRole,
    nickname,
    boundaries,
    greetingStyle,
    chatMode,
    avatarStyle,
    hair,
    eyes,
    outfit,
    palette,
    camera,
    photoPack,
    imagePrompt,
    dynamism,
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
  ]);

  const dynamicSummary = [
    `warmth ${meterTone(form.warmth)}`,
    `assertiveness ${meterTone(form.assertiveness)}`,
    `mystery ${meterTone(form.mystery)}`,
    `playfulness ${meterTone(form.playfulness)}`,
  ].join(" • ");

  const visualSummary = [avatarStyle, hair, eyes, outfit, palette, camera]
    .filter(Boolean)
    .join(" • ");

  const memoryAnchorPreview = [
    form.region ? `region: ${form.region}` : "",
    relationshipStage ? `stage: ${relationshipStage}` : "",
    form.relationshipToUser ? `relationship: ${form.relationshipToUser}` : "",
    form.setting ? `setting: ${form.setting}` : "",
    visualNote ? `aura: ${visualNote}` : "",
    selectedInterests.length ? `interests: ${selectedInterests.join(", ")}` : "",
    keyMemories ? `memories: ${keyMemories}` : "",
    userRole ? `user role: ${userRole}` : "",
  ].filter(Boolean);

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

  const allSteps: Array<{ id: StudioStep; label: string }> = [
    { id: "identity", label: "Identity" },
    { id: "personality", label: "Personality" },
    { id: "scenario", label: "Scenario" },
    { id: "advanced", label: "Advanced" },
    { id: "visual", label: "Visual" },
    { id: "publish", label: "Publish" },
  ];

  const visibleSteps = useMemo(() => {
    if (isQuickMode) {
      return allSteps.filter((step) =>
        ["identity", "personality", "scenario", "publish"].includes(step.id),
      );
    }
    return allSteps;
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

  function buildAvatarPromptInput(): ProviderCharacterImagePromptInput {
    return buildLegacyAvatarPromptInputCompat({
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
  }

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

  function applyScenePreset(preset: (typeof SCENE_PRESETS)[number]) {
    setForm((current) => ({
      ...current,
      setting: preset.setting,
      tone: preset.tone,
      openingState: preset.openingState,
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

  async function handleGenerateAvatar() {
    if (avatarGenerating) return;

    if (!form.name.trim()) {
      setBanner({
        type: "error",
        message: "Set a character name before generating an avatar.",
      });
      setActiveStep("identity");
      return;
    }

    if (!form.age.trim() || !form.region.trim()) {
      setBanner({
        type: "error",
        message: "Age and region are required before generating an avatar.",
      });
      setActiveStep("identity");
      return;
    }

    setAvatarGenerating(true);
    setAvatarResultMessage(null);
    setAvatarQueuedExternalJobId(null);
    setQueuedJobProvider(null);
    setAvatarJobStatus("idle");

    try {
      const promptInput = buildAvatarPromptInput();

      const result = await requestImageGeneration({
        provider: avatarProvider,
        kind: "avatar",
        characterId: `draft-${(form.name || "character")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")}`,
        promptInput,
        safety: avatarSafetyInput,
      });

      if (!result.ok) {
        throw new Error(result.errorMessage || "Avatar generation failed.");
      }

      setLastAvatarPromptInput(promptInput);
      setLastAvatarResolvedPrompt(
        result.revisedPrompt ??
          builderV2Summary.promptEngineOutput.canonicalPrompt ??
          null,
      );
      setLastAvatarNegativePrompt(
        result.revisedNegativePrompt ??
          builderV2Summary.promptEngineOutput.negativePrompt ??
          null,
      );

      if (result.imageUrl) {
        setGeneratedAvatarUrl(result.imageUrl);
        setAvatarJobStatus("completed");
        setAvatarResultMessage("Avatar preview generated successfully.");
        setBanner({
          type: "success",
          message:
            "Avatar preview generated. It will be attached when you create the character.",
        });
      } else if (result.externalJobId) {
        setAvatarQueuedExternalJobId(result.externalJobId);
        setQueuedJobProvider(avatarProvider);
        setGeneratedAvatarUrl(null);
        setAvatarJobStatus("queued");
        setAvatarResultMessage(
          "Generation request was accepted and queued by the provider.",
        );
        setBanner({
          type: "success",
          message:
            "Avatar request queued successfully. The preview will refresh automatically when it is ready.",
        });
      } else {
        setAvatarResultMessage(
          "Generation completed without a preview URL from the provider.",
        );
        setAvatarJobStatus("failed");
        setBanner({
          type: "error",
          message:
            "The provider did not return a preview image. Try again or switch provider later.",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not generate avatar.";
      setAvatarResultMessage(null);
      setGeneratedAvatarUrl(null);
      setAvatarQueuedExternalJobId(null);
      setQueuedJobProvider(null);
      setAvatarJobStatus("failed");
      setBanner({
        type: "error",
        message,
      });
    } finally {
      setAvatarGenerating(false);
    }
  }

  async function persistGeneratedAvatar(args: {
    characterId: string;
    provider: ImageProvider;
  }) {
    if (!generatedAvatarUrl || !lastAvatarPromptInput) {
      return;
    }

    const job = await createCharacterImageJob({
      characterId: args.characterId,
      promptInput: lastAvatarPromptInput,
      model: args.provider === "mage" ? "mage" : "sd3.5-medium",
      workflowName:
        args.provider === "mage" ? "mage-avatar-v1" : "character-avatar-v1",
    });

    const imageResponse = await fetch(generatedAvatarUrl);
    if (!imageResponse.ok) {
      throw new Error("Could not download generated avatar.");
    }

    const blob = await imageResponse.blob();
    const mimeType = blob.type || "image/png";
    const extension =
      mimeType === "image/webp"
        ? "webp"
        : mimeType === "image/jpeg"
          ? "jpg"
          : "png";

    await uploadGeneratedCharacterImage({
      characterId: args.characterId,
      jobId: job.id,
      imageId: crypto.randomUUID(),
      blob,
      extension,
      mimeType,
      model: args.provider === "mage" ? "mage" : "sd3.5-medium",
      workflowName:
        args.provider === "mage" ? "mage-avatar-v1" : "character-avatar-v1",
      promptInput: lastAvatarPromptInput,
      resolvedPrompt: lastAvatarResolvedPrompt ?? undefined,
      negativePrompt: lastAvatarNegativePrompt ?? undefined,
      isPrimary: true,
    });

    await markCharacterImageJobCompleted({
      jobId: job.id,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!form.name.trim()) {
      setBanner({ type: "error", message: "Character name is required." });
      setActiveStep("identity");
      return;
    }

    if (!form.age.trim()) {
      setBanner({ type: "error", message: "Age field is required." });
      setActiveStep("identity");
      return;
    }

    if (!form.region.trim()) {
      setBanner({ type: "error", message: "Region field is required." });
      setActiveStep("identity");
      return;
    }

    if (form.coreVibes.length < 2) {
      setBanner({ type: "error", message: "Pick at least 2 core vibes." });
      setActiveStep("personality");
      return;
    }

    if (
      !form.setting.trim() ||
      !form.relationshipToUser.trim() ||
      !form.sceneGoal.trim()
    ) {
      setBanner({
        type: "error",
        message: "Setting, relationship, and scene goal are required.",
      });
      setActiveStep("scenario");
      return;
    }

    setSaving(true);
    setBanner(null);

    try {
      const created = await createMyCustomCharacter(draft);

      if (generatedAvatarUrl && lastAvatarPromptInput) {
        try {
          await persistGeneratedAvatar({
            characterId: created.id,
            provider: queuedJobProvider || avatarProvider,
          });
        } catch (avatarError) {
          console.error("Avatar persistence failed:", avatarError);
        }
      }

      setBanner({
        type: "success",
        message: `"${created.name}" created successfully.`,
      });
      router.push(`/chat/custom/${created.slug}`);
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
    } finally {
      setSaving(false);
    }
  }

  const identitySummary = [
    `${ageValue}`,
    form.region.trim(),
    form.archetype,
    form.visibility === "public" ? "public" : "private",
  ].filter(Boolean);

  const activeStepComplete = getStepCompletion(
    activeStep,
    form,
    readinessScore,
    isQuickMode,
  );

  const canGenerateAvatar = Boolean(
    form.name.trim() && form.region.trim() && form.age.trim(),
  );

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

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <TopNavLink href="/" label="Home" />
              <TopNavLink href="/my-characters" label="My Characters" />
              <TopNavLink href="/characters" label="Public Characters" />
              <TopNavLink
                href="/create-character"
                label="Create Character"
                active
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyRandomTemplate}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10"
              >
                Surprise me
              </button>
              <button
                type="button"
                onClick={resetStudio}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10"
              >
                Reset studio
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/5 to-cyan-400/10 p-8 shadow-2xl shadow-fuchsia-500/10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.15),transparent_25%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-fuchsia-200">
                  Character Studio Final
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                  {isQuickMode
                    ? "Quickly build a strong character foundation"
                    : "Build a premium, roleplay-stable character system"}
                </h1>
                <p className="mt-4 max-w-4xl text-sm leading-7 text-white/65 md:text-base">
                  {isQuickMode
                    ? "Quick Mode keeps creation focused: name, age, region, hobbies, basic traits, and a short scenario."
                    : "Deep Studio adds relationship logic, attachment dynamics, conflict behavior, public character presentation, and future-ready visual prep without breaking your current save flow."}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  <StatPill
                    label="Mode"
                    value={isQuickMode ? "Quick" : "Deep"}
                  />
                  <StatPill label="Engine" value="Roleplay-first" />
                  <StatPill label="Memory" value="Reset-safe" />
                  <StatPill label="Flow" value="Supabase-safe" />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                    Build Readiness
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                    {readinessScore} / 100
                  </div>
                </div>
                <div className="mt-4">
                  <ProgressBar value={readinessScore} />
                </div>
                <div className="mt-4 grid gap-3 text-sm text-white/70">
                  {isQuickMode ? (
                    <>
                      <div>• Minimal friction</div>
                      <div>• Core identity + hobbies + simple scenario</div>
                      <div>• Faster start, solid output</div>
                    </>
                  ) : (
                    <>
                      <div>• Relationship stage + chemistry logic</div>
                      <div>
                        • Conflict, affection, initiative, emotional
                        availability
                      </div>
                      <div>• Public card customization + visual prep</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap gap-2">
              {visibleSteps.map((step) => (
                <StepPill
                  key={step.id}
                  title={step.label}
                  active={activeStep === step.id}
                  complete={getStepCompletion(
                    step.id,
                    form,
                    readinessScore,
                    isQuickMode,
                  )}
                  onClick={() => goToStep(step.id)}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-white/60">
                Current section:{" "}
                <span className="text-white/85">{activeStep}</span> •{" "}
                {activeStepComplete ? "ready" : "still needs input"}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={goPreviousStep}
                  disabled={!previousStep}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={goNextStep}
                  disabled={!nextStep}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <form onSubmit={handleSubmit} className="space-y-6">
              {banner ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    banner.type === "success"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-100",
                  )}
                >
                  {banner.message}
                </div>
              ) : null}

              <Section
                title="Template library"
                description="Start from a polished, working template and then customize it."
                accent="fuchsia"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-white/60">
                    Templates apply safely on top of the current builder system.
                  </div>
                  <button
                    type="button"
                    onClick={applyRandomTemplate}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                  >
                    Apply random template
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
                description="Quick Mode is intentionally simpler. Deep Studio unlocks full control."
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
                    Deep Studio
                  </SegmentButton>
                </div>
              </Section>

              {activeStep === "identity" && (
                <Section
                  title="Identity"
                  description="Core character anchors."
                  accent="cyan"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="Character name"
                      value={form.name}
                      onChange={(value) => setField("name", value)}
                      placeholder="Ayla"
                      required
                    />
                    <SelectField
                      label="Gender presentation"
                      value={form.genderPresentation}
                      onChange={(value) =>
                        setField("genderPresentation", value)
                      }
                      options={GENDER_OPTIONS}
                    />
                  </div>

                  <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-white/80">Age</div>
                        <div className="mt-1 text-xs leading-6 text-white/50">
                          Pick an actual age between 18 and 55.
                        </div>
                      </div>
                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                        {ageValue} • {ageToneLabel(ageValue)}
                      </div>
                    </div>

                    <div className="mt-4">
                      <input
                        type="range"
                        min={18}
                        max={55}
                        step={1}
                        value={ageValue}
                        onChange={(event) =>
                          setAgeFromSlider(Number(event.target.value))
                        }
                        className="w-full accent-cyan-400"
                      />
                      <div className="mt-2 flex items-center justify-between text-xs text-white/35">
                        <span>18</span>
                        <span>25</span>
                        <span>35</span>
                        <span>45</span>
                        <span>55</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 text-sm text-white/75">Region</div>
                    <div className="flex flex-wrap gap-2">
                      {REGION_OPTIONS.map((option) => (
                        <RegionChip
                          key={option}
                          label={option}
                          active={selectedRegion === option}
                          onClick={() => handleRegionSelect(option)}
                        />
                      ))}
                      <RegionChip
                        label="Custom"
                        active={!selectedRegion && !!customRegion}
                        onClick={() => handleRegionSelect("")}
                      />
                    </div>

                    {!selectedRegion ? (
                      <div className="mt-4">
                        <InputField
                          label="Custom region"
                          value={customRegion}
                          onChange={handleCustomRegionChange}
                          placeholder="Balkan / Levantine / Iberian / etc."
                          required
                        />
                      </div>
                    ) : null}

                    {!isQuickMode ? (
                      <div className="mt-4">
                        <InputField
                          label="Region note (optional)"
                          value={regionNote}
                          onChange={(value) =>
                            rebuildCustomNotes({ "Region note": value })
                          }
                          placeholder="coastal Brazilian, urban Turkish, old-money Roman, etc."
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 text-sm text-white/75">Archetype</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {ARCHETYPE_OPTIONS.map((option) => (
                        <OptionCard
                          key={option.value}
                          active={form.archetype === option.value}
                          title={option.label}
                          description={option.description}
                          onClick={() => setField("archetype", option.value)}
                        />
                      ))}
                    </div>
                  </div>
                </Section>
              )}

              {activeStep === "personality" && (
                <>
                  {isQuickMode ? (
                    <>
                      <Section
                        title="Hobbies and interests"
                        description="Pick a few things that make the character feel alive."
                      >
                        <div className="flex flex-wrap gap-2">
                          {INTEREST_ANCHOR_OPTIONS.map((option) => (
                            <MiniChip
                              key={option}
                              label={option}
                              active={selectedInterests.includes(option)}
                              onClick={() => toggleInterest(option)}
                            />
                          ))}
                        </div>
                      </Section>

                      <Section
                        title="Basic personality"
                        description="Simple controls for a fast but strong personality setup."
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          {CORE_VIBE_OPTIONS.map((option) => (
                            <VibeChip
                              key={option.id}
                              active={form.coreVibes.includes(option.id)}
                              label={option.label}
                              description={option.description}
                              onClick={() => toggleCoreVibe(option.id)}
                            />
                          ))}
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <SliderField
                            label="Warmth"
                            value={form.warmth}
                            onChange={(value) => setField("warmth", value)}
                          />
                          <SliderField
                            label="Assertiveness"
                            value={form.assertiveness}
                            onChange={(value) =>
                              setField("assertiveness", value)
                            }
                          />
                          <SliderField
                            label="Mystery"
                            value={form.mystery}
                            onChange={(value) => setField("mystery", value)}
                          />
                          <SliderField
                            label="Playfulness"
                            value={form.playfulness}
                            onChange={(value) => setField("playfulness", value)}
                          />
                        </div>
                      </Section>
                    </>
                  ) : (
                    <>
                      <Section
                        title="Visual aura"
                        description="Fantasy texture, vibe, and visual identity."
                      >
                        <div className="flex flex-wrap gap-2">
                          {VISUAL_AURA_OPTIONS.map((option) => (
                            <MiniChip
                              key={option}
                              label={option}
                              active={visualNote === option}
                              onClick={() =>
                                rebuildCustomNotes({
                                  "Visual aura":
                                    visualNote === option ? "" : option,
                                })
                              }
                            />
                          ))}
                        </div>

                        <div className="mt-4">
                          <InputField
                            label="Custom visual aura (optional)"
                            value={visualNote}
                            onChange={(value) =>
                              rebuildCustomNotes({ "Visual aura": value })
                            }
                            placeholder="sharp cheekbones, understated luxury, dangerous sleepy eyes, etc."
                          />
                        </div>
                      </Section>

                      <Section
                        title="Interest anchors"
                        description="Lifestyle signals that make the character feel more lived-in."
                      >
                        <div className="flex flex-wrap gap-2">
                          {INTEREST_ANCHOR_OPTIONS.map((option) => (
                            <MiniChip
                              key={option}
                              label={option}
                              active={selectedInterests.includes(option)}
                              onClick={() => toggleInterest(option)}
                            />
                          ))}
                        </div>
                      </Section>

                      <Section
                        title="Trait algorithm"
                        description="Pick 2–4 strong vibes. The builder converts them into a deeper hidden prompt system."
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          {CORE_VIBE_OPTIONS.map((option) => (
                            <VibeChip
                              key={option.id}
                              active={form.coreVibes.includes(option.id)}
                              label={option.label}
                              description={option.description}
                              onClick={() => toggleCoreVibe(option.id)}
                            />
                          ))}
                        </div>

                        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-white/55">
                          Current emotional blend: {dynamicSummary}
                        </div>
                      </Section>

                      <Section
                        title="Voice and behavior controls"
                        description="These tune how the hidden engine expresses the character in chat."
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <SelectField
                            label="Reply length"
                            value={form.replyLength}
                            onChange={(value) => setField("replyLength", value)}
                            options={REPLY_LENGTH_OPTIONS}
                          />
                          <SelectField
                            label="Speech style"
                            value={form.speechStyle}
                            onChange={(value) => setField("speechStyle", value)}
                            options={SPEECH_STYLE_OPTIONS}
                          />
                          <SelectField
                            label="Relationship pace"
                            value={form.relationshipPace}
                            onChange={(value) =>
                              setField("relationshipPace", value)
                            }
                            options={RELATIONSHIP_PACE_OPTIONS}
                          />
                          <SelectField
                            label="Message format"
                            value={
                              (messageFormat ||
                                MESSAGE_FORMAT_OPTIONS[0]) as (typeof MESSAGE_FORMAT_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "Message format": value })
                            }
                            options={MESSAGE_FORMAT_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                          <SelectField
                            label="Linguistic flavor"
                            value={
                              (linguisticFlavor ||
                                LINGUISTIC_FLAVOR_OPTIONS[0]) as (typeof LINGUISTIC_FLAVOR_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "Linguistic flavor": value })
                            }
                            options={LINGUISTIC_FLAVOR_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                          <SelectField
                            label="Current energy"
                            value={
                              (currentEnergy ||
                                CURRENT_ENERGY_OPTIONS[0]) as (typeof CURRENT_ENERGY_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "Current energy": value })
                            }
                            options={CURRENT_ENERGY_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <SliderField
                            label="Warmth"
                            value={form.warmth}
                            onChange={(value) => setField("warmth", value)}
                          />
                          <SliderField
                            label="Assertiveness"
                            value={form.assertiveness}
                            onChange={(value) =>
                              setField("assertiveness", value)
                            }
                          />
                          <SliderField
                            label="Mystery"
                            value={form.mystery}
                            onChange={(value) => setField("mystery", value)}
                          />
                          <SliderField
                            label="Playfulness"
                            value={form.playfulness}
                            onChange={(value) => setField("playfulness", value)}
                          />
                        </div>

                        <div className="mt-5">
                          <SliderField
                            label="Dynamism"
                            value={dynamism}
                            onChange={(value) => {
                              setDynamism(value);
                              rebuildCustomNotes({ Dynamism: String(value) });
                            }}
                            min={0}
                            max={100}
                          />
                        </div>
                      </Section>
                    </>
                  )}
                </>
              )}

              {activeStep === "scenario" && (
                <>
                  {isQuickMode ? (
                    <Section
                      title="Scenario"
                      description="Keep it short and clear in Quick Mode."
                      accent="fuchsia"
                    >
                      <div className="flex flex-wrap gap-2">
                        {RELATIONSHIP_PRESETS.map((preset) => (
                          <MiniChip
                            key={preset}
                            label={preset}
                            active={form.relationshipToUser === preset}
                            onClick={() =>
                              setField("relationshipToUser", preset)
                            }
                          />
                        ))}
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <InputField
                          label="Setting"
                          value={form.setting}
                          onChange={(value) => setField("setting", value)}
                          placeholder="late-night rooftop"
                        />
                        <InputField
                          label="Relationship to user"
                          value={form.relationshipToUser}
                          onChange={(value) =>
                            setField("relationshipToUser", value)
                          }
                          placeholder="best friend with tension"
                        />
                        <InputField
                          label="Scene goal"
                          value={form.sceneGoal}
                          onChange={(value) => setField("sceneGoal", value)}
                          placeholder="build chemistry slowly"
                        />
                        <InputField
                          label="Tone"
                          value={form.tone}
                          onChange={(value) => setField("tone", value)}
                          placeholder="playful and intimate"
                        />
                      </div>
                    </Section>
                  ) : (
                    <>
                      <Section
                        title="Relationship architecture"
                        description="Controls the emotional baseline and how the bond behaves."
                        accent="fuchsia"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <SelectField
                            label="Relationship stage"
                            value={
                              (relationshipStage ||
                                RELATIONSHIP_STAGE_OPTIONS[0]) as (typeof RELATIONSHIP_STAGE_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "Relationship stage": value })
                            }
                            options={RELATIONSHIP_STAGE_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                          <SelectField
                            label="Conversation initiative"
                            value={
                              (conversationInitiative ||
                                INITIATIVE_OPTIONS[1]) as (typeof INITIATIVE_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({
                                "Conversation initiative": value,
                              })
                            }
                            options={INITIATIVE_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                          <SelectField
                            label="Affection style"
                            value={
                              (affectionStyle ||
                                AFFECTION_STYLE_OPTIONS[0]) as (typeof AFFECTION_STYLE_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "Affection style": value })
                            }
                            options={AFFECTION_STYLE_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                          <SelectField
                            label="Conflict style"
                            value={
                              (conflictStyle ||
                                CONFLICT_STYLE_OPTIONS[0]) as (typeof CONFLICT_STYLE_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "Conflict style": value })
                            }
                            options={CONFLICT_STYLE_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                          <SelectField
                            label="Emotional availability"
                            value={
                              (emotionalAvailability ||
                                EMOTIONAL_AVAILABILITY_OPTIONS[1]) as (typeof EMOTIONAL_AVAILABILITY_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({
                                "Emotional availability": value,
                              })
                            }
                            options={EMOTIONAL_AVAILABILITY_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                          <SelectField
                            label="Chemistry template"
                            value={
                              (chemistryTemplate ||
                                CHEMISTRY_TEMPLATE_OPTIONS[0]) as (typeof CHEMISTRY_TEMPLATE_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "Chemistry template": value })
                            }
                            options={CHEMISTRY_TEMPLATE_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                          <SliderField
                            label="Jealousy"
                            value={Number(jealousy || 42)}
                            onChange={(value) =>
                              rebuildCustomNotes({ Jealousy: String(value) })
                            }
                          />
                          <SliderField
                            label="Attachment"
                            value={Number(attachment || 58)}
                            onChange={(value) =>
                              rebuildCustomNotes({ Attachment: String(value) })
                            }
                          />
                          <SliderField
                            label="Protectiveness"
                            value={Number(protectiveness || 54)}
                            onChange={(value) =>
                              rebuildCustomNotes({
                                Protectiveness: String(value),
                              })
                            }
                          />
                        </div>
                      </Section>

                      <Section
                        title="User persona framing"
                        description="Who is the user in this character's emotional world?"
                        accent="fuchsia"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <SelectField
                            label="User role"
                            value={
                              (userRole ||
                                USER_ROLE_OPTIONS[0]) as (typeof USER_ROLE_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "User role": value })
                            }
                            options={USER_ROLE_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                          <InputField
                            label="Nickname for user (optional)"
                            value={nickname}
                            onChange={(value) =>
                              rebuildCustomNotes({ "Nickname for user": value })
                            }
                            placeholder="love, trouble, beautiful, etc."
                          />
                        </div>
                      </Section>

                      <Section
                        title="Greeting and mode"
                        description="First impression and interaction frame."
                        accent="cyan"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <SelectField
                            label="Greeting style"
                            value={
                              (greetingStyle ||
                                GREETING_STYLE_OPTIONS[0]) as (typeof GREETING_STYLE_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "Greeting style": value })
                            }
                            options={GREETING_STYLE_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                          <SelectField
                            label="Chat mode / flair"
                            value={
                              (chatMode ||
                                CHAT_MODE_OPTIONS[0]) as (typeof CHAT_MODE_OPTIONS)[number]
                            }
                            onChange={(value) =>
                              rebuildCustomNotes({ "Chat mode": value })
                            }
                            options={CHAT_MODE_OPTIONS.map((v) => ({
                              value: v,
                              label: v,
                            }))}
                          />
                        </div>
                      </Section>

                      <Section
                        title="Relationship setup"
                        description="Fast ways to define the user-character dynamic."
                        accent="fuchsia"
                      >
                        <div className="flex flex-wrap gap-2">
                          {RELATIONSHIP_PRESETS.map((preset) => (
                            <MiniChip
                              key={preset}
                              label={preset}
                              active={form.relationshipToUser === preset}
                              onClick={() =>
                                setField("relationshipToUser", preset)
                              }
                            />
                          ))}
                        </div>
                      </Section>

                      <Section
                        title="Scene accelerators"
                        description="One-click scene foundations for stronger context."
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          {SCENE_PRESETS.map((preset) => (
                            <button
                              key={preset.title}
                              type="button"
                              onClick={() => applyScenePreset(preset)}
                              className="rounded-[24px] border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyan-400/25 hover:bg-black/35"
                            >
                              <div className="text-sm font-medium text-white">
                                {preset.title}
                              </div>
                              <div className="mt-2 text-xs leading-6 text-white/55">
                                {preset.setting}
                              </div>
                            </button>
                          ))}
                        </div>
                      </Section>

                      <Section
                        title="Roleplay scenario"
                        description="These become part of the saved character."
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <InputField
                            label="Setting"
                            value={form.setting}
                            onChange={(value) => setField("setting", value)}
                            placeholder="late-night hospital shift"
                          />
                          <InputField
                            label="Relationship to user"
                            value={form.relationshipToUser}
                            onChange={(value) =>
                              setField("relationshipToUser", value)
                            }
                            placeholder="emotionally guarded co-worker"
                          />
                          <InputField
                            label="Scene goal"
                            value={form.sceneGoal}
                            onChange={(value) => setField("sceneGoal", value)}
                            placeholder="build tension slowly without breaking composure"
                          />
                          <InputField
                            label="Tone"
                            value={form.tone}
                            onChange={(value) => setField("tone", value)}
                            placeholder="restrained, intimate, low-key"
                          />
                        </div>

                        <div className="mt-4">
                          <TextAreaField
                            label="Opening state"
                            value={form.openingState}
                            onChange={(value) =>
                              setField("openingState", value)
                            }
                            placeholder="tired after a brutal shift, but unusually honest tonight"
                            rows={4}
                          />
                        </div>
                      </Section>
                    </>
                  )}
                </>
              )}

              {!isQuickMode && activeStep === "advanced" && (
                <>
                  <Section
                    title="Response control"
                    description="Directive, example style, and stable behavior shaping."
                  >
                    <div className="grid gap-4">
                      <InputField
                        label="Response directive"
                        value={responseDirective}
                        onChange={(value) =>
                          rebuildCustomNotes({ "Response directive": value })
                        }
                        placeholder="be reserved, emotionally sharp, and use concise flirtation"
                      />
                      <TextAreaField
                        label="Example message"
                        value={exampleMessage}
                        onChange={(value) =>
                          rebuildCustomNotes({ "Example message": value })
                        }
                        placeholder='*leans against the doorway, studying you for a second* "You always look like trouble when you go quiet."'
                        rows={4}
                      />
                      <TextAreaField
                        label="Key memories"
                        value={keyMemories}
                        onChange={(value) =>
                          rebuildCustomNotes({ "Key memories": value })
                        }
                        placeholder="met the user on a rainy night, remembers their coffee order, notices when they get quiet"
                        rows={3}
                      />
                    </div>
                  </Section>

                  <Section
                    title="Boundaries and forbidden behaviors"
                    description="Guardrails so the character stays tasteful and coherent."
                  >
                    <div className="flex flex-wrap gap-2">
                      {BOUNDARY_OPTIONS.map((option) => (
                        <MiniChip
                          key={option}
                          label={option}
                          active={selectedBoundaries.includes(option)}
                          onClick={() => toggleBoundary(option)}
                        />
                      ))}
                    </div>
                  </Section>

                  <Section
                    title="Creator intent"
                    description="Use this for extra nuance."
                  >
                    <div className="grid gap-4">
                      <InputField
                        label="Tags"
                        value={form.tags}
                        onChange={(value) => setField("tags", value)}
                        placeholder="slow burn, romantic tension, protective, witty"
                      />
                      <TextAreaField
                        label="Custom notes"
                        value={bodyNotes}
                        onChange={(value) => rebuildCustomNotes({}, value)}
                        placeholder="Keep the character emotionally coherent, observant, and reactive to subtext rather than explaining everything directly."
                        rows={5}
                      />
                    </div>
                  </Section>
                </>
              )}

              {!isQuickMode && activeStep === "visual" && (
                <Section
                  title="Visual lab prep"
                  description="Prepares the character for future portraits, cards, and media generation."
                  accent="cyan"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Avatar style"
                      value={
                        (avatarStyle ||
                          AVATAR_STYLE_OPTIONS[0]) as (typeof AVATAR_STYLE_OPTIONS)[number]
                      }
                      onChange={(value) =>
                        rebuildCustomNotes({ "Avatar style": value })
                      }
                      options={AVATAR_STYLE_OPTIONS.map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                    <SelectField
                      label="Hair"
                      value={
                        (hair || HAIR_OPTIONS[0]) as (typeof HAIR_OPTIONS)[number]
                      }
                      onChange={(value) => rebuildCustomNotes({ Hair: value })}
                      options={HAIR_OPTIONS.map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                    <SelectField
                      label="Eyes"
                      value={
                        (eyes || EYE_OPTIONS[0]) as (typeof EYE_OPTIONS)[number]
                      }
                      onChange={(value) => rebuildCustomNotes({ Eyes: value })}
                      options={EYE_OPTIONS.map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                    <SelectField
                      label="Outfit"
                      value={
                        (outfit ||
                          OUTFIT_OPTIONS[0]) as (typeof OUTFIT_OPTIONS)[number]
                      }
                      onChange={(value) =>
                        rebuildCustomNotes({ Outfit: value })
                      }
                      options={OUTFIT_OPTIONS.map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                    <SelectField
                      label="Palette"
                      value={
                        (palette ||
                          PALETTE_OPTIONS[0]) as (typeof PALETTE_OPTIONS)[number]
                      }
                      onChange={(value) =>
                        rebuildCustomNotes({ Palette: value })
                      }
                      options={PALETTE_OPTIONS.map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                    <SelectField
                      label="Camera framing"
                      value={
                        (camera ||
                          CAMERA_OPTIONS[0]) as (typeof CAMERA_OPTIONS)[number]
                      }
                      onChange={(value) =>
                        rebuildCustomNotes({ Camera: value })
                      }
                      options={CAMERA_OPTIONS.map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                    <SelectField
                      label="Photo pack style"
                      value={
                        (photoPack ||
                          PHOTO_PACK_OPTIONS[0]) as (typeof PHOTO_PACK_OPTIONS)[number]
                      }
                      onChange={(value) =>
                        rebuildCustomNotes({ "Photo pack": value })
                      }
                      options={PHOTO_PACK_OPTIONS.map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                  </div>

                  <div className="mt-4">
                    <TextAreaField
                      label="Image prompt prep"
                      value={imagePrompt}
                      onChange={(value) =>
                        rebuildCustomNotes({ "Image prompt": value })
                      }
                      placeholder="cinematic luxury portrait, warm skin glow, rich contrast, subtle eye contact, premium fashion editorial lighting..."
                      rows={4}
                    />
                  </div>
                </Section>
              )}

              {(activeStep === "visual" || activeStep === "publish") && (
                <Section
                  title="AI avatar preview"
                  description="Generate a provider-backed avatar preview now. If a preview image is returned, it will be attached automatically after character creation."
                  accent="cyan"
                >
                  <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                      <div className="grid gap-4 md:grid-cols-2">
                        <SegmentButton
                          active={avatarProvider === "mage"}
                          onClick={() => setAvatarProvider("mage")}
                        >
                          Mage
                        </SegmentButton>
                        <SegmentButton
                          active={avatarProvider === "self-hosted-comfy"}
                          onClick={() => setAvatarProvider("self-hosted-comfy")}
                        >
                          Self-hosted ComfyUI
                        </SegmentButton>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateAvatar}
                        disabled={avatarGenerating || !canGenerateAvatar}
                        className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {avatarGenerating ? "Generating..." : "Generate Avatar"}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StatPill label="Avatar status" value={avatarStatusLabel} />
                      <StatPill
                        label="Provider"
                        value={
                          queuedJobProvider
                            ? queuedJobProvider === "mage"
                              ? "Mage"
                              : "Self-hosted ComfyUI"
                            : avatarProvider === "mage"
                              ? "Mage"
                              : "Self-hosted ComfyUI"
                        }
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/65">
                      Adult-only fictional avatar flow is enabled. The preview
                      generator is blocked for minors, real people, public
                      figures, non-consensual scenarios, and illegal content.
                    </div>

                    {avatarResultMessage ? (
                      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                        {avatarResultMessage}
                        {avatarQueuedExternalJobId
                          ? ` External job: ${avatarQueuedExternalJobId}`
                          : ""}
                      </div>
                    ) : null}

                    {generatedAvatarUrl ? (
                      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
                        <img
                          src={generatedAvatarUrl}
                          alt="Generated avatar preview"
                          className="h-[420px] w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
                        {avatarQueuedExternalJobId
                          ? "Avatar job is being monitored. Preview will appear automatically when ready."
                          : "No avatar preview yet. Set name, age, and region, then generate."}
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {activeStep === "publish" && (
                <Section
                  title="Publish setup"
                  description="Decide how this character should live inside your system."
                  accent="fuchsia"
                >
                  <div className="grid gap-5">
                    <div>
                      <div className="mb-2 text-sm text-white/75">
                        Visibility
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <SegmentButton
                          active={form.visibility === "private"}
                          onClick={() => setField("visibility", "private")}
                        >
                          Private
                        </SegmentButton>
                        <SegmentButton
                          active={form.visibility === "public"}
                          onClick={() => setField("visibility", "public")}
                        >
                          Public
                        </SegmentButton>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/55">
                        Private characters stay in your vault only. Public
                        characters keep the same internal structure but can be
                        shared on a public page.
                      </p>
                    </div>

                    {!isQuickMode ? (
                      <div className="grid gap-4">
                        <InputField
                          label="Public tagline"
                          value={publicTagline}
                          onChange={(value) =>
                            rebuildCustomNotes({ "Public tagline": value })
                          }
                          placeholder="Elegant, emotionally unreadable, impossible to forget."
                        />
                        <TextAreaField
                          label="Public teaser"
                          value={publicTeaser}
                          onChange={(value) =>
                            rebuildCustomNotes({ "Public teaser": value })
                          }
                          placeholder="A luxurious slow-burn character with controlled warmth, dangerous softness, and selective honesty."
                          rows={3}
                        />
                        <InputField
                          label="Public tags"
                          value={publicTags}
                          onChange={(value) =>
                            rebuildCustomNotes({ "Public tags": value })
                          }
                          placeholder="slow burn, elegant, dangerous, luxury"
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white/60">
                        Quick Mode keeps publish settings minimal on purpose.
                        You still keep full payload compatibility, public/private
                        control, and can deepen the character later without
                        rebuilding it.
                      </div>
                    )}
                  </div>
                </Section>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Creating..." : "Create character"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/my-characters")}
                  className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Go to My Characters
                </button>
              </div>
            </form>

            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              <Section
                title="Live output"
                description="Generated from the studio algorithm and saved directly to the current account."
                accent="fuchsia"
              >
                <div className="rounded-[26px] border border-white/10 bg-gradient-to-br from-black/35 to-black/20 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/80">
                      Preview
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                      studio compiled
                    </div>
                  </div>

                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {draft.name || "Unnamed Character"}
                  </h3>

                  <p className="mt-2 text-sm text-white/65">{draft.headline}</p>

                  {selectedTemplateId ? (
                    <div className="mt-3 inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-100">
                      Template applied:{" "}
                      {
                        CHARACTER_TEMPLATES.find(
                          (item) => item.id === selectedTemplateId,
                        )?.title
                      }
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {identitySummary.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                        Age profile
                      </div>
                      <div className="mt-2 text-sm text-white/75">
                        {ageValue} • {ageToneLabel(ageValue)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                        Emotional blend
                      </div>
                      <div className="mt-2 text-sm text-white/75">
                        {dynamicSummary}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                      Build readiness
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={readinessScore} />
                    </div>
                  </div>

                  <DividerLabel label="Builder V2 summary" />
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                      Prompt summary
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/75">
                      {builderV2Summary.promptEngineOutput.promptSummary ||
                        "No prompt summary yet."}
                    </p>

                    <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/35">
                      Canonical prompt
                    </div>
                    <p className="mt-2 max-h-40 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/70">
                      {builderV2Summary.promptEngineOutput.canonicalPrompt}
                    </p>

                    <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/35">
                      Negative prompt
                    </div>
                    <p className="mt-2 max-h-32 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/70">
                      {builderV2Summary.promptEngineOutput.negativePrompt}
                    </p>
                  </div>

                  <DividerLabel label="Avatar preview" />
                  <div className="mt-4 rounded-[24px] border border-white/10 bg-gradient-to-br from-fuchsia-400/10 via-white/[0.02] to-cyan-400/10 p-4">
                    {generatedAvatarUrl ? (
                      <img
                        src={generatedAvatarUrl}
                        alt="Avatar preview"
                        className="h-[340px] w-full rounded-[20px] object-cover"
                      />
                    ) : (
                      <div className="mt-4 grid grid-cols-[110px_1fr] gap-4">
                        <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-fuchsia-500/25 via-slate-800 to-cyan-500/25">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_35%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.08),transparent_30%)]" />
                          <div className="absolute left-1/2 top-5 h-16 w-16 -translate-x-1/2 rounded-full border border-white/15 bg-white/10" />
                          <div className="absolute bottom-4 left-1/2 h-24 w-24 -translate-x-1/2 rounded-[20px] border border-white/10 bg-white/5" />
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm text-white/80">
                            {visualSummary || "Visual prep not fully set yet"}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {[
                              avatarStyle,
                              hair,
                              eyes,
                              outfit,
                              palette,
                              camera,
                              photoPack,
                            ]
                              .filter(Boolean)
                              .map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                                >
                                  {item}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isQuickMode ? (
                    <>
                      {imagePrompt ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                            Image prompt prep
                          </div>
                          <p className="mt-3 text-sm leading-7 text-white/75">
                            {imagePrompt}
                          </p>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {memoryAnchorPreview.length > 0 ? (
                    <>
                      <DividerLabel label="Memory anchors" />
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mt-3 flex flex-wrap gap-2">
                          {memoryAnchorPreview.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}

                  <DividerLabel label="First reply variants" />
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                        Softer
                      </div>
                      <p className="mt-2 text-sm leading-7 text-white/75">
                        {firstReplySoft}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                        Flirtier
                      </div>
                      <p className="mt-2 text-sm leading-7 text-white/75">
                        {firstReplyFlirty}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                        Colder
                      </div>
                      <p className="mt-2 text-sm leading-7 text-white/75">
                        {firstReplyCold}
                      </p>
                    </div>
                  </div>

                  {!isQuickMode && (publicTagline || publicTeaser || publicTags) ? (
                    <>
                      <DividerLabel label="Public showcase" />
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        {publicTagline ? (
                          <div className="text-base font-medium text-white">
                            {publicTagline}
                          </div>
                        ) : null}
                        {publicTeaser ? (
                          <p className="mt-2 text-sm leading-7 text-white/70">
                            {publicTeaser}
                          </p>
                        ) : null}
                        {publicTags ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {parseCsv(publicTags).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  <DividerLabel label="Draft output" />
                  <div className="mt-5 space-y-4 text-sm text-white/75">
                    <div>
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                        Description
                      </div>
                      <p>{draft.description}</p>
                    </div>

                    <div>
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                        Greeting
                      </div>
                      <p>{draft.greeting}</p>
                    </div>

                    <div>
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                        Preview message
                      </div>
                      <p>{draft.previewMessage}</p>
                    </div>
                  </div>
                </div>
              </Section>

              <Section
                title="Quality checks"
                description="These are the remaining things that affect output strength."
              >
                {validationIssues.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                    Everything important is in place.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {validationIssues.map((issue) => (
                      <div
                        key={issue}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72"
                      >
                        {issue}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section
                title="What this final version includes"
                description={
                  isQuickMode
                    ? "Quick Mode keeps only the essentials visible."
                    : "Deep Studio includes the most important advanced controls."
                }
              >
                {isQuickMode ? (
                  <ul className="space-y-3 text-sm text-white/68">
                    <li>• Name</li>
                    <li>• Age</li>
                    <li>• Region</li>
                    <li>• Hobbies / interests</li>
                    <li>• Basic traits</li>
                    <li>• Short scenario</li>
                    <li>• Publish visibility</li>
                    <li>• Avatar preview generation</li>
                    <li>• Avatar queue polling</li>
                    <li>• Builder-v2 metadata enrichment</li>
                  </ul>
                ) : (
                  <ul className="space-y-3 text-sm text-white/68">
                    <li>• Relationship stage</li>
                    <li>• Jealousy / attachment / protectiveness</li>
                    <li>• Conversation initiative</li>
                    <li>• Affection style</li>
                    <li>• Conflict style</li>
                    <li>• Emotional availability</li>
                    <li>• Message format + linguistic flavor</li>
                    <li>• Forbidden behaviors</li>
                    <li>• Chemistry template</li>
                    <li>• Current energy / status</li>
                    <li>• Public card customization</li>
                    <li>• First-message variants preview</li>
                    <li>• Visual lab prep</li>
                    <li>• Avatar preview generation</li>
                    <li>• Avatar queue polling</li>
                    <li>• Builder-v2 prompt summary + canonical prompt</li>
                  </ul>
                )}
              </Section>
            </aside>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
