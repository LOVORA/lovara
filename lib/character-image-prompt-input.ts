import { readBuilderV2Payload } from "@/lib/character-builder/payload-readers";
import type { Character } from "@/lib/characters";
import { deriveVisualChoiceProfile } from "@/lib/create-character/choice-weighting";
import { buildSelectionCompilerOutputFromCustomCharacterSource } from "@/lib/create-character/full-selection-compiler";
import { getRandomAvatarPosePreset } from "@/lib/avatar-pose-library";
import type { PosePromptContract } from "@/lib/create-character/pose-prompt-contract";
import {
  normalizeReferenceAvatarStyle,
  normalizeReferenceCamera,
  normalizeReferenceLightingMood,
  normalizeReferencePhotoPack,
} from "@/lib/create-character/reference-realism";
import { readStructuredNotes } from "@/lib/create-character/studio-notes";
import { deriveVisualPromptCompatibility } from "@/lib/create-character/visual-compatibility";
import type { CharacterImagePromptInput } from "@/lib/image-generation/types";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapAgeToBand(value: string): CharacterImagePromptInput["ageBand"] {
  const age = Number.parseInt(value, 10);

  if (!Number.isFinite(age)) return "21-24";
  if (age <= 20) return "18-20";
  if (age <= 24) return "21-24";
  if (age <= 29) return "25-29";
  if (age <= 39) return "30-39";
  if (age <= 49) return "40-49";
  if (age <= 59) return "50-59";
  return "60-70";
}

function parseAdultAgeValue(value: string) {
  const age = Number.parseInt(value, 10);
  if (!Number.isFinite(age)) return 25;
  return Math.max(18, Math.min(70, age));
}

