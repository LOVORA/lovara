import type { StudioFormState } from "@/lib/custom-character-studio";
import {
  AFFECTION_STYLE_OPTIONS,
  ARC_STAGE_OPTIONS,
  BEHAVIOR_MODE_OPTIONS,
  CHAT_MODE_OPTIONS,
  CHEMISTRY_TEMPLATE_OPTIONS,
  CONFLICT_STYLE_OPTIONS,
  EMOTIONAL_AVAILABILITY_OPTIONS,
  GREETING_STYLE_OPTIONS,
  INITIATIVE_OPTIONS,
  RELATIONSHIP_DYNAMIC_OPTIONS,
  OPENING_STATE_OPTIONS,
  RELATIONSHIP_PRESETS,
  RELATIONSHIP_STAGE_OPTIONS,
  ROLEPLAY_SCENARIO_TEMPLATES,
  SCENE_GOAL_OPTIONS,
  SCENE_PRESETS,
  SCENE_TYPE_OPTIONS,
  USER_ROLE_OPTIONS_EXTENDED,
} from "@/lib/create-character/studio-editor";
import {
  InputField,
  MiniChip,
  Section,
  SelectField,
  SliderField,
  TextAreaField,
} from "@/components/create-character/studio-primitives";
import type {
  RebuildCustomNotes,
  SetStudioField,
} from "@/components/create-character/studio-step-types";

type ScenarioStepSectionProps = {
  affectionStyle: string;
  attachment: string;
  arcStage: string;
  behaviorMode: string;
  chatMode: string;
  chemistryTemplate: string;
  conflictStyle: string;
  conversationInitiative: string;
  emotionalAvailability: string;
  form: StudioFormState;
  greetingStyle: string;
  isQuickMode: boolean;
  jealousy: string;
  nickname: string;
  protectiveness: string;
  relationshipDynamic: string;
  relationshipStage: string;
  sceneType: string;
  userRole: string;
  onApplyScenePreset: (preset: (typeof SCENE_PRESETS)[number]) => void;
  onFieldChange: SetStudioField;
  onRebuildCustomNotes: RebuildCustomNotes;
};

