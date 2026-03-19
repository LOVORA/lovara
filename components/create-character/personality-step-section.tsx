import {
  CORE_VIBE_OPTIONS,
  REPLY_LENGTH_OPTIONS,
  RELATIONSHIP_PACE_OPTIONS,
  SPEECH_STYLE_OPTIONS,
  type CoreVibeId,
  type StudioFormState,
} from "@/lib/custom-character-studio";
import {
  CURRENT_ENERGY_OPTIONS,
  INTEREST_ANCHOR_OPTIONS,
  LINGUISTIC_FLAVOR_OPTIONS,
  MESSAGE_FORMAT_OPTIONS,
  VISUAL_AURA_OPTIONS,
} from "@/lib/create-character/studio-editor";
import {
  MiniChip,
  Section,
  SelectField,
  SliderField,
  VibeChip,
  InputField,
} from "@/components/create-character/studio-primitives";
import type {
  RebuildCustomNotes,
  SetStudioField,
} from "@/components/create-character/studio-step-types";

type PersonalityStepSectionProps = {
  currentEnergy: string;
  dynamicSummary: string;
  dynamism: number;
  form: StudioFormState;
  isQuickMode: boolean;
  linguisticFlavor: string;
  messageFormat: string;
  selectedInterests: string[];
  visualNote: string;
  onFieldChange: SetStudioField;
  onRebuildCustomNotes: RebuildCustomNotes;
  onSetDynamism: (value: number) => void;
  onToggleCoreVibe: (id: CoreVibeId) => void;
  onToggleInterest: (item: string) => void;
};

export function PersonalityStepSection({
  currentEnergy,
  dynamicSummary,
  dynamism,
  form,
  isQuickMode,
  linguisticFlavor,
  messageFormat,
  selectedInterests,
  visualNote,
  onFieldChange,
  onRebuildCustomNotes,
  onSetDynamism,
  onToggleCoreVibe,
  onToggleInterest,
}: PersonalityStepSectionProps) {
  if (isQuickMode) {
    return (
      <>
        <Section
          title="Hobbies and interests"
          description="Pick a few things that make the character feel alive."
        >
          <div className="flex flex-wrap gap-2">
            {INTEREST_ANCHOR_OPTIONS.map((option) => (
              <MiniChip
                key={option}
                label={option}
                active={selectedInterests.includes(option)}
                onClick={() => onToggleInterest(option)}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Basic personality"
          description="Simple controls for a fast but strong personality setup."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {CORE_VIBE_OPTIONS.map((option) => (
              <VibeChip
                key={option.id}
                active={form.coreVibes.includes(option.id)}
                label={option.label}
                description={option.description}
                onClick={() => onToggleCoreVibe(option.id)}
              />
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SliderField
              label="Warmth"
              value={form.warmth}
              onChange={(value) => onFieldChange("warmth", value)}
            />
            <SliderField
              label="Assertiveness"
              value={form.assertiveness}
              onChange={(value) => onFieldChange("assertiveness", value)}
            />
            <SliderField
              label="Mystery"
              value={form.mystery}
              onChange={(value) => onFieldChange("mystery", value)}
            />
            <SliderField
              label="Playfulness"
              value={form.playfulness}
              onChange={(value) => onFieldChange("playfulness", value)}
            />
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <Section
        title="Visual aura"
        description="Fantasy texture, vibe, and visual identity."
      >
        <div className="flex flex-wrap gap-2">
          {VISUAL_AURA_OPTIONS.map((option) => (
            <MiniChip
              key={option}
              label={option}
              active={visualNote === option}
              onClick={() =>
                onRebuildCustomNotes({
                  "Visual aura": visualNote === option ? "" : option,
                })
              }
            />
          ))}
        </div>

        <div className="mt-4">
          <InputField
            label="Custom visual aura (optional)"
            value={visualNote}
            onChange={(value) => onRebuildCustomNotes({ "Visual aura": value })}
            placeholder="sharp cheekbones, understated luxury, dangerous sleepy eyes, etc."
          />
        </div>
      </Section>

      <Section
        title="Interest anchors"
        description="Lifestyle signals that make the character feel more lived-in."
      >
        <div className="flex flex-wrap gap-2">
          {INTEREST_ANCHOR_OPTIONS.map((option) => (
            <MiniChip
              key={option}
              label={option}
              active={selectedInterests.includes(option)}
              onClick={() => onToggleInterest(option)}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Trait algorithm"
        description="Pick 2-4 strong vibes. The builder converts them into a deeper hidden prompt system."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {CORE_VIBE_OPTIONS.map((option) => (
            <VibeChip
              key={option.id}
              active={form.coreVibes.includes(option.id)}
              label={option.label}
              description={option.description}
              onClick={() => onToggleCoreVibe(option.id)}
            />
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-white/55">
          Current emotional blend: {dynamicSummary}
        </div>
      </Section>

      <Section
        title="Voice and behavior controls"
        description="These tune how the hidden engine expresses the character in chat."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Reply length"
            value={form.replyLength}
            onChange={(value) => onFieldChange("replyLength", value)}
            options={REPLY_LENGTH_OPTIONS}
          />
          <SelectField
            label="Speech style"
            value={form.speechStyle}
            onChange={(value) => onFieldChange("speechStyle", value)}
            options={SPEECH_STYLE_OPTIONS}
          />
          <SelectField
            label="Relationship pace"
            value={form.relationshipPace}
            onChange={(value) => onFieldChange("relationshipPace", value)}
            options={RELATIONSHIP_PACE_OPTIONS}
          />
          <SelectField
            label="Message format"
            value={messageFormat || MESSAGE_FORMAT_OPTIONS[0]}
            onChange={(value) => onRebuildCustomNotes({ "Message format": value })}
            options={MESSAGE_FORMAT_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Linguistic flavor"
            value={linguisticFlavor || LINGUISTIC_FLAVOR_OPTIONS[0]}
            onChange={(value) =>
              onRebuildCustomNotes({ "Linguistic flavor": value })
            }
            options={LINGUISTIC_FLAVOR_OPTIONS.map((value) => ({
              value,
              label: value,
            }))}
          />
          <SelectField
            label="Current energy"
            value={currentEnergy || CURRENT_ENERGY_OPTIONS[0]}
            onChange={(value) => onRebuildCustomNotes({ "Current energy": value })}
            options={CURRENT_ENERGY_OPTIONS.map((value) => ({ value, label: value }))}
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SliderField
            label="Warmth"
            value={form.warmth}
            onChange={(value) => onFieldChange("warmth", value)}
          />
          <SliderField
            label="Assertiveness"
            value={form.assertiveness}
            onChange={(value) => onFieldChange("assertiveness", value)}
          />
          <SliderField
            label="Mystery"
            value={form.mystery}
            onChange={(value) => onFieldChange("mystery", value)}
          />
          <SliderField
            label="Playfulness"
            value={form.playfulness}
            onChange={(value) => onFieldChange("playfulness", value)}
          />
        </div>

        <div className="mt-5">
          <SliderField
            label="Dynamism"
            value={dynamism}
            onChange={onSetDynamism}
            min={0}
            max={100}
          />
        </div>
      </Section>
    </>
  );
}
