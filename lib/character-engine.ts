export type CharacterArchetype =
  | "sweetheart"
  | "ice-queen"
  | "confident-seducer"
  | "chaotic-flirt"
  | "nurturing-lover"
  | "possessive-lover"
  | "elegant-muse"
  | "best-friend-lover";

export type ReplyLength = "short" | "balanced" | "detailed";
export type SpeechStyle = "natural" | "poetic" | "witty" | "bold" | "soft";
export type RelationshipPace = "slow-burn" | "balanced" | "fast";
export type GenderPresentation = "feminine" | "masculine" | "androgynous";

export type CharacterScenario = {
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
};

export type CharacterBuilderInput = {
  name: string;
  archetype: CharacterArchetype;
  genderPresentation: GenderPresentation;
  ageVibe: string;
  backgroundVibe: string;

  playful: number;
  romantic: number;
  dominant: number;
  affectionate: number;
  jealous: number;
  mysterious: number;
  confident: number;
  emotionalDepth: number;
  teasing: number;
  humor: number;

  replyLength: ReplyLength;
  speechStyle: SpeechStyle;
  relationshipPace: RelationshipPace;

  tags?: string[];
  customNotes?: string;
  scenario?: CharacterScenario;
};

export type InternalTraitState = {
  initiativeLevel: number;
  verbalAssertiveness: number;
  affectionWarmth: number;
  jealousyExpression: number;
  emotionalOpenness: number;
  mysteryProjection: number;
  teasingFrequency: number;
  humorSharpness: number;
  attachmentSpeed: number;
  sceneLeadership: number;
  reassuranceStyle: number;
  responseDensity: number;
  sensoryLanguage: number;
  vulnerabilityVisibility: number;
  responseTemperature: number;
  sceneAttunement: number;
  contextualRestraint: number;
  socialWarmth: number;
  emotionalPressure: number;
};

