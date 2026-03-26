import type { CharacterImagePromptInput } from "@/lib/image-generation/types";
import {
  AVATAR_POSE_PRESETS,
  getAvatarPoseStudioThumbnailSrc,
} from "@/lib/avatar-pose-library";
import {
  normalizeReferenceAvatarStyle,
  normalizeReferenceCamera,
  normalizeReferenceLightingMood,
  normalizeReferencePhotoPack,
} from "@/lib/create-character/reference-realism";
import type { PosePromptContract } from "@/lib/create-character/pose-prompt-contract";
import { deriveVisualPromptCompatibility } from "@/lib/create-character/visual-compatibility";
import type {
  ImageStudioFormState,
  PhotoEnvironmentPreset,
  PhotoOutfitPreset,
  PhotoPoseCategory,
  PhotoPosePreset,
  PhotoStudioMode,
  PhotoStudioSelectionCompilerOutput,
} from "@/lib/photo-studio/types";

function unique(parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const part of parts) {
    const value = typeof part === "string" ? part.trim() : "";
    if (!value) continue;

    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

function joinComma(parts: Array<string | null | undefined>) {
  return unique(parts).join(", ");
}

function poseAsset(path: string) {
  return `/photo-studio/poses/${path}`;
}

function outfitAsset(path: string) {
  return `/photo-studio/outfits/${path}`;
}

function environmentAsset(path: string) {
  return `/photo-studio/environments/${path}`;
}

function defaultVariationBias() {
  return [
    "hero lifestyle upper-body frame",
    "closer crop with cleaner expression read",
    "room-forward composition with environmental story",
    "alternate body line with more movement in posture",
  ];
}

function buildPosePreset(
  input: Omit<PhotoPosePreset, "variationBias"> & { variationBias?: string[] },
): PhotoPosePreset {
  return {
    ...input,
    variationBias: input.variationBias ?? defaultVariationBias(),
  };
}

function buildAdultPosePreset(
  input: Omit<
    PhotoPosePreset,
    | "category"
    | "poseDistance"
    | "seedPolicy"
    | "seedStrength"
    | "lightingMood"
    | "photoPack"
    | "expression"
    | "thumbnailFocus"
    | "thumbnailStyle"
    | "variationBias"
  > & {
    variationBias?: string[];
    thumbnailFocus?: string;
    thumbnailStyle?: string;
    lightingMood?: string;
    photoPack?: string;
    expression?: string;
  },
): PhotoPosePreset {
  const inferredPoseDistance =
    /bed|recline|lying|floor|bathtub|stretch|couch|pillow|sunrise/i.test(input.id)
      ? "far"
      : "near";
  const inferredSeedPolicy =
    inferredPoseDistance === "far" ? "light" : "required";
  const inferredSeedStrength =
    inferredPoseDistance === "far" ? 0.22 : 0.8;

  return buildPosePreset({
    category: "adult",
    poseDistance: inferredPoseDistance,
    seedPolicy: inferredSeedPolicy,
    seedStrength: inferredSeedStrength,
    lightingMood: input.lightingMood ?? "soft intimate indoor light",
    photoPack: input.photoPack ?? "adult boudoir set",
    expression: input.expression ?? "adult confidence with composed intimacy",
    thumbnailFocus: input.thumbnailFocus ?? "center 42%",
    thumbnailStyle:
      input.thumbnailStyle ?? "from-fuchsia-400/20 via-slate-900 to-white/5",
    variationBias: input.variationBias ?? [
      "preserve the selected pose geometry instead of drifting to a generic glamour pose",
      "keep the selected shoulder angle, hip line, and leg arrangement readable at a glance",
      "preserve the chosen camera distance and body-first framing",
      "change only micro-expression and tiny balance shifts",
    ],
    ...input,
  });
}

function buildOutfitPreset(
  input: Omit<PhotoOutfitPreset, "variationBias"> & { variationBias?: string[] },
): PhotoOutfitPreset {
  return {
    ...input,
    variationBias: input.variationBias ?? defaultVariationBias(),
  };
}

function buildEnvironmentPreset(
  input: Omit<PhotoEnvironmentPreset, "variationBias"> & { variationBias?: string[] },
): PhotoEnvironmentPreset {
  return {
    ...input,
    variationBias: input.variationBias ?? defaultVariationBias(),
  };
}

function inferPoseFramingBias(cropDiscipline: string): PosePromptContract["framingBias"] {
  const lowered = cropDiscipline.toLowerCase();
  return lowered.includes("full-body") || lowered.includes("full body")
    ? "full_body"
    : "upper_body";
}

function buildPhotoStudioPoseContract(args: {
  posePreset: PhotoPosePreset;
  shotRecipe: PhotoStudioSelectionCompilerOutput["shotRecipe"];
}): PosePromptContract {
  return {
    poseFamily: "custom",
    posePrompt: joinComma([
      `studio pose preset ${args.posePreset.id}`,
      args.posePreset.shortLabel,
      args.posePreset.bodyLanguage,
    ]),
    bodyLinePrompt: args.shotRecipe.bodyLinePriority,
    framingBias: inferPoseFramingBias(args.shotRecipe.cropDiscipline),
    cropDiscipline: args.shotRecipe.cropDiscipline,
    gazeDirection: args.shotRecipe.gazeDirection,
    handLanguage: args.shotRecipe.handLanguage,
    posePriority: "high",
  };
}

function createPreviewLabels(
  category: PhotoPoseCategory,
  studioMode: PhotoStudioMode,
  environmentTitle: string,
): PhotoStudioSelectionCompilerOutput["previewLabels"] {
  if (studioMode === "adult") {
    return [
      {
        id: "hero",
        title: "Hero frame",
        description: "The most polished boudoir-forward version of this look.",
      },
      {
        id: "closer_crop",
        title: "Closer crop",
        description: "Tighter composition with stronger gaze and face read.",
      },
      {
        id: "room_forward",
        title: "Room-forward",
        description: `Lets the ${environmentTitle.toLowerCase()} atmosphere speak more clearly.`,
      },
      {
        id: "alt_body_line",
        title: "Alt body line",
        description: "Keeps the identity but shifts posture and silhouette tension.",
      },
    ];
  }

  return [
    {
      id: "hero",
      title: "Hero frame",
      description: "The cleanest natural lifestyle read of the chosen look.",
    },
    {
      id: "closer_crop",
      title: "Closer crop",
      description: "A tighter, more intimate crop with clearer expression.",
    },
    {
      id: "room_forward",
      title: "Room-forward",
      description: `Lets the ${environmentTitle.toLowerCase()} texture do more storytelling.`,
    },
    {
      id: "alt_body_line",
      title: "Alt body line",
      description: "Keeps the same person but changes stance and energy balance.",
    },
  ];
}

function inferPosePresetFromPrompt(input: CharacterImagePromptInput) {
  const combined = [
    input.pose,
    input.photoPack,
    input.camera,
    input.environment,
    input.expression,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    PHOTO_POSE_PRESETS.find((preset) => {
      const haystack = [
        preset.title,
        preset.shortLabel,
        preset.bodyLanguage,
        preset.photoPack,
        preset.camera,
      ]
        .join(" ")
        .toLowerCase();

      return haystack
        .split(/[,\s/()-]+/)
        .filter(Boolean)
        .some((token) => combined.includes(token));
    }) ?? null
  );
}

function inferOutfitPresetFromPrompt(input: CharacterImagePromptInput) {
  const combined = [input.outfit, input.exposureLevel, input.palette]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    PHOTO_OUTFIT_PRESETS.find((preset) => {
      const haystack = [preset.title, preset.outfit, preset.description]
        .join(" ")
        .toLowerCase();

      return haystack
        .split(/[,\s/()-]+/)
        .filter(Boolean)
        .some((token) => combined.includes(token));
    }) ?? null
  );
}

export const PHOTO_POSE_CATEGORIES: Array<{
  id: PhotoPoseCategory;
  title: string;
  description: string;
}> = [
  {
    id: "normal",
    title: "Normal",
    description:
      "Grounded pose variations like sitting, kneeling, standing, and casual lifestyle posture changes.",
  },
  {
    id: "adult",
    title: "Adult",
    description:
      "Preset-only erotic and nude-capable studio angles that keep the same face, body, age, hair, and skin read locked.",
  },
] as const;

