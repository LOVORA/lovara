"use client";

import { useEffect, useState } from "react";
import {
  buildStudioAvatarPromptInput,
  buildStudioImagePromptSummary,
} from "@/lib/create-character/studio-builder";
import {
  type AvatarJobLifecycle,
  type BannerState,
  type ProviderJobStatusResponse,
  type StudioStep,
} from "@/lib/create-character/studio-editor";
import { type StudioFormState } from "@/lib/custom-character-studio";
import {
  getDefaultImageProvider,
  requestImageGeneration,
  type CharacterImagePromptInput,
  type CharacterImageSafetyInput,
  type ImageProvider,
} from "@/lib/image-provider";

type UseAvatarGenerationArgs = {
  form: StudioFormState;
  safety: CharacterImageSafetyInput;
  setBanner: (banner: BannerState) => void;
  setActiveStep: (step: StudioStep) => void;
};

export function useAvatarGeneration({
  form,
  safety,
  setBanner,
  setActiveStep,
}: UseAvatarGenerationArgs) {
  const [avatarGenerating, setAvatarGenerating] = useState(false);
  const [avatarProvider] = useState<ImageProvider>(getDefaultImageProvider());
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(
    null,
  );
  const [avatarResultMessage, setAvatarResultMessage] = useState<string | null>(
    null,
  );
  const [avatarQueuedExternalJobId, setAvatarQueuedExternalJobId] = useState<
    string | null
  >(null);
  const [queuedJobProvider, setQueuedJobProvider] =
    useState<ImageProvider | null>(null);
  const [avatarJobStatus, setAvatarJobStatus] =
    useState<AvatarJobLifecycle>("idle");
  const [lastAvatarPromptInput, setLastAvatarPromptInput] =
    useState<CharacterImagePromptInput | null>(null);
  const [lastAvatarResolvedPrompt, setLastAvatarResolvedPrompt] = useState<
    string | null
  >(null);
  const [lastAvatarNegativePrompt, setLastAvatarNegativePrompt] = useState<
    string | null
  >(null);

  function clearAvatarPreview() {
    setGeneratedAvatarUrl(null);
    setAvatarResultMessage(null);
    setAvatarQueuedExternalJobId(null);
    setQueuedJobProvider(null);
    setAvatarJobStatus("idle");
    setLastAvatarPromptInput(null);
    setLastAvatarResolvedPrompt(null);
    setLastAvatarNegativePrompt(null);
  }

  useEffect(() => {
    if (
      avatarQueuedExternalJobId === null ||
      queuedJobProvider === null ||
      generatedAvatarUrl
    ) {
      return;
    }

    const safeExternalJobId: string = avatarQueuedExternalJobId;
    const safeProvider: ImageProvider = queuedJobProvider;
    let cancelled = false;

    async function pollOnce(provider: ImageProvider, externalJobId: string) {
      try {
        const response = await fetch(
          `/api/image/status?provider=${encodeURIComponent(provider)}&jobId=${encodeURIComponent(externalJobId)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | ProviderJobStatusResponse
          | null;

        if (!response.ok) {
          throw new Error(
            payload?.errorMessage ||
              "Could not refresh avatar generation status.",
          );
        }

        if (!payload) {
          throw new Error("Invalid status response from image provider.");
        }

        if (cancelled) return;

        if (!payload.ok) {
          throw new Error(payload.errorMessage || "Avatar polling failed.");
        }

        if (payload.revisedPrompt) {
          setLastAvatarResolvedPrompt(payload.revisedPrompt);
        }

        if (typeof payload.revisedNegativePrompt === "string") {
          setLastAvatarNegativePrompt(payload.revisedNegativePrompt);
        }

        if (payload.status === "queued") {
          setAvatarJobStatus("queued");
          setAvatarResultMessage(
            "Avatar request is queued. Waiting for provider response...",
          );
          return;
        }

        if (payload.status === "processing") {
          setAvatarJobStatus("processing");
          setAvatarResultMessage(
            "Avatar is being generated. Preview will appear automatically.",
          );
          return;
        }

        if (payload.status === "completed") {
          setAvatarJobStatus("completed");

          if (payload.imageUrl) {
            setGeneratedAvatarUrl(payload.imageUrl);
            setAvatarQueuedExternalJobId(null);
            setQueuedJobProvider(null);
            setAvatarResultMessage("Avatar preview generated successfully.");
            setBanner({
              type: "success",
              message:
                "Avatar preview is ready. It will be attached when you create the character.",
            });
            return;
          }

          setAvatarQueuedExternalJobId(null);
          setQueuedJobProvider(null);
          setAvatarResultMessage(
            "Generation completed, but no preview image URL was returned.",
          );
          setBanner({
            type: "error",
            message:
              "The provider completed the job without returning a preview image.",
          });
          return;
        }

        if (payload.status === "failed") {
          setAvatarJobStatus("failed");
          setAvatarQueuedExternalJobId(null);
          setQueuedJobProvider(null);
          setAvatarResultMessage(null);
          setBanner({
            type: "error",
            message:
              payload.errorMessage ||
              "Avatar generation failed at the provider.",
          });
        }
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "Could not refresh avatar status.";

        setBanner({
          type: "error",
          message,
        });
      }
    }

    void pollOnce(safeProvider, safeExternalJobId);

    const intervalId = window.setInterval(() => {
      void pollOnce(safeProvider, safeExternalJobId);
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [avatarQueuedExternalJobId, generatedAvatarUrl, queuedJobProvider, setBanner]);

  async function handleGenerateAvatar() {
    if (avatarGenerating) return;

    if (!form.name.trim()) {
      setBanner({
        type: "error",
        message: "Set a character name before generating an avatar.",
      });
      setActiveStep("identity");
      return;
    }

    if (!form.age.trim() || !form.region.trim()) {
      setBanner({
        type: "error",
        message: "Age and region are required before generating an avatar.",
      });
      setActiveStep("identity");
      return;
    }

    setAvatarGenerating(true);
    setAvatarResultMessage(null);
    setAvatarQueuedExternalJobId(null);
    setQueuedJobProvider(null);
    setAvatarJobStatus("idle");

    try {
      const promptInput = buildStudioAvatarPromptInput({
        mode: form.mode,
        name: form.name,
        age: form.age,
        region: form.region,
        archetype: form.archetype,
        genderPresentation: form.genderPresentation,
        visibility: form.visibility,
        coreVibes: form.coreVibes,
        warmth: form.warmth,
        assertiveness: form.assertiveness,
        mystery: form.mystery,
        playfulness: form.playfulness,
        tone: form.tone,
        setting: form.setting,
        relationshipToUser: form.relationshipToUser,
        sceneGoal: form.sceneGoal,
        customNotes: form.customNotes,
      });
      const promptSummary = buildStudioImagePromptSummary(promptInput);

      const result = await requestImageGeneration({
        provider: avatarProvider,
        kind: "avatar",
        characterId: `draft-${(form.name || "character")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")}`,
        promptInput,
        safety,
      });

      if (!result.ok) {
        throw new Error(result.errorMessage || "Avatar generation failed.");
      }

      setLastAvatarPromptInput(promptInput);
      setLastAvatarResolvedPrompt(
        result.revisedPrompt ??
          promptSummary.promptEngineOutput.canonicalPrompt ??
          null,
      );
      setLastAvatarNegativePrompt(
        result.revisedNegativePrompt ??
          promptSummary.promptEngineOutput.negativePrompt ??
          null,
      );

      if (result.imageUrl) {
        setGeneratedAvatarUrl(result.imageUrl);
        setAvatarJobStatus("completed");
        setAvatarResultMessage("Avatar preview generated successfully.");
        setBanner({
          type: "success",
          message:
            "Avatar preview generated. It will be attached when you create the character.",
        });
        return;
      }

      if (result.externalJobId) {
        setAvatarQueuedExternalJobId(result.externalJobId);
        setQueuedJobProvider(avatarProvider);
        setGeneratedAvatarUrl(null);
        setAvatarJobStatus("queued");
        setAvatarResultMessage(
          "Generation request was accepted and queued by the provider.",
        );
        setBanner({
          type: "success",
          message:
            "Avatar request queued successfully. The preview will refresh automatically when it is ready.",
        });
        return;
      }

      setAvatarResultMessage(
        "Generation completed without a preview URL from the provider.",
      );
      setAvatarJobStatus("failed");
      setBanner({
        type: "error",
        message: "Runware did not return a preview image. Try again.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not generate avatar.";

      setAvatarResultMessage(null);
      setGeneratedAvatarUrl(null);
      setAvatarQueuedExternalJobId(null);
      setQueuedJobProvider(null);
      setAvatarJobStatus("failed");
      setBanner({
        type: "error",
        message,
      });
    } finally {
      setAvatarGenerating(false);
    }
  }

  return {
    avatarGenerating,
    avatarJobStatus,
    avatarProvider,
    avatarQueuedExternalJobId,
    avatarResultMessage,
    clearAvatarPreview,
    generatedAvatarUrl,
    handleGenerateAvatar,
    lastAvatarNegativePrompt,
    lastAvatarPromptInput,
    lastAvatarResolvedPrompt,
  };
}
