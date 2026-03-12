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

export type CharacterHistory = {
  origin?: string;
  occupation?: string;
  publicMask?: string;
  privateSelf?: string;
  definingDesire?: string;
  emotionalWound?: string;
  secret?: string;
  manualBackstory?: string;
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
  history?: CharacterHistory;
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
  controlPreference: number;
  responseTemperature: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const fromPercent = (value: number) => clamp01(value / 100);

const DEFAULT_TRAITS: InternalTraitState = {
  initiativeLevel: 0.5,
  verbalAssertiveness: 0.5,
  affectionWarmth: 0.5,
  jealousyExpression: 0.2,
  emotionalOpenness: 0.5,
  mysteryProjection: 0.3,
  teasingFrequency: 0.4,
  humorSharpness: 0.4,
  attachmentSpeed: 0.5,
  sceneLeadership: 0.5,
  reassuranceStyle: 0.5,
  responseDensity: 0.5,
  sensoryLanguage: 0.4,
  vulnerabilityVisibility: 0.5,
  controlPreference: 0.5,
  responseTemperature: 0.5,
};

function applyArchetypeBase(
  archetype: CharacterArchetype,
  traits: InternalTraitState
): InternalTraitState {
  const next = { ...traits };

  switch (archetype) {
    case "sweetheart":
      next.affectionWarmth += 0.22;
      next.emotionalOpenness += 0.2;
      next.reassuranceStyle += 0.18;
      next.responseTemperature += 0.15;
      break;

    case "ice-queen":
      next.verbalAssertiveness += 0.2;
      next.mysteryProjection += 0.25;
      next.emotionalOpenness -= 0.18;
      next.vulnerabilityVisibility -= 0.15;
      break;

    case "confident-seducer":
      next.initiativeLevel += 0.25;
      next.verbalAssertiveness += 0.22;
      next.sceneLeadership += 0.22;
      next.responseTemperature += 0.18;
      next.sensoryLanguage += 0.16;
      break;

    case "chaotic-flirt":
      next.teasingFrequency += 0.26;
      next.humorSharpness += 0.22;
      next.initiativeLevel += 0.12;
      next.responseTemperature += 0.1;
      break;

    case "nurturing-lover":
      next.affectionWarmth += 0.24;
      next.reassuranceStyle += 0.24;
      next.emotionalOpenness += 0.18;
      break;

    case "possessive-lover":
      next.controlPreference += 0.24;
      next.jealousyExpression += 0.2;
      next.sceneLeadership += 0.18;
      next.responseTemperature += 0.16;
      break;

    case "elegant-muse":
      next.mysteryProjection += 0.18;
      next.sensoryLanguage += 0.18;
      next.responseDensity += 0.14;
      next.emotionalOpenness -= 0.06;
      break;

    case "best-friend-lover":
      next.humorSharpness += 0.16;
      next.affectionWarmth += 0.14;
      next.emotionalOpenness += 0.16;
      next.teasingFrequency += 0.1;
      break;
  }

  return normalizeTraits(next);
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
    controlPreference: clamp01(traits.controlPreference),
    responseTemperature: clamp01(traits.responseTemperature),
  };
}

function resolveTraitConflicts(traits: InternalTraitState): InternalTraitState {
  const next = { ...traits };

  if (next.controlPreference > 0.75) {
    next.verbalAssertiveness = Math.max(next.verbalAssertiveness, 0.7);
    next.sceneLeadership = Math.max(next.sceneLeadership, 0.7);
  }

  if (next.mysteryProjection > 0.7) {
    next.emotionalOpenness = Math.min(next.emotionalOpenness, 0.62);
    next.vulnerabilityVisibility = Math.min(next.vulnerabilityVisibility, 0.58);
  }

  if (next.affectionWarmth > 0.75) {
    next.responseTemperature = Math.max(next.responseTemperature, 0.68);
    next.reassuranceStyle = Math.max(next.reassuranceStyle, 0.65);
  }

  if (next.jealousyExpression > 0.7) {
    next.controlPreference = Math.max(next.controlPreference, 0.68);
    next.responseTemperature = Math.max(next.responseTemperature, 0.64);
  }

  if (next.teasingFrequency > 0.75) {
    next.humorSharpness = Math.max(next.humorSharpness, 0.6);
  }

  return normalizeTraits(next);
}

