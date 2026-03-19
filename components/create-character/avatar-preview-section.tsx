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
      title="AI avatar preview"
      description="Generate a preview now to see the look before saving. If it looks right, it attaches automatically after character creation."
      accent="cyan"
    >
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="flex items-center">
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
              Provider: Runware
            </div>
          </div>

          <button
            type="button"
            onClick={onGenerateAvatar}
            disabled={avatarGenerating || !canGenerateAvatar}
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {avatarGenerating ? "Generating preview..." : "Generate preview"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatPill label="Avatar status" value={avatarStatusLabel} />
          <StatPill label="Provider" value="Runware" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/65">
          This preview is only for adult fictional characters. Real people,
          public figures, minors, and unsafe scenarios are blocked automatically.
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
          <div className="relative h-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
            <Image
              src={generatedAvatarUrl}
              alt="Generated avatar preview"
              fill
              unoptimized
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
            {avatarQueuedExternalJobId
              ? "The preview job is running. The image will appear here automatically when ready."
              : "No preview yet. Add the basic identity first, then generate one."}
          </div>
        )}
      </div>
    </Section>
  );
}
