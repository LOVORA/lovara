import type { StudioFormState } from "@/lib/custom-character-studio";
import {
  ATTENTION_HOOK_OPTIONS,
  BOUNDARY_OPTIONS,
  REPLY_OBJECTIVE_OPTIONS,
  SCENE_FOCUS_OPTIONS,
  SENSORY_PALETTE_OPTIONS,
} from "@/lib/create-character/studio-editor";
import {
  InputField,
  MiniChip,
  Section,
  SelectField,
  TextAreaField,
} from "@/components/create-character/studio-primitives";
import type {
  RebuildCustomNotes,
  SetStudioField,
} from "@/components/create-character/studio-step-types";

type AdvancedStepSectionProps = {
  bodyNotes: string;
  attentionHook: string;
  exampleMessage: string;
  form: StudioFormState;
  keyMemories: string;
  replyObjective: string;
  responseDirective: string;
  sceneFocus: string;
  selectedBoundaries: string[];
  sensoryPalette: string;
  onFieldChange: SetStudioField;
  onRebuildCustomNotes: RebuildCustomNotes;
  onToggleBoundary: (item: string) => void;
};

export function AdvancedStepSection({
  bodyNotes,
  attentionHook,
  exampleMessage,
  form,
  keyMemories,
  replyObjective,
  responseDirective,
  sceneFocus,
  selectedBoundaries,
  sensoryPalette,
  onFieldChange,
  onRebuildCustomNotes,
  onToggleBoundary,
}: AdvancedStepSectionProps) {
  return (
    <>
      <Section
        title="Response control"
        description="Directive, example style, and stable behavior shaping."
      >
        <div className="grid gap-4">
          <InputField
            label="Response directive"
            value={responseDirective}
            onChange={(value) =>
              onRebuildCustomNotes({ "Response directive": value })
            }
            placeholder="be reserved, emotionally sharp, and use concise flirtation"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Reply objective"
              value={replyObjective || REPLY_OBJECTIVE_OPTIONS[0]}
              onChange={(value) =>
                onRebuildCustomNotes({ "Reply objective": value })
              }
              options={REPLY_OBJECTIVE_OPTIONS.map((value) => ({
                value,
                label: value,
              }))}
            />
            <SelectField
              label="Scene focus"
              value={sceneFocus || SCENE_FOCUS_OPTIONS[0]}
              onChange={(value) => onRebuildCustomNotes({ "Scene focus": value })}
              options={SCENE_FOCUS_OPTIONS.map((value) => ({
                value,
                label: value,
              }))}
            />
            <SelectField
              label="Attention hook"
              value={attentionHook || ATTENTION_HOOK_OPTIONS[0]}
              onChange={(value) =>
                onRebuildCustomNotes({ "Attention hook": value })
              }
              options={ATTENTION_HOOK_OPTIONS.map((value) => ({
                value,
                label: value,
              }))}
            />
            <SelectField
              label="Sensory palette"
              value={sensoryPalette || SENSORY_PALETTE_OPTIONS[0]}
              onChange={(value) =>
                onRebuildCustomNotes({ "Sensory palette": value })
              }
              options={SENSORY_PALETTE_OPTIONS.map((value) => ({
                value,
                label: value,
              }))}
            />
          </div>
          <TextAreaField
            label="Example message"
            value={exampleMessage}
            onChange={(value) =>
              onRebuildCustomNotes({ "Example message": value })
            }
            placeholder='*leans against the doorway, studying you for a second* "You always look like trouble when you go quiet."'
            rows={4}
          />
          <TextAreaField
            label="Key memories"
            value={keyMemories}
            onChange={(value) => onRebuildCustomNotes({ "Key memories": value })}
            placeholder="met the user on a rainy night, remembers their coffee order, notices when they get quiet"
            rows={3}
          />
        </div>
      </Section>

      <Section
        title="Boundaries and forbidden behaviors"
        description="Guardrails so the character stays tasteful and coherent."
      >
        <div className="flex flex-wrap gap-2">
          {BOUNDARY_OPTIONS.map((option) => (
            <MiniChip
              key={option}
              label={option}
              active={selectedBoundaries.includes(option)}
              onClick={() => onToggleBoundary(option)}
            />
          ))}
        </div>
      </Section>

      <Section title="Creator intent" description="Use this for extra nuance.">
        <div className="grid gap-4">
          <InputField
            label="Tags"
            value={form.tags}
            onChange={(value) => onFieldChange("tags", value)}
            placeholder="slow burn, romantic tension, protective, witty"
          />
          <TextAreaField
            label="Custom notes"
            value={bodyNotes}
            onChange={(value) => onRebuildCustomNotes({}, value)}
            placeholder="Keep the character emotionally coherent, observant, and reactive to subtext rather than explaining everything directly."
            rows={5}
          />
        </div>
      </Section>
    </>
  );
}