function mapAgeValueToBand(value: number): CharacterImagePromptInput["ageBand"] {
  if (value <= 20) return "18-20";
  if (value <= 24) return "21-24";
  if (value <= 29) return "25-29";
  if (value <= 39) return "30-39";
  if (value <= 49) return "40-49";
  if (value <= 59) return "50-59";
  return "60-70";
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildFallbackPoseContract(seedSource: string): PosePromptContract {
  const posePreset = getRandomAvatarPosePreset({
    usage: "create",
    seed: hashSeed(seedSource),
  });

  return {
    poseFamily: posePreset.family,
    posePrompt: posePreset.posePrompt,
    bodyLinePrompt: posePreset.bodyLinePrompt,
    framingBias: posePreset.framingBias,
    cropDiscipline:
      posePreset.framingBias === "full_body"
        ? "full-body framing with readable silhouette and clear leg line"
        : "upper-body framing with readable torso, waist, chest, and upper hips",
    gazeDirection: "natural adult eye line with readable pose intent",
    handLanguage: "hands should support the pose and body silhouette",
    posePriority: "high",
  };
}

export const DEFAULT_CHARACTER_IMAGE_SAFETY = {
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
} as const;

export function buildPromptInputFromBuiltInCharacter(
  character: Character,
): CharacterImagePromptInput {
  const ageValue =
    typeof character.age === "number" && Number.isFinite(character.age)
      ? Math.max(18, Math.min(70, Math.round(character.age)))
      : 25;
  const visualChoiceProfile = deriveVisualChoiceProfile({
    ageValue,
    ageBand: mapAgeValueToBand(ageValue),
    archetype: character.archetype,
    profession: character.role,
    relationshipToUser: character.scenario?.relationshipToUser,
    sceneType: character.scenario?.sceneGoal,
    behaviorMode: character.personality,
    visualAura: clean(character.visualProfile?.visualAura),
    outfit: clean(character.visualProfile?.style),
    expression: clean(character.role),
    setting: clean(character.scenario?.setting),
    hair: clean(character.visualProfile?.hair),
    eyes: clean(character.visualProfile?.eyes),
  });
  const visualCompatibility = deriveVisualPromptCompatibility({
    profession: clean(character.role),
    outfit: clean(character.visualProfile?.style),
    setting: clean(character.scenario?.setting),
    sceneType: clean(character.scenario?.sceneGoal),
    relationshipToUser: clean(character.scenario?.relationshipToUser),
    genderPresentation: "feminine",
  });
  const poseContract = buildFallbackPoseContract(character.name);
  return {
    characterName: character.name,
    archetype: character.archetype,
    profession: clean(character.role) || undefined,
    relationshipToUser: clean(character.scenario?.relationshipToUser) || undefined,
    sceneType: clean(character.scenario?.sceneGoal) || undefined,
    visualAura: clean(character.visualProfile?.visualAura),
    ageValue,
    ageBand: mapAgeValueToBand(ageValue),
    genderPresentation: "feminine",
    hair: clean(character.visualProfile?.hair),
    eyes: clean(character.visualProfile?.eyes),
    outfit: clean(character.visualProfile?.style),
    camera: normalizeReferenceCamera("upper-body framing"),
    photoPack: normalizeReferencePhotoPack("natural lifestyle portraits"),
    avatarStyle: normalizeReferenceAvatarStyle("reference-style natural realism"),
    bodyType: "natural feminine silhouette",
    expression: [
      clean(character.role) ? clean(character.role) : "focused eye contact",
      visualChoiceProfile.expressionStyle,
    ]
      .filter(Boolean)
      .join(", "),
    lightingMood: normalizeReferenceLightingMood(
      "soft daylight or clean practical indoor light",
    ),
    environment:
      visualCompatibility.backgroundIntent ||
      clean(character.scenario?.setting) ||
      "natural indoor lifestyle setting",
    backgroundIntent: visualCompatibility.backgroundIntent || undefined,
    outfitIntent: visualCompatibility.outfitIntent || undefined,
    nudityMode: visualCompatibility.nudityMode,
    faceBias: visualCompatibility.faceBias,
    bodyReadPriority: visualCompatibility.bodyReadPriority,
    sceneNote: visualCompatibility.promptAnchors.join(". ") || undefined,
    signatureDetail: clean(character.visualProfile?.signatureDetail),
    pose: [
      poseContract.posePrompt,
      poseContract.bodyLinePrompt,
      `exact pose family: ${poseContract.poseFamily}`,
      poseContract.cropDiscipline,
      visualChoiceProfile.postureDiscipline,
    ]
      .filter(Boolean)
      .join(", "),
    poseContract,
    visualConstitution: [
      ...visualCompatibility.sceneAnchors,
      ...visualCompatibility.realismAnchors,
    ],
    negativeConstitutionHints: visualCompatibility.negativeAnchors,
    selectionContractSummary: [
      character.name ? `${character.name} keeps a stable fictional adult identity.` : "",
      clean(character.visualProfile?.hair)
        ? `Hair stays readable: ${clean(character.visualProfile?.hair)}.`
        : "",
      clean(character.visualProfile?.eyes)
        ? `Eye read stays visible: ${clean(character.visualProfile?.eyes)}.`
        : "",
      clean(character.visualProfile?.style)
        ? `Wardrobe class stays exact: ${clean(character.visualProfile?.style)}.`
        : "",
      clean(character.role)
        ? `Profession cue remains believable: ${clean(character.role)}.`
        : "",
    ].filter(Boolean),
    imageMoodContractSummary: [
      clean(character.scenario?.relationshipToUser)
        ? `Role cue should shape mood: ${clean(character.scenario?.relationshipToUser)}.`
        : "",
      clean(character.personality)
        ? `Personality should read in expression and body language: ${clean(character.personality)}.`
        : "",
    ].filter(Boolean),
    nsfwLevel: "adult",
  };
}

export function buildPromptInputFromCustomCharacter(
  character: {
    name: string;
    archetype: string;
    headline: string;
    payload?: unknown;
    scenario?: unknown;
  },
): CharacterImagePromptInput {
  const payload = asRecord(character.payload);
  const scenario = asRecord(character.scenario);
  const builder = readBuilderV2Payload(payload);
  const identity = asRecord(payload.identity);
  const visual = asRecord(payload.visualProfile);
  const metadata = asRecord(payload.metadata);
  const builderInput = asRecord(metadata.builderInput);
  const structuredNotes = readStructuredNotes(clean(builderInput.customNotes));
  const studio = asRecord(payload.studio);
  const ageValue = parseAdultAgeValue(clean(identity.age));
  const selectionCompiler = buildSelectionCompilerOutputFromCustomCharacterSource({
    name: character.name,
    archetype: clean(character.archetype),
    headline: clean(character.headline),
    scenario: character.scenario ?? null,
    payload,
  });
  const poseContract = buildFallbackPoseContract(`${character.name}|${clean(character.archetype)}`);
  const visualCompatibility = deriveVisualPromptCompatibility({
    profession: structuredNotes["Profession"] || clean(character.headline),
    outfit: builder.visualProfile.outfit || clean(visual.outfit),
    setting: clean(scenario.setting),
    sceneType: clean(structuredNotes["Scene type"]),
    relationshipToUser: clean(asRecord(payload.scenario).relationshipToUser as string),
    relationshipDynamic: clean(structuredNotes["Relationship dynamic"]),
    behaviorMode: clean(structuredNotes["Behavior mode"]),
    genderPresentation: clean(identity.genderPresentation) || "feminine",
    bodyType: clean(visual.bodyType),
    bustSize: clean(visual.bustSize),
    breastType: clean(visual.breastType),
    buttSize: clean(visual.buttSize),
  });
  const visualChoiceProfile = deriveVisualChoiceProfile({
    ageValue,
    ageBand: mapAgeToBand(clean(identity.age)),
    archetype: clean(character.archetype),
    profession: structuredNotes["Profession"] || clean(character.headline),
    relationshipToUser: clean(asRecord(payload.scenario).relationshipToUser as string),
    relationshipDynamic: clean(structuredNotes["Relationship dynamic"]),
    sceneType: clean(structuredNotes["Scene type"]),
    behaviorMode: clean(structuredNotes["Behavior mode"]),
    coreVibes: Array.isArray(studio.coreVibes)
      ? (studio.coreVibes as string[])
      : [],
    warmth: typeof studio.warmth === "number" ? Math.round(studio.warmth as number) : null,
    assertiveness:
      typeof studio.assertiveness === "number"
        ? Math.round(studio.assertiveness as number)
        : null,
    mystery:
      typeof studio.mystery === "number"
        ? Math.round(studio.mystery as number)
        : null,
    playfulness:
      typeof studio.playfulness === "number"
        ? Math.round(studio.playfulness as number)
        : null,
    region: clean(identity.region),
    visualAura:
      builder.visualProfile.visualAura || clean(visual.visualAura) || clean(character.headline),
    bodyType: clean(visual.bodyType),
    outfit: builder.visualProfile.outfit || clean(visual.outfit),
    lightingMood: clean(visual.lightingMood),
    expression: clean(visual.expression),
    accessoryVibe: clean(visual.accessoryVibe),
    signatureDetail: clean(visual.signatureDetail),
    camera: builder.visualProfile.camera || clean(visual.camera),
    hair: builder.visualProfile.hair || clean(visual.hair),
    eyes: builder.visualProfile.eyes || clean(visual.eyes),
    setting: clean(scenario.setting),
  });

  return {
    characterName: character.name,
    archetype: clean(character.archetype),
    profession:
      structuredNotes["Profession"] || clean(character.headline) || undefined,
    relationshipToUser:
      clean(asRecord(payload.scenario).relationshipToUser as string) || undefined,
    relationshipDynamic: clean(structuredNotes["Relationship dynamic"]) || undefined,
    sceneType: clean(structuredNotes["Scene type"]) || undefined,
    behaviorMode: clean(structuredNotes["Behavior mode"]) || undefined,
    visualAura:
      builder.visualProfile.visualAura || clean(visual.visualAura) || clean(character.headline),
    ageValue,
    ageBand: mapAgeToBand(clean(identity.age)),
    genderPresentation: clean(identity.genderPresentation) || "feminine",
    region: clean(identity.region),
    skinTone: clean(visual.skinTone),
    hair: builder.visualProfile.hair || clean(visual.hair),
    hairTexture: clean(visual.hairTexture),
    eyes: builder.visualProfile.eyes || clean(visual.eyes),
    eyeShape: clean(visual.eyeShape),
    makeupStyle: clean(visual.makeupStyle),
    accessoryVibe: clean(visual.accessoryVibe),
    outfit: builder.visualProfile.outfit || clean(visual.outfit),
    palette: builder.visualProfile.palette || clean(visual.palette),
    camera: normalizeReferenceCamera(
      builder.visualProfile.camera || clean(visual.camera) || "upper-body framing",
    ),
    photoPack: normalizeReferencePhotoPack(
      builder.visualProfile.photoPack || clean(visual.photoPack),
    ),
    avatarStyle: normalizeReferenceAvatarStyle(
      builder.visualProfile.avatarStyle ||
        clean(visual.avatarStyle) ||
        "reference-style natural realism",
    ),
    bodyType: clean(visual.bodyType),
    bustSize: clean(visual.bustSize),
    breastType: clean(visual.breastType),
    hipsType: clean(visual.hipsType),
    buttSize: clean(visual.buttSize),
    waistDefinition: clean(visual.waistDefinition),
    heightImpression: clean(visual.heightImpression),
    exposureLevel: clean(visual.exposureLevel),
    pose: [
      clean(visual.pose) || poseContract.posePrompt,
      poseContract.bodyLinePrompt,
      `exact pose family: ${poseContract.poseFamily}`,
      poseContract.cropDiscipline,
      visualChoiceProfile.postureDiscipline,
    ]
      .filter(Boolean)
      .join(", "),
    poseContract,
    expression: [
      clean(visual.expression) || "engaged eye contact",
      visualChoiceProfile.expressionStyle,
    ]
      .filter(Boolean)
      .join(", "),
    lightingMood: normalizeReferenceLightingMood(
      clean(visual.lightingMood) || "soft daylight or clean practical indoor light",
    ),
    environment:
      visualCompatibility.backgroundIntent ||
      clean(scenario.setting) ||
      clean(visual.environment) ||
      "natural indoor lifestyle setting",
    backgroundIntent: visualCompatibility.backgroundIntent || undefined,
    outfitIntent: visualCompatibility.outfitIntent || undefined,
    nudityMode: visualCompatibility.nudityMode,
    faceBias: visualCompatibility.faceBias,
    bodyReadPriority: visualCompatibility.bodyReadPriority,
    hobbies: clean(structuredNotes["Hobbies"]) || undefined,
    fetishes: clean(structuredNotes["Fetishes"]) || undefined,
    extraPersonalityDetails:
      clean(structuredNotes["Extra personality details"]) || undefined,
    extraPhysicalDetails:
      clean(structuredNotes["Extra physical details"]) || undefined,
    sceneNote: [
      visualCompatibility.promptAnchors.join(". "),
      clean(structuredNotes["Extra personality details"]),
      clean(structuredNotes["Extra physical details"]),
    ]
      .filter(Boolean)
      .join(". ") || undefined,
    signatureDetail: clean(visual.signatureDetail),
    visualConstitution:
      [
        ...selectionCompiler.visualPromptCompileResult.positiveIdentity,
        ...selectionCompiler.visualPromptCompileResult.positiveFace,
        ...selectionCompiler.visualPromptCompileResult.positiveHair,
        ...selectionCompiler.visualPromptCompileResult.positiveBody,
        ...selectionCompiler.visualPromptCompileResult.positiveWardrobe,
        ...selectionCompiler.visualPromptCompileResult.positivePhotoLanguage,
        ...selectionCompiler.visualConstitutionProfile.imagePromptAdditions,
        ...visualCompatibility.sceneAnchors,
        ...visualCompatibility.realismAnchors,
      ],
    visualIdentityLock:
      [
        ...(selectionCompiler.selectionPromptContract?.identity ?? []),
        ...(selectionCompiler.selectionPromptContract?.face ?? []),
        ...(selectionCompiler.selectionPromptContract?.hair ?? []),
        ...selectionCompiler.visualPromptCompileResult.selectedDescriptors.flatMap(
          (descriptor) => descriptor.identityLockAnchors,
        ),
        ...selectionCompiler.visualConstitutionProfile.identityLockAdditions,
      ],
    negativeConstitutionHints:
      [
        ...selectionCompiler.visualPromptCompileResult.negativeDrift,
        ...selectionCompiler.visualConstitutionProfile.negativeGuardrails,
        ...visualCompatibility.negativeAnchors,
      ],
    selectionPromptContract: selectionCompiler.selectionPromptContract,
    visualPromptCompileResult: selectionCompiler.visualPromptCompileResult,
    hiddenVisualSectionPrompts:
      selectionCompiler.visualPromptCompileResult.hiddenSectionPrompts,
    masterVisualPrompt:
      selectionCompiler.visualPromptCompileResult.masterVisualPrompt.join(" "),
    selectionContractSummary: selectionCompiler.selectionPromptContract.promptSummary,
    behaviorContractSummary: selectionCompiler.selectionPromptContract.personality,
    imageMoodContractSummary: selectionCompiler.selectionPromptContract.imageMood,
    referenceHints: selectionCompiler.visualPromptCompileResult.referenceHints,
    nsfwLevel: "adult",
  };
}
