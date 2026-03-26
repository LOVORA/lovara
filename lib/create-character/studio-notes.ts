export const STRUCTURED_NOTE_KEYS = [
  "Region note",
  "Origin",
  "Visual aura",
  "Interest anchors",
  "Response directive",
  "Key memories",
  "Example message",
  "User role",
  "Nickname for user",
  "Boundaries",
  "Relationship dynamic",
  "Scene type",
  "Behavior mode",
  "Arc stage",
  "Reply objective",
  "Scene focus",
  "Attention hook",
  "Sensory palette",
  "Greeting style",
  "Chat mode",
  "Profession",
  "Trait stack",
  "Avatar style",
  "Skin tone",
  "Eye color",
  "Hair",
  "Hair color",
  "Hair style",
  "Custom hairstyle",
  "Hair texture",
  "Eyes",
  "Eye shape",
  "Makeup style",
  "Accessory vibe",
  "Outfit",
  "Palette",
  "Body type",
  "Bust size",
  "Breast type",
  "Hip shape",
  "Butt size",
  "Waist definition",
  "Height impression",
  "Exposure level",
  "Camera",
  "Lighting mood",
  "Photo pack",
  "Signature detail",
  "Image prompt",
  "Dynamism",
  "Relationship stage",
  "Jealousy",
  "Attachment",
  "Protectiveness",
  "Conversation initiative",
  "Affection style",
  "Conflict style",
  "Emotional availability",
  "Message format",
  "Linguistic flavor",
  "Chemistry template",
  "Current energy",
  "Hobbies",
  "Fetishes",
  "Extra personality details",
  "Extra physical details",
  "Public tagline",
  "Public teaser",
  "Public tags",
] as const;

export type StudioStructuredNoteKey = (typeof STRUCTURED_NOTE_KEYS)[number];
export type StudioStructuredNoteMap = Record<StudioStructuredNoteKey, string>;

function encodeStructuredValue(value: string) {
  return value.replace(/\n/g, "\\n");
}

function decodeStructuredValue(value: string) {
  return value.replace(/\\n/g, "\n");
}

export function extractStructuredLine(source: string, prefix: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`^${escaped}:\\s*(.+)$`, "m"));
  return match?.[1] ? decodeStructuredValue(match[1]) : "";
}

export function removeStructuredLine(source: string, prefix: string) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`^${escaped}:\\s*.+$(\\n)?`, "m"), "").trim();
}

export function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parsePipe(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readStructuredNotes(source: string): StudioStructuredNoteMap {
  return Object.fromEntries(
    STRUCTURED_NOTE_KEYS.map((key) => [key, extractStructuredLine(source, key)]),
  ) as StudioStructuredNoteMap;
}

export function getStructuredBodyNotes(source: string): string {
  let result = source;

  for (const key of STRUCTURED_NOTE_KEYS) {
    result = removeStructuredLine(result, key);
  }

  return result.trim();
}

export function composeStructuredNotes(
  values: Partial<StudioStructuredNoteMap>,
  bodyNotes: string,
): string {
  return [
    ...STRUCTURED_NOTE_KEYS.map((key) =>
      typeof values[key] === "string" && values[key]!.trim().length > 0
        ? `${key}: ${encodeStructuredValue(values[key] as string)}`
        : "",
    ),
    bodyNotes.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}
