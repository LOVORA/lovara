import {
  InputField,
  Section,
  SegmentButton,
  TextAreaField,
} from "@/components/create-character/studio-primitives";
import { type StudioFormState } from "@/lib/custom-character-studio";

type PublishSetupSectionProps = {
  isQuickMode: boolean;
  publicTagline: string;
  publicTags: string;
  publicTeaser: string;
  visibility: StudioFormState["visibility"];
  onPublicTaglineChange: (value: string) => void;
  onPublicTagsChange: (value: string) => void;
  onPublicTeaserChange: (value: string) => void;
  onVisibilityChange: (value: StudioFormState["visibility"]) => void;
};

export function PublishSetupSection({
  isQuickMode,
  publicTagline,
  publicTags,
  publicTeaser,
  visibility,
  onPublicTaglineChange,
  onPublicTagsChange,
  onPublicTeaserChange,
  onVisibilityChange,
}: PublishSetupSectionProps) {
  return (
    <Section
      title="Publish setup"
      description="Decide how this character should live inside your system."
      accent="fuchsia"
    >
      <div className="grid gap-5">
        <div>
          <div className="mb-2 text-sm text-white/75">Visibility</div>
          <div className="flex flex-wrap gap-3">
            <SegmentButton
              active={visibility === "private"}
              onClick={() => onVisibilityChange("private")}
            >
              Private
            </SegmentButton>
            <SegmentButton
              active={visibility === "public"}
              onClick={() => onVisibilityChange("public")}
            >
              Public
            </SegmentButton>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Private characters stay in your vault only. Public characters keep
            the same internal structure but can be shared on a public page.
          </p>
        </div>

        {!isQuickMode ? (
          <div className="grid gap-4">
            <InputField
              label="Public tagline"
              value={publicTagline}
              onChange={onPublicTaglineChange}
              placeholder="Elegant, emotionally unreadable, impossible to forget."
            />
            <TextAreaField
              label="Public teaser"
              value={publicTeaser}
              onChange={onPublicTeaserChange}
              placeholder="A luxurious slow-burn character with controlled warmth, dangerous softness, and selective honesty."
              rows={3}
            />
            <InputField
              label="Public tags"
              value={publicTags}
              onChange={onPublicTagsChange}
              placeholder="slow burn, elegant, dangerous, luxury"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-white/60">
            Quick Mode keeps publish settings minimal on purpose. You still keep
            full payload compatibility, public/private control, and can deepen
            the character later without rebuilding it.
          </div>
        )}
      </div>
    </Section>
  );
}
