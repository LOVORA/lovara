import {
  ProgressBar,
  StatPill,
  StepPill,
  TopNavLink,
} from "@/components/create-character/studio-primitives";
import { type StudioStep } from "@/lib/create-character/studio-editor";

type StudioHeaderStep = {
  complete: boolean;
  id: StudioStep;
  label: string;
};

type StudioShellHeaderProps = {
  activeStep: StudioStep;
  activeStepComplete: boolean;
  hasNextStep: boolean;
  hasPreviousStep: boolean;
  isQuickMode: boolean;
  onApplyRandomTemplate: () => void;
  onGoBack: () => void;
  onGoNext: () => void;
  onGoToStep: (step: StudioStep) => void;
  onResetStudio: () => void;
  readinessScore: number;
  steps: StudioHeaderStep[];
};

export function StudioShellHeader({
  activeStep,
  activeStepComplete,
  hasNextStep,
  hasPreviousStep,
  isQuickMode,
  onApplyRandomTemplate,
  onGoBack,
  onGoNext,
  onGoToStep,
  onResetStudio,
  readinessScore,
  steps,
}: StudioShellHeaderProps) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <TopNavLink href="/" label="Home" />
          <TopNavLink href="/my-characters" label="My Characters" />
          <TopNavLink href="/characters" label="Professional" />
          <TopNavLink href="/community" label="Community" />
          <TopNavLink href="/create-character" label="Create Character" active />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApplyRandomTemplate}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10"
          >
            Pick one for me
          </button>
          <button
            type="button"
            onClick={onResetStudio}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:border-white/20 hover:bg-white/10"
          >
            Start over
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/5 to-cyan-400/10 p-8 shadow-2xl shadow-fuchsia-500/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.15),transparent_25%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-fuchsia-200">
              Character Studio
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
              {isQuickMode
                ? "Build a strong character in a few simple steps"
                : "Build a clear, detailed character people enjoy chatting with"}
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/65 md:text-base">
              {isQuickMode
                ? "Quick mode keeps things simple: name, age, region, traits, and a short scene."
                : "Deep mode gives you more control over relationship style, behavior, public card text, and visual setup."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <StatPill label="Mode" value={isQuickMode ? "Quick" : "Deep"} />
              <StatPill label="Chat" value="Roleplay-first" />
              <StatPill label="Memory" value="Keeps context" />
              <StatPill label="Flow" value="Easy to save" />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                Ready score
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                {readinessScore} / 100
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar value={readinessScore} />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              {isQuickMode ? (
                <>
                  <div>• Minimal friction</div>
                  <div>• Name, traits, and a simple scene</div>
                  <div>• Faster start, cleaner setup</div>
                </>
              ) : (
                <>
                  <div>• Relationship style and chemistry</div>
                  <div>• Behavior, tone, and message style</div>
                  <div>• Public profile text and visual prep</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap gap-2">
          {steps.map((step) => (
            <StepPill
              key={step.id}
              title={step.label}
              active={activeStep === step.id}
              complete={step.complete}
              onClick={() => onGoToStep(step.id)}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-white/60">
            Current section: <span className="text-white/85">{activeStep}</span>{" "}
            • {activeStepComplete ? "ready" : "needs a little more"}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGoBack}
              disabled={!hasPreviousStep}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onGoNext}
              disabled={!hasNextStep}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
