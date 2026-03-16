import type {
  CharacterAgeBand,
  CharacterBuilderMode,
  CharacterBuilderStep,
  CharacterOutputType,
  CharacterStyleType,
} from "./types";

export type CharacterOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  image?: string;
};

export const CHARACTER_STYLE_OPTIONS: CharacterOption<CharacterStyleType>[] = [
  {
    value: "realistic",
    label: "Realistic",
    description: "Photorealistic adult character generation with premium portrait styling.",
  },
  {
    value: "anime",
    label: "Anime",
    description: "Stylized anime character generation with clean identity and expressive visuals.",
  },
];

export const CHARACTER_BUILDER_MODE_OPTIONS: CharacterOption<CharacterBuilderMode>[] =
  [
    {
      value: "preset",
      label: "Preset Builder",
      description: "Choose traits visually and let Lovora build the hidden prompt for you.",
    },
    {
      value: "custom_prompt",
      label: "Custom Prompt",
      description: "Write your own character idea and let Lovora refine it behind the scenes.",
    },
  ];

export const CHARACTER_PRESET_STEPS: CharacterBuilderStep[] = [
  "style",
  "mode",
  "identity",
  "face",
  "hair",
  "body",
  "vibe",
  "outfit",
  "scene",
  "review",
];

export const CHARACTER_CUSTOM_PROMPT_STEPS: CharacterBuilderStep[] = [
  "style",
  "mode",
  "prompt",
  "locks",
  "review",
];

export const CHARACTER_AGE_BAND_OPTIONS: CharacterOption<CharacterAgeBand>[] = [
  { value: "18-20", label: "18–20", description: "Young adult appearance, clearly 18+." },
  { value: "21-24", label: "21–24", description: "Prime young-adult range." },
  { value: "25-29", label: "25–29", description: "Mature young-adult range." },
  { value: "30-39", label: "30–39", description: "Confident adult presence." },
  { value: "40+", label: "40+", description: "Mature, seasoned adult presence." },
];

export const CHARACTER_REGION_OPTIONS: CharacterOption[] = [
  { value: "latin", label: "Latin" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "middle-eastern", label: "Middle Eastern" },
  { value: "slavic", label: "Slavic" },
  { value: "nordic", label: "Nordic" },
  { value: "east-asian", label: "East Asian" },
  { value: "south-asian", label: "South Asian" },
  { value: "southeast-asian", label: "Southeast Asian" },
  { value: "african", label: "African" },
  { value: "mixed", label: "Mixed" },
  { value: "global", label: "Global" },
];

export const CHARACTER_SKIN_TONE_OPTIONS: CharacterOption[] = [
  { value: "porcelain", label: "Porcelain" },
  { value: "fair", label: "Fair" },
  { value: "light-olive", label: "Light Olive" },
  { value: "olive", label: "Olive" },
  { value: "tan", label: "Tan" },
  { value: "bronze", label: "Bronze" },
  { value: "deep-brown", label: "Deep Brown" },
  { value: "dark-ebony", label: "Dark Ebony" },
];

export const CHARACTER_GENDER_PRESENTATION_OPTIONS: CharacterOption[] = [
  { value: "feminine", label: "Feminine" },
  { value: "masculine", label: "Masculine" },
  { value: "androgynous", label: "Androgynous" },
];

export const CHARACTER_EYE_COLOR_OPTIONS: CharacterOption[] = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "hazel", label: "Hazel" },
  { value: "light-brown", label: "Light Brown" },
  { value: "dark-brown", label: "Dark Brown" },
  { value: "gray", label: "Gray" },
  { value: "amber", label: "Amber" },
];

export const CHARACTER_EYE_SHAPE_OPTIONS: CharacterOption[] = [
  { value: "soft-round", label: "Soft Round" },
  { value: "almond", label: "Almond" },
  { value: "cat-eyes", label: "Cat Eyes" },
  { value: "sharp-narrow", label: "Sharp Narrow" },
  { value: "sleepy-eyes", label: "Sleepy Eyes" },
  { value: "doll-like", label: "Doll-like" },
];

export const CHARACTER_FACE_SHAPE_OPTIONS: CharacterOption[] = [
  { value: "oval", label: "Oval" },
  { value: "heart-shaped", label: "Heart-shaped" },
  { value: "soft-round", label: "Soft Round" },
  { value: "defined-jawline", label: "Defined Jawline" },
  { value: "slim-elegant", label: "Slim Elegant" },
  { value: "full-soft-face", label: "Full Soft Face" },
];

