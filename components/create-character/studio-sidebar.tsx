import Image from "next/image";
import { type CharacterDraftInput } from "@/lib/account";
import {
  DividerLabel,
  ProgressBar,
  Section,
} from "@/components/create-character/studio-primitives";

const QUICK_MODE_FEATURES = [
  "Name",
  "Age",
  "Region",
  "Hobbies / interests",
  "Basic traits",
  "Short scenario",
  "Publish visibility",
  "Avatar preview generation",
  "Avatar queue polling",
  "Builder-v2 metadata enrichment",
] as const;

const DEEP_MODE_FEATURES = [
  "Relationship stage",
  "Jealousy / attachment / protectiveness",
  "Conversation initiative",
  "Affection style",
  "Conflict style",
  "Emotional availability",
  "Message format + linguistic flavor",
  "Reply objective + scene focus",
  "Forbidden behaviors",
  "Chemistry template",
  "Current energy / status",
  "Public card customization",
  "First-message variants preview",
  "Visual lab prep",
  "Skin tone / makeup / accessories / lighting",
  "Avatar preview generation",
  "Avatar queue polling",
  "Builder-v2 prompt summary + canonical prompt",
] as const;

type StudioSidebarProps = {
  ageToneLabel: string;
  ageValue: number;
  canonicalPrompt: string;
  draft: CharacterDraftInput;
  dynamicSummary: string;
  firstReplyCold: string;
  firstReplyFlirty: string;
  firstReplySoft: string;
  generatedAvatarUrl: string | null;
  greeting: string;
  identitySummary: string[];
  imagePrompt: string;
  isQuickMode: boolean;
  memoryAnchorPreview: string[];
  negativePrompt: string;
  openingBeat: string;
  openingSummary: string;
  previewMessage: string;
  promptSummary: string;
  publicTagline: string;
  publicTagsList: string[];
  publicTeaser: string;
  readinessScore: number;
  selectedTemplateTitle: string | null;
  validationIssues: string[];
  visualSummary: string;
  visualTags: string[];
};

