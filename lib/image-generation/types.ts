import type { HiddenPromptEngineInput } from "@/lib/character-builder/types";
import type { PosePromptContract } from "@/lib/create-character/pose-prompt-contract";
import type { SelectionPromptContract } from "@/lib/create-character/selection-prompt-contract";
import type { VisualPromptCompileResult } from "@/lib/create-character/full-selection-compiler";

export type ImageProvider = "runware" | "runware_ideogram" | "xai";

export type ImageGenerationProfile =
  | "identity_locked_avatar"
  | "identity_locked_gallery";

export type ImageQualityTier = "max" | "premium";

export type ImageReferenceStrategy =
  | "single_avatar_lock"
  | "stacked_character_reference";

export type VariationLockContract = {
  ageValue?: number | null;
  ageBand?: string | null;
  outfit?: string | null;
  outfitIntent?: string | null;
  nudityMode?: "covered" | "implied_nude" | "true_nude" | null;
  bodyType?: string | null;
  bustSize?: string | null;
  breastType?: string | null;
  buttSize?: string | null;
  waistDefinition?: string | null;
  skinTone?: string | null;
  hair?: string | null;
  eyes?: string | null;
  faceBias?: "neutral" | "soft_feminine" | null;
  profession?: string | null;
  backgroundIntent?: string | null;
  bodyReadPriority?: "standard" | "high" | null;
  poseFamily?: string | null;
  framingBias?: "upper_body" | "full_body" | null;
  selectionContractSummary?: string[] | null;
  imageMoodContractSummary?: string[] | null;
  hiddenVisualSectionPrompts?: string[] | null;
  masterVisualPrompt?: string | null;
};

export type CharacterImageFeedbackType =
  | "like_reference"
  | "reject_result"
  | "prefer_this_style";

export type CandidateJudgeReport = {
  candidateId: string;
  score: number;
  decision: "accept" | "soft_reject" | "reject";
  flags: string[];
};

export type BatchJudgeSummary = {
  judgeVersion: string;
  retryCount: number;
  bestCandidateId: string | null;
  bestScore: number | null;
  shouldRetry: boolean;
  bestAvailable: boolean;
  reports: CandidateJudgeReport[];
};

export type CharacterImageSafetyInput = {
  isAdultOnly: boolean;
  subjectDeclared18Plus: boolean;
  consentConfirmed: boolean;
  depictsRealPerson: boolean;
  depictsPublicFigure: boolean;
  depictsFranchiseCharacter: boolean;
  depictsProtectedStyleRequest: boolean;
  lookalikeRiskFlag: boolean;
  namedCharacterReferenceFlag: boolean;
  blockedRequestReason?: string | null;
  nonConsensualFlag: boolean;
  underageRiskFlag: boolean;
  illegalContentFlag: boolean;
};

export type CharacterImagePromptInput = {
  characterName: string;
  studioMode?: "normal" | "adult";
  contentTier?: "safe" | "adult";
  archetype?: string;
  profession?: string;
  relationshipToUser?: string;
  relationshipDynamic?: string;
  sceneType?: string;
  behaviorMode?: string;
  visualAura?: string;
  ageValue?: number;
  ageBand?: "18-20" | "21-24" | "25-29" | "30-39" | "40-49" | "50-59" | "60-70";
  genderPresentation?: string;
  region?: string;
  skinTone?: string;
  hair?: string;
  hairTexture?: string;
  eyes?: string;
  eyeShape?: string;
  makeupStyle?: string;
  accessoryVibe?: string;
  outfit?: string;
  palette?: string;
  camera?: string;
  photoPack?: string;
  avatarStyle?: string;
  bodyType?: string;
  bustSize?: string;
  breastType?: string;
  hipsType?: string;
  buttSize?: string;
  waistDefinition?: string;
  heightImpression?: string;
  exposureLevel?: string;
  pose?: string;
  poseContract?: PosePromptContract;
  expression?: string;
  lightingMood?: string;
  environment?: string;
  backgroundIntent?: string;
  outfitIntent?: string;
  nudityMode?: "covered" | "implied_nude" | "true_nude";
  faceBias?: "neutral" | "soft_feminine";
  bodyReadPriority?: "standard" | "high";
  sceneNote?: string;
  hobbies?: string;
  fetishes?: string;
  extraPersonalityDetails?: string;
  extraPhysicalDetails?: string;
  signatureDetail?: string;
  visualConstitution?: string[];
  visualIdentityLock?: string[];
  negativeConstitutionHints?: string[];
  selectionPromptContract?: SelectionPromptContract;
  visualPromptCompileResult?: VisualPromptCompileResult;
  hiddenVisualSectionPrompts?: string[];
  masterVisualPrompt?: string;
  selectionContractSummary?: string[];
  behaviorContractSummary?: string[];
  imageMoodContractSummary?: string[];
  referenceHints?: string[];
  nsfwLevel?: "adult" | "suggestive" | "none";
};

