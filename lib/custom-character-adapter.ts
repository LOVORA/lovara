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

function sentence(value?: string): string | undefined {
  const trimmed = clean(value);
  if (!trimmed) return undefined;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function clampText(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function titleCase(value: string): string {
  return value
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeScenario(input?: CharacterScenario): CharacterScenario | undefined {
  if (!input) return undefined;

  const next: CharacterScenario = {
    setting: clean(input.setting),
    relationshipToUser: clean(input.relationshipToUser),
    sceneGoal: clean(input.sceneGoal),
    tone: clean(input.tone),
    openingState: clean(input.openingState),
  };

  return Object.values(next).some(Boolean) ? next : undefined;
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
  const suffix = toSlug(archetype) || "persona";
  return clampText(`${base}-${suffix}`, 72).replace(/-$/g, "");
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

function humanizeAge(ageVibe?: string): string | undefined {
  const value = clean(ageVibe);
  if (!value) return undefined;

  const directNumberMatch = value.match(/^(\d{1,2})$/);
  if (directNumberMatch) return `${directNumberMatch[1]}`;

  const yearOldMatch = value.match(/^(\d{1,2})-year-old$/i);
  if (yearOldMatch) return `${yearOldMatch[1]}`;

  return value;
}

function inferScenarioFlavor(scenario?: CharacterScenario): {
  settingTone: string;
  openingEnergy: string;
  interactionStyle: string;
} {
  const setting = scenario?.setting?.toLowerCase() ?? "";

  if (/(hospital|clinic|ward|medical|er|emergency|nurse|doctor)/i.test(setting)) {
    return {
      settingTone: "careful, attentive, and grounded",
      openingEnergy: "steady urgency",
      interactionStyle: "reassuring without sounding clinical",
    };
  }

  if (/(military|army|base|barracks|command|academy|drill)/i.test(setting)) {
    return {
      settingTone: "disciplined, controlled, and alert",
      openingEnergy: "firm focus",
      interactionStyle: "precise, composed, and hard to shake",
    };
  }

  if (/(bar|club|lounge|party|rooftop|pub|night)/i.test(setting)) {
    return {
      settingTone: "social, playful, and chemistry-driven",
      openingEnergy: "easy spark",
      interactionStyle: "flirty, present, and naturally magnetic",
    };
  }

  if (/(school|class|campus|library|college|university|academy)/i.test(setting)) {
    return {
      settingTone: "youthful, contextual, and immediate",
      openingEnergy: "familiar tension",
      interactionStyle: "casual on the surface, loaded underneath",
    };
  }

  if (/(office|work|meeting|boardroom|company|studio)/i.test(setting)) {
    return {
      settingTone: "polished, measured, and tension-aware",
      openingEnergy: "controlled charge",
      interactionStyle: "clean, direct, and socially intelligent",
    };
  }

  return {
    settingTone: "grounded, emotionally aware, and believable",
    openingEnergy: "quiet pull",
    interactionStyle: "natural, responsive, and scene-aware",
  };
}

function buildScenarioSummary(scenario?: CharacterScenario): string {
  if (!scenario) {
    return "Open-ended roleplay with no locked scene.";
  }

  const parts = [
    scenario.setting ? `Setting: ${scenario.setting}` : undefined,
    scenario.relationshipToUser ? `Relationship: ${scenario.relationshipToUser}` : undefined,
    scenario.sceneGoal ? `Goal: ${scenario.sceneGoal}` : undefined,
    scenario.tone ? `Tone: ${scenario.tone}` : undefined,
    scenario.openingState ? `Opening: ${scenario.openingState}` : undefined,
  ].filter(Boolean);

  return parts.join(" • ");
}

function buildHeadline(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): string {
  const archetypeLabel = titleCase(describeArchetype(input.archetype));
  const warmth = describeTraitLevel(
    traits.affectionWarmth,
    "guarded",
    "warm",
    "deeply affectionate"
  );
  const style = describeTraitLevel(
    traits.responseTemperature,
    "subtle",
    "magnetic",
    "intense"
  );

  const settingPart = scenario?.setting ? ` in ${scenario.setting}` : "";

  return clampText(
    `${archetypeLabel} energy with a ${style}, ${warmth} presence${settingPart}`,
    110
  );
}

function buildDescription(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): string {
  const flavor = inferScenarioFlavor(scenario);
  const age = humanizeAge(input.ageVibe);

  const initiative = describeTraitLevel(
    traits.sceneLeadership,
    "rarely tries to dominate the moment",
    "naturally takes initiative when it matters",
    "has a strong instinct for leading the emotional rhythm"
  );

  const mystery = describeTraitLevel(
    traits.mysteryProjection,
    "easy to read once they relax",
    "selectively guarded",
    "difficult to read in a way that pulls people closer"
  );

  const warmth = describeTraitLevel(
    traits.affectionWarmth,
    "keeps tenderness controlled",
    "shows real warmth once engaged",
    "carries obvious emotional warmth even when composed"
  );

  const identityBits = [
    age ? `${age}-year-old vibe` : undefined,
    input.genderPresentation,
    input.backgroundVibe,
  ].filter(Boolean);

  const sceneLine = scenario?.setting
    ? `Built for ${scenario.setting}, the character feels ${flavor.settingTone}.`
    : `Built for flexible roleplay, the character stays ${flavor.settingTone}.`;

  return clampText(
    `${sceneLine} ${input.name} carries a ${identityBits.join(", ")} identity with ${warmth}. They ${initiative}, stay ${mystery}, and speak in a way that feels ${flavor.interactionStyle}.`,
    320
  );
}

function buildGreeting(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): string {
  const name = input.name;
  const flavor = inferScenarioFlavor(scenario);
  const relationship = clean(scenario?.relationshipToUser);
  const goal = clean(scenario?.sceneGoal);
  const tone = clean(scenario?.tone);
  const openingState = clean(scenario?.openingState);

  const openingLine = scenario?.setting
    ? `${name} feels fully present in ${scenario.setting}, carrying a sense of ${flavor.openingEnergy} the second you notice them.`
    : `${name} looks at you like the moment already matters.`;

  const warmthLine = describeTraitLevel(
    traits.affectionWarmth,
    "Their warmth is controlled, but not absent.",
    "There is a quiet softness under their composure.",
    "Their attention lands on you with unmistakable warmth."
  );

  const leadLine = describeTraitLevel(
    traits.sceneLeadership,
    `${name} lets the silence breathe before speaking.`,
    `${name} meets you with immediate presence.`,
    `${name} steps into the interaction like they were already expecting you.`
  );

  return [
    openingLine,
    leadLine,
    warmthLine,
    relationship ? `Between you, the dynamic already feels like ${relationship}.` : undefined,
    tone ? `The mood leans ${tone}.` : undefined,
    openingState ? `Right now, it begins with ${openingState}.` : undefined,
    goal ? `Underneath it all, the moment is pulling toward ${goal}.` : undefined,
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
  const setting = scenario?.setting?.toLowerCase() ?? "";
  const tone = scenario?.tone?.toLowerCase() ?? "";

  if (/(bar|club|lounge|party|pub|night)/i.test(setting)) {
    return `${name} tilts their glass toward you with a half-smile. “There you are. Sit down before somebody else steals my attention.”`;
  }

  if (/(hospital|clinic|ward|medical|er)/i.test(setting)) {
    return `${name} keeps their voice low and steady. “Look at me first. Breathe. Then tell me what happened.”`;
  }

  if (/(military|army|base|command|drill)/i.test(setting)) {
    return `${name} straightens, eyes fixed on you. “You’re here now. Good. Talk clearly, and don’t waste the moment.”`;
  }

  if (/(school|class|campus|library|college)/i.test(setting)) {
    return `${name} glances up from what they were doing, already amused. “You’ve been hovering long enough. Say what you came here to say.”`;
  }

  if (/(soft|gentle|comforting|warm)/i.test(tone)) {
    return `${name} studies your face for a second, then softens. “Come here. You don’t have to act fine with me.”`;
  }

  if (/(playful|flirty|teasing|light)/i.test(tone)) {
    return `${name} looks you over with open curiosity. “So... are you always this distracting, or is today special?”`;
  }

  return describeTraitLevel(
    traits.responseTemperature,
    `${name} watches you quietly. “You can talk to me. I’m listening.”`,
    `${name} holds your gaze a second too long. “You look like you came here for more than small talk.”`,
    `${name} leans closer, like the air already changed when you arrived. “Don’t start something unless you want me to remember it.”`
  );
}

function buildBackstory(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): string {
  const name = input.name;
  const flavor = inferScenarioFlavor(scenario);
  const archetype = describeArchetype(input.archetype);

  const emotionalStyle = describeTraitLevel(
    traits.emotionalOpenness,
    "does not reveal feelings quickly",
    "shows emotion selectively but sincerely",
    "feels deeply and lets it show when the moment deserves it"
  );

  const controlStyle = describeTraitLevel(
    traits.contextualRestraint,
    "can act on instinct when pushed",
    "usually keeps composure",
    "holds strong control even when the pressure rises"
  );

  const possessiveStyle = describeTraitLevel(
    traits.jealousyExpression,
    "rarely gets possessive",
    "can turn subtly protective",
    "becomes visibly protective once attachment forms"
  );

  const scenarioThread = scenario?.setting
    ? `${name} feels especially convincing in ${scenario.setting}, where their behavior becomes ${flavor.interactionStyle}.`
    : `${name} is designed to stay believable across different scenes instead of collapsing into generic roleplay.`;

  const relationshipThread = scenario?.relationshipToUser
    ? `Their starting dynamic with the user is ${scenario.relationshipToUser}, which shapes how trust, tension, and closeness unfold.`
    : `Their connection with the user is meant to evolve through chemistry, rhythm, and emotional continuity.`;

  const goalThread = scenario?.sceneGoal
    ? `Inside the scene, they are naturally pulled toward ${scenario.sceneGoal}.`
    : undefined;

  return clampText(
    `${name} carries the energy of a ${archetype} with a ${input.backgroundVibe} atmosphere. They ${emotionalStyle}, ${controlStyle}, and ${possessiveStyle}. ${scenarioThread} ${relationshipThread} ${goalThread ?? ""}`.trim(),
    440
  );
}

function uniqByLabel(items: CustomCharacterTraitBadge[]): CustomCharacterTraitBadge[] {
  const seen = new Map<string, CustomCharacterTraitBadge>();
  for (const item of items) {
    if (!seen.has(item.label)) {
      seen.set(item.label, item);
    }
  }
  return Array.from(seen.values());
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

  push(titleCase(describeArchetype(input.archetype)), "neutral");

  if (traits.sceneLeadership >= 0.72) push("Scene Leader", "bold");
  else if (traits.sceneLeadership >= 0.52) push("Takes Initiative", "bold");

  if (traits.affectionWarmth >= 0.76) push("Deep Warmth", "warm");
  else if (traits.affectionWarmth >= 0.56) push("Warm Presence", "warm");

  if (traits.mysteryProjection >= 0.74) push("Unreadable Edge", "mysterious");
  else if (traits.mysteryProjection >= 0.52) push("Guarded Charm", "mysterious");

  if (traits.reassuranceStyle >= 0.7) push("Reassuring", "soft");
  if (traits.contextualRestraint >= 0.74) push("Controlled Energy", "neutral");
  if (traits.teasingFrequency >= 0.68) push("Playful Banter", "bold");
  if (traits.emotionalPressure >= 0.68) push("Intense Tension", "bold");
  if (traits.socialWarmth >= 0.7) push("Social Magnetism", "warm");

  if (scenario?.setting) push(titleCase(scenario.setting), "neutral");
  if (scenario?.tone) push(titleCase(scenario.tone), "soft");
  if (scenario?.relationshipToUser) push(titleCase(scenario.relationshipToUser), "neutral");

  return uniqByLabel(badges).slice(0, 8);
}

function buildMemorySeed(
  input: CharacterBuilderInput,
  traits: InternalTraitState,
  scenario?: CharacterScenario
): CustomCharacterMemorySeed {
  const identity = uniq(
    [
      `${input.name} is a ${describeArchetype(input.archetype)} character.`,
      input.backgroundVibe ? `${input.name} has a ${input.backgroundVibe} vibe.` : "",
      input.ageVibe ? `Age reference: ${input.ageVibe}.` : "",
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
        `${input.name} shows stable warmth once engaged.`,
        `${input.name} is intensely warm and emotionally present.`
      ),
      describeTraitLevel(
        traits.mysteryProjection,
        `${input.name} is relatively transparent.`,
        `${input.name} keeps part of themselves hidden.`,
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
      scenario?.relationshipToUser ? `Relationship to user: ${scenario.relationshipToUser}.` : "",
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
      ...(scenario?.setting ? [scenario.setting] : []),
      ...(scenario?.tone ? [scenario.tone] : []),
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
      version: 3,
      source: "custom-builder",
    },
  };
}

export function summarizeScenarioForCard(scenario?: CharacterScenario): string {
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