export const CHARACTER_LIP_STYLE_OPTIONS: CharacterOption[] = [
  { value: "soft-natural", label: "Soft Natural" },
  { value: "full-lips", label: "Full Lips" },
  { value: "glossy-plump", label: "Glossy Plump" },
  { value: "sharp-defined", label: "Sharp Defined" },
  { value: "petite-lips", label: "Petite Lips" },
];

export const CHARACTER_NOSE_TYPE_OPTIONS: CharacterOption[] = [
  { value: "soft-small", label: "Soft Small" },
  { value: "straight-elegant", label: "Straight Elegant" },
  { value: "defined-sharp", label: "Defined Sharp" },
  { value: "button-nose", label: "Button Nose" },
];

export const CHARACTER_MAKEUP_LEVEL_OPTIONS: CharacterOption[] = [
  { value: "bare-natural", label: "Bare Natural" },
  { value: "soft-glam", label: "Soft Glam" },
  { value: "full-glam", label: "Full Glam" },
  { value: "smokey", label: "Smokey" },
  { value: "glossy-seductive", label: "Glossy Seductive" },
];

export const CHARACTER_HAIR_COLOR_OPTIONS: CharacterOption[] = [
  { value: "black", label: "Black" },
  { value: "dark-brown", label: "Dark Brown" },
  { value: "chocolate-brown", label: "Chocolate Brown" },
  { value: "light-brown", label: "Light Brown" },
  { value: "blonde", label: "Blonde" },
  { value: "platinum", label: "Platinum" },
  { value: "red", label: "Red" },
  { value: "auburn", label: "Auburn" },
  { value: "silver", label: "Silver" },
  { value: "pink", label: "Pink" },
  { value: "blue-fantasy", label: "Blue Fantasy" },
];

export const CHARACTER_HAIR_LENGTH_OPTIONS: CharacterOption[] = [
  { value: "short", label: "Short" },
  { value: "bob", label: "Bob" },
  { value: "shoulder-length", label: "Shoulder Length" },
  { value: "long", label: "Long" },
  { value: "very-long", label: "Very Long" },
];

export const CHARACTER_HAIR_TEXTURE_OPTIONS: CharacterOption[] = [
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "curly", label: "Curly" },
  { value: "coily", label: "Coily" },
  { value: "messy-textured", label: "Messy Textured" },
  { value: "silky-smooth", label: "Silky Smooth" },
];

export const CHARACTER_HAIRSTYLE_OPTIONS: CharacterOption[] = [
  { value: "loose-hair", label: "Loose Hair" },
  { value: "ponytail", label: "Ponytail" },
  { value: "bun", label: "Bun" },
  { value: "twin-tails", label: "Twin Tails" },
  { value: "braids", label: "Braids" },
  { value: "wolf-cut", label: "Wolf Cut" },
  { value: "curtain-bangs", label: "Curtain Bangs" },
  { value: "layered-glam", label: "Layered Glam" },
];

export const CHARACTER_BODY_TYPE_OPTIONS: CharacterOption[] = [
  { value: "slim", label: "Slim" },
  { value: "petite", label: "Petite" },
  { value: "athletic", label: "Athletic" },
  { value: "curvy", label: "Curvy" },
  { value: "thick", label: "Thick" },
  { value: "soft-chubby", label: "Soft Chubby" },
  { value: "toned-hourglass", label: "Toned Hourglass" },
  { value: "voluptuous", label: "Voluptuous" },
];

export const CHARACTER_BUST_SIZE_OPTIONS: CharacterOption[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "full", label: "Full" },
  { value: "large", label: "Large" },
];

export const CHARACTER_HIPS_TYPE_OPTIONS: CharacterOption[] = [
  { value: "narrow", label: "Narrow" },
  { value: "balanced", label: "Balanced" },
  { value: "curvy", label: "Curvy" },
  { value: "wide-hips", label: "Wide Hips" },
];

export const CHARACTER_HEIGHT_IMPRESSION_OPTIONS: CharacterOption[] = [
  { value: "petite", label: "Petite" },
  { value: "average", label: "Average" },
  { value: "tall", label: "Tall" },
  { value: "model-tall", label: "Model Tall" },
];

export const CHARACTER_WAIST_DEFINITION_OPTIONS: CharacterOption[] = [
  { value: "soft-waist", label: "Soft Waist" },
  { value: "defined-waist", label: "Defined Waist" },
  { value: "hourglass-waist", label: "Hourglass Waist" },
];

