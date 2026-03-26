import type { HiddenPromptEngineInput } from "@/lib/character-builder/types";
import type { CharacterImagePromptInput } from "@/lib/image-generation/types";

export type OriginalitySafetyDecision = "allow" | "block";

export type OriginalityBlockedReason =
  | "franchise_character"
  | "protected_style"
  | "real_person_lookalike"
  | "named_character_reference";

export type OriginalityNormalizedRequestProfile = {
  identityTokens: string[];
  sceneTokens: string[];
  styleTokens: string[];
};

export type OriginalityGuardResult = {
  decision: OriginalitySafetyDecision;
  reasons: string[];
  matchedTerms: string[];
  blockedReason: OriginalityBlockedReason | null;
  safeAlternatives: string[];
  normalizedRequestProfile: OriginalityNormalizedRequestProfile;
  flags: {
    depictsFranchiseCharacter: boolean;
    depictsProtectedStyleRequest: boolean;
    lookalikeRiskFlag: boolean;
    namedCharacterReferenceFlag: boolean;
    depictsRealPerson: boolean;
    depictsPublicFigure: boolean;
  };
};

const FRANCHISE_TERMS = [
  "disney",
  "pixar",
  "marvel",
  "dc comics",
  "nintendo",
  "ghibli",
  "studio ghibli",
  "star wars",
  "harry potter",
  "pokemon",
  "naruto",
  "dragon ball",
  "attack on titan",
  "demon slayer",
  "sailor moon",
  "queen elsa",
  "princess anna",
  "spider-man",
  "spiderman",
  "iron man",
  "captain america",
  "batman",
  "superman",
  "wonder woman",
  "goku",
  "luffy",
  "mikasa",
  "tanjiro",
  "princess peach",
  "hogwarts",
];

const PROTECTED_STYLE_TERMS = [
  "anime",
  "manga",
  "chibi",
  "disney style",
  "pixar style",
  "marvel style",
  "ghibli style",
  "anime-inspired",
  "anime inspired",
  "manga style",
  "cartoon princess",
  "superhero style",
];

const PUBLIC_FIGURE_HINTS = [
  "celebrity",
  "public figure",
  "influencer",
  "real person",
  "real woman",
  "real man",
];

const LOOKALIKE_PATTERNS = [
  /\b(?:looks?\s+like|look\s+like|similar\s+to|modeled\s+after|based\s+on|inspired\s+by|face\s+like)\s+[a-z]+(?:\s+[a-z]+){0,2}\b/i,
  /\blike\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/,
];

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