export function StudioSidebar({
  ageToneLabel,
  ageValue,
  canonicalPrompt,
  draft,
  dynamicSummary,
  firstReplyCold,
  firstReplyFlirty,
  firstReplySoft,
  generatedAvatarUrl,
  greeting,
  identitySummary,
  imagePrompt,
  isQuickMode,
  memoryAnchorPreview,
  negativePrompt,
  openingBeat,
  openingSummary,
  previewMessage,
  promptSummary,
  publicTagline,
  publicTagsList,
  publicTeaser,
  readinessScore,
  selectedTemplateTitle,
  validationIssues,
  visualSummary,
  visualTags,
}: StudioSidebarProps) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
      <Section
        title="Live preview"
        description="This is how the character currently reads as you build it."
        accent="fuchsia"
      >
        <div className="rounded-[26px] border border-white/10 bg-gradient-to-br from-black/35 to-black/20 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/80">
              Preview
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
              live
            </div>
          </div>

          <h3 className="mt-3 text-2xl font-semibold text-white">
            {draft.name || "Unnamed Character"}
          </h3>

          <p className="mt-2 text-sm text-white/65">{draft.headline}</p>

          {selectedTemplateTitle ? (
            <div className="mt-3 inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-100">
              Template applied: {selectedTemplateTitle}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            {identitySummary.map((item) => (
              <span
                key={item}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Age and tone
              </div>
              <div className="mt-2 text-sm text-white/75">
                {ageValue} • {ageToneLabel}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Personality feel
              </div>
              <div className="mt-2 text-sm text-white/75">
                {dynamicSummary}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Ready score
              </div>
            <div className="mt-3">
              <ProgressBar value={readinessScore} />
            </div>
          </div>

          <DividerLabel label="Prompt preview" />
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
              Prompt summary
            </div>
            <p className="mt-2 text-sm leading-7 text-white/75">
              {promptSummary || "No prompt summary yet."}
            </p>

            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/35">
              Main prompt
            </div>
            <p className="mt-2 max-h-40 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/70">
              {canonicalPrompt}
            </p>

            <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/35">
              Things to avoid
            </div>
            <p className="mt-2 max-h-32 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-6 text-white/70">
              {negativePrompt}
            </p>
          </div>

          <DividerLabel label="Avatar preview" />
          <div className="mt-4 rounded-[24px] border border-white/10 bg-gradient-to-br from-fuchsia-400/10 via-white/[0.02] to-cyan-400/10 p-4">
            {generatedAvatarUrl ? (
              <div className="relative h-[340px] w-full overflow-hidden rounded-[20px]">
                <Image
                  src={generatedAvatarUrl}
                  alt="Avatar preview"
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 32vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-[110px_1fr] gap-4">
                <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br from-fuchsia-500/25 via-slate-800 to-cyan-500/25">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_35%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.08),transparent_30%)]" />
                  <div className="absolute left-1/2 top-5 h-16 w-16 -translate-x-1/2 rounded-full border border-white/15 bg-white/10" />
                  <div className="absolute bottom-4 left-1/2 h-24 w-24 -translate-x-1/2 rounded-[20px] border border-white/10 bg-white/5" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-white/80">
                    {visualSummary || "Visual details are still simple"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visualTags.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isQuickMode && imagePrompt ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Image notes
              </div>
              <p className="mt-3 text-sm leading-7 text-white/75">
                {imagePrompt}
              </p>
            </div>
          ) : null}

          {memoryAnchorPreview.length > 0 ? (
            <>
              <DividerLabel label="Memory anchors" />
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mt-3 flex flex-wrap gap-2">
                  {memoryAnchorPreview.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <DividerLabel label="First message ideas" />
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Softer
              </div>
              <p className="mt-2 text-sm leading-7 text-white/75">
                {firstReplySoft}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Flirtier
              </div>
              <p className="mt-2 text-sm leading-7 text-white/75">
                {firstReplyFlirty}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Colder
              </div>
              <p className="mt-2 text-sm leading-7 text-white/75">
                {firstReplyCold}
              </p>
            </div>
          </div>

          {!isQuickMode &&
          (publicTagline || publicTeaser || publicTagsList.length > 0) ? (
            <>
              <DividerLabel label="Public showcase" />
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                {publicTagline ? (
                  <div className="text-base font-medium text-white">
                    {publicTagline}
                  </div>
                ) : null}
                {publicTeaser ? (
                  <p className="mt-2 text-sm leading-7 text-white/70">
                    {publicTeaser}
                  </p>
                ) : null}
                {publicTagsList.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {publicTagsList.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          <DividerLabel label="Draft output" />
          <div className="mt-5 space-y-4 text-sm text-white/75">
            <div>
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                Description
              </div>
              <p>{draft.description}</p>
            </div>

            <div>
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                Opening summary
              </div>
              <p>{openingSummary}</p>
            </div>

            <div>
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                Opening beat
              </div>
              <p>{openingBeat}</p>
            </div>

            <div>
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                Greeting
              </div>
              <p>{greeting}</p>
            </div>

            <div>
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                Preview message
              </div>
              <p>{previewMessage}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Quality checks"
        description="These are the remaining things that affect output strength."
      >
        {validationIssues.length === 0 ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            Everything important is in place.
          </div>
        ) : (
          <div className="space-y-2">
            {validationIssues.map((issue) => (
              <div
                key={issue}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/72"
              >
                {issue}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="What this final version includes"
        description={
          isQuickMode
            ? "Quick Mode keeps only the essentials visible."
            : "Deep Studio includes the most important advanced controls."
        }
      >
        <ul className="space-y-3 text-sm text-white/68">
          {(isQuickMode ? QUICK_MODE_FEATURES : DEEP_MODE_FEATURES).map(
            (item) => (
              <li key={item}>• {item}</li>
            ),
          )}
        </ul>
      </Section>
    </aside>
  );
}
