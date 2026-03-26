function clean(value?: string | null): string {
  return (value ?? "").trim();
}

const ARCHETYPE_HEADLINE_MAP: Record<string, string> = {
  sweetheart: "Warm chemistry with an easy, emotionally open presence.",
  "ice-queen": "Cool restraint, sharp composure, and hard-earned warmth.",
  "confident-seducer": "Direct, magnetic pressure with confident emotional control.",
  "chaotic-flirt": "Playful unpredictability with fast spark and restless chemistry.",
  "nurturing-lover": "Soft reassurance, attentive care, and grounded intimacy.",
  "possessive-lover": "Protective attachment, sharper tension, and intense chemistry.",
  "elegant-muse": "Quiet mystery, refined allure, and memorable emotional pull.",
  "best-friend-lover": "Comfort-first chemistry with a bond that already feels personal.",
};

function withSetting(baseHeadline: string, setting?: string | null): string {
  const settingValue = clean(setting);
  if (!settingValue) return baseHeadline;

  return `${baseHeadline.replace(/\.$/, "")} Built to feel natural in ${settingValue}.`;
}

export function normalizeVisibleHeadline(
  headline?: string | null,
  archetype?: string | null,
  setting?: string | null,
): string | null {
  const value = clean(headline);
  if (!value) return null;

  const archetypeKey = clean(archetype).toLocaleLowerCase("en");
  const mappedHeadline = ARCHETYPE_HEADLINE_MAP[archetypeKey];
  const looksLikeLegacyTemplate =
    /\benergy with a\b.+\bpresence\.?$/i.test(value) ||
    /\bwith a magnetic, deeply affectionate presence\.?$/i.test(value);

  if (looksLikeLegacyTemplate && mappedHeadline) {
    return withSetting(mappedHeadline, setting);
  }

  return value;
}