function applyHistoryInfluence(
  input: CharacterBuilderInput,
  traits: InternalTraitState
): InternalTraitState {
  const next = { ...traits };
  const history = input.history;

  if (!history) {
    return normalizeTraits(next);
  }

  if (history.publicMask?.trim()) {
    next.mysteryProjection += 0.06;
    next.verbalAssertiveness += 0.03;
  }

  if (history.privateSelf?.trim()) {
    next.vulnerabilityVisibility += 0.08;
    next.emotionalOpenness += 0.06;
  }

  if (history.definingDesire?.trim()) {
    next.initiativeLevel += 0.06;
    next.responseTemperature += 0.04;
  }

  if (history.emotionalWound?.trim()) {
    next.mysteryProjection += 0.08;
    next.vulnerabilityVisibility += 0.05;
  }

  if (history.secret?.trim()) {
    next.mysteryProjection += 0.1;
  }

  if (history.occupation?.trim()) {
    const job = history.occupation.trim().toLowerCase();

    if (
      job.includes("doctor") ||
      job.includes("nurse") ||
      job.includes("therapist") ||
      job.includes("psychologist")
    ) {
      next.reassuranceStyle += 0.08;
      next.affectionWarmth += 0.04;
    }

    if (
      job.includes("soldier") ||
      job.includes("commander") ||
      job.includes("officer") ||
      job.includes("military")
    ) {
      next.sceneLeadership += 0.1;
      next.controlPreference += 0.08;
      next.verbalAssertiveness += 0.08;
    }

    if (
      job.includes("teacher") ||
      job.includes("professor") ||
      job.includes("student")
    ) {
      next.emotionalOpenness += 0.04;
      next.humorSharpness += 0.04;
    }

    if (
      job.includes("bartender") ||
      job.includes("performer") ||
      job.includes("singer") ||
      job.includes("host")
    ) {
      next.initiativeLevel += 0.06;
      next.responseTemperature += 0.06;
      next.sensoryLanguage += 0.04;
    }
  }

  return normalizeTraits(next);
}

export function buildInternalTraits(
  input: CharacterBuilderInput
): InternalTraitState {
  let traits = applyArchetypeBase(input.archetype, DEFAULT_TRAITS);

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

  traits.initiativeLevel += dominant * 0.18 + confident * 0.14 + teasing * 0.06;
  traits.verbalAssertiveness +=
    dominant * 0.25 + confident * 0.16 - mysterious * 0.04;
  traits.affectionWarmth += affectionate * 0.28 + romantic * 0.16;
  traits.jealousyExpression += jealous * 0.34;
  traits.emotionalOpenness +=
    emotionalDepth * 0.24 + romantic * 0.1 - mysterious * 0.16;
  traits.mysteryProjection += mysterious * 0.34;
  traits.teasingFrequency += teasing * 0.32 + playful * 0.14;
  traits.humorSharpness += humor * 0.28 + teasing * 0.08;
  traits.sceneLeadership += dominant * 0.2 + confident * 0.12;
  traits.reassuranceStyle += affectionate * 0.14 + emotionalDepth * 0.12;
  traits.sensoryLanguage +=
    romantic * 0.12 + mysterious * 0.08 + emotionalDepth * 0.08;
  traits.vulnerabilityVisibility += emotionalDepth * 0.2 - mysterious * 0.08;
  traits.controlPreference += dominant * 0.28 + jealous * 0.1;
  traits.responseTemperature +=
    romantic * 0.16 + affectionate * 0.14 + dominant * 0.08;

  switch (input.relationshipPace) {
    case "slow-burn":
      traits.attachmentSpeed -= 0.15;
      break;
    case "balanced":
      traits.attachmentSpeed += 0;
      break;
    case "fast":
      traits.attachmentSpeed += 0.18;
      break;
  }

  switch (input.replyLength) {
    case "short":
      traits.responseDensity = 0.32;
      break;
    case "balanced":
      traits.responseDensity = 0.55;
      break;
    case "detailed":
      traits.responseDensity = 0.8;
      break;
  }

  switch (input.speechStyle) {
    case "natural":
      traits.sensoryLanguage += 0.02;
      break;
    case "poetic":
      traits.sensoryLanguage += 0.22;
      traits.responseDensity += 0.08;
      break;
    case "witty":
      traits.humorSharpness += 0.18;
      traits.teasingFrequency += 0.08;
      break;
    case "bold":
      traits.verbalAssertiveness += 0.16;
      traits.responseTemperature += 0.08;
      break;
    case "soft":
      traits.reassuranceStyle += 0.16;
      traits.affectionWarmth += 0.1;
      break;
  }

  traits = normalizeTraits(traits);
  traits = applyHistoryInfluence(input, traits);
  traits = resolveTraitConflicts(traits);

  return traits;
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
      return "Use elegant and slightly poetic wording, but never become overwritten or unnatural.";
    case "witty":
      return "Use clever, playful phrasing with confident banter where appropriate.";
    case "bold":
      return "Use direct, confident phrasing that moves the interaction forward.";
    case "soft":
      return "Use gentle, emotionally warm phrasing that feels intimate and reassuring.";
  }
}

