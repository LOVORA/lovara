"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DEFAULT_CHARACTER_IMAGE_SAFETY } from "@/lib/character-image-prompt-input";
import {
  getDefaultImageProvider,
  requestImageGeneration,
} from "@/lib/image-provider";
import {
  getEnvironmentPresets,
  getOutfitPresetsForCategory,
  getPosePresetsForCategory,
} from "@/lib/photo-studio/presets";
import {
  buildImageStudioInitialState,
  resolveStudioSelection,
} from "@/lib/photo-studio/resolver";
import { supabase } from "@/lib/supabase";
import type {
  ImageStudioFormState,
  PhotoOutfitPreset,
  PhotoPosePreset,
  PhotoStudioCharacterSource,
  PhotoEnvironmentPreset,
  PhotoStudioPreviewCandidate,
  PhotoStudioSelectionCompilerOutput,
} from "@/lib/photo-studio/types";
import { Section } from "@/components/create-character/studio-primitives";

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

type PreviewContext = Pick<
  PhotoStudioSelectionCompilerOutput,
  "selectionVersion" | "shotSummary" | "shotReason" | "previewLabels"
>;

type PreviewLabel = PreviewContext["previewLabels"][number];
type WizardStep = "outfit" | "pose" | "background" | "review";

const FALLBACK_PREVIEW_LABELS: PreviewContext["previewLabels"] = [
  {
    id: "hero",
    title: "Hero frame",
    description: "Lead shot with the strongest overall read.",
  },
  {
    id: "closer_crop",
    title: "Closer crop",
    description: "A tighter composition with a cleaner face read.",
  },
  {
    id: "room_forward",
    title: "Room-forward",
    description: "A wider frame that lets the scene texture speak more.",
  },
  {
    id: "alt_body_line",
    title: "Alt body line",
    description: "A fresh posture with the same locked identity.",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function buildFallbackCandidate(
  imageUrl: string,
  prompt: string | null,
  negativePrompt: string | null,
): PhotoStudioPreviewCandidate {
  return {
    tempId: "preview-selected",
    imageUrl,
    width: null,
    height: null,
    seed: null,
    model: null,
    prompt,
    negativePrompt,
  };
}

function getCandidateById(
  candidates: PhotoStudioPreviewCandidate[],
  candidateId: string | null,
) {
  if (!candidateId) return candidates[0] ?? null;
  return (
    candidates.find((candidate) => candidate.tempId === candidateId) ??
    candidates[0] ??
    null
  );
}

function getPreviewLabel(context: PreviewContext | null, index: number): PreviewLabel {
  return context?.previewLabels[index] ?? FALLBACK_PREVIEW_LABELS[index] ?? FALLBACK_PREVIEW_LABELS[0];
}

function getGenerateCtaLabel({
  isGenerating,
  isPreviewStale,
  hasPreviewSet,
}: {
  isGenerating: boolean;
  isPreviewStale: boolean;
  hasPreviewSet: boolean;
}) {
  if (isGenerating) return "Creating previews...";
  if (isPreviewStale) return "Refresh previews";
  if (hasPreviewSet) return "Generate again";
  return "Generate";
}

function StudioVisualCard({
  active,
  title,
  description,
  badge,
  kind,
  thumbnailSrc,
  thumbnailAlt,
  thumbnailFocus,
  thumbnailStyle,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  badge: string;
  kind: "pose" | "outfit";
  thumbnailSrc: string;
  thumbnailAlt: string;
  thumbnailFocus?: string;
  thumbnailStyle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group overflow-hidden rounded-[26px] border text-left transition duration-200",
        active
          ? "border-cyan-300/40 bg-cyan-400/10 shadow-[0_22px_60px_rgba(34,211,238,0.14)]"
          : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_22px_60px_rgba(0,0,0,0.24)]",
      )}
    >
      <div className={cn("relative h-44 w-full overflow-hidden bg-gradient-to-br", thumbnailStyle)}>
        <Image
          src={thumbnailSrc}
          alt={thumbnailAlt}
          fill
          unoptimized
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
          style={{ objectPosition: thumbnailFocus ?? "center" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_24%),linear-gradient(to_top,rgba(5,8,22,0.78),transparent_48%)]" />
        <div className="absolute left-3 top-3 rounded-full border border-white/12 bg-black/35 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/72 backdrop-blur">
          {kind}
        </div>
        <div className="absolute bottom-3 left-3 rounded-full border border-white/12 bg-black/35 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/78 backdrop-blur">
          {badge}
        </div>
        {active ? (
          <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/15 text-sm text-cyan-100 backdrop-blur">
            ✓
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="mt-2 text-sm leading-6 text-white/58">{description}</div>
      </div>
    </button>
  );
}

function SummaryChip({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/42">{label}</div>
      <div className="mt-2 text-sm text-white/78">{value}</div>
    </div>
  );
}

function ChoiceButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[24px] border p-5 text-left transition",
        active
          ? "border-cyan-300/40 bg-cyan-400/10 shadow-[0_22px_60px_rgba(34,211,238,0.14)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-medium text-white">{title}</div>
          <div className="mt-2 text-sm leading-6 text-white/58">{description}</div>
        </div>
        {active ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/15 text-sm text-cyan-100">
            ✓
          </div>
        ) : null}
      </div>
    </button>
  );
}