export const CHARACTER_MAIN_VIBE_OPTIONS: CharacterOption[] = [
  { value: "soft", label: "Soft" },
  { value: "sweet", label: "Sweet" },
  { value: "playful", label: "Playful" },
  { value: "seductive", label: "Seductive" },
  { value: "elegant", label: "Elegant" },
  { value: "luxury", label: "Luxury" },
  { value: "dominant", label: "Dominant" },
  { value: "shy", label: "Shy" },
  { value: "dark-feminine", label: "Dark Feminine" },
  { value: "sporty", label: "Sporty" },
  { value: "girl-next-door", label: "Girl Next Door" },
  { value: "artsy", label: "Artsy" },
  { value: "innocent-looking-adult", label: "Innocent-looking Adult" },
  { value: "cold-beauty", label: "Cold Beauty" },
];

export const CHARACTER_ENERGY_OPTIONS: CharacterOption[] = [
  { value: "calm", label: "Calm" },
  { value: "flirty", label: "Flirty" },
  { value: "confident", label: "Confident" },
  { value: "mysterious", label: "Mysterious" },
  { value: "wild", label: "Wild" },
  { value: "gentle", label: "Gentle" },
  { value: "emotionally-warm", label: "Emotionally Warm" },
  { value: "teasing", label: "Teasing" },
];

export const CHARACTER_PERSONA_FLAVOR_OPTIONS: CharacterOption[] = [
  { value: "romantic", label: "Romantic" },
  { value: "glamour", label: "Glamour" },
  { value: "luxury-muse", label: "Luxury Muse" },
  { value: "best-friend-vibe", label: "Best Friend Vibe" },
  { value: "dangerous-beauty", label: "Dangerous Beauty" },
  { value: "cozy-companion", label: "Cozy Companion" },
  { value: "bratty", label: "Bratty" },
  { value: "classy", label: "Classy" },
  { value: "innocent-tease", label: "Innocent Tease" },
];

export const CHARACTER_OUTFIT_TYPE_OPTIONS: CharacterOption[] = [
  { value: "lingerie", label: "Lingerie" },
  { value: "bikini", label: "Bikini" },
  { value: "elegant-dress", label: "Elegant Dress" },
  { value: "tight-casual-fit", label: "Tight Casual Fit" },
  { value: "oversized-shirt", label: "Oversized Shirt" },
  { value: "office-look", label: "Office Look" },
  { value: "gymwear", label: "Gymwear" },
  { value: "sleepwear", label: "Sleepwear" },
  { value: "streetwear", label: "Streetwear" },
  { value: "luxury-robe", label: "Luxury Robe" },
  { value: "swimsuit", label: "Swimsuit" },
  { value: "adult-cosplay-inspired", label: "Adult Cosplay-inspired" },
];

export const CHARACTER_OUTFIT_COLOR_OPTIONS: CharacterOption[] = [
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "red", label: "Red" },
  { value: "pink", label: "Pink" },
  { value: "blue", label: "Blue" },
  { value: "gold", label: "Gold" },
  { value: "nude-beige", label: "Nude Beige" },
  { value: "emerald", label: "Emerald" },
  { value: "custom", label: "Custom" },
];

export const CHARACTER_EXPOSURE_LEVEL_OPTIONS: CharacterOption[] = [
  { value: "tasteful", label: "Tasteful" },
  { value: "flirty", label: "Flirty" },
  { value: "bold", label: "Bold" },
  { value: "very-bold", label: "Very Bold" },
];

export const CHARACTER_SCENE_TYPE_OPTIONS: CharacterOption[] = [
  { value: "studio-portrait", label: "Studio Portrait" },
  { value: "mirror-selfie", label: "Mirror Selfie" },
  { value: "bedroom", label: "Bedroom" },
  { value: "luxury-hotel", label: "Luxury Hotel" },
  { value: "bathroom", label: "Bathroom" },
  { value: "beach", label: "Beach" },
  { value: "poolside", label: "Poolside" },
  { value: "living-room", label: "Living Room" },
  { value: "balcony", label: "Balcony" },
  { value: "car-selfie", label: "Car Selfie" },
  { value: "night-city", label: "Night City" },
  { value: "cozy-home", label: "Cozy Home" },
  { value: "gym-aesthetic", label: "Gym Aesthetic" },
  { value: "sunset-outdoors", label: "Sunset Outdoors" },
];

