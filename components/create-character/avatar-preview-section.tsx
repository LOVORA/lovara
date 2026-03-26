import Image from "next/image";
import { Section, StatPill } from "@/components/create-character/studio-primitives";

type AvatarPreviewSectionProps = {
  avatarGenerating: boolean;
  avatarQueuedExternalJobId: string | null;
  avatarResultMessage: string | null;
  avatarStatusLabel: string;
  canGenerateAvatar: boolean;
  generatedAvatarUrl: string | null;
  onGenerateAvatar: () => void;
};

export function AvatarPreviewSection({
  avatarGenerating,
  avatarQueuedExternalJobId,
  avatarResultMessage,
  avatarStatusLabel,
  canGenerateAvatar,
  generatedAvatarUrl,
  onGenerateAvatar,
}: AvatarPreviewSectionProps) {
  return (
    <Section
      title="Avatar image"
      description="Generate a realistic original character image before saving. If it feels right, it attaches automatically after character creation."
      accent="cyan"
    >
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="flex items-center">
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
              Image provider: Runware
            </div>
          </div>

          <button
            type="button"
            onClick={onGenerateAvatar}
            disabled={avatarGenerating || !canGenerateAvatar}
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {avatarGenerating ? "Generating image..." : "Generate image"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatPill label="Avatar status" value={avatarStatusLabel} />
          <StatPill label="Provider" value="Runware" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/65">
          This image flow is only for original adult fictional characters.
          Real people, public figures, franchise characters, anime-style mimic
          requests, minors, and unsafe scenarios are blocked automatically.
        </div>

        {avatarResultMessage ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            {avatarResultMessage}
            {avatarQueuedExternalJobId
              ? ` External job: ${avatarQueuedExternalJobId}`
              : ""}
          </div>
        ) : null}

        {generatedAvatarUrl ? (
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(3,10,19,0.9))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_90px_rgba(0,0,0,0.28)]">
            <div className="relative grid min-h-[clamp(380px,58vh,560px)] place-items-center overflow-hidden rounded-[22px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.34))] px-3 py-4">
              <Image
                src={generatedAvatarUrl}
                alt="Generated avatar image"
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-contain object-center p-2 drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(3,10,19,0.78))] p-8 text-sm text-white/45">
            {avatarQueuedExternalJobId
              ? "The image job is running. The result will appear here automatically when it is ready."
              : "No image yet. Add the basic identity first, then generate one."}
          </div>
        )}
      </div>
    </Section>
  );
}