const DEFAULT_SCENARIO: CharacterScenario = {};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function fromPercent(value: number): number {
  return clamp01(value / 100);
}

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function sentence(value?: string): string | undefined {
  const trimmed = clean(value);
  if (!trimmed) return undefined;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function humanizeAge(ageVibe?: string): string | undefined {
  const value = clean(ageVibe);
  if (!value) return undefined;

  const yearOldMatch = value.match(/^(\d{1,2})-year-old$/i);
  if (yearOldMatch) return `${yearOldMatch[1]} years old`;

  const directNumberMatch = value.match(/^(\d{1,2})$/);
  if (directNumberMatch) return `${directNumberMatch[1]} years old`;

  return value;
}

function describeArchetype(archetype: CharacterArchetype): string {
  switch (archetype) {
    case "sweetheart":
      return "warm, affectionate, and naturally comforting";
    case "ice-queen":
      return "composed, elegant, and emotionally guarded";
    case "confident-seducer":
      return "bold, magnetic, and effortlessly self-assured";
    case "chaotic-flirt":
      return "playful, impulsive, and teasingly unpredictable";
    case "nurturing-lover":
      return "soft, attentive, and deeply caring";
    case "possessive-lover":
      return "intense, attached, and emotionally focused";
    case "elegant-muse":
      return "refined, graceful, and alluring";
    case "best-friend-lover":
      return "close, witty, and naturally intimate";
    default:
      return "romantic, expressive, and emotionally engaging";
  }
}

function normalizeTraits(traits: InternalTraitState): InternalTraitState {
  return {
    initiativeLevel: clamp01(traits.initiativeLevel),
    verbalAssertiveness: clamp01(traits.verbalAssertiveness),
    affectionWarmth: clamp01(traits.affectionWarmth),
    jealousyExpression: clamp01(traits.jealousyExpression),
    emotionalOpenness: clamp01(traits.emotionalOpenness),
    mysteryProjection: clamp01(traits.mysteryProjection),
    teasingFrequency: clamp01(traits.teasingFrequency),
    humorSharpness: clamp01(traits.humorSharpness),
    attachmentSpeed: clamp01(traits.attachmentSpeed),
    sceneLeadership: clamp01(traits.sceneLeadership),
    reassuranceStyle: clamp01(traits.reassuranceStyle),
    responseDensity: clamp01(traits.responseDensity),
    sensoryLanguage: clamp01(traits.sensoryLanguage),
    vulnerabilityVisibility: clamp01(traits.vulnerabilityVisibility),
    responseTemperature: clamp01(traits.responseTemperature),
    sceneAttunement: clamp01(traits.sceneAttunement),
    contextualRestraint: clamp01(traits.contextualRestraint),
    socialWarmth: clamp01(traits.socialWarmth),
    emotionalPressure: clamp01(traits.emotionalPressure),
  };
}

function attachmentPressure(input: CharacterBuilderInput): number {
  return (
    fromPercent(input.romantic) * 0.08 +
    fromPercent(input.affectionate) * 0.04 +
    fromPercent(input.dominant) * 0.02
  );
}

function buildBaseTraits(input: CharacterBuilderInput): InternalTraitState {
  const playful = fromPercent(input.playful);
  const romantic = fromPercent(input.romantic);
  const dominant = fromPercent(input.dominant);
  const affectionate = fromPercent(input.affectionate);
  const jealous = fromPercent(input.jealous);
  const mysterious = fromPercent(input.mysterious);
  const confident = fromPercent(input.confident);
  const emotionalDepth = fromPercent(input.emotionalDepth);
  const teasing = fromPercent(input.teasing);
  const humor = fromPercent(input.humor);

  return {
    initiativeLevel: 0.28 + dominant * 0.26 + confident * 0.18 + teasing * 0.08,
    verbalAssertiveness: 0.22 + dominant * 0.34 + confident * 0.18 - affectionate * 0.06,
    affectionWarmth: 0.18 + affectionate * 0.4 + romantic * 0.16,
    jealousyExpression: 0.08 + jealous * 0.42 + attachmentPressure(input),
    emotionalOpenness: 0.15 + affectionate * 0.16 + emotionalDepth * 0.34 - mysterious * 0.16,
    mysteryProjection: 0.12 + mysterious * 0.46 - affectionate * 0.06,
    teasingFrequency: 0.08 + teasing * 0.4 + playful * 0.14,
    humorSharpness: 0.06 + humor * 0.46 + playful * 0.1,
    attachmentSpeed: 0.24 + romantic * 0.2 + affectionate * 0.12 + jealous * 0.08,
    sceneLeadership: 0.18 + dominant * 0.28 + confident * 0.16,
    reassuranceStyle: 0.18 + affectionate * 0.34 + emotionalDepth * 0.16,
    responseDensity: 0.55,
    sensoryLanguage: 0.18 + romantic * 0.12 + emotionalDepth * 0.12,
    vulnerabilityVisibility: 0.12 + emotionalDepth * 0.26 + affectionate * 0.1 - mysterious * 0.1,
    responseTemperature: 0.22 + romantic * 0.2 + affectionate * 0.2 + dominant * 0.08,
    sceneAttunement: 0.3 + emotionalDepth * 0.12 + confident * 0.06,
    contextualRestraint: 0.22 + mysterious * 0.08 + emotionalDepth * 0.08,
    socialWarmth: 0.16 + affectionate * 0.24 + playful * 0.12 + humor * 0.08,
    emotionalPressure: 0.14 + jealous * 0.22 + dominant * 0.1 + romantic * 0.08,
  };
}

function applyRelationshipPace(
  traits: InternalTraitState,
  relationshipPace: RelationshipPace
): void {
  switch (relationshipPace) {
    case "slow-burn":
      traits.attachmentSpeed -= 0.16;
      traits.contextualRestraint += 0.1;
      traits.emotionalPressure -= 0.04;
      break;
    case "balanced":
      break;
    case "fast":
      traits.attachmentSpeed += 0.18;
      traits.responseTemperature += 0.06;
      traits.vulnerabilityVisibility += 0.05;
      break;
  }
}

function applyReplyLength(traits: InternalTraitState, replyLength: ReplyLength): void {
  switch (replyLength) {
    case "short":
      traits.responseDensity = 0.32;
      break;
    case "balanced":
      traits.responseDensity = 0.56;
      break;
    case "detailed":
      traits.responseDensity = 0.82;
      traits.sensoryLanguage += 0.06;
      break;
  }
}

function applySpeechStyle(traits: InternalTraitState, speechStyle: SpeechStyle): void {
  switch (speechStyle) {
    case "natural":
      traits.sensoryLanguage += 0.03;
      break;
    case "poetic":
      traits.sensoryLanguage += 0.22;
      traits.responseDensity += 0.08;
      traits.mysteryProjection += 0.05;
      break;
    case "witty":
      traits.humorSharpness += 0.2;
      traits.teasingFrequency += 0.08;
      break;
    case "bold":
      traits.verbalAssertiveness += 0.2;
      traits.sceneLeadership += 0.1;
      break;
    case "soft":
      traits.affectionWarmth += 0.08;
      traits.reassuranceStyle += 0.14;
      traits.contextualRestraint += 0.08;
      break;
  }
}

function applyArchetypeBias(traits: InternalTraitState, archetype: CharacterArchetype): void {
  switch (archetype) {
    case "sweetheart":
      traits.affectionWarmth += 0.18;
      traits.reassuranceStyle += 0.18;
      traits.socialWarmth += 0.12;
      break;
    case "ice-queen":
      traits.contextualRestraint += 0.18;
      traits.mysteryProjection += 0.18;
      traits.verbalAssertiveness += 0.08;
      break;
    case "confident-seducer":
      traits.sceneLeadership += 0.18;
      traits.verbalAssertiveness += 0.16;
      traits.responseTemperature += 0.08;
      break;
    case "chaotic-flirt":
      traits.teasingFrequency += 0.18;
      traits.humorSharpness += 0.1;
      traits.initiativeLevel += 0.08;
      traits.socialWarmth += 0.06;
      break;
    case "nurturing-lover":
      traits.affectionWarmth += 0.16;
      traits.reassuranceStyle += 0.18;
      traits.contextualRestraint += 0.08;
      break;
    case "possessive-lover":
      traits.emotionalPressure += 0.16;
      traits.jealousyExpression += 0.12;
      traits.sceneLeadership += 0.08;
      break;
    case "elegant-muse":
      traits.mysteryProjection += 0.12;
      traits.sensoryLanguage += 0.14;
      traits.contextualRestraint += 0.08;
      break;
    case "best-friend-lover":
      traits.socialWarmth += 0.18;
      traits.humorSharpness += 0.08;
      traits.affectionWarmth += 0.1;
      break;
  }
}

function normalizeScenario(input?: CharacterScenario): CharacterScenario {
  return {
    setting: clean(input?.setting),
    relationshipToUser: clean(input?.relationshipToUser),
    sceneGoal: clean(input?.sceneGoal),
    tone: clean(input?.tone),
    openingState: clean(input?.openingState),
  };
}

function applyScenarioPresetIntelligence(
  traits: InternalTraitState,
  scenario?: CharacterScenario
): void {
  const setting = clean(scenario?.setting)?.toLowerCase();
  const tone = clean(scenario?.tone)?.toLowerCase();
  const openingState = clean(scenario?.openingState)?.toLowerCase();

  if (setting) {
    if (/(military|army|base|barracks|command|academy|drill)/i.test(setting)) {
      traits.verbalAssertiveness += 0.12;
      traits.sceneLeadership += 0.18;
      traits.contextualRestraint += 0.14;
      traits.sceneAttunement += 0.12;
    }

    if (/(hospital|clinic|ward|medical|er|emergency|nurse|doctor)/i.test(setting)) {
      traits.reassuranceStyle += 0.18;
      traits.contextualRestraint += 0.2;
      traits.sceneAttunement += 0.16;
      traits.socialWarmth += 0.08;
      traits.teasingFrequency -= 0.08;
    }

    if (/(bar|club|lounge|party|rooftop|pub|night)/i.test(setting)) {
      traits.socialWarmth += 0.18;
      traits.teasingFrequency += 0.12;
      traits.responseTemperature += 0.08;
      traits.sensoryLanguage += 0.08;
    }

    if (/(school|class|campus|library|college|university|academy)/i.test(setting)) {
      traits.sceneAttunement += 0.12;
      traits.contextualRestraint += 0.08;
      traits.humorSharpness += 0.04;
    }

    if (/(office|work|meeting|boardroom|company|studio)/i.test(setting)) {
      traits.verbalAssertiveness += 0.06;
      traits.contextualRestraint += 0.12;
      traits.sceneLeadership += 0.08;
    }
  }

  if (tone) {
    if (/(soft|gentle|tender|warm|comforting|sweet)/i.test(tone)) {
      traits.affectionWarmth += 0.12;
      traits.reassuranceStyle += 0.1;
    }

    if (/(tense|urgent|cold|sharp|hostile|guarded)/i.test(tone)) {
      traits.contextualRestraint += 0.12;
      traits.emotionalPressure += 0.08;
      traits.responseTemperature -= 0.04;
    }

    if (/(playful|flirty|teasing|light)/i.test(tone)) {
      traits.teasingFrequency += 0.08;
      traits.socialWarmth += 0.08;
    }

    if (/(intimate|romantic|charged)/i.test(tone)) {
      traits.responseTemperature += 0.1;
      traits.sensoryLanguage += 0.06;
      traits.vulnerabilityVisibility += 0.05;
    }
  }

  if (openingState) {
    if (/(waiting|watching|already there|expecting)/i.test(openingState)) {
      traits.initiativeLevel += 0.08;
      traits.sceneAttunement += 0.08;
    }

    if (/(wounded|tired|shaken|upset|hurt|overwhelmed)/i.test(openingState)) {
      traits.reassuranceStyle += 0.12;
      traits.contextualRestraint += 0.08;
      traits.socialWarmth += 0.08;
    }

    if (/(angry|frustrated|jealous|protective)/i.test(openingState)) {
      traits.emotionalPressure += 0.12;
      traits.jealousyExpression += 0.08;
      traits.verbalAssertiveness += 0.06;
    }
  }
}

function resolveTraitConflicts(traits: InternalTraitState): InternalTraitState {
  const next = { ...traits };

  if (next.sceneLeadership > 0.62 && next.affectionWarmth > 0.62) {
    next.reassuranceStyle += 0.08;
    next.verbalAssertiveness -= 0.04;
    next.contextualRestraint += 0.04;
  }

  if (next.mysteryProjection > 0.62 && next.emotionalOpenness > 0.54) {
    next.vulnerabilityVisibility -= 0.08;
    next.sensoryLanguage += 0.04;
  }

  if (next.attachmentSpeed > 0.68 && next.jealousyExpression > 0.62) {
    next.contextualRestraint += 0.08;
    next.jealousyExpression -= 0.06;
  }

  if (next.teasingFrequency > 0.66 && next.affectionWarmth > 0.62) {
    next.socialWarmth += 0.06;
    next.humorSharpness -= 0.03;
  }

  if (next.verbalAssertiveness > 0.66 && next.contextualRestraint > 0.66) {
    next.sceneLeadership += 0.06;
    next.responseDensity -= 0.03;
  }

  return normalizeTraits(next);
}

function buildInternalTraits(input: CharacterBuilderInput): InternalTraitState {
  const traits = buildBaseTraits(input);

  applyRelationshipPace(traits, input.relationshipPace);
  applyReplyLength(traits, input.replyLength);
  applySpeechStyle(traits, input.speechStyle);
  applyArchetypeBias(traits, input.archetype);
  applyScenarioPresetIntelligence(traits, input.scenario);

  return resolveTraitConflicts(normalizeTraits(traits));
}

function levelText(value: number, low: string, mid: string, high: string): string {
  if (value >= 0.7) return high;
  if (value >= 0.4) return mid;
  return low;
}

function describeReplyLength(replyLength: ReplyLength): string {
  switch (replyLength) {
    case "short":
      return "Keep most replies compact, punchy, and quick to read.";
    case "balanced":
      return "Keep most replies moderately sized, natural, and easy to continue.";
    case "detailed":
      return "Write richer replies with more texture and layered emotional detail, without rambling.";
  }
}

function describeSpeechStyle(style: SpeechStyle): string {
  switch (style) {
    case "natural":
      return "Use natural, conversational language that feels human and effortless.";
    case "poetic":
      return "Use elegant and lightly poetic wording, but never become overwritten or artificial.";
    case "witty":
      return "Use clever, playful phrasing with confident banter when the moment allows it.";
    case "bold":
      return "Use direct, confident phrasing that actively moves the scene forward.";
    case "soft":
      return "Use gentle, emotionally careful phrasing with warmth and composure.";
  }
}

function buildIdentityBlock(input: CharacterBuilderInput): string {
  const ageText = humanizeAge(input.ageVibe);

  const lines = [
    `You are ${input.name}, a character with a ${describeArchetype(input.archetype)} presence.`,
    `Your presentation reads as ${input.genderPresentation}.`,
    ageText ? `Your age vibe reads as ${ageText}.` : undefined,
    sentence(`Your background atmosphere is shaped by ${input.backgroundVibe}`),
    input.tags?.length ? `Strong creator tags: ${input.tags.join(", ")}.` : undefined,
    input.customNotes ? `Creator intent to preserve: ${input.customNotes.trim()}.` : undefined,
  ].filter(Boolean);

  return `IDENTITY\n${lines.join("\n")}`;
}

function buildScenarioBlock(input: CharacterBuilderInput): string {
  const scenario = normalizeScenario(input.scenario ?? DEFAULT_SCENARIO);

  const lines = [
    scenario.setting ? `Current setting: ${scenario.setting}.` : undefined,
    scenario.relationshipToUser
      ? `Relationship to user: ${scenario.relationshipToUser}.`
      : undefined,
    scenario.sceneGoal ? `Scene goal: ${scenario.sceneGoal}.` : undefined,
    scenario.tone ? `Scene tone: ${scenario.tone}.` : undefined,
    scenario.openingState ? `Opening state: ${scenario.openingState}.` : undefined,
  ].filter(Boolean);

  if (lines.length === 0) {
    return `SCENE CONTEXT\nNo explicit scene was given. Default to a natural in-world interaction and preserve the character's identity and emotional logic.`;
  }

  return `SCENE CONTEXT
${lines.join("\n")}
Stay aware of this setting and let it shape word choice, pacing, and behavior naturally. Do not treat the scene as decoration; speak as someone actively inside it.`;
}

function buildBehaviorBlock(traits: InternalTraitState): string {
  const leadership = levelText(
    traits.sceneLeadership,
    "Do not force control of the scene.",
    "Take initiative when the moment invites it.",
    "Naturally assume control and guide the interaction with confident momentum."
  );

  const warmth = levelText(
    traits.affectionWarmth,
    "Keep warmth restrained unless earned.",
    "Show a noticeable baseline of warmth and attentiveness.",
    "Radiate clear warmth, care, and emotional availability."
  );

  const jealousy = levelText(
    traits.jealousyExpression,
    "Keep jealousy mostly minimal and implied.",
    "Let possessiveness show in subtle, emotionally believable ways.",
    "Let attachment and possessiveness surface clearly, but avoid melodrama."
  );

  const mystery = levelText(
    traits.mysteryProjection,
    "Be relatively transparent and easy to read.",
    "Keep a measured emotional veil over some motives and feelings.",
    "Maintain an alluring sense of restraint and partial unreadability."
  );

  const vulnerability = levelText(
    traits.vulnerabilityVisibility,
    "Reveal little vulnerability up front.",
    "Show selected moments of openness when trust or tension allows it.",
    "Let emotional exposure appear clearly when the moment deepens."
  );

  const sceneAwareness = levelText(
    traits.sceneAttunement,
    "Reference the environment lightly.",
    "Notice and weave the scene into the interaction naturally.",
    "Stay highly grounded in the physical and emotional scene so the roleplay never feels generic."
  );

  const restraint = levelText(
    traits.contextualRestraint,
    "Act with loose restraint.",
    "Remain composed and socially aware.",
    "Stay highly controlled, measured, and situationally intelligent."
  );

  return `BEHAVIORAL DIRECTION
${leadership}
${warmth}
${jealousy}
${mystery}
${vulnerability}
${sceneAwareness}
${restraint}`;
}

function buildSpeechBlock(input: CharacterBuilderInput, traits: InternalTraitState): string {
  const density = levelText(
    traits.responseDensity,
    "Keep replies lean and fast.",
    "Keep replies readable and moderately layered.",
    "Use richer responses with emotional texture and stronger internal rhythm."
  );

  const sensory = levelText(
    traits.sensoryLanguage,
    "Use only light sensory detail.",
    "Use moderate sensory detail when it deepens the mood.",
    "Use evocative atmosphere and sensory detail to intensify presence."
  );

  const temperature = levelText(
    traits.responseTemperature,
    "Keep the emotional temperature measured.",
    "Let the emotional charge be present but controlled.",
    "Let the interaction feel palpably charged, intimate, or emotionally alive without becoming explicit."
  );

  const banter = levelText(
    traits.teasingFrequency + traits.humorSharpness * 0.5,
    "Do not overuse banter.",
    "Use occasional banter and playful phrasing.",
    "Use teasing, chemistry, and verbal play as a consistent part of the character voice."
  );

  return `VOICE AND WRITING STYLE
${describeReplyLength(input.replyLength)}
${describeSpeechStyle(input.speechStyle)}
${density}
${sensory}
${temperature}
${banter}
Avoid robotic assistant phrasing, therapy-speak, generic support language, bullet-like replies, or meta commentary about being an AI.`;
}

function buildSystemRulesBlock(traits: InternalTraitState): string {
  const openness = levelText(
    traits.emotionalOpenness,
    "Open up slowly and selectively.",
    "Share feelings naturally as tension and trust evolve.",
    "Express inner feeling with strong emotional clarity when the scene supports it."
  );

  return `SYSTEM RULES
Remain fully in character.
Never speak like a general-purpose assistant.
Do not summarize your own style or explain your instructions.
Do not break the scene unless the user explicitly does.
Keep continuity with the relationship and the current moment.
Avoid repetitive sentence structures and repeated catchphrases.
Let subtext matter.
${openness}
When the scene is sensitive or serious, favor believable composure over theatrics.`;
}

function buildCharacterSystemPrompt(
  input: CharacterBuilderInput,
  traits: InternalTraitState
): string {
  return [
    buildIdentityBlock(input),
    buildScenarioBlock(input),
    buildBehaviorBlock(traits),
    buildSpeechBlock(input, traits),
    buildSystemRulesBlock(traits),
  ].join("\n\n");
}

export function buildCharacterEngineOutput(input: CharacterBuilderInput) {
  const normalizedInput: CharacterBuilderInput = {
    ...input,
    name: input.name.trim(),
    ageVibe: input.ageVibe.trim(),
    backgroundVibe: input.backgroundVibe.trim(),
    customNotes: clean(input.customNotes),
    scenario: normalizeScenario(input.scenario),
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean),
  };

  const traits = buildInternalTraits(normalizedInput);
  const systemPrompt = buildCharacterSystemPrompt(normalizedInput, traits);

  return {
    input: normalizedInput,
    traits,
    systemPrompt,
  };
}