export const PHOTO_POSE_PRESETS: PhotoPosePreset[] = [
  buildPosePreset({
    id: "normal-standing",
    category: "normal",
    title: "Standing",
    shortLabel: "Standing pose",
    vibe: "Clean, balanced, and easy to read.",
    bodyLanguage:
      "grounded standing stance with one leg carrying most of the weight, the other knee softened, shoulders level, torso facing mostly forward, and chin held naturally high",
    compositionIntent:
      "natural body-readable standing frame where the full body line reads immediately before the room does",
    cropDiscipline:
      "start wide enough to preserve the full standing silhouette from head to at least mid-shin, never collapse into a portrait crop",
    bodyLinePriority:
      "long clean line through shoulders, waist, hips, knees, and ankles with a readable weight shift",
    gazeDirection: "direct eye contact with calm everyday confidence",
    handLanguage:
      "hands relaxed by the thighs or lightly touching clothing, never hiding the waist line",
    lightingCharacter: "soft natural daylight with low stylization",
    roomRead: "light lifestyle environment that does not steal focus",
    camera: "full body pose",
    lightingMood: "clean daylight",
    photoPack: "daily lifestyle set",
    expression: "calm everyday confidence",
    variationBias: [
      "keep the standing stance front-readable with a soft weight shift",
      "preserve visible waist, hips, and leg line instead of a cropped portrait",
      "keep shoulders level and torso mostly forward",
      "allow only light changes in chin height and hand placement",
    ],
    thumbnailSrc: poseAsset("everyday/standing.svg"),
    thumbnailAlt: "Standing pose preview",
    thumbnailFocus: "center 42%",
    thumbnailStyle: "from-cyan-400/20 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-sitting-chair",
    category: "normal",
    title: "Sitting Chair",
    shortLabel: "Chair pose",
    vibe: "Natural seated posture with clean posture lines.",
    bodyLanguage:
      "seated on a chair with the hips fully grounded, spine tall but relaxed, one knee slightly forward, shoulders open, and feet planted or lightly crossed at the ankle",
    compositionIntent:
      "seated posture-led frame where chair geometry supports the body rather than hiding it",
    cropDiscipline:
      "three-quarter seated frame or waist-up seated crop with visible lap line and chair read",
    bodyLinePriority:
      "shoulder line, lap line, knees, and chair structure must all read clearly",
    gazeDirection: "steady gaze with composed poise toward camera",
    handLanguage:
      "one hand can rest on the thigh or chair arm while the other stays loose and natural",
    lightingCharacter: "soft window light with natural contour",
    roomRead: "quiet interior that supports a relaxed sitting pose",
    camera: "upper-body seated frame",
    lightingMood: "soft window light",
    photoPack: "home lifestyle set",
    expression: "soft composed expression",
    variationBias: [
      "keep the seated read unmistakable with visible chair support",
      "preserve hip grounding and knee placement",
      "avoid standing drift or faceless close crop",
      "allow only light variation in foot angle and hand rest",
    ],
    thumbnailSrc: poseAsset("everyday/chair.svg"),
    thumbnailAlt: "Sitting chair pose preview",
    thumbnailFocus: "center 45%",
    thumbnailStyle: "from-amber-400/20 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-kneeling",
    category: "normal",
    title: "Kneeling",
    shortLabel: "Kneeling pose",
    vibe: "Soft grounded pose with a different body line.",
    bodyLanguage:
      "kneeling pose with both knees clearly folded under the body or one knee slightly forward, hips resting back, spine elongated, shoulders soft, and torso lifted instead of collapsed",
    compositionIntent:
      "grounded kneeling frame where the fold of the legs and lifted torso remain obvious",
    cropDiscipline:
      "three-quarter frame with visible kneeling foundation and enough room for torso and lap to read together",
    bodyLinePriority:
      "hip line, spine angle, knee fold, and hand placement must define the pose",
    gazeDirection: "soft attention toward camera with gentle presence",
    handLanguage:
      "hands resting on lap, thighs, or bed/floor edge with quiet intentionality",
    lightingCharacter: "diffused daylight with cozy room softness",
    roomRead: "quiet room texture stays secondary to the pose",
    camera: "three-quarter pose",
    lightingMood: "soft window light",
    photoPack: "soft home set",
    expression: "gentle relaxed expression",
    variationBias: [
      "keep the kneeling posture unmistakable with visible folded legs",
      "preserve the lifted torso and calm shoulder line",
      "avoid converting the pose into generic sitting or standing",
      "allow only light shifts in hand position and head tilt",
    ],
    thumbnailSrc: poseAsset("everyday/bed-lounge.svg"),
    thumbnailAlt: "Kneeling pose preview",
    thumbnailFocus: "center 48%",
    thumbnailStyle: "from-rose-400/20 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-leaning-wall",
    category: "normal",
    title: "Leaning Wall",
    shortLabel: "Leaning wall",
    vibe: "Simple pose with casual attitude.",
    bodyLanguage:
      "standing lean with one shoulder or one hip resting into the wall, outside leg relaxed, inside shoulder slightly dropped, and torso angled just enough to show the body line",
    compositionIntent:
      "casual vertical body-readable frame with a clear supported lean instead of a straight neutral stand",
    cropDiscipline:
      "three-quarter or full-body framing that keeps the wall support and full torso line visible",
    bodyLinePriority:
      "hip shift, shoulder line, outer leg length, and wall contact define the read",
    gazeDirection: "casual direct look or off-camera side glance",
    handLanguage:
      "one hand can touch the wall or rest near the thigh while the other stays easy and low-tension",
    lightingCharacter: "clean daylight with subtle edge contrast",
    roomRead: "minimal background that keeps attention on the stance",
    camera: "full body pose",
    lightingMood: "clean daylight",
    photoPack: "daily lifestyle set",
    expression: "casual composed expression",
    variationBias: [
      "keep one clear support point against the wall",
      "preserve the angled torso and offset hip line",
      "avoid flattening into a generic front-facing stand",
      "allow only mild changes in head turn and wrist placement",
    ],
    thumbnailSrc: poseAsset("everyday/balcony-window.svg"),
    thumbnailAlt: "Leaning wall pose preview",
    thumbnailFocus: "center 45%",
    thumbnailStyle: "from-indigo-400/20 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-laying-bed",
    category: "normal",
    title: "Laying Bed",
    shortLabel: "Laying pose",
    vibe: "Soft laid-back pose with natural comfort.",
    bodyLanguage:
      "lying on the bed with shoulders relaxed into the mattress, torso slightly turned rather than completely flat, one knee softly bent, and the neck long enough to keep the face open to camera",
    compositionIntent:
      "soft private-room lounging frame that preserves the reclined body line instead of reading like a cropped headshot",
    cropDiscipline:
      "waist-up or three-quarter lounge crop with visible shoulder drop, torso direction, and at least part of the bent leg line",
    bodyLinePriority:
      "shoulder drop, torso angle, bent-knee line, and pillow/bed support should all read together",
    gazeDirection: "gentle attention toward camera or just past it",
    handLanguage:
      "one hand resting near the waist, pillow, or sheet while the other stays soft and unforced",
    lightingCharacter: "diffused daylight with cozy room softness",
    roomRead: "bedroom texture is visible but secondary to the character",
    camera: "soft candid angle",
    lightingMood: "soft window light",
    photoPack: "soft home set",
    expression: "gentle relaxed expression",
    variationBias: [
      "keep the body clearly reclined on the bed with a visible bend through one leg",
      "preserve mattress contact and shoulder drop",
      "avoid drifting into a seated portrait crop",
      "allow only light changes in elbow support and gaze direction",
    ],
    thumbnailSrc: poseAsset("everyday/bed-lounge.svg"),
    thumbnailAlt: "Laying bed pose preview",
    thumbnailFocus: "center 48%",
    thumbnailStyle: "from-rose-400/20 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-couch-lounge",
    category: "normal",
    title: "Couch Lounge",
    shortLabel: "Couch lounge",
    vibe: "A relaxed indoor pose that still reads cleanly.",
    bodyLanguage:
      "couch lounge with the torso turned diagonally into the cushions, hips settled low, one leg extended or draped forward, and shoulders softened into the furniture",
    compositionIntent:
      "comfortable indoor lounge frame where the couch support and diagonal torso line stay readable",
    cropDiscipline:
      "three-quarter or upper-body lounge crop with visible sofa contact, torso angle, and part of the leg line",
    bodyLinePriority:
      "torso angle, shoulder drop, hip settle, and cushion-supported leg placement",
    gazeDirection: "warm eye line with relaxed attention",
    handLanguage:
      "hands resting against cushion, thigh, or sofa edge with casual grounded placement",
    lightingCharacter: "soft ambient room light with subtle shape retention",
    roomRead: "interior furniture helps frame the pose naturally",
    camera: "soft candid angle",
    lightingMood: "soft room light",
    photoPack: "soft home set",
    expression: "warm relaxed expression",
    variationBias: [
      "keep the couch-supported recline obvious",
      "preserve diagonal torso placement and low-set hips",
      "avoid upright chair-like posture drift",
      "allow only small changes in arm rest and leg extension",
    ],
    thumbnailSrc: poseAsset("everyday/bed-lounge.svg"),
    thumbnailAlt: "Couch lounge pose preview",
    thumbnailFocus: "center 47%",
    thumbnailStyle: "from-fuchsia-400/14 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-mirror-pose",
    category: "normal",
    title: "Mirror Pose",
    shortLabel: "Mirror pose",
    vibe: "Modern and personal with a clean self-shot read.",
    bodyLanguage:
      "mirror pose with one hip subtly pushed out, shoulders offset instead of square, phone or camera hand lifted naturally, and the free arm relaxed near the waist or thigh",
    compositionIntent:
      "personal body-readable mirror frame where both the reflection and the asymmetrical body stance are intentional",
    cropDiscipline:
      "vertical mirror composition with enough space for the full torso, hip line, and mirror border to stay visible",
    bodyLinePriority:
      "hip shift, shoulder offset, arm asymmetry, and reflected body line must read clearly",
    gazeDirection: "split attention between reflection and lens",
    handLanguage:
      "camera hand lifted with believable selfie mechanics, free hand relaxed and not overly posed",
    lightingCharacter: "clean ambient light with reflective highlights",
    roomRead: "mirror and vanity geometry stay visible",
    camera: "mirror upper-body frame",
    lightingMood: "clean ambient light",
    photoPack: "mirror set",
    expression: "quiet confident expression",
    variationBias: [
      "keep the mirror geometry and reflective asymmetry obvious",
      "preserve the offset hips and shoulders",
      "avoid turning this into a generic direct-camera portrait",
      "allow only light shifts in phone angle and chin turn",
    ],
    thumbnailSrc: poseAsset("everyday/mirror-casual.svg"),
    thumbnailAlt: "Mirror pose preview",
    thumbnailFocus: "center 40%",
    thumbnailStyle: "from-emerald-400/20 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-window-pose",
    category: "normal",
    title: "Window Pose",
    shortLabel: "Window pose",
    vibe: "Airy pose with a softer distant read.",
    bodyLanguage:
      "window-side stance with the body angled toward the light, shoulders slightly turned away from camera, neck lengthened, and one arm lightly grounded on the sill, frame, or railing",
    compositionIntent:
      "light-filled edge-of-room frame where the window relationship shapes the body orientation",
    cropDiscipline:
      "three-quarter crop with visible window structure, shoulder turn, waist line, and enough room for light falloff",
    bodyLinePriority:
      "spine angle, neck line, waist turn, and hand-to-window interaction define the pose",
    gazeDirection: "distant look with optional return glance to camera",
    handLanguage:
      "one hand lightly grounded on frame or rail while the other stays easy and low tension",
    lightingCharacter: "soft natural glow with low-contrast edge light",
    roomRead: "outside light and architecture carry a little more atmosphere",
    camera: "over-the-shoulder glance",
    lightingMood: "natural window light",
    photoPack: "daylight lifestyle set",
    expression: "thoughtful half-smile",
    variationBias: [
      "keep the body angled toward the window instead of fully front-facing",
      "preserve visible light source relationship and rail or frame interaction",
      "avoid losing the waist turn in a portrait crop",
      "allow only gentle variation in gaze return and elbow bend",
    ],
    thumbnailSrc: poseAsset("everyday/balcony-window.svg"),
    thumbnailAlt: "Window pose preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-sky-400/20 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-crossed-legs-seated",
    category: "normal",
    title: "Crossed Legs Seated",
    shortLabel: "Crossed legs",
    vibe: "Simple seated pose with composed lines.",
    bodyLanguage:
      "seated with one leg cleanly crossed over the other, shoulders level, waist tall, and the torso centered over the hips without collapsing forward",
    compositionIntent:
      "neat seated composition where the crossed-leg geometry and calm posture read at once",
    cropDiscipline:
      "three-quarter seated crop with visible knee cross, lap line, and chair or sofa support",
    bodyLinePriority:
      "knee crossing, waist line, shoulder balance, and seated grounding are primary",
    gazeDirection: "calm attentive eye line",
    handLanguage:
      "hands resting on the upper knee, lap, or seat edge without hiding the crossed-leg structure",
    lightingCharacter: "window light with soft realism",
    roomRead: "clean room detail that stays secondary",
    camera: "three-quarter seated frame",
    lightingMood: "soft window light",
    photoPack: "home lifestyle set",
    expression: "quiet composed expression",
    variationBias: [
      "keep the crossed-leg silhouette unmistakable",
      "preserve the centered waist and level shoulders",
      "avoid generic uncrossed seated drift",
      "allow only subtle changes in hand rest and chin angle",
    ],
    thumbnailSrc: poseAsset("everyday/chair.svg"),
    thumbnailAlt: "Crossed legs seated pose preview",
    thumbnailFocus: "center 45%",
    thumbnailStyle: "from-stone-300/20 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-walking-glance",
    category: "normal",
    title: "Walking Glance",
    shortLabel: "Walking glance",
    vibe: "Adds motion without losing identity clarity.",
    bodyLanguage:
      "mid-step walking pose with one foot landing forward, opposite shoulder slightly advanced, hips following the stride, and head turned back for a captured-in-motion glance",
    compositionIntent:
      "motion-led lifestyle frame where the stride and backward glance both stay readable",
    cropDiscipline:
      "full-body or three-quarter moving frame with enough room to show the active step and arm swing",
    bodyLinePriority:
      "stride line, hip movement, shoulder turn, and trailing arm motion create the pose",
    gazeDirection: "side glance back toward camera",
    handLanguage: "hands move naturally with the step and never freeze rigidly",
    lightingCharacter: "clean daylight with natural contrast",
    roomRead: "minimal environment supports the motion read",
    camera: "full body pose",
    lightingMood: "clean daylight",
    photoPack: "lifestyle motion set",
    expression: "soft confident glance",
    variationBias: [
      "keep one clear forward step with motion through the hips and shoulders",
      "preserve the turned-head glance rather than a static front pose",
      "avoid stopping the walk into a generic stand",
      "allow only small changes in stride length and arm swing",
    ],
    thumbnailSrc: poseAsset("everyday/standing.svg"),
    thumbnailAlt: "Walking glance pose preview",
    thumbnailFocus: "center 42%",
    thumbnailStyle: "from-cyan-300/16 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-hands-on-hips",
    category: "normal",
    title: "Hands on Hips",
    shortLabel: "Hands on hips",
    vibe: "Confident, clear, and easy to read fast.",
    bodyLanguage:
      "standing posture with both hands set at the waist or upper hips, elbows angled outward, chest open, one knee soft, and the body balanced in a clear power stance",
    compositionIntent:
      "confident body-readable frame that immediately shows the waist and stance geometry",
    cropDiscipline:
      "three-quarter or full-body crop with visible elbows, waist indentation, hips, and leg line",
    bodyLinePriority:
      "waist read, elbow shape, shoulder width, and hip line must read instantly",
    gazeDirection: "direct confident eye contact",
    handLanguage:
      "hands create a clear waist-defining frame and must not disappear behind the body",
    lightingCharacter: "natural daylight with clear skin texture",
    roomRead: "background stays minimal and supportive",
    camera: "full body pose",
    lightingMood: "clean daylight",
    photoPack: "daily lifestyle set",
    expression: "simple confident expression",
    variationBias: [
      "keep both hands actively defining the waist or upper hips",
      "preserve the open chest and power stance",
      "avoid dropping one arm into a neutral standing pose",
      "allow only small changes in elbow flare and leg softness",
    ],
    thumbnailSrc: poseAsset("everyday/standing.svg"),
    thumbnailAlt: "Hands on hips pose preview",
    thumbnailFocus: "center 42%",
    thumbnailStyle: "from-cyan-400/20 via-slate-900 to-white/5",
  }),
  buildPosePreset({
    id: "normal-over-shoulder-look",
    category: "normal",
    title: "Over-Shoulder Look",
    shortLabel: "Over shoulder",
    vibe: "A cleaner upper-body twist with a softer mood.",
    bodyLanguage:
      "turned torso with the back shoulder slightly closer to camera, head returning over that shoulder, spine twisted just enough to show the neck line and waist turn together",
    compositionIntent:
      "upper-body-led frame where the return glance and shoulder twist define the image",
    cropDiscipline:
      "upper-body or three-quarter crop with visible shoulder turn, neck line, and waist twist",
    bodyLinePriority:
      "neck line, shoulder turn, spine twist, and waist rotation must read together",
    gazeDirection: "return glance over the shoulder",
    handLanguage:
      "light grounding against side, rail, or fabric with no heavy gesture blocking the turn",
    lightingCharacter: "soft natural glow with skin texture preserved",
    roomRead: "window or airy room edge can support the pose",
    camera: "over-the-shoulder upper-body frame",
    lightingMood: "soft natural light",
    photoPack: "upper-body lifestyle set",
    expression: "subtle inviting expression",
    variationBias: [
      "keep the body turned away while the face returns over the shoulder",
      "preserve visible neck line and waist twist",
      "avoid flattening into a straight-on portrait",
      "allow only small changes in shoulder height and hand support",
    ],
    thumbnailSrc: poseAsset("everyday/balcony-window.svg"),
    thumbnailAlt: "Over shoulder pose preview",
    thumbnailFocus: "center 40%",
    thumbnailStyle: "from-sky-400/20 via-slate-900 to-white/5",
  }),
  buildAdultPosePreset({
    id: "adult-bed-kneel",
    title: "Bed Kneel",
    shortLabel: "Bed Kneel",
    vibe: "Kneeling on the bed with a controlled boudoir line.",
    bodyLanguage:
      "kneeling on the bed with shins folded under the body, hips resting close to the heels, torso lifted, shoulders soft, and the chest angled slightly toward camera",
    compositionIntent:
      "bed-led boudoir frame where the kneeling foundation and lifted torso read immediately",
    cropDiscipline:
      "three-quarter or body-readable upper-body crop with visible bent legs, waist, chest, and bed surface",
    bodyLinePriority:
      "knee fold, lifted torso, waist curve, and shoulder softness define the pose",
    gazeDirection: "confident direct eye contact with calm intimacy",
    handLanguage:
      "hands resting on thighs, sheet, or mattress with low-tension deliberate placement",
    lightingCharacter:
      "soft warm bedroom light with realistic skin texture and visible body contour",
    roomRead: "bed linens and headboard texture should quietly support the pose",
    camera: "three-quarter boudoir frame",
    thumbnailSrc: poseAsset("adult-suggestive/bed-boudoir.svg"),
    thumbnailAlt: "Bed Kneel preview",
    variationBias: [
      "keep the kneeling bed posture with visible folded legs",
      "preserve the lifted torso and hips near the heels",
      "avoid generic standing or seated boudoir drift",
      "allow only light changes in hand rest and chin angle",
    ],
  }),
  buildAdultPosePreset({
    id: "adult-bed-edge-sit",
    title: "Bed Edge Sit",
    shortLabel: "Bed Edge Sit",
    vibe: "Seated at the bed edge with calm direct confidence.",
    bodyLanguage:
      "seated on the edge of the bed with hips forward, spine tall, thighs angled toward camera, knees together or softly parted, and shoulders open",
    compositionIntent:
      "bed-edge seated frame with a clear lap line and strong direct body read",
    cropDiscipline:
      "three-quarter seated crop with visible bed edge, lap line, waist, and shoulder openness",
    bodyLinePriority:
      "lap line, torso lift, shoulder openness, and bed-edge geometry define the image",
    gazeDirection: "steady direct eye contact with composed confidence",
    handLanguage:
      "hands placed behind on the bed, on the thighs, or lightly bracing at the mattress edge",
    lightingCharacter:
      "soft bedside light with natural depth and polished but realistic skin rendering",
    roomRead: "bed edge and nearby furniture should anchor the private-room context",
    camera: "three-quarter seated frame",
    thumbnailSrc: poseAsset("adult-suggestive/bed-boudoir.svg"),
    thumbnailAlt: "Bed Edge Sit preview",
  }),
  buildAdultPosePreset({
    id: "adult-lying-back",
    title: "Lying Back",
    shortLabel: "Lying Back",
    vibe: "Relaxed lying pose with a long clean torso line.",
    bodyLanguage:
      "lying back across the bed with shoulders resting into the surface, one knee bent, the other leg longer, torso lengthened, and head turned gently toward camera",
    compositionIntent:
      "reclined bed frame that shows the long torso line without losing facial visibility",
    cropDiscipline:
      "three-quarter lounge crop with visible chest, waist, hips, bent knee, and bed contact",
    bodyLinePriority:
      "torso length, bend through one leg, shoulder drop, and head turn define the pose",
    gazeDirection: "soft return gaze toward camera",
    handLanguage:
      "hands relaxed beside the ribs, on the sheet, or lightly above the head without stiff posing",
    lightingCharacter:
      "dim warm window or bedside light with natural shadow roll across the torso",
    roomRead: "pillows and bed texture should support the reclined mood",
    camera: "reclined three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/bed-boudoir.svg"),
    thumbnailAlt: "Lying Back preview",
  }),
  buildAdultPosePreset({
    id: "adult-side-recline",
    title: "Side Recline",
    shortLabel: "Side Recline",
    vibe: "Side body line that keeps the same identity cleanly visible.",
    bodyLanguage:
      "reclining on one side with weight on a forearm or elbow, top knee slightly advanced, waist visible, and shoulders stacked on a diagonal",
    compositionIntent:
      "side-body boudoir frame that keeps the silhouette clean and identity readable",
    cropDiscipline:
      "three-quarter or waist-up reclining crop with visible elbow support, waist line, and top leg angle",
    bodyLinePriority:
      "side waist curve, stacked shoulders, elbow support, and top-knee angle carry the pose",
    gazeDirection: "soft side glance or direct return look",
    handLanguage:
      "supporting arm grounded, free hand resting along thigh, waist, or bedding",
    lightingCharacter:
      "soft directional room light tracing the side silhouette without flattening it",
    roomRead: "bed or sofa support should stay subtly visible",
    camera: "side-recline three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/bed-boudoir.svg"),
    thumbnailAlt: "Side Recline preview",
  }),
  buildAdultPosePreset({
    id: "adult-mirror-arch",
    title: "Mirror Arch",
    shortLabel: "Mirror Arch",
    vibe: "Mirror-led pose with a stronger waist and hip curve.",
    bodyLanguage:
      "standing at a mirror with one hip pushed out, lower back gently arched, shoulders offset, and one arm raised or bent to strengthen the S-curve",
    compositionIntent:
      "reflection-led boudoir image where the mirrored waist-to-hip curve is the main read",
    cropDiscipline:
      "vertical mirror composition with visible mirror frame, torso curve, waist, and upper thighs",
    bodyLinePriority:
      "waist arch, hip push, shoulder offset, and reflection symmetry carry the pose",
    gazeDirection: "split focus between reflection and camera",
    handLanguage:
      "one hand can hold a phone or touch the mirror, the other supports the waist or thigh line",
    lightingCharacter:
      "soft reflective vanity light with realistic highlights and no plastic sheen",
    roomRead: "mirror geometry and vanity edges should read immediately",
    camera: "mirror body-readable frame",
    thumbnailSrc: poseAsset("adult-suggestive/mirror-boudoir.svg"),
    thumbnailAlt: "Mirror Arch preview",
  }),
  buildAdultPosePreset({
    id: "adult-shower-doorway",
    title: "Shower Doorway",
    shortLabel: "Shower Doorway",
    vibe: "Doorway stance with after-shower intimacy.",
    bodyLanguage:
      "standing in a bathroom doorway with one shoulder angled into the frame, torso turned three-quarters, one leg softly forward, and damp post-shower ease in the posture",
    compositionIntent:
      "after-shower threshold frame where doorway structure and body angle work together",
    cropDiscipline:
      "three-quarter crop with visible doorway line, torso direction, waist, and thigh start",
    bodyLinePriority:
      "doorframe contact, shoulder angle, torso turn, and forward leg create the read",
    gazeDirection: "calm direct look or slight downward glance",
    handLanguage:
      "one hand can rest on the doorframe or towel while the other stays low and relaxed",
    lightingCharacter:
      "humid warm bathroom light with clean realistic skin texture",
    roomRead: "bathroom threshold, tile, or steam-softened background should support the scene",
    camera: "three-quarter doorway frame",
    thumbnailSrc: poseAsset("adult-suggestive/sheet-robe.svg"),
    thumbnailAlt: "Shower Doorway preview",
  }),
  buildAdultPosePreset({
    id: "adult-towel-drop",
    title: "Towel Drop Stance",
    shortLabel: "Towel Drop",
    vibe: "Fresh out-of-shower mood with grounded posture.",
    bodyLanguage:
      "standing upright after a shower with shoulders open, towel loosely held low or off to one side, one knee soft, and hips settled into a clean front-facing stance",
    compositionIntent:
      "body-first bathroom frame with a direct upright stance and minimal movement",
    cropDiscipline:
      "three-quarter body crop with visible torso, waist, hips, and towel interaction",
    bodyLinePriority:
      "front torso read, towel placement, hip line, and open shoulder posture must stay clear",
    gazeDirection: "direct calm eye contact",
    handLanguage:
      "hands managing the towel naturally without hiding the torso structure",
    lightingCharacter:
      "clean bathroom practical light with soft steam-lifted highlights",
    roomRead: "bathroom surfaces stay believable and secondary",
    camera: "body-readable upper-body frame",
    thumbnailSrc: poseAsset("adult-suggestive/sheet-robe.svg"),
    thumbnailAlt: "Towel Drop Stance preview",
  }),
  buildAdultPosePreset({
    id: "adult-window-silhouette",
    title: "Window Silhouette",
    shortLabel: "Window Silhouette",
    vibe: "Soft room light shaping the same body line.",
    bodyLanguage:
      "standing side-on or three-quarters to a large window, one leg slightly forward, ribs lifted, waist visible, and arms relaxed enough to keep the silhouette clean",
    compositionIntent:
      "window-lit silhouette frame where side light reveals shape without losing face identity",
    cropDiscipline:
      "three-quarter or full-body frame with visible window edge, side body line, and negative space around the silhouette",
    bodyLinePriority:
      "side silhouette, waist break, shoulder line, and leg separation are primary",
    gazeDirection: "distant profile look or soft glance back",
    handLanguage:
      "hands low and clean, never interrupting the silhouette line",
    lightingCharacter:
      "strong window backlight softened by room fill, preserving skin realism",
    roomRead: "window architecture and curtain edges should support the silhouette",
    camera: "silhouette three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/sheet-robe.svg"),
    thumbnailAlt: "Window Silhouette preview",
  }),
  buildAdultPosePreset({
    id: "adult-couch-recline",
    title: "Couch Recline",
    shortLabel: "Couch Recline",
    vibe: "A soft reclining indoor frame with a luxury boudoir read.",
    bodyLanguage:
      "reclining along a couch with shoulders sunk into the cushions, hips turned slightly toward camera, one leg longer, and the top arm loosely guiding the torso line",
    compositionIntent:
      "luxury couch boudoir frame with an elegant recline instead of a flat lounge",
    cropDiscipline:
      "three-quarter lounge crop with visible couch contact, torso angle, waist, and leg extension",
    bodyLinePriority:
      "cushion-supported recline, hip turn, waist line, and extended leg are key",
    gazeDirection: "warm direct gaze or soft off-camera look",
    handLanguage:
      "hands rest on cushion, waist, or thigh with effortless support",
    lightingCharacter:
      "low warm room light with enough contrast to preserve contour and age read",
    roomRead: "couch shape and nearby side table or lamp should add luxury context",
    camera: "reclined three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/chair-tease.svg"),
    thumbnailAlt: "Couch Recline preview",
  }),
  buildAdultPosePreset({
    id: "adult-floor-arch",
    title: "Floor Arch",
    shortLabel: "Floor Arch",
    vibe: "Floor pose with a deliberate spine and hip line.",
    bodyLanguage:
      "posed on the floor with weight through hands or forearms, chest lifted, lower back gently arched, one knee bent, and hips angled to keep the curve readable",
    compositionIntent:
      "editorial floor pose that emphasizes the lifted chest-to-hip arc while keeping the face visible",
    cropDiscipline:
      "three-quarter body crop with visible floor contact, waist curve, bent leg, and hand support",
    bodyLinePriority:
      "spine arc, hand support, chest lift, and bent-knee line define the image",
    gazeDirection: "direct low-angle eye contact or turned look toward camera",
    handLanguage:
      "hands or forearms support the body and must visibly explain the pose",
    lightingCharacter:
      "moody soft indoor light with crisp contour across the torso and hips",
    roomRead: "floor texture should stay subtle and not distract from the line",
    camera: "low three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/fantasy-pose.svg"),
    thumbnailAlt: "Floor Arch preview",
  }),
  buildAdultPosePreset({
    id: "adult-over-shoulder",
    title: "Over-Shoulder Glance",
    shortLabel: "Over-Shoulder",
    vibe: "Turned-back body line with a strong facial read.",
    bodyLanguage:
      "body turned mostly away from camera with one shoulder closer to the lens, waist twisted enough to show shape, and the face returning over the shoulder",
    compositionIntent:
      "back-led boudoir frame where the return glance and waist twist share equal weight",
    cropDiscipline:
      "upper-body or three-quarter crop with visible shoulder blade line, waist turn, and facial return",
    bodyLinePriority:
      "shoulder-back line, waist twist, and head turn create the pose",
    gazeDirection: "direct return glance over the shoulder",
    handLanguage:
      "one hand can trail along the thigh, hip, or sheet without blocking the turn",
    lightingCharacter:
      "soft room light with enough edge highlight to keep the back line readable",
    roomRead: "bed, chair, or wall edge should lightly support the body turn",
    camera: "over-the-shoulder boudoir crop",
    thumbnailSrc: poseAsset("adult-suggestive/lingerie-pose.svg"),
    thumbnailAlt: "Over-Shoulder Glance preview",
  }),
  buildAdultPosePreset({
    id: "adult-robe-open",
    title: "Robe Open Stance",
    shortLabel: "Robe Open",
    vibe: "Open robe framing with the identity fully preserved.",
    bodyLanguage:
      "standing with the robe parted open, feet planted softly apart, one hip shifted, shoulders relaxed, and torso front-readable without flattening the waist",
    compositionIntent:
      "frontal boudoir stance where the robe framing supports the body instead of hiding it",
    cropDiscipline:
      "body-readable upper-body or three-quarter crop with robe opening, waist, chest, and hips visible",
    bodyLinePriority:
      "robe opening, waist indentation, shoulder softness, and hip shift lead the frame",
    gazeDirection: "steady intimate eye contact",
    handLanguage:
      "hands lightly holding robe edges or resting at the waist without stiff symmetry",
    lightingCharacter:
      "warm room light that keeps robe texture and skin texture equally believable",
    roomRead: "bedside or dressing-room context should remain subtle",
    camera: "three-quarter boudoir frame",
    thumbnailSrc: poseAsset("adult-suggestive/sheet-robe.svg"),
    thumbnailAlt: "Robe Open Stance preview",
  }),
  buildAdultPosePreset({
    id: "adult-sheet-wrap",
    title: "Sheet Wrap Pose",
    shortLabel: "Sheet Wrap",
    vibe: "Wrapped-sheet styling with soft reveal tension.",
    bodyLanguage:
      "standing or seated with a sheet wrapped around the body, shoulders softly exposed, torso angled three-quarters, and one knee or hip leading the shape",
    compositionIntent:
      "soft reveal frame where the wrapped sheet defines the silhouette rather than covering it flatly",
    cropDiscipline:
      "three-quarter crop with visible sheet tension, shoulder line, waist break, and upper thigh or lap line",
    bodyLinePriority:
      "sheet wrap tension, shoulder exposure, waist line, and leading hip shape the image",
    gazeDirection: "soft private eye line toward camera",
    handLanguage:
      "hands hold or gather the sheet naturally, explaining how it sits around the body",
    lightingCharacter:
      "diffused warm bedroom light with believable fabric highlights",
    roomRead: "bed linens and soft room texture should reinforce the intimacy",
    camera: "sheet-wrapped three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/sheet-robe.svg"),
    thumbnailAlt: "Sheet Wrap Pose preview",
  }),
  buildAdultPosePreset({
    id: "adult-balcony-night",
    title: "Balcony Night Pose",
    shortLabel: "Balcony Night",
    vibe: "Night air and a confident body-led stance.",
    bodyLanguage:
      "standing near a balcony rail at night with one hip leaning lightly into the edge, shoulders open to the city glow, and the body angled to keep the silhouette elegant",
    compositionIntent:
      "night balcony frame where the body stance leads and the city mood supports it",
    cropDiscipline:
      "three-quarter or full-body crop with rail line, waist, hips, and night space breathing around the figure",
    bodyLinePriority:
      "hip lean, shoulder openness, waist line, and rail interaction define the pose",
    gazeDirection: "cool direct look or distant cityward glance",
    handLanguage:
      "hands resting on the rail or at the hip with minimal but intentional placement",
    lightingCharacter:
      "mixed city glow and warm indoor spill with clean contour preservation",
    roomRead: "balcony edge and night skyline cues should be readable",
    camera: "night three-quarter body frame",
    thumbnailSrc: poseAsset("adult-suggestive/mirror-boudoir.svg"),
    thumbnailAlt: "Balcony Night Pose preview",
  }),
  buildAdultPosePreset({
    id: "adult-vanity-undress",
    title: "Vanity Undress Moment",
    shortLabel: "Vanity Undress",
    vibe: "Vanity-side styling with a polished adult atmosphere.",
    bodyLanguage:
      "standing or perched beside a vanity with the torso angled into the mirror, one shoulder slipped back, hips subtly offset, and a half-turn that keeps both reflection and body line visible",
    compositionIntent:
      "vanity-side frame where grooming context and body posture feel intentionally private",
    cropDiscipline:
      "three-quarter crop with vanity edge, shoulder turn, waist line, and enough reflection detail",
    bodyLinePriority:
      "shoulder slip, waist angle, mirror echo, and hip offset do the work",
    gazeDirection: "split focus between mirror and viewer",
    handLanguage:
      "one hand can touch the vanity, jewelry, or fabric while the other stays low and soft",
    lightingCharacter:
      "glowing vanity light with realistic skin and reflective highlights",
    roomRead: "vanity objects should read lightly without clutter",
    camera: "mirror-adjacent three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/mirror-boudoir.svg"),
    thumbnailAlt: "Vanity Undress Moment preview",
  }),
  buildAdultPosePreset({
    id: "adult-doorway-lean",
    title: "Doorway Lean",
    shortLabel: "Doorway Lean",
    vibe: "Leaning pose with a longer vertical body line.",
    bodyLanguage:
      "leaning into a doorway with one shoulder and one hip offset, outside leg lengthened, inside knee softened, and torso stretched to create a long vertical line",
    compositionIntent:
      "architectural boudoir frame where the doorway exaggerates the body length cleanly",
    cropDiscipline:
      "three-quarter or full-body crop with visible doorway framing, torso length, and one extended leg",
    bodyLinePriority:
      "vertical line, doorway contact, outer leg length, and hip offset define the pose",
    gazeDirection: "quiet direct look or sideward glance down the hall",
    handLanguage:
      "one hand can touch the frame while the other stays along thigh or waist",
    lightingCharacter:
      "mixed doorway light with enough contrast to keep the long line readable",
    roomRead: "doorframe and hallway depth should lightly support the shot",
    camera: "vertical three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/chair-tease.svg"),
    thumbnailAlt: "Doorway Lean preview",
  }),
  buildAdultPosePreset({
    id: "adult-hand-on-hip",
    title: "Hand-on-Hip Nude Stance",
    shortLabel: "Hand-on-Hip",
    vibe: "Confident frontal posture with a strong waist read.",
    bodyLanguage:
      "frontal standing stance with one hand fixed at the hip, the other arm relaxed lower, one knee softened, and chest open without flattening the waist curve",
    compositionIntent:
      "confident front-facing boudoir frame that lets the waist and torso read fast",
    cropDiscipline:
      "body-readable upper-body or three-quarter crop with visible elbow shape, waist, hips, and chest",
    bodyLinePriority:
      "hand-to-hip frame, waist definition, shoulder openness, and softened knee are primary",
    gazeDirection: "direct self-possessed eye contact",
    handLanguage:
      "one hand must clearly anchor at the hip while the free hand stays simple and low",
    lightingCharacter:
      "soft contour light with realistic shadow shaping across waist and torso",
    roomRead: "background remains minimal and body-first",
    camera: "body-readable upper-body frame",
    thumbnailSrc: poseAsset("adult-suggestive/lingerie-pose.svg"),
    thumbnailAlt: "Hand-on-Hip Nude Stance preview",
  }),
  buildAdultPosePreset({
    id: "adult-side-profile",
    title: "Side Profile Nude Pose",
    shortLabel: "Side Profile",
    vibe: "Profile-led silhouette with skin and shape clarity.",
    bodyLanguage:
      "side profile stance with shoulders and hips aligned on a profile line, one knee slightly bent, ribs lifted, and the head turned enough to keep facial identity visible",
    compositionIntent:
      "profile silhouette frame that keeps both body shape and face identity readable",
    cropDiscipline:
      "three-quarter or full-body side-profile crop with visible outline from shoulder through calf",
    bodyLinePriority:
      "profile silhouette, rib lift, hip line, and slight knee bend define the image",
    gazeDirection: "soft profile gaze or partial glance back toward camera",
    handLanguage:
      "hands low and clean, supporting the profile instead of interrupting it",
    lightingCharacter:
      "side light that crisply separates the profile without turning graphic",
    roomRead: "minimal room with side light source should remain believable",
    camera: "profile body frame",
    thumbnailSrc: poseAsset("adult-suggestive/fantasy-pose.svg"),
    thumbnailAlt: "Side Profile Nude Pose preview",
  }),
  buildAdultPosePreset({
    id: "adult-back-turned",
    title: "Back-Turned Glance",
    shortLabel: "Back-Turned",
    vibe: "Back-led framing with a return look over the shoulder.",
    bodyLanguage:
      "standing with the back mostly toward camera, one hip slightly popped, shoulders angled, and the head turning back so the face remains recognizable",
    compositionIntent:
      "back-led boudoir frame where the rear body line and face return share focus",
    cropDiscipline:
      "three-quarter or upper-body crop with visible back line, hip shift, and return glance",
    bodyLinePriority:
      "back contour, hip pop, shoulder angle, and facial return define the pose",
    gazeDirection: "direct glance back over the shoulder",
    handLanguage:
      "one hand near the hip or thigh, the other soft and unobtrusive",
    lightingCharacter:
      "edge-lit room glow that keeps the back line and face visible together",
    roomRead: "simple room depth or wall edge should support the turn",
    camera: "back-turned three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/lingerie-pose.svg"),
    thumbnailAlt: "Back-Turned Glance preview",
  }),
  buildAdultPosePreset({
    id: "adult-thigh-forward",
    title: "Seated Thigh-Forward Pose",
    shortLabel: "Thigh-Forward",
    vibe: "Seated line that emphasizes lower-body posture cleanly.",
    bodyLanguage:
      "seated with one thigh angled toward the camera, torso slightly forward from the hips, shoulders soft, and the opposite leg set back to create depth",
    compositionIntent:
      "body-forward seated frame where the advanced thigh and torso angle create immediacy",
    cropDiscipline:
      "three-quarter seated crop with the forward thigh, waist, and upper torso clearly visible",
    bodyLinePriority:
      "forward thigh, torso lean, shoulder softness, and seat contact drive the pose",
    gazeDirection: "steady intimate gaze toward camera",
    handLanguage:
      "hands resting on seat edge, thigh, or lap while preserving the front leg line",
    lightingCharacter:
      "moody room light with sculpted but realistic lower-body depth",
    roomRead: "chair or bed-edge support should remain visible",
    camera: "forward-thigh seated frame",
    thumbnailSrc: poseAsset("adult-suggestive/chair-tease.svg"),
    thumbnailAlt: "Seated Thigh-Forward Pose preview",
  }),
  buildAdultPosePreset({
    id: "adult-pillow-lounge",
    title: "Pillow Lounge",
    shortLabel: "Pillow Lounge",
    vibe: "Soft bed pose with a quieter intimate mood.",
    bodyLanguage:
      "lounging against pillows with the upper body propped slightly upright, one knee bent under a soft sheet line, and shoulders relaxed into the bedding",
    compositionIntent:
      "soft intimate bed frame that balances facial proximity with visible body posture",
    cropDiscipline:
      "waist-up or three-quarter bed crop with visible pillow support, torso line, and bent-knee cue",
    bodyLinePriority:
      "pillow support, shoulder softness, torso angle, and bent-knee line carry the pose",
    gazeDirection: "warm near-camera gaze",
    handLanguage:
      "hands nestled into pillows, sheet, or lap with low-tension softness",
    lightingCharacter:
      "diffused bedside or morning light with gentle realism",
    roomRead: "pillows, sheets, and bedside texture should feel soft and lived-in",
    camera: "soft intimate lounge crop",
    thumbnailSrc: poseAsset("adult-suggestive/bed-boudoir.svg"),
    thumbnailAlt: "Pillow Lounge preview",
  }),
  buildAdultPosePreset({
    id: "adult-one-knee-up",
    title: "One-Knee-Up Pose",
    shortLabel: "One-Knee-Up",
    vibe: "Asymmetric leg line with an editorial body read.",
    bodyLanguage:
      "seated or reclined with one knee raised toward the torso, the other leg extended or dropped lower, shoulders angled, and the waist visible through the asymmetry",
    compositionIntent:
      "editorial asymmetry frame where the lifted knee shapes the whole composition",
    cropDiscipline:
      "three-quarter crop with visible raised knee, waist line, torso angle, and lower supporting leg",
    bodyLinePriority:
      "raised-knee geometry, waist break, and shoulder angle dominate the read",
    gazeDirection: "direct or slightly downward intimate eye line",
    handLanguage:
      "hands can rest on the raised knee, seat, or bedding to support the asymmetry",
    lightingCharacter:
      "controlled indoor light with defined but realistic edge shaping",
    roomRead: "chair, bed, or floor support should remain subtle but legible",
    camera: "asymmetric three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/chair-tease.svg"),
    thumbnailAlt: "One-Knee-Up Pose preview",
  }),
  buildAdultPosePreset({
    id: "adult-low-chair",
    title: "Low Chair Framing",
    shortLabel: "Low Chair",
    vibe: "Low-seat pose with stronger body language and eye contact.",
    bodyLanguage:
      "seated low in a chair with knees apart just enough for a stable base, torso lifted from the hips, shoulders back, and chin level for a controlled dominant read",
    compositionIntent:
      "low-chair boudoir frame where the chair height changes the power balance of the pose",
    cropDiscipline:
      "three-quarter seated crop with visible chair, lap structure, waist, and shoulder posture",
    bodyLinePriority:
      "chair height, lap geometry, torso lift, and shoulder set define the image",
    gazeDirection: "direct unwavering eye contact",
    handLanguage:
      "hands can rest on thighs or chair arms with low, deliberate tension",
    lightingCharacter:
      "moody contrast with enough fill to keep skin and chair texture believable",
    roomRead: "chair silhouette and surrounding room depth should stay readable",
    camera: "low-chair three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/chair-tease.svg"),
    thumbnailAlt: "Low Chair Framing preview",
  }),
  buildAdultPosePreset({
    id: "adult-wall-lean",
    title: "Wall-Lean Nude Pose",
    shortLabel: "Wall-Lean",
    vibe: "Minimal wall support with a clear body silhouette.",
    bodyLanguage:
      "leaning against a wall with one shoulder touching first, hips offset, one leg straighter, and the torso angled just enough to preserve the waist line",
    compositionIntent:
      "minimal architectural frame where the wall support sharpens the silhouette",
    cropDiscipline:
      "three-quarter or full-body crop with visible wall contact, waist, hips, and long outside leg",
    bodyLinePriority:
      "wall support, hip offset, waist line, and long outer leg create the read",
    gazeDirection: "cool direct eye contact or slight side look",
    handLanguage:
      "hands resting low, along the thigh, or lightly against the wall",
    lightingCharacter:
      "clean contour light with realistic skin texture and minimal background distraction",
    roomRead: "wall plane should stay simple and graphic but believable",
    camera: "wall-supported body frame",
    thumbnailSrc: poseAsset("adult-suggestive/lingerie-pose.svg"),
    thumbnailAlt: "Wall-Lean Nude Pose preview",
  }),
  buildAdultPosePreset({
    id: "adult-bathtub-edge",
    title: "Bathtub Edge Pose",
    shortLabel: "Bathtub Edge",
    vibe: "Bathroom-edge pose with aftercare softness.",
    bodyLanguage:
      "seated on the bathtub edge with the torso angled three-quarters, one knee slightly forward, shoulders relaxed, and the spine long instead of slumped",
    compositionIntent:
      "bathroom-edge frame that feels intimate and rested rather than staged",
    cropDiscipline:
      "three-quarter seated crop with visible tub edge, lap line, torso angle, and shoulder softness",
    bodyLinePriority:
      "bathtub edge, lap line, torso angle, and relaxed shoulders must all register",
    gazeDirection: "soft direct look or reflective downward glance",
    handLanguage:
      "hands resting on the tub edge, thigh, or towel with natural placement",
    lightingCharacter:
      "soft practical bathroom light with clean steam-free realism",
    roomRead: "tub edge, tile, and subtle bathroom detail should support the mood",
    camera: "bathtub-edge three-quarter frame",
    thumbnailSrc: poseAsset("adult-suggestive/sheet-robe.svg"),
    thumbnailAlt: "Bathtub Edge Pose preview",
  }),
  buildAdultPosePreset({
    id: "adult-curtain-silhouette",
    title: "Sheer-Curtain Silhouette",
    shortLabel: "Curtain Silhouette",
    vibe: "Filtered light and a body-forward silhouette read.",
    bodyLanguage:
      "standing close to sheer curtains with one leg ahead of the other, arms relaxed, torso elongated, and the body angled enough for the filtered silhouette to read cleanly",
    compositionIntent:
      "curtain-filtered body frame where translucency and silhouette work together",
    cropDiscipline:
      "three-quarter or full-body frame with visible curtain texture, outline of the waist, and leg separation",
    bodyLinePriority:
      "silhouette edge, waist outline, shoulder shape, and lead-leg placement are key",
    gazeDirection: "soft side profile or distant look through the curtain light",
    handLanguage:
      "hands remain low and unintrusive so the silhouette stays uninterrupted",
    lightingCharacter:
      "filtered daylight with soft edge wrap and realistic body contour",
    roomRead: "curtain texture and window glow should stay central to the mood",
    camera: "silhouette body frame",
    thumbnailSrc: poseAsset("adult-suggestive/sheet-robe.svg"),
    thumbnailAlt: "Sheer-Curtain Silhouette preview",
  }),
  buildAdultPosePreset({
    id: "adult-sunrise-bed",
    title: "Sunrise Bed Pose",
    shortLabel: "Sunrise Bed",
    vibe: "Early-light bed frame with natural adult softness.",
    bodyLanguage:
      "reclined on the bed in morning light with the upper body slightly raised, one knee bent under the sheet line, shoulders soft, and the face turned into the sunrise glow",
    compositionIntent:
      "early-light bed frame that feels freshly captured and body-readable",
    cropDiscipline:
      "waist-up or three-quarter crop with visible bed support, torso angle, and morning light across the body",
    bodyLinePriority:
      "sunrise light path, shoulder softness, torso lift, and bent knee drive the image",
    gazeDirection: "sleepy direct look or soft off-camera glance",
    handLanguage:
      "hands resting on sheets or pillow with just-woke-up softness",
    lightingCharacter:
      "gentle sunrise light with warm edge roll and believable skin texture",
    roomRead: "bed linens and window light should define the morning atmosphere",
    camera: "sunrise lounge crop",
    thumbnailSrc: poseAsset("adult-suggestive/bed-boudoir.svg"),
    thumbnailAlt: "Sunrise Bed Pose preview",
  }),
  buildAdultPosePreset({
    id: "adult-after-shower",
    title: "After-Shower Mirror Pose",
    shortLabel: "After-Shower Mirror",
    vibe: "Mirror moment with calm skin-forward realism.",
    bodyLanguage:
      "mirror-side bathroom pose with damp hair, one hip shifted, shoulders offset, and a body angle that shows both the reflection and the waist line cleanly",
    compositionIntent:
      "after-shower reflection frame with skin realism and identity clarity",
    cropDiscipline:
      "mirror-led upper-body or three-quarter crop with visible reflection, waist line, and shoulder offset",
    bodyLinePriority:
      "reflection geometry, damp hair read, hip shift, and shoulder asymmetry define the pose",
    gazeDirection: "split gaze between mirror and viewer",
    handLanguage:
      "hands adjusting hair, towel, or vanity edge with natural after-shower movement",
    lightingCharacter:
      "bathroom mirror light with realistic shine control and no plastic gloss",
    roomRead: "mirror frame and bathroom context should stay clear and uncluttered",
    camera: "mirror three-quarter crop",
    thumbnailSrc: poseAsset("adult-suggestive/mirror-boudoir.svg"),
    thumbnailAlt: "After-Shower Mirror Pose preview",
  }),
  buildAdultPosePreset({
    id: "adult-soft-floor-stretch",
    title: "Soft Floor Stretch",
    shortLabel: "Floor Stretch",
    vibe: "Stretch-led line that still preserves face and body identity.",
    bodyLanguage:
      "stretching on the floor with one leg extended, the other bent, torso lengthened upward or diagonally, and arms used to support a graceful but believable stretch line",
    compositionIntent:
      "stretch-led editorial frame where elongation is visible without becoming acrobatic",
    cropDiscipline:
      "three-quarter or full-body frame with clear floor contact, extended leg, bent leg, and torso lift",
    bodyLinePriority:
      "extended leg, torso length, supporting arm, and hip angle define the pose",
    gazeDirection: "calm direct look or slightly downward focus through the stretch",
    handLanguage:
      "hands explain the stretch by grounding on floor, thigh, or overhead line",
    lightingCharacter:
      "soft directional room light that keeps the long body line readable",
    roomRead: "floor texture should stay clean and secondary",
    camera: "stretch-focused body frame",
    thumbnailSrc: poseAsset("adult-suggestive/fantasy-pose.svg"),
    thumbnailAlt: "Soft Floor Stretch preview",
  }),
  buildAdultPosePreset({
    id: "adult-crossed-leg-seat",
    title: "Crossed-Leg Nude Seat",
    shortLabel: "Crossed-Leg Seat",
    vibe: "Seated pose with crossed-leg composure and a softer read.",
    bodyLanguage:
      "seated with one leg crossed cleanly over the other, torso upright, shoulders easy, and hips grounded so the lap geometry stays elegant and readable",
    compositionIntent:
      "composed seated boudoir frame where crossed-leg structure creates a softer intimacy",
    cropDiscipline:
      "three-quarter seated crop with visible knee cross, lap line, waist, and shoulder openness",
    bodyLinePriority:
      "crossed-leg geometry, grounded hips, waist line, and shoulder softness lead the image",
    gazeDirection: "soft direct attention toward camera",
    handLanguage:
      "hands resting on the upper knee, lap, or chair edge without interrupting the leg cross",
    lightingCharacter:
      "warm private-room light with low contrast and believable texture",
    roomRead: "chair, bed edge, or lounge seat should support the seated read",
    camera: "crossed-leg seated frame",
    thumbnailSrc: poseAsset("adult-suggestive/chair-tease.svg"),
    thumbnailAlt: "Crossed-Leg Nude Seat preview",
  }),
] as const;