export type ImageGenerationKind = "initial" | "variation";

export type CharacterImageKind = "avatar" | "variation";

export type CharacterImageType =
  | "avatar"
  | "reference"
  | "variation"
  | "gallery";

export type CharacterImageVariantKind =
  | "base"
  | "outfit"
  | "selfie"
  | "pose"
  | "location"
  | "full_body";

export type ImageJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type ImageModerationStatus = "pending" | "approved" | "blocked";

export type ImageModerationSnapshot = {
  isAdultOnly: boolean;
  subjectDeclared18Plus: boolean;
  consentConfirmed: boolean;
  depictsRealPerson: boolean;
  depictsPublicFigure: boolean;
  depictsFranchiseCharacter: boolean;
  depictsProtectedStyleRequest: boolean;
  lookalikeRiskFlag: boolean;
  namedCharacterReferenceFlag: boolean;
  blockedRequestReason?: string | null;
  nonConsensualFlag: boolean;
  underageRiskFlag: boolean;
  illegalContentFlag: boolean;
  moderationStatus: ImageModerationStatus;
  moderationNotes?: string | null;
};

export type GeneratedImageCandidate = {
  tempId: string;
  imageUrl: string;
  width?: number | null;
  height?: number | null;
  seed?: number | null;
  model?: string | null;
  prompt?: string | null;
  negativePrompt?: string | null;
};

export type PromptEngineOutputLike = {
  promptSummary: string;
  canonicalPrompt: string;
  negativePrompt: string;
  moderationFlags: {
    needsBlock: boolean;
    reasons: string[];
    matchedTerms?: string[];
    blockedRequestReason?: string | null;
    safetyDecision?: "allow" | "block";
    suggestedOriginalAlternatives?: string[];
    normalizedRequestProfile?: {
      identityTokens: string[];
      sceneTokens: string[];
      styleTokens: string[];
    };
  };
  generationHints?: Record<string, unknown>;
  identityLock?: Record<string, unknown>;
};

export type InitialGenerationJobInput = {
  userId: string;
  characterId: string;
  provider: ImageProvider;
  styleType: string;
  builderMode: string;
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutputLike;
  model?: string | null;
  moderation: ImageModerationSnapshot;
};

export type InitialGenerationServiceArgs = {
  provider: ImageProvider;
  styleType: string;
  builderMode: string;
  hiddenPromptInput: HiddenPromptEngineInput;
  promptEngineOutput: PromptEngineOutputLike;
  candidateCount?: number;
  model?: string | null;
};

export type InitialGenerationServiceResult =
  | {
      ok: true;
      provider: ImageProvider;
      kind: ImageGenerationKind;
      externalJobId?: string | null;
      candidates: GeneratedImageCandidate[];
    }
  | {
      ok: false;
      provider: ImageProvider;
      kind: ImageGenerationKind;
      errorCode: string;
      errorMessage: string;
    };

export type CharacterImageJobRepositoryInsert = {
  userId: string;
  characterId: string;
  provider: ImageProvider;
  kind: CharacterImageKind;
  promptInputJson: Record<string, unknown>;
  canonicalPrompt: string;
  negativePrompt: string;
  moderation: ImageModerationSnapshot;
  styleType: string;
  requestMode: string;
  referenceImageIds?: unknown;
  variationType?: string | null;
  seed?: number | null;
  model?: string | null;
  generationProfile?: ImageGenerationProfile;
  qualityTier?: ImageQualityTier;
  referenceStrategy?: ImageReferenceStrategy;
  providerModel?: string | null;
};

export type CharacterImageRepositoryInsert = {
  userId: string;
  characterId: string;
  jobId: string | null;
  imageType: CharacterImageType;
  variantKind?: CharacterImageVariantKind | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  seed?: number | null;
  modelUsed?: string | null;
  providerUsed?: string | null;
  workflowName?: string | null;
  promptInputJson?: Record<string, unknown>;
  promptSnapshot?: string | null;
  negativePromptSnapshot?: string | null;
  isPrimary?: boolean;
  isReference?: boolean;
  sortOrder?: number;
  generationProfile?: ImageGenerationProfile;
  qualityTier?: ImageQualityTier;
  referenceStrategy?: ImageReferenceStrategy;
  providerModel?: string | null;
  feedbackType?: CharacterImageFeedbackType | null;
  isLikedReference?: boolean;
  referenceRank?: number | null;
  qualityScore?: number | null;
  qualityFlags?: string[] | null;
  judgeVersion?: string | null;
  moderation: ImageModerationSnapshot;
};

export const IMAGE_PROVIDER_CONFIGS: Record<
  ImageProvider,
  {
    label: string;
  }
> = {
  runware: {
    label: "Runware",
  },
  runware_ideogram: {
    label: "Runware Ideogram",
  },
  xai: {
    label: "xAI",
  },
};
