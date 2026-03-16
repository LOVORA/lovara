import type {
  CharacterBuilderAction,
  CharacterBuilderState,
  CharacterCustomPromptLocks,
  CharacterCustomPromptState,
  CharacterGenerationState,
  CharacterPresetSelections,
  CharacterPublishingState,
} from "./types";
import {
  EMPTY_CUSTOM_PROMPT_STATE,
  EMPTY_GENERATION_STATE,
  EMPTY_PRESET_SELECTIONS,
  EMPTY_PUBLISHING_STATE,
  INITIAL_CHARACTER_BUILDER_STATE,
} from "./types";

function mergePresetSection<
  TSectionKey extends keyof CharacterPresetSelections,
>(
  state: CharacterBuilderState,
  section: TSectionKey,
  payload: Record<string, string>,
): CharacterBuilderState {
  return {
    ...state,
    preset: {
      ...state.preset,
      [section]: {
        ...state.preset[section],
        ...payload,
      },
    },
  };
}

function mergeCustomPrompt(
  current: CharacterCustomPromptState,
  payload: Partial<CharacterCustomPromptState>,
): CharacterCustomPromptState {
  return {
    ...current,
    ...payload,
    locks: {
      ...current.locks,
      ...(payload.locks ?? {}),
    },
  };
}

function mergeCustomPromptLocks(
  current: CharacterCustomPromptLocks,
  payload: Partial<CharacterCustomPromptLocks>,
): CharacterCustomPromptLocks {
  return {
    ...current,
    ...payload,
  };
}

function resetGenerationState(
  current: CharacterGenerationState = EMPTY_GENERATION_STATE,
): CharacterGenerationState {
  return {
    ...current,
    status: "idle",
    candidates: [],
    selectedCandidateId: null,
    primaryReferenceImageUrl: null,
    errorMessage: null,
  };
}

function resetPublishingState(
  current: CharacterPublishingState = EMPTY_PUBLISHING_STATE,
): CharacterPublishingState {
  return {
    ...current,
    name: "",
    visibility: "private",
    publicTagline: "",
    publicTeaser: "",
    publicTags: [],
  };
}

function normalizePublishingState(
  current: CharacterPublishingState,
  payload: Partial<CharacterPublishingState>,
): CharacterPublishingState {
  const nextTags =
    payload.publicTags !== undefined
      ? payload.publicTags.filter(Boolean)
      : current.publicTags;

  return {
    ...current,
    ...payload,
    publicTags: nextTags,
  };
}

function normalizeSelectedCandidate(
  state: CharacterBuilderState,
  candidateId: string,
): CharacterBuilderState {
  const selected = state.generation.candidates.find(
    (candidate) => candidate.tempId === candidateId,
  );

  return {
    ...state,
    generation: {
      ...state.generation,
      selectedCandidateId: candidateId,
      primaryReferenceImageUrl: selected?.imageUrl ?? null,
      errorMessage: null,
    },
  };
}

function clearGenerationSelection(
  state: CharacterBuilderState,
): CharacterBuilderState {
  return {
    ...state,
    generation: {
      ...state.generation,
      selectedCandidateId: null,
      primaryReferenceImageUrl: null,
    },
  };
}

export function characterBuilderReducer(
  state: CharacterBuilderState,
  action: CharacterBuilderAction,
): CharacterBuilderState {
  switch (action.type) {
    case "SET_STYLE_TYPE": {
      const nextStyle = action.payload;

      return {
        ...state,
        flow: {
          ...state.flow,
          styleType: nextStyle,
        },
        customPrompt: {
          ...state.customPrompt,
          helperStyle: nextStyle,
        },
        generation: resetGenerationState(state.generation),
      };
    }

    case "SET_BUILDER_MODE": {
      const nextMode = action.payload;
      const nextStep = nextMode === "custom_prompt" ? "prompt" : "identity";

      return {
        ...state,
        flow: {
          ...state.flow,
          builderMode: nextMode,
          currentStep:
            state.flow.currentStep === "style" || state.flow.currentStep === "mode"
              ? state.flow.currentStep
              : nextStep,
        },
        generation: resetGenerationState(state.generation),
      };
    }

    case "GO_TO_STEP": {
      return {
        ...state,
        flow: {
          ...state.flow,
          currentStep: action.payload,
        },
      };
    }

    case "UPDATE_PRESET_SECTION": {
      return clearGenerationSelection(
        mergePresetSection(state, action.section, action.payload),
      );
    }

    case "UPDATE_CUSTOM_PROMPT": {
      return clearGenerationSelection({
        ...state,
        customPrompt: mergeCustomPrompt(state.customPrompt, action.payload),
      });
    }

    case "UPDATE_CUSTOM_PROMPT_LOCKS": {
      return clearGenerationSelection({
        ...state,
        customPrompt: {
          ...state.customPrompt,
          locks: mergeCustomPromptLocks(
            state.customPrompt.locks,
            action.payload,
          ),
        },
      });
    }

    case "SET_GENERATION_STATUS": {
      return {
        ...state,
        generation: {
          ...state.generation,
          status: action.payload,
          errorMessage:
            action.payload === "generating" ? null : state.generation.errorMessage,
        },
      };
    }

    case "SET_GENERATION_RESULTS": {
      return {
        ...state,
        generation: {
          ...state.generation,
          status: "success",
          candidates: action.payload,
          selectedCandidateId: null,
          primaryReferenceImageUrl: null,
          errorMessage: null,
        },
      };
    }

    case "SELECT_GENERATED_CANDIDATE": {
      return normalizeSelectedCandidate(state, action.payload);
    }

    case "SET_PRIMARY_REFERENCE": {
      return {
        ...state,
        generation: {
          ...state.generation,
          primaryReferenceImageUrl: action.payload,
        },
      };
    }

    case "SET_GENERATION_ERROR": {
      return {
        ...state,
        generation: {
          ...state.generation,
          status: action.payload ? "error" : state.generation.status,
          errorMessage: action.payload,
        },
      };
    }

    case "UPDATE_PUBLISHING": {
      return {
        ...state,
        publishing: normalizePublishingState(state.publishing, action.payload),
      };
    }

    case "RESET_BUILDER": {
      return {
        ...INITIAL_CHARACTER_BUILDER_STATE,
        preset: { ...EMPTY_PRESET_SELECTIONS },
        customPrompt: { ...EMPTY_CUSTOM_PROMPT_STATE },
        generation: { ...EMPTY_GENERATION_STATE },
        publishing: { ...resetPublishingState() },
      };
    }

    default: {
      return state;
    }
  }
}

export function createInitialCharacterBuilderState(): CharacterBuilderState {
  return {
    ...INITIAL_CHARACTER_BUILDER_STATE,
    preset: { ...EMPTY_PRESET_SELECTIONS },
    customPrompt: {
      ...EMPTY_CUSTOM_PROMPT_STATE,
      locks: { ...EMPTY_CUSTOM_PROMPT_STATE.locks },
    },
    generation: { ...EMPTY_GENERATION_STATE },
    publishing: { ...EMPTY_PUBLISHING_STATE },
  };
}