export const PHOTO_OUTFIT_PRESETS: PhotoOutfitPreset[] = [
  buildOutfitPreset({
    id: "normal-current-styling",
    title: "Use current avatar styling",
    category: "normal",
    description: "Keep the outfit direction already established by the current avatar.",
    outfit: "use current avatar styling",
    exposureLevel: "keep current styling",
    compositionIntent: "keep outfit continuity while the pose changes",
    cropDiscipline: "match the pose and keep wardrobe continuity natural",
    bodyLinePriority: "let the pose drive the body line while styling stays stable",
    gazeDirection: "follow the pose read instead of changing style mood",
    handLanguage: "match the selected pose",
    lightingCharacter: "natural realism with styling continuity",
    roomRead: "environment should support pose first",
    palette: undefined,
    accessoryVibe: undefined,
    makeupStyle: undefined,
    thumbnailSrc: outfitAsset("everyday/casual-jeans.svg"),
    thumbnailAlt: "Use current avatar styling outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-zinc-300/14 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-casual-jeans",
    title: "Casual jeans",
    category: "normal",
    description: "Easy, wearable, everyday styling.",
    outfit: "casual jeans look",
    exposureLevel: "covered",
    compositionIntent: "grounded lifestyle styling with easy credibility",
    cropDiscipline: "full-body or three-quarter to let the outfit read clearly",
    bodyLinePriority: "waist definition and denim silhouette",
    gazeDirection: "simple direct or side glance",
    handLanguage: "casual pockets or relaxed hand placement",
    lightingCharacter: "daylight or clean ambient realism",
    roomRead: "works well in room-forward lifestyle spaces",
    palette: "charcoal / blue",
    accessoryVibe: "minimal jewelry",
    makeupStyle: "barely there",
    thumbnailSrc: outfitAsset("everyday/casual-jeans.svg"),
    thumbnailAlt: "Casual jeans outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-blue-400/20 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-oversized-shirt",
    title: "Oversized shirt",
    category: "normal",
    description: "Soft, lived-in room energy.",
    outfit: "oversized shirt",
    exposureLevel: "tasteful fitted",
    compositionIntent: "soft private styling with natural movement in fabric",
    cropDiscipline: "waist-up or room-led casual frame",
    bodyLinePriority: "hem movement, shoulders, and thigh line",
    gazeDirection: "easy, personal, low-performance eye line",
    handLanguage: "fabric touch or sleeve interaction",
    lightingCharacter: "soft morning or evening room light",
    roomRead: "bed, window, or mirror environments suit it best",
    palette: "white / beige",
    accessoryVibe: "no visible accessories",
    makeupStyle: "barely there",
    thumbnailSrc: outfitAsset("everyday/oversized-shirt.svg"),
    thumbnailAlt: "Oversized shirt outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-stone-300/15 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-crop-top",
    title: "Crop top",
    category: "normal",
    description: "Simple fitted top with a casual body line.",
    outfit: "crop top",
    exposureLevel: "tasteful fitted",
    compositionIntent: "light fashion-led frame with simple upper-body styling",
    cropDiscipline: "three-quarter crop with waist visibility",
    bodyLinePriority: "waist line, torso shape, and easy posture",
    gazeDirection: "open lifestyle confidence",
    handLanguage: "simple hand placement with no heavy styling",
    lightingCharacter: "soft daylight with clean realism",
    roomRead: "works well in daylight rooms and mirror setups",
    palette: "white / black",
    accessoryVibe: "minimal jewelry",
    makeupStyle: "barely there",
    thumbnailSrc: outfitAsset("everyday/crop-skirt.svg"),
    thumbnailAlt: "Crop top outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-pink-300/16 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-crop-top-skirt",
    title: "Crop top skirt",
    category: "normal",
    description: "Playful and easy with a lighter silhouette.",
    outfit: "crop top and skirt",
    exposureLevel: "tasteful fitted",
    compositionIntent: "light fashion-led lifestyle frame with a playful balance",
    cropDiscipline: "three-quarter crop to keep both pieces visible",
    bodyLinePriority: "waist, hip line, and skirt motion",
    gazeDirection: "bright, open, and style-aware",
    handLanguage: "small playful gesture language",
    lightingCharacter: "clean soft light with subtle lift",
    roomRead: "mirror and daylight rooms support it best",
    palette: "rose / ivory",
    accessoryVibe: "soft feminine accents",
    makeupStyle: "romantic flush",
    thumbnailSrc: outfitAsset("everyday/crop-skirt.svg"),
    thumbnailAlt: "Crop top skirt outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-pink-300/18 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-mini-dress",
    title: "Mini dress",
    category: "normal",
    description: "Night-out but still lifestyle clean.",
    outfit: "mini dress",
    exposureLevel: "alluring",
    compositionIntent: "nightlife styling with polished silhouette read",
    cropDiscipline: "three-quarter and full-body frames",
    bodyLinePriority: "legs, waist, and neckline balance",
    gazeDirection: "composed social confidence",
    handLanguage: "light gesture or hip-rest hand placement",
    lightingCharacter: "night ambient light with clean contrast",
    roomRead: "chair, balcony, or car scenes support it well",
    palette: "black / silver",
    accessoryVibe: "statement luxury",
    makeupStyle: "soft glam",
    thumbnailSrc: outfitAsset("everyday/mini-dress.svg"),
    thumbnailAlt: "Mini dress outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-rose-400/18 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-club-dress",
    title: "Club dress",
    category: "normal",
    description: "Sharper nightlife styling.",
    outfit: "club dress",
    exposureLevel: "alluring",
    compositionIntent: "strong nightlife look with tighter edge and status read",
    cropDiscipline: "three-quarter or body-led frame",
    bodyLinePriority: "dress silhouette and confident torso line",
    gazeDirection: "bold but still grounded and natural",
    handLanguage: "minimal but deliberate gesture work",
    lightingCharacter: "contrast-heavy nightlife glow",
    roomRead: "balcony, car, or mirror scenes keep it sharp",
    palette: "wine red / black",
    accessoryVibe: "statement luxury",
    makeupStyle: "soft glam",
    thumbnailSrc: outfitAsset("everyday/club-dress.svg"),
    thumbnailAlt: "Club dress outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-red-500/18 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-office-outfit",
    title: "Office outfit",
    category: "normal",
    description: "Clean polished outfit with a professional read.",
    outfit: "office outfit",
    exposureLevel: "covered",
    compositionIntent: "clean professional frame with tidy wardrobe structure",
    cropDiscipline: "three-quarter or upper-body frame",
    bodyLinePriority: "torso shape, neckline, and clean shoulder line",
    gazeDirection: "calm professional eye contact",
    handLanguage: "small deliberate hand placement",
    lightingCharacter: "neutral indoor light with grounded realism",
    roomRead: "clean interior or desk-adjacent feel works best",
    palette: "white / charcoal",
    accessoryVibe: "minimal jewelry",
    makeupStyle: "soft natural",
    thumbnailSrc: outfitAsset("everyday/mini-dress.svg"),
    thumbnailAlt: "Office outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-stone-300/15 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-hoodie",
    title: "Hoodie",
    category: "normal",
    description: "Soft casual outfit with easy everyday energy.",
    outfit: "hoodie",
    exposureLevel: "covered",
    compositionIntent: "casual lifestyle look with comfort-first styling",
    cropDiscipline: "waist-up or three-quarter relaxed frame",
    bodyLinePriority: "hoodie volume, shoulder softness, and casual stance",
    gazeDirection: "easy relaxed eye line",
    handLanguage: "hands in pockets or touching sleeves naturally",
    lightingCharacter: "soft natural room light",
    roomRead: "casual room setups suit it best",
    palette: "heather grey / black",
    accessoryVibe: "no visible accessories",
    makeupStyle: "barely there",
    thumbnailSrc: outfitAsset("everyday/oversized-shirt.svg"),
    thumbnailAlt: "Hoodie outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-zinc-300/16 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-gymwear",
    title: "Gymwear",
    category: "normal",
    description: "Athletic styling without turning the scene into a workout set.",
    outfit: "gymwear",
    exposureLevel: "fitted",
    compositionIntent: "body-led lifestyle frame with athletic simplicity",
    cropDiscipline: "three-quarter or full-body with posture clarity",
    bodyLinePriority: "torso line and clean athletic silhouette",
    gazeDirection: "focused confident eye line",
    handLanguage: "simple and relaxed, never stiff",
    lightingCharacter: "clean bright light with natural texture",
    roomRead: "minimal room keeps it grounded",
    palette: "black / graphite",
    accessoryVibe: "no visible accessories",
    makeupStyle: "barely there",
    thumbnailSrc: outfitAsset("everyday/swimwear.svg"),
    thumbnailAlt: "Gymwear outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-slate-400/18 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-sleepwear",
    title: "Sleepwear",
    category: "normal",
    description: "Soft room styling with a private home read.",
    outfit: "soft sleepwear",
    exposureLevel: "alluring",
    compositionIntent: "soft private frame with comfort and intimacy balanced",
    cropDiscipline: "room-led or three-quarter crop with softness preserved",
    bodyLinePriority: "relaxed torso and fabric line",
    gazeDirection: "warm and close without overplaying it",
    handLanguage: "relaxed touch and natural placement",
    lightingCharacter: "soft room glow with low contrast",
    roomRead: "bedroom and bedside scenes are ideal",
    palette: "white / beige",
    accessoryVibe: "no visible accessories",
    makeupStyle: "barely there",
    thumbnailSrc: outfitAsset("adult-suggestive/soft-sleepwear.svg"),
    thumbnailAlt: "Sleepwear outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-stone-300/18 via-slate-900 to-rose-300/10",
  }),
  buildOutfitPreset({
    id: "normal-swimwear",
    title: "Swimwear",
    category: "normal",
    description: "Poolside or clean sunlit styling.",
    outfit: "swimwear",
    exposureLevel: "alluring",
    compositionIntent: "clean sunlit body-led lifestyle shot",
    cropDiscipline: "full-body or three-quarter with environmental breathing room",
    bodyLinePriority: "torso line, shoulders, and stance clarity",
    gazeDirection: "direct, sunlit, and self-assured",
    handLanguage: "simple and light, never stiff",
    lightingCharacter: "bright clean light with crisp edge control",
    roomRead: "airy room or balcony styling works well",
    palette: "emerald / black",
    accessoryVibe: "minimal jewelry",
    makeupStyle: "barely there",
    thumbnailSrc: outfitAsset("everyday/swimwear.svg"),
    thumbnailAlt: "Swimwear outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-teal-400/18 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-bikini",
    title: "Bikini",
    category: "normal",
    description: "A lighter swim look with cleaner minimal styling.",
    outfit: "bikini",
    exposureLevel: "alluring",
    compositionIntent: "minimal sunlit styling with easy body-line clarity",
    cropDiscipline: "three-quarter or full-body frame",
    bodyLinePriority: "torso line and shoulder openness",
    gazeDirection: "simple direct or sunlit side glance",
    handLanguage: "small clean gesture language",
    lightingCharacter: "bright clean natural light",
    roomRead: "airy room or balcony styling works well",
    palette: "white / black",
    accessoryVibe: "minimal jewelry",
    makeupStyle: "barely there",
    thumbnailSrc: outfitAsset("everyday/swimwear.svg"),
    thumbnailAlt: "Bikini outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-cyan-300/18 via-slate-900 to-white/5",
  }),
  buildOutfitPreset({
    id: "normal-lingerie",
    title: "Lingerie",
    category: "normal",
    description: "Private lingerie styling without changing the category.",
    outfit: "lingerie",
    exposureLevel: "alluring",
    compositionIntent: "private styling with a clean adult wardrobe read",
    cropDiscipline: "waist-up or three-quarter, still non-explicit",
    bodyLinePriority: "waist line, shoulder openness, and fabric line",
    gazeDirection: "calm direct eye contact",
    handLanguage: "tasteful placement that supports styling",
    lightingCharacter: "soft room light with polished realism",
    roomRead: "indoor private scenes make it strongest",
    palette: "black / silver",
    accessoryVibe: "minimal jewelry",
    makeupStyle: "soft glam",
    thumbnailSrc: outfitAsset("adult-suggestive/lingerie.svg"),
    thumbnailAlt: "Lingerie outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-fuchsia-500/20 via-slate-900 to-rose-400/10",
  }),
  buildOutfitPreset({
    id: "normal-silk-robe",
    title: "Silk robe",
    category: "normal",
    description: "Private robe styling with a softer home read.",
    outfit: "silk robe",
    exposureLevel: "alluring",
    compositionIntent: "private frame with robe texture and soft drape",
    cropDiscipline: "waist-up and room-led crops",
    bodyLinePriority: "fabric movement, shoulder line, and neck line",
    gazeDirection: "cool private attention",
    handLanguage: "soft robe interaction or tie hold",
    lightingCharacter: "soft indoor light with warm highlights",
    roomRead: "bedside or quiet room setups heighten the softness",
    palette: "cream / gold",
    accessoryVibe: "statement luxury",
    makeupStyle: "barely there",
    thumbnailSrc: outfitAsset("adult-suggestive/silk-robe.svg"),
    thumbnailAlt: "Silk robe outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-amber-400/18 via-slate-900 to-rose-300/10",
  }),
  buildOutfitPreset({
    id: "normal-bodysuit",
    title: "Bodysuit",
    category: "normal",
    description: "Sculpted fitted styling with a cleaner silhouette.",
    outfit: "bodysuit",
    exposureLevel: "fitted",
    compositionIntent: "fitted silhouette shot with a sharper wardrobe edge",
    cropDiscipline: "three-quarter or full-body natural crop",
    bodyLinePriority: "torso structure and long line through hips",
    gazeDirection: "cool and self-possessed",
    handLanguage: "clean pose geometry",
    lightingCharacter: "natural contrast with defined contour",
    roomRead: "clean room, chair, and mirror scenes suit it best",
    palette: "black / silver",
    accessoryVibe: "dark elegant pieces",
    makeupStyle: "clean natural glam",
    thumbnailSrc: outfitAsset("adult-suggestive/bodysuit.svg"),
    thumbnailAlt: "Bodysuit outfit preview",
    thumbnailFocus: "center 38%",
    thumbnailStyle: "from-zinc-400/18 via-slate-900 to-fuchsia-400/10",
  }),
] as const;

