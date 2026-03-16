import type {
  CharacterBuilderDerivedState,
  CharacterBuilderState,
  CharacterBuilderValidationIssue,
  CharacterPresetSelections,
} from "./types";
import {
  CHARACTER_MINIMUM_CUSTOM_PROMPT_LENGTH,
  CHARACTER_REQUIRED_PRESET_FIELDS,
} from "./constants";

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function compact(values: Array<string | null | undefined | false>): string[] {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countFilled(values: Record<string, unknown>): number {
  return Object.values(values).reduce<number>((count, value) => {
    if (typeof value === "string") {
      return nonEmpty(value) ? count + 1 : count;
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? count + 1 : count;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? count + 1 : count;
    }

    if (typeof value === "boolean") {
      return value ? count + 1 : count;
    }

    if (isRecord(value)) {
      return countFilled(value) > 0 ? count + 1 : count;
    }

    return count;
  }, 0);
}

function getPresetCompletionScore(state: CharacterBuilderState): number {
  const sections = state.preset;
  const totalPossible =
    Object.keys(sections.core).length +
    Object.keys(sections.face).length +
    Object.keys(sections.hair).length +
    Object.keys(sections.body).length +
    Object.keys(sections.vibe).length +
    Object.keys(sections.outfit).length +
    Object.keys(sections.scene).length;

  const filled =
    countFilled(sections.core as Record<string, unknown>) +
    countFilled(sections.face as Record<string, unknown>) +
    countFilled(sections.hair as Record<string, unknown>) +
    countFilled(sections.body as Record<string, unknown>) +
    countFilled(sections.vibe as Record<string, unknown>) +
    countFilled(sections.outfit as Record<string, unknown>) +
    countFilled(sections.scene as Record<string, unknown>);

  if (totalPossible === 0) return 0;
  return Math.round((filled / totalPossible) * 100);
}

function getCustomPromptCompletionScore(state: CharacterBuilderState): number {
  const promptScore = Math.min(
    70,
    Math.round(
      (state.customPrompt.promptText.trim().length /
        CHARACTER_MINIMUM_CUSTOM_PROMPT_LENGTH) *
        70,
    ),
  );

  const locks = state.customPrompt.locks;
  const lockCount = countFilled(locks as Record<string, unknown>);
  const lockScore = Math.min(20, lockCount * 5);

  const helperScore =
    (state.customPrompt.helperStyle ? 5 : 0) +
    (state.customPrompt.helperOutputType ? 3 : 0) +
    (state.customPrompt.helperVibe ? 2 : 0);

  return Math.min(100, promptScore + lockScore + helperScore);
}

function buildPresetValidationIssues(
  preset: CharacterPresetSelections,
): CharacterBuilderValidationIssue[] {
  const issues: CharacterBuilderValidationIssue[] = [];

  CHARACTER_REQUIRED_PRESET_FIELDS.core.forEach((field) => {
    if (!nonEmpty(preset.core[field])) {
      issues.push({
        field: `core.${field}`,
        message: `Missing required identity field: ${field}.`,
      });
    }
  });

  CHARACTER_REQUIRED_PRESET_FIELDS.face.forEach((field) => {
    if (!nonEmpty(preset.face[field])) {
      issues.push({
        field: `face.${field}`,
        message: `Missing required face field: ${field}.`,
      });
    }
  });

  CHARACTER_REQUIRED_PRESET_FIELDS.hair.forEach((field) => {
    if (!nonEmpty(preset.hair[field])) {
      issues.push({
        field: `hair.${field}`,
        message: `Missing required hair field: ${field}.`,
      });
    }
  });

  CHARACTER_REQUIRED_PRESET_FIELDS.body.forEach((field) => {
    if (!nonEmpty(preset.body[field])) {
      issues.push({
        field: `body.${field}`,
        message: `Missing required body field: ${field}.`,
      });
    }
  });

  CHARACTER_REQUIRED_PRESET_FIELDS.vibe.forEach((field) => {
    if (!nonEmpty(preset.vibe[field])) {
      issues.push({
        field: `vibe.${field}`,
        message: `Missing required vibe field: ${field}.`,
      });
    }
  });

  CHARACTER_REQUIRED_PRESET_FIELDS.outfit.forEach((field) => {
    if (!nonEmpty(preset.outfit[field])) {
      issues.push({
        field: `outfit.${field}`,
        message: `Missing required outfit field: ${field}.`,
      });
    }
  });

  CHARACTER_REQUIRED_PRESET_FIELDS.scene.forEach((field) => {
    if (!nonEmpty(preset.scene[field])) {
      issues.push({
        field: `scene.${field}`,
        message: `Missing required scene field: ${field}.`,
      });
    }
  });

  return issues;
}

function buildCustomPromptValidationIssues(
  state: CharacterBuilderState,
): CharacterBuilderValidationIssue[] {
  const issues: CharacterBuilderValidationIssue[] = [];

  if (
    state.customPrompt.promptText.trim().length <
    CHARACTER_MINIMUM_CUSTOM_PROMPT_LENGTH
  ) {
    issues.push({
      field: "customPrompt.promptText",
      message: `Prompt must be at least ${CHARACTER_MINIMUM_CUSTOM_PROMPT_LENGTH} characters long.`,
    });
  }

  return issues;
}

export function getValidationIssues(
  state: CharacterBuilderState,
): CharacterBuilderValidationIssue[] {
  const issues: CharacterBuilderValidationIssue[] = [];

  if (!state.flow.styleType) {
    issues.push({
      field: "flow.styleType",
      message: "Choose a style type before generating.",
    });
  }

  if (!state.flow.builderMode) {
    issues.push({
      field: "flow.builderMode",
      message: "Choose a builder mode before continuing.",
    });
  }

  if (!nonEmpty(state.publishing.name)) {
    issues.push({
      field: "publishing.name",
      message: "Character name is required before publishing.",
    });
  }

  if (state.flow.builderMode === "preset") {
    issues.push(...buildPresetValidationIssues(state.preset));
  } else {
    issues.push(...buildCustomPromptValidationIssues(state));
  }

  if (state.generation.status === "error" && state.generation.errorMessage) {
    issues.push({
      field: "generation.status",
      message: state.generation.errorMessage,
    });
  }

  return issues;
}

export function getReadinessScore(state: CharacterBuilderState): number {
  const baseScore =
    state.flow.builderMode === "preset"
      ? getPresetCompletionScore(state)
      : getCustomPromptCompletionScore(state);

  const styleBonus = state.flow.styleType ? 5 : 0;
  const publishBonus = nonEmpty(state.publishing.name) ? 5 : 0;

  return Math.min(100, baseScore + styleBonus + publishBonus);
}

export function getIdentitySummary(state: CharacterBuilderState): string[] {
  if (state.flow.builderMode === "custom_prompt") {
    return compact([
      state.flow.styleType,
      state.customPrompt.locks.ageBand,
      state.customPrompt.locks.region,
      state.customPrompt.locks.eyeColor,
      state.customPrompt.locks.hairColor,
    ]);
  }

  return compact([
    state.flow.styleType,
    state.preset.core.ageBand,
    state.preset.core.region,
    state.preset.core.skinTone,
    state.preset.face.eyeColor,
    state.preset.hair.hairColor,
    state.preset.body.bodyType,
    state.preset.vibe.mainVibe,
  ]);
}

export function getVisualSummary(state: CharacterBuilderState): string[] {
  if (state.flow.builderMode === "custom_prompt") {
    return compact([
      state.customPrompt.helperOutputType,
      state.customPrompt.helperVibe,
      state.customPrompt.locks.eyeColor,
      state.customPrompt.locks.hairColor,
    ]);
  }

  return compact([
    state.preset.face.eyeColor,
    state.preset.face.eyeShape,
    state.preset.hair.hairColor,
    state.preset.hair.hairstyle,
    state.preset.body.bodyType,
    state.preset.outfit.outfitType,
    state.preset.scene.sceneType,
    state.preset.scene.cameraFraming,
    state.preset.scene.expression,
  ]);
}

export function getCanGenerate(state: CharacterBuilderState): boolean {
  if (!state.flow.styleType) return false;

  if (state.flow.builderMode === "preset") {
    const presetIssues = buildPresetValidationIssues(state.preset);
    return presetIssues.length === 0;
  }

  return (
    state.customPrompt.promptText.trim().length >=
    CHARACTER_MINIMUM_CUSTOM_PROMPT_LENGTH
  );
}

export function getCanPublish(state: CharacterBuilderState): boolean {
  if (!nonEmpty(state.publishing.name)) return false;
  if (!getCanGenerate(state)) return false;

  return (
    state.generation.candidates.length > 0 &&
    nonEmpty(state.generation.selectedCandidateId ?? "")
  );
}

export function getCharacterBuilderDerivedState(
  state: CharacterBuilderState,
): CharacterBuilderDerivedState {
  const readinessScore = getReadinessScore(state);
  const validationIssues = getValidationIssues(state);
  const canGenerate = getCanGenerate(state);
  const canPublish = getCanPublish(state);
  const identitySummary = getIdentitySummary(state);
  const visualSummary = getVisualSummary(state);

  return {
    readinessScore,
    validationIssues,
    canGenerate,
    canPublish,
    identitySummary,
    visualSummary,
  };
}
