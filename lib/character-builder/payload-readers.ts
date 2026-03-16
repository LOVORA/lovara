export type UnknownRecord = Record<string, unknown>;

export type BuilderV2VisualProfile = {
  visualAura: string;
  avatarStyle: string;
  hair: string;
  eyes: string;
  outfit: string;
  palette: string;
  camera: string;
  photoPack: string;
};

export type BuilderV2PublicProfile = {
  tagline: string;
  teaser: string;
  tags: string[];
};

export type BuilderV2PayloadView = {
  enabled: boolean;
  styleType: string;
  builderMode: string;
  promptVersion: string;
  promptSummary: string;
  canonicalPrompt: string;
  negativePrompt: string;
  identityLock: UnknownRecord;
  generationHints: UnknownRecord;
  moderationFlags: UnknownRecord;
  visualProfile: BuilderV2VisualProfile;
  publicProfile: BuilderV2PublicProfile;
};

const EMPTY_VISUAL_PROFILE: BuilderV2VisualProfile = {
  visualAura: "",
  avatarStyle: "",
  hair: "",
  eyes: "",
  outfit: "",
  palette: "",
  camera: "",
  photoPack: "",
};

const EMPTY_PUBLIC_PROFILE: BuilderV2PublicProfile = {
  tagline: "",
  teaser: "",
  tags: [],
};

const EMPTY_BUILDER_V2_PAYLOAD: BuilderV2PayloadView = {
  enabled: false,
  styleType: "",
  builderMode: "",
  promptVersion: "",
  promptSummary: "",
  canonicalPrompt: "",
  negativePrompt: "",
  identityLock: {},
  generationHints: {},
  moderationFlags: {},
  visualProfile: EMPTY_VISUAL_PROFILE,
  publicProfile: EMPTY_PUBLIC_PROFILE,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function readBuilderV2Payload(
  payload: unknown,
): BuilderV2PayloadView {
  const root = asRecord(payload);

  const visualProfileRaw = asRecord(root.visualProfile);
  const publicProfileRaw = asRecord(root.publicProfile);

  const enabled =
    asBoolean(root.builderV2) ||
    asString(root.styleType).length > 0 ||
    asString(root.builderMode).length > 0 ||
    asString(root.promptSummary).length > 0;

  return {
    enabled,
    styleType: asString(root.styleType),
    builderMode: asString(root.builderMode),
    promptVersion: asString(root.promptVersion),
    promptSummary: asString(root.promptSummary),
    canonicalPrompt: asString(root.canonicalPrompt),
    negativePrompt: asString(root.negativePrompt),
    identityLock: asRecord(root.identityLock),
    generationHints: asRecord(root.generationHints),
    moderationFlags: asRecord(root.moderationFlags),
    visualProfile: {
      visualAura: asString(visualProfileRaw.visualAura),
      avatarStyle: asString(visualProfileRaw.avatarStyle),
      hair: asString(visualProfileRaw.hair),
      eyes: asString(visualProfileRaw.eyes),
      outfit: asString(visualProfileRaw.outfit),
      palette: asString(visualProfileRaw.palette),
      camera: asString(visualProfileRaw.camera),
      photoPack: asString(visualProfileRaw.photoPack),
    },
    publicProfile: {
      tagline: asString(publicProfileRaw.tagline),
      teaser: asString(publicProfileRaw.teaser),
      tags: asStringArray(publicProfileRaw.tags),
    },
  };
}

export function hasBuilderV2Payload(payload: unknown): boolean {
  return readBuilderV2Payload(payload).enabled;
}

export function readBuilderV2VisualSummary(payload: unknown): string[] {
  const data = readBuilderV2Payload(payload);

  return [
    data.visualProfile.visualAura,
    data.visualProfile.avatarStyle,
    data.visualProfile.hair,
    data.visualProfile.eyes,
    data.visualProfile.outfit,
    data.visualProfile.palette,
    data.visualProfile.camera,
    data.visualProfile.photoPack,
  ].filter(Boolean);
}

export function readBuilderV2PublicCard(payload: unknown): {
  title: string;
  teaser: string;
  tags: string[];
} {
  const data = readBuilderV2Payload(payload);

  return {
    title: data.publicProfile.tagline,
    teaser: data.publicProfile.teaser,
    tags: data.publicProfile.tags,
  };
}

export function readBuilderV2PromptDebug(payload: unknown): {
  promptSummary: string;
  canonicalPrompt: string;
  negativePrompt: string;
} {
  const data = readBuilderV2Payload(payload);

  return {
    promptSummary: data.promptSummary,
    canonicalPrompt: data.canonicalPrompt,
    negativePrompt: data.negativePrompt,
  };
}

export function mergeBuilderV2Payload(
  originalPayload: unknown,
  patch: Partial<BuilderV2PayloadView>,
): Record<string, unknown> {
  const current = readBuilderV2Payload(originalPayload);

  return {
    ...(asRecord(originalPayload)),
    builderV2: patch.enabled ?? current.enabled,
    styleType: patch.styleType ?? current.styleType,
    builderMode: patch.builderMode ?? current.builderMode,
    promptVersion: patch.promptVersion ?? current.promptVersion,
    promptSummary: patch.promptSummary ?? current.promptSummary,
    canonicalPrompt: patch.canonicalPrompt ?? current.canonicalPrompt,
    negativePrompt: patch.negativePrompt ?? current.negativePrompt,
    identityLock: patch.identityLock ?? current.identityLock,
    generationHints: patch.generationHints ?? current.generationHints,
    moderationFlags: patch.moderationFlags ?? current.moderationFlags,
    visualProfile: {
      ...current.visualProfile,
      ...(patch.visualProfile ?? {}),
    },
    publicProfile: {
      ...current.publicProfile,
      ...(patch.publicProfile ?? {}),
    },
  };
}

export function getSafePayloadObject(payload: unknown): Record<string, unknown> {
  return asRecord(payload);
}

export function getEmptyBuilderV2Payload(): BuilderV2PayloadView {
  return {
    ...EMPTY_BUILDER_V2_PAYLOAD,
    visualProfile: { ...EMPTY_VISUAL_PROFILE },
    publicProfile: { ...EMPTY_PUBLIC_PROFILE },
    identityLock: {},
    generationHints: {},
    moderationFlags: {},
  };
}