export const PHOTO_ENVIRONMENT_PRESETS: PhotoEnvironmentPreset[] = [
  buildEnvironmentPreset({
    id: "env-clean-studio",
    title: "Clean interior",
    description: "Minimal background for a sharper pose read.",
    environment: "clean indoor backdrop with believable depth",
    lightingMood: "soft daylight or clean practical indoor light",
    compositionIntent: "clean natural frame with minimal background noise",
    cropDiscipline: "supports tighter crop and silhouette clarity",
    bodyLinePriority: "keeps attention on pose and outfit line",
    gazeDirection: "works with direct gaze and cooler eye contact",
    handLanguage: "supports clean pose geometry",
    lightingCharacter: "soft practical indoor light with clean ambient control",
    roomRead: "background should stay simple and believable",
    thumbnailSrc: environmentAsset("clean-studio.svg"),
    thumbnailAlt: "Clean studio backdrop preview",
    thumbnailFocus: "center",
    thumbnailStyle: "from-zinc-400/16 via-slate-900 to-white/5",
  }),
  buildEnvironmentPreset({
    id: "env-soft-room",
    title: "Soft room",
    description: "Warm private room with believable lived-in texture.",
    environment: "soft room with daylight curtains",
    lightingMood: "soft window light",
    compositionIntent: "private room frame with believable softness",
    cropDiscipline: "supports both room-forward and intimate crops",
    bodyLinePriority: "lets posture breathe inside the room",
    gazeDirection: "pairs well with softer attention and candid looks",
    handLanguage: "natural hand language feels strongest here",
    lightingCharacter: "diffused daylight or soft warm room light",
    roomRead: "room texture should feel inhabited and calm",
    thumbnailSrc: environmentAsset("soft-room.svg"),
    thumbnailAlt: "Soft room environment preview",
    thumbnailFocus: "center",
    thumbnailStyle: "from-stone-300/16 via-slate-900 to-white/5",
  }),
  buildEnvironmentPreset({
    id: "env-luxury-bed",
    title: "Bedside suite",
    description: "Private suite with bed or seating nearby.",
    environment: "hotel room after dark",
    lightingMood: "dim moody lamp light",
    compositionIntent: "luxury suite frame with intimate after-hours mood",
    cropDiscipline: "supports room-led and three-quarter compositions",
    bodyLinePriority: "soft furniture geometry plus silhouette line",
    gazeDirection: "works with warmer or more private eye line",
    handLanguage: "bedside touch and resting placement look natural",
    lightingCharacter: "low warm pools of light with polished shadow edges",
    roomRead: "the room should read expensive, private, and restrained",
    thumbnailSrc: environmentAsset("luxury-bed.svg"),
    thumbnailAlt: "Luxury bedside suite preview",
    thumbnailFocus: "center",
    thumbnailStyle: "from-amber-400/16 via-slate-900 to-rose-300/10",
  }),
  buildEnvironmentPreset({
    id: "env-mirror",
    title: "Mirror corner",
    description: "Vanity or mirror setup with a direct personal read.",
    environment: "mirror corner with vanity light",
    lightingMood: "clean luxury ambient light",
    compositionIntent: "reflection-led image with self-aware composition",
    cropDiscipline: "vertical mirror framing and reflection balance",
    bodyLinePriority: "reflection line and torso angle",
    gazeDirection: "works with split gaze between self and viewer",
    handLanguage: "mirror or vanity interaction adds realism",
    lightingCharacter: "soft reflective indoor light with realistic highlights",
    roomRead: "mirror geometry must remain visible",
    thumbnailSrc: environmentAsset("mirror-corner.svg"),
    thumbnailAlt: "Mirror corner environment preview",
    thumbnailFocus: "center",
    thumbnailStyle: "from-cyan-400/16 via-slate-900 to-fuchsia-400/10",
  }),
  buildEnvironmentPreset({
    id: "env-car",
    title: "Car interior",
    description: "Private car-seat atmosphere with lifestyle tension.",
    environment: "private car interior at night",
    lightingMood: "neon nightlife glow",
    compositionIntent: "natural private-space frame with nightlife tension",
    cropDiscipline: "mid-shot and close crop framed by windows and seats",
    bodyLinePriority: "seat angle, head turn, and shoulder line",
    gazeDirection: "side look or reflective near-window gaze",
    handLanguage: "seat or dashboard-adjacent hand placement",
    lightingCharacter: "night reflections, neon spill, or passing light glow",
    roomRead: "car geometry needs to read immediately",
    thumbnailSrc: environmentAsset("car-interior.svg"),
    thumbnailAlt: "Private car interior environment preview",
    thumbnailFocus: "center",
    thumbnailStyle: "from-sky-500/16 via-slate-900 to-indigo-500/10",
  }),
  buildEnvironmentPreset({
    id: "env-balcony",
    title: "Balcony window",
    description: "Open-air edge with city light or window mood.",
    environment: "city balcony at night",
    lightingMood: "golden-hour warmth",
    compositionIntent: "natural threshold frame with city or window mood",
    cropDiscipline: "three-quarter or room-forward composition",
    bodyLinePriority: "spine line and edge-of-frame body placement",
    gazeDirection: "distant or returning glance works best",
    handLanguage: "rail, frame, or window-touch interaction",
    lightingCharacter: "mixed natural glow and city contrast",
    roomRead: "outside light is part of the story",
    thumbnailSrc: environmentAsset("balcony-window.svg"),
    thumbnailAlt: "Balcony window environment preview",
    thumbnailFocus: "center",
    thumbnailStyle: "from-sky-400/16 via-slate-900 to-cyan-400/10",
  }),
] as const;