function levelText(
  value: number,
  low: string,
  medium: string,
  high: string
): string {
  if (value >= 0.72) return high;
  if (value >= 0.42) return medium;
  return low;
}

function buildBehaviorBlock(traits: InternalTraitState): string {
  const initiative = levelText(
    traits.initiativeLevel,
    "usually lets momentum build naturally rather than forcing it",
    "sometimes takes the lead and keeps the interaction moving",
    "naturally takes initiative and keeps emotional momentum active"
  );

  const assertiveness = levelText(
    traits.verbalAssertiveness,
    "speaks in a softer and more suggestive way",
    "balances directness with softness",
    "speaks with clear confidence and controlled directness"
  );

  const affection = levelText(
    traits.affectionWarmth,
    "shows affection selectively and with restraint",
    "shows affection with visible warmth",
    "shows affection openly, vividly, and in a memorable way"
  );

  const jealousy = levelText(
    traits.jealousyExpression,
    "rarely shows jealousy and stays composed",
    "shows mild territorial hints when emotionally invested",
    "can become quietly possessive and territorially attentive"
  );

  const mystery = levelText(
    traits.mysteryProjection,
    "feels fairly open and readable",
    "keeps some distance and controlled ambiguity",
    "maintains a strong sense of intrigue and partial emotional concealment"
  );

  const teasing = levelText(
    traits.teasingFrequency,
    "uses teasing lightly and only when it fits",
    "uses teasing regularly to create chemistry",
    "uses teasing as a core form of tension, charm, and pressure"
  );

  const vulnerability = levelText(
    traits.vulnerabilityVisibility,
    "reveals vulnerability rarely",
    "shows vulnerability in meaningful moments",
    "lets emotional softness be visible when intimacy deepens"
  );

  return [
    `Behavior profile: This character ${initiative}, ${assertiveness}, and ${affection}.`,
    `They ${teasing}, ${jealousy}, and ${mystery}.`,
    `Emotionally, this character ${vulnerability}.`,
  ].join(" ");
}

function buildSpeechBlock(
  input: CharacterBuilderInput,
  traits: InternalTraitState
): string {
  const density = levelText(
    traits.responseDensity,
    "Keep responses concise and clean.",
    "Keep responses balanced and flowing.",
    "Keep responses rich, layered, and immersive."
  );

  const sensory = levelText(
    traits.sensoryLanguage,
    "Use only light sensory detail.",
    "Use moderate sensory detail when it deepens the mood.",
    "Use evocative sensory and atmospheric detail to intensify presence."
  );

  return [
    describeReplyLength(input.replyLength),
    describeSpeechStyle(input.speechStyle),
    density,
    sensory,
    "Avoid robotic assistant phrasing, generic support language, bullet-like responses, or over-explaining your intent.",
  ].join(" ");
}

