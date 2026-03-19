import {
  ACCESSORY_VIBE_OPTIONS,
  AVATAR_STYLE_OPTIONS,
  BODY_TYPE_OPTIONS,
  BUST_SIZE_OPTIONS,
  CAMERA_OPTIONS,
  EYE_SHAPE_OPTIONS,
  EYE_OPTIONS,
  HAIR_OPTIONS,
  HAIR_TEXTURE_OPTIONS,
  HEIGHT_IMPRESSION_OPTIONS,
  HIP_SHAPE_OPTIONS,
  LIGHTING_MOOD_OPTIONS,
  MAKEUP_STYLE_OPTIONS,
  OUTFIT_OPTIONS,
  PALETTE_OPTIONS,
  PHOTO_PACK_OPTIONS,
  EXPOSURE_LEVEL_OPTIONS,
  SKIN_TONE_OPTIONS,
  WAIST_DEFINITION_OPTIONS,
} from "@/lib/create-character/studio-editor";
import {
  Section,
  SelectField,
  TextAreaField,
} from "@/components/create-character/studio-primitives";
import type { RebuildCustomNotes } from "@/components/create-character/studio-step-types";

type VisualStepSectionProps = {
  avatarStyle: string;
  bodyType: string;
  bustSize: string;
  camera: string;
  accessoryVibe: string;
  eyeShape: string;
  eyes: string;
  hair: string;
  hairTexture: string;
  heightImpression: string;
  hipsType: string;
  imagePrompt: string;
  lightingMood: string;
  makeupStyle: string;
  outfit: string;
  palette: string;
  photoPack: string;
  exposureLevel: string;
  signatureDetail: string;
  skinTone: string;
  waistDefinition: string;
  onRebuildCustomNotes: RebuildCustomNotes;
};

export function VisualStepSection({
  avatarStyle,
  bodyType,
  bustSize,
  camera,
  accessoryVibe,
  eyeShape,
  eyes,
  hair,
  hairTexture,
  heightImpression,
  hipsType,
  imagePrompt,
  lightingMood,
  makeupStyle,
  outfit,
  palette,
  photoPack,
  exposureLevel,
  signatureDetail,
  skinTone,
  waistDefinition,
  onRebuildCustomNotes,
}: VisualStepSectionProps) {
  return (
    <Section
      title="Visual lab prep"
      description="Prepares the character for future portraits, cards, and media generation."
      accent="cyan"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Avatar style"
          value={avatarStyle || AVATAR_STYLE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Avatar style": value })}
          options={AVATAR_STYLE_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Skin tone"
          value={skinTone || SKIN_TONE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Skin tone": value })}
          options={SKIN_TONE_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Hair"
          value={hair || HAIR_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ Hair: value })}
          options={HAIR_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Hair texture"
          value={hairTexture || HAIR_TEXTURE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Hair texture": value })}
          options={HAIR_TEXTURE_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Eyes"
          value={eyes || EYE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ Eyes: value })}
          options={EYE_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Eye shape"
          value={eyeShape || EYE_SHAPE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Eye shape": value })}
          options={EYE_SHAPE_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Outfit"
          value={outfit || OUTFIT_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ Outfit: value })}
          options={OUTFIT_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Makeup style"
          value={makeupStyle || MAKEUP_STYLE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Makeup style": value })}
          options={MAKEUP_STYLE_OPTIONS.map((value) => ({
            value,
            label: value,
          }))}
        />
        <SelectField
          label="Accessory vibe"
          value={accessoryVibe || ACCESSORY_VIBE_OPTIONS[0]}
          onChange={(value) =>
            onRebuildCustomNotes({ "Accessory vibe": value })
          }
          options={ACCESSORY_VIBE_OPTIONS.map((value) => ({
            value,
            label: value,
          }))}
        />
        <SelectField
          label="Palette"
          value={palette || PALETTE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ Palette: value })}
          options={PALETTE_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Body type"
          value={bodyType || BODY_TYPE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Body type": value })}
          options={BODY_TYPE_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Bust size"
          value={bustSize || BUST_SIZE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Bust size": value })}
          options={BUST_SIZE_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Hip shape"
          value={hipsType || HIP_SHAPE_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Hip shape": value })}
          options={HIP_SHAPE_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Waist definition"
          value={waistDefinition || WAIST_DEFINITION_OPTIONS[0]}
          onChange={(value) =>
            onRebuildCustomNotes({ "Waist definition": value })
          }
          options={WAIST_DEFINITION_OPTIONS.map((value) => ({
            value,
            label: value,
          }))}
        />
        <SelectField
          label="Height impression"
          value={heightImpression || HEIGHT_IMPRESSION_OPTIONS[0]}
          onChange={(value) =>
            onRebuildCustomNotes({ "Height impression": value })
          }
          options={HEIGHT_IMPRESSION_OPTIONS.map((value) => ({
            value,
            label: value,
          }))}
        />
        <SelectField
          label="Camera framing"
          value={camera || CAMERA_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ Camera: value })}
          options={CAMERA_OPTIONS.map((value) => ({ value, label: value }))}
        />
        <SelectField
          label="Lighting mood"
          value={lightingMood || LIGHTING_MOOD_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Lighting mood": value })}
          options={LIGHTING_MOOD_OPTIONS.map((value) => ({
            value,
            label: value,
          }))}
        />
        <SelectField
          label="Exposure"
          value={exposureLevel || EXPOSURE_LEVEL_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Exposure level": value })}
          options={EXPOSURE_LEVEL_OPTIONS.map((value) => ({
            value,
            label: value,
          }))}
        />
        <SelectField
          label="Photo pack style"
          value={photoPack || PHOTO_PACK_OPTIONS[0]}
          onChange={(value) => onRebuildCustomNotes({ "Photo pack": value })}
          options={PHOTO_PACK_OPTIONS.map((value) => ({ value, label: value }))}
        />
      </div>

      <div className="mt-4">
        <TextAreaField
          label="Signature detail"
          value={signatureDetail}
          onChange={(value) =>
            onRebuildCustomNotes({ "Signature detail": value })
          }
          placeholder="small scar near the lip, emerald ring, beauty mark under the eye, loose tie, etc."
          rows={2}
        />
      </div>

      <div className="mt-4">
        <TextAreaField
          label="Image prompt prep"
          value={imagePrompt}
          onChange={(value) => onRebuildCustomNotes({ "Image prompt": value })}
          placeholder="cinematic luxury portrait, warm skin glow, rich contrast, subtle eye contact, premium fashion editorial lighting..."
          rows={4}
        />
      </div>
    </Section>
  );
}