function getPhysicalSummary(source: PhotoStudioCharacterSource) {
  const input = source.promptInput;
  return [
    { label: "Age", value: input.ageValue ? String(input.ageValue) : input.ageBand ?? null },
    { label: "Region", value: input.region ?? null },
    { label: "Skin Tone", value: input.skinTone ?? null },
    { label: "Hair", value: input.hair ?? null },
    { label: "Body", value: input.bodyType ?? null },
    {
      label: "Bust / Breast",
      value: [input.bustSize, input.breastType].filter(Boolean).join(" / ") || null,
    },
    {
      label: "Butt / Waist / Height",
      value:
        [input.buttSize, input.waistDefinition, input.heightImpression]
          .filter(Boolean)
          .join(" / ") || null,
    },
  ];
}

export function IdentityLockedPhotoStudio({
  source,
}: {
  source: PhotoStudioCharacterSource;
}) {
  const [form, setForm] = useState<ImageStudioFormState>(() =>
    buildImageStudioInitialState({
      input: source.promptInput,
      latestGalleryImageUrl: source.latestGalleryImageUrl,
    }),
  );
  const [currentStep, setCurrentStep] = useState<WizardStep>("outfit");
  const [previewCandidates, setPreviewCandidates] = useState<PhotoStudioPreviewCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [previewResolvedPrompt, setPreviewResolvedPrompt] = useState<string | null>(null);
  const [previewNegativePrompt, setPreviewNegativePrompt] = useState<string | null>(null);
  const [previewContext, setPreviewContext] = useState<PreviewContext | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [latestSavedImageUrl, setLatestSavedImageUrl] = useState<string | null>(null);
  const [latestSavedImageId, setLatestSavedImageId] = useState<string | null>(null);
  const [isDeletingSaved, setIsDeletingSaved] = useState(false);

  const selection = useMemo(
    () =>
      resolveStudioSelection({
        basePromptInput: source.promptInput,
        form,
      }),
    [form, source.promptInput],
  );
  const posePresets = useMemo(
    () => getPosePresetsForCategory("normal"),
    [],
  );
  const outfitPresets = useMemo(
    () => getOutfitPresetsForCategory("normal"),
    [],
  );
  const backgroundPresets = useMemo(() => getEnvironmentPresets(), []);
  const selectedCandidate = useMemo(
    () => getCandidateById(previewCandidates, selectedCandidateId),
    [previewCandidates, selectedCandidateId],
  );
  const heroPreview = useMemo(() => {
    const candidate = selectedCandidate ?? previewCandidates[0] ?? null;
    if (!candidate) return null;
    return {
      candidate,
      label: getPreviewLabel(previewContext, 0),
    };
  }, [previewCandidates, previewContext, selectedCandidate]);
  const isPreviewStale =
    previewCandidates.length > 0 &&
    previewContext?.selectionVersion !== selection.selectionVersion;
  const canGenerate = !isGenerating && !isSaving;
  const canSave =
    Boolean(selectedCandidate?.imageUrl) &&
    !isGenerating &&
    !isSaving &&
    !isPreviewStale;
  const generateCtaLabel = getGenerateCtaLabel({
    isGenerating,
    isPreviewStale,
    hasPreviewSet: previewCandidates.length > 0,
  });
  const physicalSummary = getPhysicalSummary(source);

  function selectOutfitPreset(preset: PhotoOutfitPreset | null) {
    setForm((current) => ({
      ...current,
      studioMode: "normal",
      poseCategory: "normal",
      outfitPreset: preset?.id ?? null,
    }));
    setCurrentStep("pose");
  }

  function selectPosePreset(preset: PhotoPosePreset) {
    setForm((current) => ({
      ...current,
      studioMode: "normal",
      poseCategory: "normal",
      posePreset: preset.id,
    }));
    setCurrentStep("background");
  }

  function selectBackgroundPreset(preset: PhotoEnvironmentPreset) {
    setForm((current) => ({
      ...current,
      backgroundPreset: preset.id,
    }));
    setCurrentStep("review");
  }

  async function requireUserId() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error("You need to sign in before generating new photos.");
    }

    return user.id;
  }

  async function handleGeneratePreview() {
    if (!source.baseImageUrl) {
      setBanner({
        type: "error",
        message: "A stable avatar is needed before creating a new photo set.",
      });
      return;
    }

    setIsGenerating(true);
    setBanner(null);

    try {
      const userId = await requireUserId();
      const result = await requestImageGeneration({
        provider: getDefaultImageProvider(),
        kind: "gallery",
        studioMode: "normal",
        characterId: source.characterId,
        userId,
        promptInput: selection.promptInput,
        safety: DEFAULT_CHARACTER_IMAGE_SAFETY,
        consistencySourceImageUrl: source.baseImageUrl,
        consistencyStrength: "strict",
        candidateCount: 1,
        generationProfile: "identity_locked_gallery",
        qualityTier: "max",
        referenceStrategy: "stacked_character_reference",
        previewOnly: true,
      });

      if (!result.ok) {
        throw new Error(result.errorMessage || "Could not generate preview photos.");
      }

      const candidates =
        result.candidates && result.candidates.length > 0
          ? result.candidates
          : result.imageUrl
            ? [
                buildFallbackCandidate(
                  result.imageUrl,
                  result.revisedPrompt ?? null,
                  result.revisedNegativePrompt ?? null,
                ),
              ]
            : [];

      if (candidates.length === 0) {
        throw new Error("Preview generation finished without any candidates.");
      }

      setPreviewCandidates(candidates);
      setSelectedCandidateId(candidates[0]?.tempId ?? null);
      setPreviewResolvedPrompt(result.revisedPrompt ?? candidates[0]?.prompt ?? null);
      setPreviewNegativePrompt(
        result.revisedNegativePrompt ?? candidates[0]?.negativePrompt ?? null,
      );
      setPreviewContext({
        selectionVersion: selection.selectionVersion,
        shotSummary: selection.shotSummary,
        shotReason: selection.shotReason,
        previewLabels: selection.previewLabels,
      });
      setBanner({
        type: "success",
        message: "Photo is ready.",
      });
    } catch (error) {
      setBanner({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not generate preview photos.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function persistSelectedPhoto() {
    if (!selectedCandidate?.imageUrl) {
      throw new Error("Choose a preview shot before saving.");
    }

    const userId = await requireUserId();
    const result = await requestImageGeneration({
      provider: getDefaultImageProvider(),
      kind: "gallery",
      studioMode: "normal",
      characterId: source.characterId,
      userId,
      promptInput: selection.promptInput,
      safety: DEFAULT_CHARACTER_IMAGE_SAFETY,
      previewImageUrl: selectedCandidate.imageUrl,
      previewResolvedPrompt: selectedCandidate.prompt ?? previewResolvedPrompt,
      previewNegativePrompt: selectedCandidate.negativePrompt ?? previewNegativePrompt,
      generationProfile: "identity_locked_gallery",
      qualityTier: "max",
      referenceStrategy: "stacked_character_reference",
    });

    if (!result.ok || !result.imageUrl) {
      throw new Error(result.errorMessage || "Could not save the selected photo.");
    }

    setLatestSavedImageUrl(result.imageUrl);
    setLatestSavedImageId(result.savedImageId ?? null);
  }

  async function handleSaveSelected() {
    setIsSaving(true);
    setBanner(null);

    try {
      await persistSelectedPhoto();
      setBanner({
        type: "success",
        message: "Saved to Collection.",
      });
    } catch (error) {
      setBanner({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not save the selected photo.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteLatestSaved() {
    if (!latestSavedImageId) return;

    setIsDeletingSaved(true);
    setBanner(null);

    try {
      const response = await fetch("/api/image/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: latestSavedImageId,
          characterId: source.characterId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not delete the saved image.");
      }

      setLatestSavedImageId(null);
      setLatestSavedImageUrl(null);
      setBanner({
        type: "success",
        message: "Deleted from Collection.",
      });
    } catch (error) {
      setBanner({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete the saved image.",
      });
    } finally {
      setIsDeletingSaved(false);
    }
  }

  function goToStep(step: WizardStep) {
    if (step === "review" && !selection.environmentPreset) return;
    setCurrentStep(step);
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-[1480px] px-4 py-6 md:px-6 md:py-8">
        {!source.baseImageUrl ? (
          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
            <div className="mx-auto max-w-2xl">
              <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-amber-100">
                Avatar needed
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                A stable avatar comes first
              </h2>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={source.backHref}
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
                >
                  {source.backLabel}
                </Link>
                <Link
                  href={source.collectionHref}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Open Collection
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.10),rgba(255,255,255,0.04),rgba(34,211,238,0.08))] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.36)] md:p-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.16),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_24%)]" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100">
                      Photo Studio
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                      {source.characterName}
                    </h1>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={source.backHref}
                      className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                    >
                      {source.backLabel}
                    </Link>
                    <Link
                      href={source.collectionHref}
                      className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                    >
                      Open Collection
                    </Link>
                  </div>
                </div>
              </section>

              {banner ? (
                <div
                  className={cn(
                    "rounded-[22px] border px-4 py-3 text-sm leading-6",
                    banner.type === "success"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-100",
                  )}
                >
                  {banner.message}
                </div>
              ) : null}

              <Section title="Build Photo Set" description="Choose outfit, pose, background, then review.">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "outfit", label: "1. Choose Outfit" },
                    { id: "pose", label: "2. Choose Pose" },
                    { id: "background", label: "3. Choose Background" },
                    { id: "review", label: "4. Review & Generate" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goToStep(item.id as WizardStep)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition",
                        currentStep === item.id
                          ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-100"
                          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-6 space-y-6">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-white">Adult Photos</div>
                        <div className="mt-2 text-sm leading-6 text-white/58">
                          Coming soon. This first version focuses on safe fashion and lifestyle photo generation.
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/58">
                        Disabled
                      </div>
                    </div>
                  </div>

                  {currentStep === "outfit" ? (
                    <div className="space-y-4">
                      <ChoiceButton
                        active={selection.outfitPreset === null}
                        title="Use Current Avatar Styling"
                        description="Keep the current avatar outfit for this new photo."
                        onClick={() => selectOutfitPreset(null)}
                      />
                      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        {outfitPresets.map((preset) => (
                          <StudioVisualCard
                            key={preset.id}
                            active={selection.outfitPreset?.id === preset.id}
                            title={preset.title}
                            description={preset.description}
                            badge={preset.outfit}
                            kind="outfit"
                            thumbnailSrc={preset.thumbnailSrc}
                            thumbnailAlt={preset.thumbnailAlt}
                            thumbnailFocus={preset.thumbnailFocus}
                            thumbnailStyle={preset.thumbnailStyle}
                            onClick={() => selectOutfitPreset(preset)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {currentStep === "pose" ? (
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {posePresets.map((preset) => (
                        <StudioVisualCard
                          key={preset.id}
                          active={selection.posePreset.id === preset.id}
                          title={preset.title}
                          description={preset.vibe}
                          badge={preset.shortLabel}
                          kind="pose"
                          thumbnailSrc={preset.thumbnailSrc}
                          thumbnailAlt={preset.thumbnailAlt}
                          thumbnailFocus={preset.thumbnailFocus}
                          thumbnailStyle={preset.thumbnailStyle}
                          onClick={() => selectPosePreset(preset)}
                        />
                      ))}
                    </div>
                  ) : null}

                  {currentStep === "background" ? (
                    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {backgroundPresets.map((preset) => (
                        <StudioVisualCard
                          key={preset.id}
                          active={selection.environmentPreset.id === preset.id}
                          title={preset.title}
                          description={preset.description}
                          badge="background"
                          kind="pose"
                          thumbnailSrc={preset.thumbnailSrc}
                          thumbnailAlt={preset.thumbnailAlt}
                          thumbnailFocus={preset.thumbnailFocus}
                          thumbnailStyle={preset.thumbnailStyle}
                          onClick={() => selectBackgroundPreset(preset)}
                        />
                      ))}
                    </div>
                  ) : null}

                  {currentStep === "review" ? (
                    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/25">
                        <div className="relative h-[320px] w-full">
                          <Image
                            src={source.baseImageUrl}
                            alt={source.characterName}
                            fill
                            unoptimized
                            className="object-contain bg-black/30 object-center"
                          />
                        </div>
                      </div>
                      <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                          Review & Generate
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold text-white">
                          {source.characterName}
                        </h2>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <SummaryChip label="Outfit" value={selection.outfitPreset?.title ?? "Use current avatar styling"} />
                          <SummaryChip label="Pose" value={selection.posePreset.title} />
                          <SummaryChip label="Background" value={selection.backgroundSummary} />
                          <SummaryChip label="Character" value={source.characterName} />
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleGeneratePreview}
                            disabled={!canGenerate}
                            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black shadow-[0_18px_50px_rgba(255,255,255,0.12)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {generateCtaLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentStep("background")}
                            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Section>

              <Section title="Result" description="Generate, save, or delete from the same page.">
                {previewCandidates.length > 0 && heroPreview ? (
                    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
                      <div className="relative h-[420px] w-full md:h-[560px]">
                        <Image
                          src={heroPreview.candidate.imageUrl}
                          alt={`${source.characterName} ${heroPreview.label.title}`}
                          fill
                          unoptimized
                          className="object-contain bg-black/30 object-center"
                        />
                      </div>
                      <div className="border-t border-white/10 p-5">
                        <div className="text-lg font-semibold text-white">
                          {previewContext?.shotSummary ?? selection.shotSummary}
                        </div>
                        <div className="mt-2 text-sm leading-7 text-white/60">
                          {heroPreview.label.description}
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleGeneratePreview}
                            disabled={!canGenerate}
                            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {generateCtaLabel}
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveSelected}
                            disabled={!canSave}
                            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? "Saving to Collection..." : "Save to Collection"}
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteLatestSaved}
                            disabled={!latestSavedImageId || isDeletingSaved}
                            className="rounded-full border border-rose-400/20 bg-rose-400/10 px-5 py-3 text-sm text-rose-100 transition hover:border-rose-400/35 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeletingSaved ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                        {isPreviewStale ? (
                          <div className="mt-4 rounded-[20px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                            Your selections changed. Refresh previews before saving.
                          </div>
                        ) : null}
                      </div>
                    </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm leading-7 text-white/58">
                    No result yet.
                  </div>
                )}
              </Section>
            </div>

            <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
              <Section title="Character" description="Locked avatar and physical summary.">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/25">
                    <div className="relative h-[320px] w-full">
                      <Image
                        src={source.baseImageUrl}
                        alt={source.characterName}
                        fill
                        unoptimized
                        className="object-contain bg-black/30 object-center"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {physicalSummary.map((item) => (
                      <SummaryChip key={item.label} label={item.label} value={item.value} />
                    ))}
                  </div>
                  {latestSavedImageUrl ? (
                    <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-white/42">
                        Latest Saved Image
                      </div>
                      <div className="relative mt-3 h-40 w-full overflow-hidden rounded-[16px] border border-white/10">
                        <Image
                          src={latestSavedImageUrl}
                          alt={`${source.characterName} latest saved`}
                          fill
                          unoptimized
                          className="object-contain bg-black/30 object-center"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </Section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