export const CHARACTER_CAMERA_FRAMING_OPTIONS: CharacterOption[] = [
  { value: "close-up", label: "Close-up" },
  { value: "bust-portrait", label: "Bust Portrait" },
  { value: "waist-up", label: "Waist-up" },
  { value: "full-body", label: "Full Body" },
  { value: "over-shoulder", label: "Over Shoulder" },
  { value: "selfie-angle", label: "Selfie Angle" },
  { value: "mirror-angle", label: "Mirror Angle" },
];

export const CHARACTER_LIGHTING_TYPE_OPTIONS: CharacterOption[] = [
  { value: "soft-daylight", label: "Soft Daylight" },
  { value: "warm-sunset", label: "Warm Sunset" },
  { value: "night-neon", label: "Night Neon" },
  { value: "studio-softbox", label: "Studio Softbox" },
  { value: "luxury-golden-light", label: "Luxury Golden Light" },
  { value: "dark-moody", label: "Dark Moody" },
  { value: "flash-selfie", label: "Flash Selfie" },
];

export const CHARACTER_POSE_ENERGY_OPTIONS: CharacterOption[] = [
  { value: "gentle-pose", label: "Gentle Pose" },
  { value: "confident-pose", label: "Confident Pose" },
  { value: "seductive-pose", label: "Seductive Pose" },
  { value: "casual-candid", label: "Casual Candid" },
  { value: "glamour-stance", label: "Glamour Stance" },
  { value: "relaxed-lounging", label: "Relaxed Lounging" },
];

export const CHARACTER_EXPRESSION_OPTIONS: CharacterOption[] = [
  { value: "soft-smile", label: "Soft Smile" },
  { value: "neutral-pretty", label: "Neutral Pretty" },
  { value: "seductive-look", label: "Seductive Look" },
  { value: "confident-smirk", label: "Confident Smirk" },
  { value: "shy-glance", label: "Shy Glance" },
  { value: "playful-tease", label: "Playful Tease" },
  { value: "intense-stare", label: "Intense Stare" },
];

export const CHARACTER_REALISM_STRENGTH_OPTIONS: CharacterOption[] = [
  { value: "stylized", label: "Stylized" },
  { value: "balanced", label: "Balanced" },
  { value: "high-realism", label: "High Realism" },
];

export const CHARACTER_DETAIL_LEVEL_OPTIONS: CharacterOption[] = [
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
  { value: "ultra-detailed", label: "Ultra Detailed" },
];

export const CHARACTER_VARIATION_GOAL_OPTIONS: CharacterOption[] = [
  { value: "best-first-portrait", label: "Best First Portrait" },
  { value: "sexy-profile-card", label: "Sexy Profile Card" },
  { value: "full-body-showcase", label: "Full Body Showcase" },
  { value: "selfie-starter", label: "Selfie Starter" },
];

export const CHARACTER_CUSTOM_PROMPT_HELPER_VIBE_OPTIONS: CharacterOption[] = [
  { value: "soft", label: "Soft" },
  { value: "luxury", label: "Luxury" },
  { value: "seductive", label: "Seductive" },
  { value: "playful", label: "Playful" },
  { value: "dark", label: "Dark" },
  { value: "romantic", label: "Romantic" },
];

export const CHARACTER_OUTPUT_TYPE_OPTIONS: CharacterOption<CharacterOutputType>[] = [
  { value: "portrait", label: "Portrait" },
  { value: "selfie", label: "Selfie" },
  { value: "full_body", label: "Full Body" },
];

export const CHARACTER_DEFAULTS = {
  styleType: "realistic" as CharacterStyleType,
  builderMode: "preset" as CharacterBuilderMode,
  outputType: "portrait" as CharacterOutputType,
  visibility: "private" as const,
  provider: "runware" as const,
  promptVersion: "v1",
  consistencyStatus: "draft" as const,
};

export const CHARACTER_REQUIRED_PRESET_FIELDS = {
  core: ["ageBand", "region", "skinTone"] as const,
  face: ["eyeColor"] as const,
  hair: ["hairColor"] as const,
  body: ["bodyType"] as const,
  vibe: ["mainVibe"] as const,
  outfit: ["outfitType"] as const,
  scene: ["sceneType", "cameraFraming"] as const,
};

export const CHARACTER_MINIMUM_CUSTOM_PROMPT_LENGTH = 20;

export const CHARACTER_REFERENCE_BUCKET = "character-images";

export const CHARACTER_VARIATION_PRESET_TYPES = [
  "more-portraits",
  "mirror-selfie",
  "full-body",
  "different-outfit",
  "bedroom",
  "beach",
  "hotel",
  "night-city",
] as const;

export type CharacterVariationPresetType =
  (typeof CHARACTER_VARIATION_PRESET_TYPES)[number];
  