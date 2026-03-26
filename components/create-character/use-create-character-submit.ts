"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  finalizeMyCustomCharacterCreation,
  type CharacterDraftInput,
} from "@/lib/account";
import type { CharacterImagePromptInput } from "@/lib/image-provider";
import type { BannerState, StudioStep } from "@/lib/create-character/studio-editor";
import type { StudioFormState } from "@/lib/custom-character-studio";

type UseCreateCharacterSubmitArgs = {
  draft: CharacterDraftInput;
  form: StudioFormState;
  generatedAvatarUrl: string | null;
  lastAvatarPromptInput: CharacterImagePromptInput | null;
  saving: boolean;
  setActiveStep: (step: StudioStep) => void;
  setBanner: (banner: BannerState) => void;
  setSaving: (value: boolean) => void;
};

function validateForm(form: StudioFormState) {
  if (!form.name.trim()) {
    return { step: "identity" as const, message: "Character name is required." };
  }
  if (!form.age.trim()) {
    return { step: "identity" as const, message: "Age field is required." };
  }
  if (!form.region.trim()) {
    return { step: "identity" as const, message: "Region field is required." };
  }
  if (form.coreVibes.length < 2) {
    return { step: "personality" as const, message: "Pick at least 2 core vibes." };
  }
  if (
    !form.setting.trim() ||
    !form.relationshipToUser.trim() ||
    !form.sceneGoal.trim()
  ) {
    return {
      step: "scenario" as const,
      message: "Setting, relationship, and scene goal are required.",
    };
  }

  return null;
}

export function useCreateCharacterSubmit({
  draft,
  form,
  generatedAvatarUrl,
  lastAvatarPromptInput,
  saving,
  setActiveStep,
  setBanner,
  setSaving,
}: UseCreateCharacterSubmitArgs) {
  const router = useRouter();

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (saving) return;

      const validation = validateForm(form);
      if (validation) {
        setBanner({ type: "error", message: validation.message });
        setActiveStep(validation.step);
        return;
      }

      setSaving(true);
      setBanner(null);

      try {
        if (!generatedAvatarUrl || !lastAvatarPromptInput) {
          throw new Error("Generate the avatar first before creating this character.");
        }

        const created = await finalizeMyCustomCharacterCreation({
          draft,
          imageUrl: generatedAvatarUrl,
        });

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
    },
    [
      draft,
      form,
      generatedAvatarUrl,
      lastAvatarPromptInput,
      router,
      saving,
      setActiveStep,
      setBanner,
      setSaving,
    ],
  );

  return { handleSubmit };
}