function compact(values: Array<string | null | undefined | false>) {
  return values
    .map((value) => clean(typeof value === "string" ? value : ""))
    .filter(Boolean);
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countMatches(text: string, terms: string[]) {
  return unique(
    terms.filter((term) => text.includes(term.toLowerCase())).map((term) => term),
  );
}

function buildSafeAlternatives(
  identityTokens: string[],
  sceneTokens: string[],
  styleTokens: string[],
) {
  const identityLine =
    identityTokens.length > 0
      ? `Create a fully original adult character with ${identityTokens.slice(0, 4).join(", ")}.`
      : "Create a fully original adult character with a believable face, body, and styling.";

  const sceneLine =
    sceneTokens.length > 0
      ? `Keep the scene grounded in ${sceneTokens.slice(0, 3).join(", ")}.`
      : "Keep the scene grounded in a realistic private setting with natural lighting.";

  const styleLine =
    styleTokens.length > 0
      ? `Stay realistic and original while preserving ${styleTokens.slice(0, 3).join(", ")}.`
      : "Stay realistic and original with natural skin, coherent anatomy, and non-clone composition.";

  return [identityLine, sceneLine, styleLine];
}

function buildNormalizedProfileFromPromptInput(
  promptInput: CharacterImagePromptInput,
): OriginalityNormalizedRequestProfile {
  return {
    identityTokens: unique(
      compact([
        promptInput.ageBand,
        promptInput.genderPresentation,
        promptInput.region,
        promptInput.skinTone,
        promptInput.hair,
        promptInput.eyes,
        promptInput.bodyType,
        promptInput.signatureDetail,
      ]),
    ),
    sceneTokens: unique(
      compact([
        promptInput.environment,
        promptInput.lightingMood,
        promptInput.camera,
        promptInput.pose,
        promptInput.expression,
      ]),
    ),
    styleTokens: unique(
      compact([
        promptInput.visualAura,
        promptInput.outfit,
        promptInput.palette,
        promptInput.avatarStyle,
      ]),
    ),
  };
}

function buildNormalizedProfileFromHiddenInput(
  input: HiddenPromptEngineInput,
): OriginalityNormalizedRequestProfile {
  if (input.builderMode === "custom_prompt") {
    return {
      identityTokens: unique(
        compact([
          input.customPrompt?.locks?.ageBand,
          input.customPrompt?.locks?.region,
          input.customPrompt?.locks?.eyeColor,
          input.customPrompt?.locks?.hairColor,
        ]),
      ),
      sceneTokens: unique(compact([input.customPrompt?.helperOutputType])),
      styleTokens: unique(compact([input.customPrompt?.helperVibe, input.styleType])),
    };
  }

  const preset = input.presetSelections;

  return {
    identityTokens: unique(
      compact([
        preset?.ageBand,
        preset?.region,
        preset?.skinTone,
        preset?.eyeColor,
        preset?.hairColor,
        preset?.bodyType,
      ]),
    ),
    sceneTokens: unique(
      compact([
        preset?.sceneType,
        preset?.cameraFraming,
        preset?.lightingType,
        preset?.poseEnergy,
      ]),
    ),
    styleTokens: unique(
      compact([
        preset?.mainVibe,
        preset?.personaFlavor,
        preset?.outfitType,
        input.styleType,
      ]),
    ),
  };
}

function inspectText(
  rawText: string,
  normalizedProfile: OriginalityNormalizedRequestProfile,
): OriginalityGuardResult {
  const lower = rawText.toLowerCase();
  const matchedFranchiseTerms = countMatches(lower, FRANCHISE_TERMS);
  const matchedStyleTerms = countMatches(lower, PROTECTED_STYLE_TERMS);
  const matchedPublicFigureTerms = countMatches(lower, PUBLIC_FIGURE_HINTS);
  const lookalikeMatch = LOOKALIKE_PATTERNS.find((pattern) => pattern.test(rawText));

  const depictsFranchiseCharacter = matchedFranchiseTerms.length > 0;
  const depictsProtectedStyleRequest = matchedStyleTerms.length > 0;
  const namedCharacterReferenceFlag = matchedFranchiseTerms.length > 0;
  const lookalikeRiskFlag = Boolean(lookalikeMatch) || matchedPublicFigureTerms.length > 0;
  const depictsRealPerson = lookalikeRiskFlag;
  const depictsPublicFigure = matchedPublicFigureTerms.length > 0;

  const reasons = [
    ...(depictsFranchiseCharacter
      ? ["Franchise or copyrighted character references are not allowed."]
      : []),
    ...(depictsProtectedStyleRequest
      ? ["Protected or mimicked visual styles are not allowed."]
      : []),
    ...(lookalikeRiskFlag
      ? ["Real-person, celebrity, or lookalike requests are not allowed."]
      : []),
  ];

  const blockedReason: OriginalityBlockedReason | null = depictsFranchiseCharacter
    ? "franchise_character"
    : lookalikeRiskFlag
      ? "real_person_lookalike"
      : depictsProtectedStyleRequest
        ? "protected_style"
        : namedCharacterReferenceFlag
          ? "named_character_reference"
          : null;

  return {
    decision: reasons.length > 0 ? "block" : "allow",
    reasons,
    matchedTerms: unique([
      ...matchedFranchiseTerms,
      ...matchedStyleTerms,
      ...matchedPublicFigureTerms,
      ...(lookalikeMatch ? ["lookalike phrasing"] : []),
    ]),
    blockedReason,
    safeAlternatives: buildSafeAlternatives(
      normalizedProfile.identityTokens,
      normalizedProfile.sceneTokens,
      normalizedProfile.styleTokens,
    ),
    normalizedRequestProfile: normalizedProfile,
    flags: {
      depictsFranchiseCharacter,
      depictsProtectedStyleRequest,
      lookalikeRiskFlag,
      namedCharacterReferenceFlag,
      depictsRealPerson,
      depictsPublicFigure,
    },
  };
}

export function inspectOriginalityFromPromptInput(
  promptInput: CharacterImagePromptInput,
) {
  const text = compact([
    promptInput.characterName,
    promptInput.archetype,
    promptInput.visualAura,
    promptInput.region,
    promptInput.hair,
    promptInput.eyes,
    promptInput.outfit,
    promptInput.palette,
    promptInput.avatarStyle,
    promptInput.expression,
    promptInput.environment,
    promptInput.signatureDetail,
  ]).join(" ");

  return inspectText(text, buildNormalizedProfileFromPromptInput(promptInput));
}

export function inspectOriginalityFromHiddenInput(input: HiddenPromptEngineInput) {
  const text =
    input.builderMode === "custom_prompt"
      ? compact([
          input.styleType,
          input.customPrompt?.promptText,
          input.customPrompt?.helperVibe,
          input.customPrompt?.locks?.region,
          input.customPrompt?.locks?.eyeColor,
          input.customPrompt?.locks?.hairColor,
        ]).join(" ")
      : compact([
          input.styleType,
          input.presetSelections?.ageBand,
          input.presetSelections?.region,
          input.presetSelections?.skinTone,
          input.presetSelections?.genderPresentation,
          input.presetSelections?.eyeColor,
          input.presetSelections?.eyeShape,
          input.presetSelections?.faceShape,
          input.presetSelections?.lipStyle,
          input.presetSelections?.noseType,
          input.presetSelections?.makeupLevel,
          input.presetSelections?.hairColor,
          input.presetSelections?.hairLength,
          input.presetSelections?.hairTexture,
          input.presetSelections?.hairstyle,
          input.presetSelections?.bodyType,
          input.presetSelections?.bustSize,
          input.presetSelections?.hipsType,
          input.presetSelections?.heightImpression,
          input.presetSelections?.waistDefinition,
          input.presetSelections?.mainVibe,
          input.presetSelections?.energy,
          input.presetSelections?.personaFlavor,
          input.presetSelections?.outfitType,
          input.presetSelections?.outfitColor,
          input.presetSelections?.exposureLevel,
          input.presetSelections?.sceneType,
          input.presetSelections?.cameraFraming,
          input.presetSelections?.lightingType,
          input.presetSelections?.poseEnergy,
          input.presetSelections?.expression,
          input.presetSelections?.realismStrength,
          input.presetSelections?.detailLevel,
          input.presetSelections?.variationGoal,
        ]).join(" ");

  return inspectText(text, buildNormalizedProfileFromHiddenInput(input));
}
