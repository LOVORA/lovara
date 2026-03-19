import {
  ARCHETYPE_OPTIONS,
  GENDER_OPTIONS,
  type StudioFormState,
} from "@/lib/custom-character-studio";
import {
  ageToneLabel,
  REGION_OPTIONS,
} from "@/lib/create-character/studio-editor";
import {
  InputField,
  OptionCard,
  RegionChip,
  Section,
  SelectField,
} from "@/components/create-character/studio-primitives";
import type {
  RebuildCustomNotes,
  SetStudioField,
} from "@/components/create-character/studio-step-types";

type IdentityStepSectionProps = {
  ageValue: number;
  customRegion: string;
  form: StudioFormState;
  isQuickMode: boolean;
  regionNote: string;
  selectedRegion: string;
  onCustomRegionChange: (value: string) => void;
  onFieldChange: SetStudioField;
  onRegionSelect: (region: string) => void;
  onRebuildCustomNotes: RebuildCustomNotes;
  onSetAgeFromSlider: (value: number) => void;
};

export function IdentityStepSection({
  ageValue,
  customRegion,
  form,
  isQuickMode,
  regionNote,
  selectedRegion,
  onCustomRegionChange,
  onFieldChange,
  onRegionSelect,
  onRebuildCustomNotes,
  onSetAgeFromSlider,
}: IdentityStepSectionProps) {
  return (
    <Section title="Identity" description="Core character anchors." accent="cyan">
      <div className="grid gap-4 md:grid-cols-2">
        <InputField
          label="Character name"
          value={form.name}
          onChange={(value) => onFieldChange("name", value)}
          placeholder="Ayla"
          required
        />
        <SelectField
          label="Gender presentation"
          value={form.genderPresentation}
          onChange={(value) => onFieldChange("genderPresentation", value)}
          options={GENDER_OPTIONS}
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/80">Age</div>
            <div className="mt-1 text-xs leading-6 text-white/50">
              Pick an actual age between 18 and 55.
            </div>
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
            {ageValue} • {ageToneLabel(ageValue)}
          </div>
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={18}
            max={55}
            step={1}
            value={ageValue}
            onChange={(event) => onSetAgeFromSlider(Number(event.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-white/35">
            <span>18</span>
            <span>25</span>
            <span>35</span>
            <span>45</span>
            <span>55</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 text-sm text-white/75">Region</div>
        <div className="flex flex-wrap gap-2">
          {REGION_OPTIONS.map((option) => (
            <RegionChip
              key={option}
              label={option}
              active={selectedRegion === option}
              onClick={() => onRegionSelect(option)}
            />
          ))}
          <RegionChip
            label="Custom"
            active={!selectedRegion && !!customRegion}
            onClick={() => onRegionSelect("")}
          />
        </div>

        {!selectedRegion ? (
          <div className="mt-4">
            <InputField
              label="Custom region"
              value={customRegion}
              onChange={onCustomRegionChange}
              placeholder="Balkan / Levantine / Iberian / etc."
              required
            />
          </div>
        ) : null}

        {!isQuickMode ? (
          <div className="mt-4">
            <InputField
              label="Region note (optional)"
              value={regionNote}
              onChange={(value) =>
                onRebuildCustomNotes({ "Region note": value })
              }
              placeholder="coastal Brazilian, urban Turkish, old-money Roman, etc."
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="mb-3 text-sm text-white/75">Archetype</div>
        <div className="grid gap-3 md:grid-cols-2">
          {ARCHETYPE_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              active={form.archetype === option.value}
              title={option.label}
              description={option.description}
              onClick={() => onFieldChange("archetype", option.value)}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}
