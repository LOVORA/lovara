"use client";

import Image from "next/image";
import Link from "next/link";
import type { CharacterImagePromptInput } from "@/lib/image-generation/types";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clean(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function buildAnchorChips(promptInput?: CharacterImagePromptInput) {
  if (!promptInput) return [];

  return [
    clean(promptInput.outfit),
    clean(promptInput.lightingMood),
    clean(promptInput.camera),
    clean(promptInput.environment),
  ].filter(Boolean).slice(0, 4);
}

export function GenerateCharacterPhotoPanel({
  characterName,
  baseImageUrl,
  promptInput,
  collectionHref = "/collection",
  generationLocked = false,
  lockedTitle = "Photo generation unavailable",
  lockedDescription = "New photos are not available for this character right now.",
  lockedCtaHref,
  lockedCtaLabel = "Open create",
  studioHref,
}: {
  characterId: string;
  characterName: string;
  baseImageUrl: string | null;
  promptInput?: CharacterImagePromptInput;
  collectionHref?: string;
  onGenerated?: (imageUrl: string) => void;
  generationLocked?: boolean;
  lockedTitle?: string;
  lockedDescription?: string;
  lockedCtaHref?: string | null;
  lockedCtaLabel?: string;
  studioHref?: string | null;
}) {
  const anchorChips = buildAnchorChips(promptInput);

  if (generationLocked) {
    return (
      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="relative border-b border-white/10 p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.14),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-rose-100">
                Photo archive
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                {lockedTitle}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/62">
                {lockedDescription}
              </p>
            </div>
            <Link
              href={collectionHref}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
            >
              Open Collection
            </Link>
          </div>
        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/20">
            <div className="relative h-[360px] w-full">
              {baseImageUrl ? (
                <Image
                  src={baseImageUrl}
                  alt={`${characterName} saved avatar`}
                  fill
                  unoptimized
                  className="object-contain bg-black/30 object-center"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                  <div className="text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-2xl font-semibold text-white/85">
                      {characterName.slice(0, 1)}
                    </div>
                    <div className="mt-4 text-sm text-white/52">Saved avatar</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[26px] border border-rose-400/20 bg-rose-400/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-rose-100/80">
                Frozen legacy flow
              </div>
              <p className="mt-3 text-sm leading-7 text-white/82">
                This character keeps its saved avatar and archived photos, but the old image flow no longer creates new shots.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/72">
                Existing photos stay in Collection.
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/72">
                Saved chats are not affected.
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/72">
                A realistic rebuild creates a new version without overwriting this archive.
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {lockedCtaHref ? (
                <Link
                  href={lockedCtaHref}
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
                >
                  {lockedCtaLabel}
                </Link>
              ) : null}
              <Link
                href={collectionHref}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
              >
                Open saved archive
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="relative border-b border-white/10 p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.14),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-fuchsia-100">
              New photo
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              Open Photo Studio
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/62">
              Build a fresh look for {characterName} by choosing a pose, an outfit, and a room while the same face and identity stay locked.
            </p>
          </div>
          <Link
            href={collectionHref}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
          >
            Open Collection
          </Link>
        </div>
      </div>

      <div className="grid gap-5 p-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/20">
          <div className="relative h-[360px] w-full">
            {baseImageUrl ? (
              <Image
                src={baseImageUrl}
                alt={`${characterName} saved avatar`}
                fill
                unoptimized
                className="object-contain bg-black/30 object-center"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                <div className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-2xl font-semibold text-white/85">
                    {characterName.slice(0, 1)}
                  </div>
                  <div className="mt-4 text-sm text-white/52">Saved avatar</div>
                </div>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.8),transparent_45%)]" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="rounded-[22px] border border-white/10 bg-black/35 p-4 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                  Same character lock
                </div>
                <div className="mt-2 text-sm leading-6 text-white/72">
                  The studio keeps the saved identity stable while you change the scene, outfit, pose, and shot mood.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5">
            <div className="rounded-[22px] border border-white/10 bg-gradient-to-br from-fuchsia-500/20 via-cyan-500/10 to-white/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl">
                  <div className="inline-flex rounded-full border border-white/12 bg-black/25 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/72">
                    Image-only studio
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                    Fast visual builder
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/72">
                    Open a dedicated photo page, pick a pose family, choose an outfit, generate four previews, then save the shot you actually want.
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-right backdrop-blur">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/44">
                    Result
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    Simple choices, better shots
                  </div>
                  <div className="mt-1 text-sm text-white/60">
                    No hidden prompt work for the customer
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Pose
              </div>
              <div className="mt-2 text-sm leading-6 text-white/72">
                Choose a pose family without changing who the character is.
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Outfit and room
              </div>
              <div className="mt-2 text-sm leading-6 text-white/72">
                Swap styling and background while the face and silhouette stay locked.
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
                Four-shot preview
              </div>
              <div className="mt-2 text-sm leading-6 text-white/72">
                Compare four candidates first, then save only the one that feels right.
              </div>
            </div>
          </div>

          {anchorChips.length > 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                Current visual anchors
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {anchorChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/74"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={studioHref || collectionHref}
              className={cn(
                "rounded-full bg-white px-5 py-3 text-sm font-medium text-black shadow-[0_18px_50px_rgba(255,255,255,0.12)] transition hover:opacity-90",
                !studioHref && "pointer-events-none opacity-60",
              )}
            >
              Open Photo Studio
            </Link>
            <div className="text-sm text-white/50">
              Uses the saved avatar as the identity anchor for every new preview set.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