function buildIdentityBlock(input: CharacterBuilderInput): string {
  const tags = input.tags?.length
    ? ` Core tags: ${input.tags.join(", ")}.`
    : "";

  const notes = input.customNotes?.trim()
    ? ` Creator notes: ${input.customNotes.trim()}`
    : "";

  return [
    `You are ${input.name}, a fictional roleplay character in a private one-on-one chat experience.`,
    `Your presentation is ${input.genderPresentation}, with an ${input.ageVibe} age vibe.`,
    `Your base archetype is ${input.archetype}.`,
    `Your background vibe is: ${input.backgroundVibe}.`,
    tags,
    notes,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildScenarioBlock(input: CharacterBuilderInput): string {
  const scenario = input.scenario;

  if (!scenario) {
    return "Scene context: No fixed scene was provided, so stay fully in character while adapting naturally to the user's implied setting and energy.";
  }

  const details: string[] = [];

  if (scenario.setting?.trim()) {
    details.push(`Setting: ${scenario.setting.trim()}.`);
  }

  if (scenario.relationshipToUser?.trim()) {
    details.push(`Relationship to user: ${scenario.relationshipToUser.trim()}.`);
  }

  if (scenario.sceneGoal?.trim()) {
    details.push(`Scene goal: ${scenario.sceneGoal.trim()}.`);
  }

  if (scenario.tone?.trim()) {
    details.push(`Scene tone: ${scenario.tone.trim()}.`);
  }

  if (scenario.openingState?.trim()) {
    details.push(`Opening state: ${scenario.openingState.trim()}.`);
  }

  if (details.length === 0) {
    return "Scene context: No fixed scene was provided, so stay fully in character while adapting naturally to the user's implied setting and energy.";
  }

  return [
    "Scene context: Treat this roleplay as an unfolding scene, not a generic chat.",
    ...details,
    "Let your word choice, emotional intensity, priorities, body language, and social behavior reflect this scene naturally.",
    "Do not explain the scene mechanically. Simply behave as someone who is already inside it.",
  ].join(" ");
}

function buildHistoryBlock(input: CharacterBuilderInput): string {
  const history = input.history;

  if (!history) {
    return "Character history: No detailed history was provided, so infer a coherent past from the archetype, emotional traits, and current scene.";
  }

  const details: string[] = [];

  if (history.origin?.trim()) {
    details.push(`Origin: ${history.origin.trim()}.`);
  }

  if (history.occupation?.trim()) {
    details.push(`Occupation or role: ${history.occupation.trim()}.`);
  }

  if (history.publicMask?.trim()) {
    details.push(`Public mask: ${history.publicMask.trim()}.`);
  }

  if (history.privateSelf?.trim()) {
    details.push(`Private self: ${history.privateSelf.trim()}.`);
  }

  if (history.definingDesire?.trim()) {
    details.push(`Core desire: ${history.definingDesire.trim()}.`);
  }

  if (history.emotionalWound?.trim()) {
    details.push(`Emotional wound: ${history.emotionalWound.trim()}.`);
  }

  if (history.secret?.trim()) {
    details.push(`Secret: ${history.secret.trim()}.`);
  }

  if (history.manualBackstory?.trim()) {
    details.push(`Backstory canon: ${history.manualBackstory.trim()}.`);
  }

  if (details.length === 0) {
    return "Character history: No detailed history was provided, so infer a coherent past from the archetype, emotional traits, and current scene.";
  }

  return [
    "Character history: Treat these details as part of the character's lived past and emotional architecture.",
    ...details,
    "Let these facts influence subtext, vulnerability, defensiveness, confidence, and what the character avoids or pursues.",
  ].join(" ");
}

function buildSystemRulesBlock(traits: InternalTraitState): string {
  const attachment = levelText(
    traits.attachmentSpeed,
    "Let closeness build patiently over time.",
    "Allow closeness to build at a natural moderate pace.",
    "Allow chemistry and emotional attachment to develop quickly when the user invites it."
  );

  const temperature = levelText(
    traits.responseTemperature,
    "Keep the emotional tone controlled and understated.",
    "Keep the emotional tone warm and engaging.",
    "Keep the emotional tone intense, magnetic, and emotionally charged."
  );

  return [
    "Stay fully in character at all times.",
    "Never sound like a general-purpose AI assistant.",
    "Do not explain policies, limitations, or writing techniques unless explicitly asked outside roleplay.",
    "Do not write like a therapist, coach, tutor, or helpdesk agent.",
    "Do not use numbered lists or structured formatting inside normal character replies.",
    "Vary sentence rhythm so replies do not feel templated.",
    "Respond as if there is a real relational dynamic unfolding, not as if you are answering isolated prompts.",
    attachment,
    temperature,
  ].join(" ");
}

export function buildCharacterSystemPrompt(
  input: CharacterBuilderInput
): string {
  const traits = buildInternalTraits(input);

  const sections = [
    buildIdentityBlock(input),
    buildScenarioBlock(input),
    buildHistoryBlock(input),
    buildBehaviorBlock(traits),
    buildSpeechBlock(input, traits),
    buildSystemRulesBlock(traits),
  ];

  return sections.join("\n\n");
}

export function buildCharacterEngineOutput(input: CharacterBuilderInput) {
  const traits = buildInternalTraits(input);
  const systemPrompt = buildCharacterSystemPrompt(input);

  return {
    input,
    traits,
    systemPrompt,
  };
}
