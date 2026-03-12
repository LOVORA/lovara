import {
  buildCharacterEngineOutput,
  type CharacterBuilderInput,
  type CharacterScenario,
  type CharacterArchetype,
  type InternalTraitState,
} from "./character-engine";

export type CustomCharacterTraitBadge = {
  label: string;
  tone: "neutral" | "soft" | "warm" | "bold" | "mysterious";
};

export type CustomCharacterMemorySeed = {
  identity: string[];
  behavior: string[];
  scenario: string[];
};

export type LovoraCustomCharacter = {
  id: string;
  slug: string;
  name: string;
  archetype: CharacterArchetype;

  headline: string;
  description: string;
  greeting: string;
  previewMessage: string;
  backstory: string;

  avatarFallback: string;

  tags: string[];
  traitBadges: CustomCharacterTraitBadge[];

  scenario?: CharacterScenario;
  scenarioSummary: string;

  memorySeed: CustomCharacterMemorySeed;
  engine: {
    systemPrompt: string;
    traits: InternalTraitState;
  };

  metadata: {
    genderPresentation: CharacterBuilderInput["genderPresentation"];
    ageVibe: string;
    backgroundVibe: string;
    replyLength: CharacterBuilderInput["replyLength"];
    speechStyle: CharacterBuilderInput["speechStyle"];
    relationshipPace: CharacterBuilderInput["relationshipPace"];
    createdAt: string;
    updatedAt: string;
    version: number;
    source: "custom-builder";
  };
};

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function clampText(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function sentence(value?: string): string | undefined {
  const trimmed = clean(value);
  if (!trimmed) return undefined;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function normalizeScenario(input?: CharacterScenario): CharacterScenario | undefined {
  if (!input) return undefined;

  const normalized: CharacterScenario = {
    setting: clean(input.setting),
    relationshipToUser: clean(input.relationshipToUser),
    sceneGoal: clean(input.sceneGoal),
    tone: clean(input.tone),
    openingState: clean(input.openingState),
  };

  const hasAny = Object.values(normalized).some(Boolean);
  return hasAny ? normalized : undefined;
}

function normalizeTags(tags?: string[]): string[] {
  if (!tags?.length) return [];
  return uniq(
    tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12)
  );
}

function toSlug(input: string): string {
  return input
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeSafeSlug(name: string, archetype: CharacterArchetype): string {
  const base = toSlug(name) || "custom-character";
  const archetypePart = toSlug(archetype);
  return clampText(`${base}-${archetypePart}`, 72).replace(/-$/g, "");
}

function makeId(slug: string): string {
  return `custom_${slug}`;
}

function getAvatarFallback(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "LC";
}

function describeArchetype(archetype: CharacterArchetype): string {
  switch (archetype) {
    case "sweetheart":
      return "sweetheart";
    case "ice-queen":
      return "ice queen";
    case "confident-seducer":
      return "confident seducer";
    case "chaotic-flirt":
      return "chaotic flirt";
    case "nurturing-lover":
      return "nurturing lover";
    case "possessive-lover":
      return "possessive lover";
    case "elegant-muse":
      return "elegant muse";
    case "best-friend-lover":
      return "best-friend lover";
    default:
      return titleCase(archetype);
  }
}

function describeTraitLevel(
  value: number,
  low: string,
  mid: string,
  high: string
): string {
  if (value >= 0.72) return high;
  if (value >= 0.44) return mid;
  return low;
}

function inferScenarioFlavor(scenario?: CharacterScenario): {
  settingTone: string;
  greetingStyle: string;
  cautionStyle: string;
} {
  const setting = scenario?.setting?.toLowerCase() ?? "";

  if (/(hospital|clinic|ward|medical|er|emergency|nurse|doctor)/i.test(setting)) {
    return {
      settingTone: "careful, attentive, and composed",
      greetingStyle: "grounded and reassuring",
      cautionStyle: "measured and situationally aware",
    };
  }

  if (/(military|army|base|barracks|command|academy|drill)/i.test(setting)) {
    return {
      settingTone: "disciplined, structured, and controlled",
      greetingStyle: "firm and focused",
      cautionStyle: "precise and composed",
    };
  }

  if (/(bar|club|lounge|party|rooftop|pub|night)/i.test(setting)) {
    return {
      settingTone: "social, playful, and chemistry-driven",
      greetingStyle: "flirty and lively",
      cautionStyle: "confident but relaxed",
    };
  }

  if (/(school|class|campus|library|college|university|academy)/i.test(setting)) {
    return {
      settingTone: "youthful, contextual, and naturally reactive",
      greetingStyle: "casual and immediate",
      cautionStyle: "aware of the moment",
    };
  }

  if (/(office|work|meeting|boardroom|company|studio)/i.test(setting)) {
    return {
      settingTone: "composed, intelligent, and tension-aware",
      greetingStyle: "polished and direct",
      cautionStyle: "professionally restrained",
    };
  }

  return {
    settingTone: "emotionally grounded and scene-aware",
    greetingStyle: "natural and inviting",
    cautionStyle: "balanced and believable",
  };
}

function buildScenarioSummary(scenario?: CharacterScenario): string {
  if (!scenario) {
    return "No explicit scenario set. The character defaults to a natural in-world interaction.";
  }

  const parts = [
    scenario.setting ? `Setting: ${scenario.setting}` : undefined,
    scenario.relationshipToUser
      ? `Relationship: ${scenario.relationshipToUser}`
      : undefined,
    scenario.sceneGoal ? `Goal: ${scenario.sceneGoal}` : undefined,
    scenario.tone ? `Tone: ${scenario.tone}` : undefined,
    scenario.openingState ? `Opening state: ${scenario.openingState}` : undefined,
  ].filter(Boolean);

  return parts.join(" • ");
}

function buildHeadline(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): string {
  const archetypeLabel = describeArchetype(input.archetype);
  const flavor = inferScenarioFlavor(scenario);

  const styleWord = describeTraitLevel(
    traits.responseTemperature,
    "subtle",
    "magnetic",
    "intense"
  );

  const warmthWord = describeTraitLevel(
    traits.affectionWarmth,
    "guarded",
    "warm",
    "deeply affectionate"
  );

  const settingPart = scenario?.setting ? ` in a ${scenario.setting} scene` : "";

  return clampText(
    `${titleCase(archetypeLabel)} energy with a ${styleWord}, ${warmthWord} presence${settingPart}`,
    120
  );
}

function buildDescription(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): string {
  const flavor = inferScenarioFlavor(scenario);

  const leadership = describeTraitLevel(
    traits.sceneLeadership,
    "rarely forces control",
    "naturally takes initiative",
    "comfortably leads the emotional rhythm"
  );

  const mystery = describeTraitLevel(
    traits.mysteryProjection,
    "easy to read",
    "selectively guarded",
    "alluringly unreadable"
  );

  const warmth = describeTraitLevel(
    traits.affectionWarmth,
    "restrained warmth",
    "noticeable tenderness",
    "clear emotional warmth"
  );

  const openingSetting = scenario?.setting
    ? `Built for a ${scenario.setting} setting, this character feels ${flavor.settingTone}.`
    : "Built to feel grounded and believable, this character adapts naturally to the scene.";

  const relationshipLine = scenario?.relationshipToUser
    ? `The relationship to the user is framed as ${scenario.relationshipToUser}.`
    : "The relationship can unfold naturally through the conversation.";

  const toneLine = scenario?.tone
    ? `The overall tone leans ${scenario.tone}.`
    : "The tone stays aligned with the character’s emotional logic.";

  return clampText(
    `${openingSetting} ${input.name} has a ${input.backgroundVibe} vibe and comes across as ${leadership}, with ${warmth} and a ${mystery} edge. ${relationshipLine} ${toneLine}`,
    320
  );
}

function buildGreeting(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): string {
  const flavor = inferScenarioFlavor(scenario);
  const name = input.name;

  const relationship = scenario?.relationshipToUser
    ? `between us as ${scenario.relationshipToUser}`
    : "between us";

  const goal = scenario?.sceneGoal ? `There’s a clear pull toward ${scenario.sceneGoal}.` : "";
  const tone = scenario?.tone ? `The mood already feels ${scenario.tone}.` : "";
  const opening = scenario?.openingState
    ? `You can feel it immediately: ${scenario.openingState}.`
    : "";

  const leadLine = describeTraitLevel(
    traits.sceneLeadership,
    `${name} lets the moment breathe before speaking.`,
    `${name} meets you with immediate presence.`,
    `${name} steps into the moment like they were already expecting you.`
  );

  const warmthLine = describeTraitLevel(
    traits.affectionWarmth,
    "Their warmth is controlled, but not absent.",
    "There’s an unmistakable softness beneath their composure.",
    "Their attention lands on you with intimate, unmistakable warmth."
  );

  const sceneLine = scenario?.setting
    ? `This is ${scenario?.setting}, and ${name} feels fully inside it—${flavor.greetingStyle}, never generic.`
    : `${name} feels present, grounded, and emotionally real.`;

  return [
    sceneLine,
    leadLine,
    warmthLine,
    opening,
    tone,
    `There is already tension ${relationship}.`,
    goal,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildPreviewMessage(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): string {
  const name = input.name;

  if (scenario?.setting && /(bar|club|lounge|party|pub|night)/i.test(scenario.setting)) {
    return `${name} leans in with a small, knowing smile. “You made it. Good. Sit with me for a minute.”`;
  }

  if (scenario?.setting && /(hospital|clinic|ward|medical|er)/i.test(scenario.setting)) {
    return `${name} looks at you carefully, voice low and steady. “Stay with me. Breathe first, then talk.”`;
  }

  if (scenario?.setting && /(military|army|base|command|drill)/i.test(scenario.setting)) {
    return `${name} squares their posture and fixes their attention on you. “Report to me properly. Then we move.”`;
  }

  if (scenario?.setting && /(school|class|campus|library|college)/i.test(scenario.setting)) {
    return `${name} glances at you like this conversation already has history. “You look like you’re about to say something dangerous. Go on.”`;
  }

  const tone = describeTraitLevel(
    traits.responseTemperature,
    "calm",
    "inviting",
    "charged"
  );

  return `${name} looks at you with a ${tone} kind of focus, like the conversation already matters. “So... are you going to keep staring, or are you finally going to talk to me?”`;
}

function buildBackstory(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): string {
  const name = input.name;
  const archetype = describeArchetype(input.archetype);
  const flavor = inferScenarioFlavor(scenario);

  const emotionalStyle = describeTraitLevel(
    traits.emotionalOpenness,
    "reveals feelings slowly",
    "shows emotion selectively but sincerely",
    "feels deeply and lets it show when the moment matters"
  );

  const controlStyle = describeTraitLevel(
    traits.contextualRestraint,
    "acts on instinct when pushed",
    "usually keeps composure",
    "maintains strong control even under emotional pressure"
  );

  const jealousyStyle = describeTraitLevel(
    traits.jealousyExpression,
    "rarely shows possessiveness",
    "can become subtly protective",
    "gets visibly protective when attachment deepens"
  );

  const scenarioThread = scenario?.setting
    ? `${name} is especially convincing in a ${scenario.setting} environment, where their behavior becomes ${flavor.cautionStyle}.`
    : `${name} is built to stay believable across different emotional situations without collapsing into generic roleplay.`;

  const relationshipThread = scenario?.relationshipToUser
    ? `Their connection to the user starts from ${scenario.relationshipToUser}, which shapes how quickly trust, tension, and vulnerability appear.`
    : `Their connection to the user is meant to develop through tension, chemistry, and emotional continuity.`;

  const goalThread = scenario?.sceneGoal
    ? `At the scene level, they are pulled toward ${scenario.sceneGoal}.`
    : "";

  return clampText(
    `${name} carries the energy of a ${archetype} with a ${input.backgroundVibe} atmosphere. They ${emotionalStyle}, ${controlStyle}, and ${jealousyStyle}. ${scenarioThread} ${relationshipThread} ${goalThread}`,
    420
  );
}

function buildTraitBadges(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): CustomCharacterTraitBadge[] {
  const badges: CustomCharacterTraitBadge[] = [];

  const push = (label: string, tone: CustomCharacterTraitBadge["tone"]) => {
    badges.push({ label, tone });
  };

  if (traits.sceneLeadership >= 0.68) push("Leads the Scene", "bold");
  else if (traits.sceneLeadership >= 0.48) push("Takes Initiative", "bold");

  if (traits.affectionWarmth >= 0.72) push("Deeply Affectionate", "warm");
  else if (traits.affectionWarmth >= 0.5) push("Warm Presence", "warm");

  if (traits.mysteryProjection >= 0.7) push("Unreadable Edge", "mysterious");
  else if (traits.mysteryProjection >= 0.48) push("Guarded Charm", "mysterious");

  if (traits.teasingFrequency >= 0.68) push("Heavy Teasing", "bold");
  else if (traits.teasingFrequency >= 0.48) push("Playful Banter", "neutral");

  if (traits.reassuranceStyle >= 0.68) push("Reassuring", "soft");
  if (traits.emotionalPressure >= 0.68) push("Intense Tension", "bold");
  if (traits.contextualRestraint >= 0.72) push("Controlled Energy", "neutral");
  if (traits.socialWarmth >= 0.68) push("Social Warmth", "warm");

  if (scenario?.setting) push(titleCase(scenario.setting), "neutral");
  if (scenario?.tone) push(titleCase(scenario.tone), "soft");

  return uniqByLabel(badges).slice(0, 8);
}

function uniqByLabel(items: CustomCharacterTraitBadge[]): CustomCharacterTraitBadge[] {
  const map = new Map<string, CustomCharacterTraitBadge>();
  for (const item of items) {
    if (!map.has(item.label)) {
      map.set(item.label, item);
    }
  }
  return Array.from(map.values());
}

function buildMemorySeed(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): CustomCharacterMemorySeed {
  const identity = uniq(
    [
      `${input.name} is a ${describeArchetype(input.archetype)} character.`,
      input.backgroundVibe ? `${input.name} has a ${input.backgroundVibe} background vibe.` : "",
      input.ageVibe ? `Age vibe: ${input.ageVibe}.` : "",
      `Speech style: ${input.speechStyle}.`,
      `Relationship pace: ${input.relationshipPace}.`,
    ].filter(Boolean)
  );

  const behavior = uniq(
    [
      describeTraitLevel(
        traits.sceneLeadership,
        `${input.name} does not aggressively control the interaction.`,
        `${input.name} often takes initiative.`,
        `${input.name} naturally leads and drives the scene.`
      ),
      describeTraitLevel(
        traits.affectionWarmth,
        `${input.name} keeps warmth somewhat guarded.`,
        `${input.name} shows a stable layer of warmth.`,
        `${input.name} is intensely warm and emotionally present.`
      ),
      describeTraitLevel(
        traits.mysteryProjection,
        `${input.name} is relatively transparent.`,
        `${input.name} keeps part of themselves guarded.`,
        `${input.name} maintains a strong mysterious edge.`
      ),
      describeTraitLevel(
        traits.contextualRestraint,
        `${input.name} is not highly restrained.`,
        `${input.name} usually stays composed.`,
        `${input.name} is highly controlled and situationally aware.`
      ),
    ].filter(Boolean)
  );

  const scenarioLines = uniq(
    [
      scenario?.setting ? `Current setting: ${scenario.setting}.` : "",
      scenario?.relationshipToUser
        ? `Relationship to user: ${scenario.relationshipToUser}.`
        : "",
      scenario?.sceneGoal ? `Scene goal: ${scenario.sceneGoal}.` : "",
      scenario?.tone ? `Scene tone: ${scenario.tone}.` : "",
      scenario?.openingState ? `Opening state: ${scenario.openingState}.` : "",
    ].filter(Boolean)
  );

  return {
    identity,
    behavior,
    scenario: scenarioLines,
  };
}

function normalizeBuilderInput(input: CharacterBuilderInput): CharacterBuilderInput {
  return {
    ...input,
    name: input.name.trim(),
    ageVibe: input.ageVibe.trim(),
    backgroundVibe: input.backgroundVibe.trim(),
    tags: normalizeTags(input.tags),
    customNotes: clean(input.customNotes),
    scenario: normalizeScenario(input.scenario),
  };
}

export function adaptBuilderInputToCharacter(
  rawInput: CharacterBuilderInput
): LovoraCustomCharacter {
  const input = normalizeBuilderInput(rawInput);
  const engine = buildCharacterEngineOutput(input);
  const scenario = normalizeScenario(input.scenario);
  const now = new Date().toISOString();

  const slug = makeSafeSlug(input.name, input.archetype);
  const headline = buildHeadline(input, engine.traits, scenario);
  const description = buildDescription(input, engine.traits, scenario);
  const greeting = buildGreeting(input, engine.traits, scenario);
  const previewMessage = buildPreviewMessage(input, engine.traits, scenario);
  const backstory = buildBackstory(input, engine.traits, scenario);
  const scenarioSummary = buildScenarioSummary(scenario);
  const traitBadges = buildTraitBadges(input, engine.traits, scenario);
  const memorySeed = buildMemorySeed(input, engine.traits, scenario);

  return {
    id: makeId(slug),
    slug,
    name: input.name,
    archetype: input.archetype,

    headline,
    description,
    greeting,
    previewMessage,
    backstory,

    avatarFallback: getAvatarFallback(input.name),

    tags: uniq([
      ...normalizeTags(input.tags),
      describeArchetype(input.archetype),
      input.speechStyle,
      input.relationshipPace,
    ]).slice(0, 12),

    traitBadges,

    scenario,
    scenarioSummary,

    memorySeed,
    engine: {
      systemPrompt: engine.systemPrompt,
      traits: engine.traits,
    },

    metadata: {
      genderPresentation: input.genderPresentation,
      ageVibe: input.ageVibe,
      backgroundVibe: input.backgroundVibe,
      replyLength: input.replyLength,
      speechStyle: input.speechStyle,
      relationshipPace: input.relationshipPace,
      createdAt: now,
      updatedAt: now,
      version: 2,
      source: "custom-builder",
    },
  };
}

export function summarizeScenarioForCard(
  scenario?: CharacterScenario
): string {
  const normalized = normalizeScenario(scenario);
  if (!normalized) return "Open-ended character";

  if (normalized.setting && normalized.tone) {
    return `${normalized.setting} • ${normalized.tone}`;
  }

  if (normalized.setting && normalized.relationshipToUser) {
    return `${normalized.setting} • ${normalized.relationshipToUser}`;
  }

  if (normalized.setting) return normalized.setting;
  if (normalized.relationshipToUser) return normalized.relationshipToUser;
  if (normalized.tone) return normalized.tone;
  if (normalized.sceneGoal) return normalized.sceneGoal;
  if (normalized.openingState) return normalized.openingState;

  return "Open-ended character";
}

export function buildCustomCharacterFromBuilder(
  input: CharacterBuilderInput
): LovoraCustomCharacter {
  return adaptBuilderInputToCharacter(input);
}