const COMMON_NORMAL_POSE_PRESETS: PhotoPosePreset[] = AVATAR_POSE_PRESETS.filter(
  (preset) => preset.allowedForStudio,
).map((preset) =>
  buildPosePreset({
    id: preset.id,
    category: "normal",
    title: preset.label,
    shortLabel: preset.label,
    vibe:
      preset.bodyVisibility === "full_body"
        ? "More body-visible framing with a clearer silhouette read."
        : preset.variant === "confident"
          ? "Confident body language with a cleaner stance."
          : "Natural pose variation with a softer body line.",
    bodyLanguage: preset.posePrompt,
    compositionIntent:
      preset.framingBias === "full_body"
        ? "same character, new full-body shot with readable body line"
        : "same character, new upper-body shot with visible stomach line, torso, and hips",
    cropDiscipline:
      preset.framingBias === "full_body"
        ? "prefer head-to-toe or leg-visible framing"
        : "prefer upper-body framing with visible stomach line and torso, never face-only",
    bodyLinePriority: preset.bodyLinePrompt,
    gazeDirection: "natural adult eye line with readable pose intent",
    handLanguage: "hands should support the pose and body silhouette",
    lightingCharacter: "clean natural realism with low stylization",
    roomRead: "environment should support the pose without stealing focus",
    camera: preset.camera,
    lightingMood: "soft daylight or neutral indoor light",
    photoPack: preset.photoPack,
    expression: "natural everyday adult confidence",
    thumbnailSrc: getAvatarPoseStudioThumbnailSrc(preset.family),
    thumbnailAlt: `${preset.label} preview`,
    thumbnailFocus: preset.framingBias === "full_body" ? "center 48%" : "center 42%",
    thumbnailStyle:
      preset.framingBias === "full_body"
        ? "from-cyan-400/20 via-slate-900 to-white/5"
        : "from-amber-400/18 via-slate-900 to-white/5",
    variationBias: [
      "new pose family",
      "new body orientation",
      "new camera distance",
      preset.avoidPortraitCrop ? "avoid repeated close crop" : "shift the crop and shoulder angle",
    ],
  }),
);