export function ScenarioStepSection({
  affectionStyle,
  attachment,
  arcStage,
  behaviorMode,
  chatMode,
  chemistryTemplate,
  conflictStyle,
  conversationInitiative,
  emotionalAvailability,
  form,
  greetingStyle,
  isQuickMode,
  jealousy,
  nickname,
  protectiveness,
  relationshipDynamic,
  relationshipStage,
  sceneType,
  userRole,
  onApplyScenePreset,
  onFieldChange,
  onRebuildCustomNotes,
}: ScenarioStepSectionProps) {
  if (isQuickMode) {
    return (
      <Section
        title="Scenario"
        description="Keep it short and clear in Quick Mode."
        accent="fuchsia"
      >
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIP_PRESETS.map((preset) => (
            <MiniChip
              key={preset}
              label={preset}
              active={form.relationshipToUser === preset}
              onClick={() => onFieldChange("relationshipToUser", preset)}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InputField
            label="Setting"
            value={form.setting}
            onChange={(value) => onFieldChange("setting", value)}
            placeholder="late-night rooftop"
          />
          <InputField
            label="Relationship to user"
            value={form.relationshipToUser}
            onChange={(value) => onFieldChange("relationshipToUser", value)}
            placeholder="best friend with tension"
          />
          <InputField
            label="Scene goal"
            value={form.sceneGoal}
            onChange={(value) => onFieldChange("sceneGoal", value)}
            placeholder="build chemistry slowly"
          />
          <InputField
            label="Tone"
            value={form.tone}
            onChange={(value) => onFieldChange("tone", value)}
            placeholder="playful and intimate"
          />
        </div>

        <div className="mt-5">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">
            Ready scenario examples
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {ROLEPLAY_SCENARIO_TEMPLATES.map((template) => (
              <button
                key={template.title}
                type="button"
                onClick={() => {
                  onFieldChange("setting", template.setting);
                  onFieldChange("relationshipToUser", template.relationshipToUser);
                  onFieldChange("sceneGoal", template.sceneGoal);
                  onFieldChange("tone", template.tone);
                  onFieldChange("openingState", template.openingState);
                  onFieldChange("customScenario", template.customScenario);
                }}
                className="rounded-[24px] border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyan-400/25 hover:bg-black/35"
              >
                <div className="text-sm font-medium text-white">{template.title}</div>
                <div className="mt-2 text-xs leading-6 text-white/55">
                  {template.summary}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <TextAreaField
            label="Custom scenario"
            value={form.customScenario}
            onChange={(value) => onFieldChange("customScenario", value)}
            placeholder="Write the moment in plain language. Example: She invites the user into her suite after an event, trying to stay composed while the attraction is obvious."
            rows={5}
          />
        </div>
      </Section>
    );
  }

  return (
    <>
      <Section
        title="Relationship architecture"
        description="Controls the emotional baseline and how the bond behaves."
        accent="fuchsia"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Relationship dynamic"
            value={relationshipDynamic || RELATIONSHIP_DYNAMIC_OPTIONS[0]}
            onChange={(value) =>
              onRebuildCustomNotes({ "Relationship dynamic": value })
            }
            options={RELATIONSHIP_DYNAMIC_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Relationship stage"
            value={relationshipStage || RELATIONSHIP_STAGE_OPTIONS[0]}
            onChange={(value) =>
              onRebuildCustomNotes({ "Relationship stage": value })
            }
            options={RELATIONSHIP_STAGE_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Conversation initiative"
            value={conversationInitiative || INITIATIVE_OPTIONS[1]}
            onChange={(value) =>
              onRebuildCustomNotes({ "Conversation initiative": value })
            }
            options={INITIATIVE_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Behavior mode"
            value={behaviorMode || BEHAVIOR_MODE_OPTIONS[0]}
            onChange={(value) => onRebuildCustomNotes({ "Behavior mode": value })}
            options={BEHAVIOR_MODE_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Affection style"
            value={affectionStyle || AFFECTION_STYLE_OPTIONS[0]}
            onChange={(value) => onRebuildCustomNotes({ "Affection style": value })}
            options={AFFECTION_STYLE_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Conflict style"
            value={conflictStyle || CONFLICT_STYLE_OPTIONS[0]}
            onChange={(value) => onRebuildCustomNotes({ "Conflict style": value })}
            options={CONFLICT_STYLE_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Emotional availability"
            value={emotionalAvailability || EMOTIONAL_AVAILABILITY_OPTIONS[1]}
            onChange={(value) =>
              onRebuildCustomNotes({ "Emotional availability": value })
            }
            options={EMOTIONAL_AVAILABILITY_OPTIONS.map((value) => ({
              value,
              label: value,
            }))}
          />
          <SelectField
            label="Arc stage"
            value={arcStage || ARC_STAGE_OPTIONS[0]}
            onChange={(value) => onRebuildCustomNotes({ "Arc stage": value })}
            options={ARC_STAGE_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Chemistry template"
            value={chemistryTemplate || CHEMISTRY_TEMPLATE_OPTIONS[0]}
            onChange={(value) =>
              onRebuildCustomNotes({ "Chemistry template": value })
            }
            options={CHEMISTRY_TEMPLATE_OPTIONS.map((value) => ({
              value,
              label: value,
            }))}
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SliderField
            label="Jealousy"
            value={Number(jealousy || 42)}
            onChange={(value) => onRebuildCustomNotes({ Jealousy: String(value) })}
          />
          <SliderField
            label="Attachment"
            value={Number(attachment || 58)}
            onChange={(value) =>
              onRebuildCustomNotes({ Attachment: String(value) })
            }
          />
          <SliderField
            label="Protectiveness"
            value={Number(protectiveness || 54)}
            onChange={(value) =>
              onRebuildCustomNotes({ Protectiveness: String(value) })
            }
          />
        </div>
      </Section>

      <Section
        title="User persona framing"
        description="Who is the user in this character's emotional world?"
        accent="fuchsia"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="User role"
            value={userRole || USER_ROLE_OPTIONS_EXTENDED[0]}
            onChange={(value) => onRebuildCustomNotes({ "User role": value })}
            options={USER_ROLE_OPTIONS_EXTENDED.map((value) => ({ value, label: value }))}
          />
          <InputField
            label="Nickname for user (optional)"
            value={nickname}
            onChange={(value) =>
              onRebuildCustomNotes({ "Nickname for user": value })
            }
            placeholder="love, trouble, beautiful, etc."
          />
        </div>
      </Section>

      <Section
        title="Greeting and mode"
        description="First impression and interaction frame."
        accent="cyan"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Scene type"
            value={sceneType || SCENE_TYPE_OPTIONS[0]}
            onChange={(value) => onRebuildCustomNotes({ "Scene type": value })}
            options={SCENE_TYPE_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Greeting style"
            value={greetingStyle || GREETING_STYLE_OPTIONS[0]}
            onChange={(value) =>
              onRebuildCustomNotes({ "Greeting style": value })
            }
            options={GREETING_STYLE_OPTIONS.map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Chat mode / flair"
            value={chatMode || CHAT_MODE_OPTIONS[0]}
            onChange={(value) => onRebuildCustomNotes({ "Chat mode": value })}
            options={CHAT_MODE_OPTIONS.map((value) => ({ value, label: value }))}
          />
        </div>
      </Section>

      <Section
        title="Relationship setup"
        description="Fast ways to define the user-character dynamic."
        accent="fuchsia"
      >
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIP_PRESETS.map((preset) => (
            <MiniChip
              key={preset}
              label={preset}
              active={form.relationshipToUser === preset}
              onClick={() => onFieldChange("relationshipToUser", preset)}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Scene accelerators"
        description="One-click scene foundations for stronger context."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {SCENE_PRESETS.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => onApplyScenePreset(preset)}
              className="rounded-[24px] border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyan-400/25 hover:bg-black/35"
            >
              <div className="text-sm font-medium text-white">
                {preset.title}
              </div>
              <div className="mt-2 text-xs leading-6 text-white/55">
                {preset.setting}
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Roleplay scenario"
        description="These become part of the saved character."
      >
        <div className="mb-5">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">
            Scenario templates
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {ROLEPLAY_SCENARIO_TEMPLATES.map((template) => {
              const active =
                form.setting === template.setting &&
                form.sceneGoal === template.sceneGoal &&
                form.customScenario === template.customScenario;

              return (
                <button
                  key={template.title}
                  type="button"
                  onClick={() => {
                    onFieldChange("setting", template.setting);
                    onFieldChange("relationshipToUser", template.relationshipToUser);
                    onFieldChange("sceneGoal", template.sceneGoal);
                    onFieldChange("tone", template.tone);
                    onFieldChange("openingState", template.openingState);
                    onFieldChange("customScenario", template.customScenario);
                  }}
                  className={
                    active
                      ? "rounded-[24px] border border-fuchsia-400/25 bg-fuchsia-400/10 p-4 text-left transition"
                      : "rounded-[24px] border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyan-400/25 hover:bg-black/35"
                  }
                >
                  <div className="text-sm font-medium text-white">
                    {template.title}
                  </div>
                  <div className="mt-2 text-xs leading-6 text-white/55">
                    {template.summary}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">
            Scene goal starters
          </div>
          <div className="flex flex-wrap gap-2">
            {SCENE_GOAL_OPTIONS.map((option) => (
              <MiniChip
                key={option}
                label={option}
                active={form.sceneGoal === option}
                onClick={() => onFieldChange("sceneGoal", option)}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label="Setting"
            value={form.setting}
            onChange={(value) => onFieldChange("setting", value)}
            placeholder="late-night hospital shift"
          />
          <InputField
            label="Relationship to user"
            value={form.relationshipToUser}
            onChange={(value) => onFieldChange("relationshipToUser", value)}
            placeholder="emotionally guarded co-worker"
          />
          <InputField
            label="Scene goal"
            value={form.sceneGoal}
            onChange={(value) => onFieldChange("sceneGoal", value)}
            placeholder="build tension slowly without breaking composure"
          />
          <InputField
            label="Tone"
            value={form.tone}
            onChange={(value) => onFieldChange("tone", value)}
            placeholder="restrained, intimate, low-key"
          />
        </div>

        <div className="mt-4">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">
            Opening state starters
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {OPENING_STATE_OPTIONS.map((option) => (
              <MiniChip
                key={option}
                label={option}
                active={form.openingState === option}
                onClick={() => onFieldChange("openingState", option)}
              />
            ))}
          </div>

          <TextAreaField
            label="Opening state"
            value={form.openingState}
            onChange={(value) => onFieldChange("openingState", value)}
            placeholder="tired after a brutal shift, but unusually honest tonight"
            rows={4}
          />
        </div>

        <TextAreaField
          label="Custom scenario"
          value={form.customScenario}
          onChange={(value) => onFieldChange("customScenario", value)}
          placeholder="Describe the exact moment you want. Keep it simple and specific, like a real scene setup."
          rows={5}
        />
      </Section>
    </>
  );
}
