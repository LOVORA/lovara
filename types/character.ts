export type CharacterStatus = "active" | "archived" | "coming_soon";
export type CharacterVisibility = "public" | "private" | "draft";

export type CharacterGenderPresentation =
  | "female"
  | "male"
  | "nonbinary"
  | "other";

export type CharacterAgeBand =
  | "18-20"
  | "21-24"
  | "25-29"
  | "30-35"
  | "36+";

export type RelationshipStyle =
  | "romantic"
  | "flirty"
  | "protective"
  | "dominant"
  | "submissive"
  | "playful"
  | "cold_to_warm"
  | "obsessive"
  | "best_friend"
  | "mentor"
  | "stranger";

export type ConversationStyle =
  | "soft"
  | "warm"
  | "teasing"
  | "confident"
  | "intense"
  | "mysterious"
  | "poetic"
  | "casual"
  | "direct";

export type ReplyLength = "short" | "medium" | "long" | "adaptive";

export type EmotionalTone =
  | "sweet"
  | "comforting"
  | "seductive"
  | "jealous"
  | "possessive"
  | "dramatic"
  | "calm"
  | "chaotic"
  | "dark"
  | "hopeful";

export type ScenarioCategory =
  | "romance"
  | "slice_of_life"
  | "fantasy"
  | "drama"
  | "school"
  | "workplace"
  | "historical"
  | "supernatural"
  | "adventure"
  | "mystery";

export type ContentRating = "safe" | "suggestive" | "mature";

export type MemoryPriority =
  | "user_name"
  | "favorite_things"
  | "relationship_milestones"
  | "sensitive_topics"
  | "promises"
  | "roleplay_lore"
  | "emotional_state";

export interface CharacterImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  isPrimary?: boolean;
}

export interface CharacterTag {
  id: string;
  label: string;
  category:
    | "personality"
    | "vibe"
    | "scenario"
    | "relationship"
    | "aesthetic"
    | "tone";
}

export interface CharacterTrait {
  key: string;
  label: string;
  score: number;
  description?: string;
}

export interface CharacterBoundary {
  key: string;
  label: string;
  enabled: boolean;
  description?: string;
}

export interface CharacterSpeechProfile {
  style: ConversationStyle[];
  replyLength: ReplyLength;
  vocabularyLevel: "simple" | "balanced" | "elegant";
  usesEmojis: boolean;
  emojiFrequency?: number;
  punctuationStyle?: "minimal" | "balanced" | "expressive";
  initiativeLevel: number;
  flirtIntensity: number;
  emotionalOpenness: number;
  teasingLevel: number;
}

export interface CharacterEmotionProfile {
  defaultTone: EmotionalTone;
  warmth: number;
  attachmentSpeed: number;
  jealousyLevel: number;
  protectiveness: number;
  vulnerability: number;
  intensity: number;
}

export interface CharacterBackstory {
  summary: string;
  origin: string;
  coreWound?: string;
  secret?: string;
  desire?: string;
  fear?: string;
  turningPoint?: string;
}

export interface CharacterBehaviorRule {
  trigger: string;
  responseStyle: string;
  example?: string;
}

export interface CharacterScenarioStarter {
  id: string;
  title: string;
  category: ScenarioCategory;
  prompt: string;
  mood: string;
  openingMessage?: string;
}

export interface CharacterExampleDialogue {
  situation: string;
  userMessage: string;
  characterReply: string;
}

export interface CharacterMemoryProfile {
  enabled: boolean;
  priorities: MemoryPriority[];
  pinImportantMoments: boolean;
  remembersNickname: boolean;
  remembersPreferences: boolean;
  remembersBoundaries: boolean;
}

export interface CharacterCreatorProfile {
  archetype: string;
  visualTags: string[];
  voiceTags: string[];
  personalitySeed: string[];
  worldType?: string;
  outfitTags?: string[];
}

export interface CharacterStats {
  likes: number;
  chats: number;
  favorites: number;
  popularityScore: number;
}

export interface CharacterSEO {
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface LovoraCharacter {
  id: string;
  slug: string;
  status: CharacterStatus;
  visibility: CharacterVisibility;

  identity: {
    name: string;
    displayName: string;
    ageBand: CharacterAgeBand;
    genderPresentation: CharacterGenderPresentation;
    archetype: string;
    occupation?: string;
    location?: string;
    relationshipStyle: RelationshipStyle[];
    headline: string;
    shortDescription: string;
  };

  media: {
    avatar: CharacterImage;
    gallery?: CharacterImage[];
  };

  discovery: {
    featured: boolean;
    tags: CharacterTag[];
    searchKeywords: string[];
    categoryOrder?: number;
    contentRating: ContentRating;
  };

  personality: {
    coreTraits: CharacterTrait[];
    emotionalProfile: CharacterEmotionProfile;
    speechProfile: CharacterSpeechProfile;
    values?: string[];
    likes?: string[];
    dislikes?: string[];
    hobbies?: string[];
  };

  backstory: CharacterBackstory;

  interaction: {
    firstImpression: string;
    relationshipPace: "slow" | "medium" | "fast";
    loveLanguage?: string[];
    attentionStyle?: string[];
    reassuranceStyle?: string[];
    conflictStyle?: string[];
    behaviorRules: CharacterBehaviorRule[];
  };

  roleplay: {
    enabled: boolean;
    primaryScenarios: ScenarioCategory[];
    scenarioStarters: CharacterScenarioStarter[];
    favoriteSettings?: string[];
    worldLore?: string;
    roleplayHooks?: string[];
  };

  examples: {
    openingLines: string[];
    dialogueSamples: CharacterExampleDialogue[];
  };

  safety: {
    contentRating: ContentRating;
    boundaries: CharacterBoundary[];
    consentForward: boolean;
    notes?: string;
  };

  memory: CharacterMemoryProfile;

  creatorProfile: CharacterCreatorProfile;

  ui: {
    accentColor?: string;
    badgeText?: string;
    cardLabel?: string;
    profileTheme?: "luxury" | "cute" | "dark" | "soft" | "fantasy";
  };

  stats?: CharacterStats;
  seo?: CharacterSEO;

  createdAt: string;
  updatedAt: string;
}