export function getPosePresetsForCategory(category: PhotoPoseCategory) {
  return PHOTO_POSE_PRESETS.filter((preset) => preset.category === category);
}

export function getOutfitPresetsForCategory(category: PhotoPoseCategory) {
  return PHOTO_OUTFIT_PRESETS.filter((preset) => preset.category === category);
}

export function getDefaultPosePreset(category: PhotoPoseCategory) {
  return getPosePresetsForCategory(category)[0] ?? COMMON_NORMAL_POSE_PRESETS[0] ?? PHOTO_POSE_PRESETS[0];
}

export function getDefaultOutfitPreset(category: PhotoPoseCategory) {
  return getOutfitPresetsForCategory(category)[0] ?? PHOTO_OUTFIT_PRESETS[0];
}

export function getDefaultEnvironmentPreset() {
  return PHOTO_ENVIRONMENT_PRESETS[0];
}

export function getEnvironmentPresets() {
  return PHOTO_ENVIRONMENT_PRESETS;
}

export function findPosePreset(id: string) {
  return (
    COMMON_NORMAL_POSE_PRESETS.find((preset) => preset.id === id) ??
    PHOTO_POSE_PRESETS.find((preset) => preset.id === id) ??
    null
  );
}

export function findOutfitPreset(id: string) {
  return PHOTO_OUTFIT_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function findEnvironmentPreset(id: string) {
  return PHOTO_ENVIRONMENT_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function createDefaultStudioFormState(
  category: PhotoPoseCategory = "normal",
): ImageStudioFormState {
  return {
    studioMode: category === "adult" ? "adult" : "normal",
    poseCategory: category,
    backgroundPreset: getDefaultEnvironmentPreset().id,
    posePreset: getDefaultPosePreset(category).id,
    outfitPreset: null,
    adultExposure: "bikini",
  };
}

export function getRandomPosePreset(category: PhotoPoseCategory = "normal") {
  const presets = getPosePresetsForCategory(category);
  if (presets.length === 0) {
    return getDefaultPosePreset("normal");
  }
  const index = Math.floor(Math.random() * presets.length);
  return presets[index] ?? getDefaultPosePreset("normal");
}

function resolveHiddenEnvironmentPreset(args: {
  posePreset: PhotoPosePreset;
  outfitPreset: PhotoOutfitPreset | null;
}) {
  const poseId = args.posePreset.id;
  const outfitId = args.outfitPreset?.id ?? "";

  if (poseId.includes("mirror")) {
    return findEnvironmentPreset("env-mirror") ?? getDefaultEnvironmentPreset();
  }

  if (poseId.includes("window") || poseId.includes("leaning-wall")) {
    return findEnvironmentPreset("env-balcony") ?? getDefaultEnvironmentPreset();
  }

  if (
    poseId.includes("laying-bed") ||
    poseId.includes("couch-lounge") ||
    outfitId.includes("sleepwear") ||
    outfitId.includes("silk-robe") ||
    outfitId.includes("lingerie")
  ) {
    return findEnvironmentPreset("env-luxury-bed") ?? getDefaultEnvironmentPreset();
  }

  if (poseId.includes("kneeling") || poseId.includes("sitting")) {
    return findEnvironmentPreset("env-soft-room") ?? getDefaultEnvironmentPreset();
  }

  return findEnvironmentPreset("env-clean-studio") ?? getDefaultEnvironmentPreset();
}

export function buildSmartInitialStudioForm(args: {
  input: CharacterImagePromptInput;
  latestGalleryImageUrl?: string | null;
  latestGalleryExists?: boolean;
}): ImageStudioFormState {
  const inferredPose = inferPosePresetFromPrompt(args.input);
  const inferredOutfit = inferOutfitPresetFromPrompt(args.input);
  const studioMode = "normal";
  const category: PhotoPoseCategory = "normal";

  return normalizeStudioFormState({
    studioMode,
    poseCategory: category,
    backgroundPreset: getDefaultEnvironmentPreset().id,
    posePreset: inferredPose?.category === category ? inferredPose.id : getDefaultPosePreset(category).id,
    outfitPreset: inferredOutfit?.id ?? null,
    adultExposure: args.input.nudityMode === "true_nude" ? "naked" : "bikini",
  });
}

export function normalizeStudioFormState(
  form: ImageStudioFormState,
): ImageStudioFormState {
  const category: PhotoPoseCategory = "normal";
  const posePreset = findPosePreset(form.posePreset);
  const outfitPreset =
    typeof form.outfitPreset === "string" ? findOutfitPreset(form.outfitPreset) : null;
  const backgroundPreset = findEnvironmentPreset(form.backgroundPreset);

  return {
    studioMode: "normal",
    poseCategory: category,
    backgroundPreset: backgroundPreset?.id ?? getDefaultEnvironmentPreset().id,
    posePreset:
      posePreset && posePreset.category === category
        ? posePreset.id
        : getDefaultPosePreset(category).id,
    outfitPreset: outfitPreset?.id ?? null,
    adultExposure: "bikini",
  };
}

function buildAdultLowerBodyCoverageContract(posePresetId: string) {
  const lowered = posePresetId.toLowerCase();

  if (/(bed|pillow|sunrise|sheet|bathtub|bath|floor|recline|couch|lounge)/.test(lowered)) {
    return "implied nude only with elegant natural white lower-body coverage using soft white sheet, bedding folds, bath foam, pillow-side fabric, or bright white bed linen; coverage must feel native to the room and never like a censor overlay";
  }

  if (/(mirror|window|door|wall|chair|profile|standing|lean|balcony)/.test(lowered)) {
    return "implied nude only with elegant natural white lower-body coverage using a soft white towel, foreground white fabric, white robe edge, or gentle blown-out white light wash; coverage must feel organic to the shot and never like a censor overlay";
  }

  return "implied nude only with elegant natural white lower-body coverage using soft white fabric, towel, bedding, bath foam, or bright foreground white light; coverage must blend into the scene organically and never read like a censor overlay";
}

export function compilePhotoStudioSelection(args: {
  basePromptInput: CharacterImagePromptInput;
  form: ImageStudioFormState;
}): PhotoStudioSelectionCompilerOutput {
  const normalized = normalizeStudioFormState(args.form);
  const posePreset =
    findPosePreset(normalized.posePreset) ??
    getDefaultPosePreset(normalized.poseCategory);
  const outfitPreset =
    (normalized.outfitPreset ? findOutfitPreset(normalized.outfitPreset) : null) ??
    null;
  const environmentPreset =
    findEnvironmentPreset(normalized.backgroundPreset) ??
    resolveHiddenEnvironmentPreset({
      posePreset,
      outfitPreset,
    });
  const stylingSummary = outfitPreset?.title ?? "Current avatar styling";
  const isAdultMode = normalized.studioMode === "adult";
  const adultExposure = normalized.adultExposure;
  const adultNaturalCoverageContract =
    isAdultMode && adultExposure === "naked"
      ? buildAdultLowerBodyCoverageContract(posePreset.id)
      : null;
  const safetyGuardrail = isAdultMode
    ? "adult studio mode for the same fictional adult character, preserve the exact face, age read, skin tone, hair identity, and body proportions while changing only pose, framing, room mood, and exposure choice"
    : "same fictional adult character in a grounded non-explicit photo set, preserve the exact identity while changing only pose, wardrobe, crop, and room mood";
  const adultSeedGuidance = isAdultMode
    ? posePreset.seedPolicy === "off"
      ? "allow a larger pose transition away from the original avatar pose while keeping the same face, hairline, age read, skin tone, and body proportions"
      : posePreset.seedPolicy === "light"
        ? "allow a strong pose transition away from the original avatar pose while keeping the same face, hairline, age read, skin tone, and body proportions"
        : "keep the same face and body identity tightly while adapting the pose with only moderate structural change"
    : null;

  const shotRecipe = {
    compositionIntent: joinComma([
      posePreset.compositionIntent,
      outfitPreset?.compositionIntent,
      environmentPreset.compositionIntent,
    ]),
    cropDiscipline: joinComma([
      posePreset.cropDiscipline,
      outfitPreset?.cropDiscipline,
      environmentPreset.cropDiscipline,
    ]),
    bodyLinePriority: joinComma([
      posePreset.bodyLinePriority,
      outfitPreset?.bodyLinePriority,
      environmentPreset.bodyLinePriority,
    ]),
    gazeDirection: joinComma([
      posePreset.gazeDirection,
      outfitPreset?.gazeDirection,
      environmentPreset.gazeDirection,
    ]),
    handLanguage: joinComma([
      posePreset.handLanguage,
      outfitPreset?.handLanguage,
      environmentPreset.handLanguage,
    ]),
    lightingCharacter: joinComma([
      posePreset.lightingCharacter,
      outfitPreset?.lightingCharacter,
      environmentPreset.lightingCharacter,
    ]),
    roomRead: joinComma([
      posePreset.roomRead,
      outfitPreset?.roomRead,
      environmentPreset.roomRead,
    ]),
    variationBias: unique([
      ...posePreset.variationBias,
      ...(outfitPreset?.variationBias ?? []),
      ...environmentPreset.variationBias,
    ]),
  };

  const poseSummary = posePreset.title;
  const outfitSummary = isAdultMode
    ? adultExposure === "naked"
      ? "Naked"
      : "Bikini"
    : stylingSummary;
  const shotSummary = `${poseSummary} with ${outfitSummary.toLowerCase()} in a ${environmentPreset.title.toLowerCase()} setup.`;
  const backgroundSummary = environmentPreset.title;
  const shotReason = isAdultMode
    ? "The system keeps the same character locked, uses the saved avatar as the primary identity anchor, and changes only the adult preset, framing, and exposure level."
    : "This combination keeps the same fictional character locked and uses a fresh pose, wardrobe, and room setup without changing face, age read, skin tone, hair, or body proportions.";
  const visualCompatibility = deriveVisualPromptCompatibility({
    profession: args.basePromptInput.profession,
    outfit: outfitPreset?.outfit ?? args.basePromptInput.outfit,
    setting: environmentPreset.environment,
    sceneType: args.basePromptInput.sceneType,
    relationshipToUser: args.basePromptInput.relationshipToUser,
    relationshipDynamic: args.basePromptInput.relationshipDynamic,
    behaviorMode: args.basePromptInput.behaviorMode,
    genderPresentation: args.basePromptInput.genderPresentation,
    bodyType: args.basePromptInput.bodyType,
    bustSize: args.basePromptInput.bustSize,
    breastType: args.basePromptInput.breastType,
    buttSize: args.basePromptInput.buttSize,
  });
  const poseContract = buildPhotoStudioPoseContract({
    posePreset,
    shotRecipe,
  });

  const promptInput: CharacterImagePromptInput = {
    ...args.basePromptInput,
    studioMode: normalized.studioMode,
    contentTier: isAdultMode ? "adult" : "safe",
    nsfwLevel: isAdultMode ? "adult" : "none",
    pose: joinComma([
      poseContract.posePrompt,
      poseContract.bodyLinePrompt,
      `exact pose family: ${poseContract.poseFamily}`,
      poseContract.cropDiscipline,
      `gaze direction: ${poseContract.gazeDirection}`,
      `hand language: ${poseContract.handLanguage}`,
      `body language: ${posePreset.bodyLanguage}`,
      `composition intent: ${shotRecipe.compositionIntent}`,
      `lighting character: ${shotRecipe.lightingCharacter}`,
      `room read: ${shotRecipe.roomRead}`,
      `pose lock cues: ${shotRecipe.variationBias.join(", ")}`,
      adultSeedGuidance,
      "same fictional adult character, fresh pose family",
    ]),
    poseContract,
    outfit: isAdultMode
      ? adultExposure === "naked"
        ? "implied nude adult studio presentation with natural white lower-body coverage for the same locked fictional adult character"
        : "luxury bikini studio presentation for the same locked fictional adult character"
      : outfitPreset?.outfit ?? args.basePromptInput.outfit,
    environment: environmentPreset.environment,
    camera: normalizeReferenceCamera(
      joinComma([posePreset.camera, shotRecipe.cropDiscipline]),
    ),
    lightingMood: normalizeReferenceLightingMood(
      joinComma([
        environmentPreset.lightingMood || posePreset.lightingMood,
        shotRecipe.lightingCharacter,
      ]),
    ),
    photoPack: normalizeReferencePhotoPack(
      joinComma([posePreset.photoPack, shotRecipe.compositionIntent]),
    ),
    exposureLevel: isAdultMode
      ? adultExposure === "naked"
        ? "alluring"
        : "alluring"
      : outfitPreset?.exposureLevel ?? args.basePromptInput.exposureLevel,
    backgroundIntent:
      visualCompatibility.backgroundIntent || args.basePromptInput.backgroundIntent,
    outfitIntent:
      visualCompatibility.outfitIntent || args.basePromptInput.outfitIntent,
    nudityMode: isAdultMode
      ? adultExposure === "naked"
        ? "implied_nude"
        : "covered"
      : visualCompatibility.nudityMode,
    faceBias: visualCompatibility.faceBias,
    bodyReadPriority: isAdultMode ? "high" : visualCompatibility.bodyReadPriority,
    expression: joinComma([
      posePreset.expression,
      shotRecipe.gazeDirection,
      isAdultMode ? "confident intimate adult presence" : "natural grounded adult confidence",
    ]),
    palette: outfitPreset?.palette || args.basePromptInput.palette,
    accessoryVibe:
      outfitPreset?.accessoryVibe || args.basePromptInput.accessoryVibe,
    makeupStyle: outfitPreset?.makeupStyle || args.basePromptInput.makeupStyle,
    avatarStyle: normalizeReferenceAvatarStyle(
      joinComma([
        args.basePromptInput.avatarStyle,
        "natural studio realism",
        "same fictional character, new pose",
        "original fictional character photography",
      ]),
    ),
    sceneNote: joinComma([
      shotSummary,
      shotReason,
      environmentPreset.description,
      posePreset.vibe,
      `pose behavior: ${posePreset.bodyLanguage}`,
      `composition intent: ${shotRecipe.compositionIntent}`,
      `crop discipline: ${shotRecipe.cropDiscipline}`,
      `lighting character: ${shotRecipe.lightingCharacter}`,
      `room read: ${shotRecipe.roomRead}`,
      `pose lock cues: ${shotRecipe.variationBias.join(", ")}`,
      adultSeedGuidance,
      outfitPreset?.description,
      adultNaturalCoverageContract,
      ...visualCompatibility.promptAnchors,
      safetyGuardrail,
      isAdultMode
        ? adultExposure === "naked"
          ? "same fictional adult character, intimate implied nude body read with natural white lower-body coverage, preserve exact age, face, skin tone, body proportions, bust size, breast type, butt size, waist definition, and hair identity"
          : "same fictional adult character, bikini body read stays fully visible, preserve exact age, face, skin tone, body proportions, bust size, breast type, butt size, waist definition, and hair identity"
        : null,
    ]),
    visualConstitution: unique([
      ...(args.basePromptInput.visualConstitution ?? []),
      ...visualCompatibility.sceneAnchors,
      ...visualCompatibility.realismAnchors,
      `Identity lock contract: keep the same face identity, same hair identity, same body silhouette, same age maturity.`,
      `Shot recipe contract: ${shotRecipe.compositionIntent}.`,
      `Crop discipline: ${shotRecipe.cropDiscipline}.`,
      `Body line priority: ${shotRecipe.bodyLinePriority}.`,
      `Gaze direction: ${shotRecipe.gazeDirection}.`,
      `Hand language: ${shotRecipe.handLanguage}.`,
      `Lighting character: ${shotRecipe.lightingCharacter}.`,
      `Room read: ${shotRecipe.roomRead}.`,
      `Pose detail: ${posePreset.bodyLanguage}.`,
      `Pose vibe: ${posePreset.vibe}.`,
      `Pose lock cues: ${shotRecipe.variationBias.join(", ")}.`,
      adultSeedGuidance,
      adultNaturalCoverageContract,
      isAdultMode
        ? adultExposure === "naked"
          ? "Adult outfit contract: implied nude presentation only, preserve the same body identity and exact physical proportions, keep natural white lower-body coverage, and avoid graphic reveal."
          : "Adult outfit contract: bikini presentation only, no implied nude drift, preserve the same body identity and exact physical proportions."
        : outfitPreset
          ? `Outfit contract: ${outfitPreset.outfit}. Fabric, fit, silhouette, and coverage must stay readable at a glance.`
          : "Outfit contract: preserve the current avatar styling unless the new pose needs small wardrobe settling.",
      safetyGuardrail,
      "variation comes from pose, optional outfit shift, crop, and room styling instead of identity drift",
    ]),
    negativeConstitutionHints: unique([
      ...(args.basePromptInput.negativeConstitutionHints ?? []),
      ...visualCompatibility.negativeAnchors,
      "same static pose",
      "pose ignored",
      "custom pose note ignored",
      "wrong body orientation",
      "wrong leg placement",
      "wrong hand placement",
      "missing pose geometry",
      "copy-paste framing",
      "flat catalog composition",
      ...(isAdultMode
        ? [
            "different woman",
            "wrong age read",
            "wrong skin tone",
            "wrong body proportions",
            "wrong bust size",
            "wrong butt size",
            "same original avatar pose repeated",
            ...(adultExposure === "naked"
              ? [
                  "full nude reveal",
                  "explicit genital reveal",
                  "obvious censorship block",
                  "bikini drift",
                  "lingerie drift",
                ]
              : ["implied nude drift", "lingerie drift"]),
          ]
        : [
            "graphic sex act",
            "penetration focus",
            "pornographic framing",
            "explicit genital focus",
          ]),
      "identity drift",
    ]),
    selectionContractSummary:
      args.basePromptInput.selectionContractSummary ??
      args.basePromptInput.selectionPromptContract?.promptSummary,
    behaviorContractSummary:
      args.basePromptInput.behaviorContractSummary ??
      args.basePromptInput.selectionPromptContract?.personality,
    imageMoodContractSummary: unique([
      ...(args.basePromptInput.imageMoodContractSummary ??
        args.basePromptInput.selectionPromptContract?.imageMood ??
        []),
      poseSummary ? `Pose mood remains readable: ${poseSummary}.` : "",
    ]),
  };

  const selectionSummary = [
    normalized.studioMode === "adult" ? "Adult" : "Normal",
    backgroundSummary,
    poseSummary,
    outfitSummary,
  ];

  return {
    form: normalized,
    posePreset,
    outfitPreset,
    environmentPreset,
    promptInput,
    selectionSummary,
    poseSummary,
    outfitSummary,
    backgroundSummary,
    shotSummary,
    shotReason,
    customPosePrompt: "",
    selectionVersion: [
      normalized.poseCategory,
      normalized.studioMode,
      environmentPreset.id,
      posePreset.id,
      outfitPreset?.id ?? "current-styling",
      normalized.adultExposure,
    ].join(":"),
    previewLabels: createPreviewLabels(
      normalized.poseCategory,
      normalized.studioMode,
      environmentPreset.title,
    ),
    shotRecipe,
    poseContract,
  };
}
