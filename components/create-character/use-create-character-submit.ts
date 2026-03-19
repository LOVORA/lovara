"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createMyCustomCharacter,
  type CharacterDraftInput,
} from "@/lib/account";
import type { CharacterImageSafetyInput, CharacterImagePromptInput, ImageProvider } from "@/lib/image-provider";
import { requestImageGeneration } from "@/lib/image-provider";
import type { BannerState, StudioStep } from "@/lib/create-character/studio-editor";
import type { StudioFormState } from "@/lib/custom-character-studio";

type UseCreateCharacterSubmitArgs = {
  avatarProvider: ImageProvider;
  avatarSafetyInput: CharacterImageSafetyInput;
  draft: CharacterDraftInput;
  form: StudioFormState;
  generatedAvatarUrl: string | null;
  lastAvatarNegativePrompt: string | null;
  lastAvatarPromptInput: CharacterImagePromptInput | null;
  lastAvatarResolvedPrompt: string | null;
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
  avatarProvider,
  avatarSafetyInput,
  draft,
  form,
  generatedAvatarUrl,
  lastAvatarNegativePrompt,
  lastAvatarPromptInput,
  lastAvatarResolvedPrompt,
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
        const created = await createMyCustomCharacter(draft);

        if (generatedAvatarUrl && lastAvatarPromptInput) {
          try {
            await requestImageGeneration({
              provider: avatarProvider,
              kind: "avatar",
              characterId: created.id,
              userId: created.user_id,
              promptInput: lastAvatarPromptInput,
              safety: avatarSafetyInput,
              previewImageUrl: generatedAvatarUrl,
              previewResolvedPrompt: lastAvatarResolvedPrompt,
              previewNegativePrompt: lastAvatarNegativePrompt,
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
    },
    [
      avatarProvider,
      avatarSafetyInput,
      draft,
      form,
      generatedAvatarUrl,
      lastAvatarNegativePrompt,
      lastAvatarPromptInput,
      lastAvatarResolvedPrompt,
      router,
      saving,
      setActiveStep,
      setBanner,
      setSaving,
    ],
  );

  return { handleSubmit };
}
