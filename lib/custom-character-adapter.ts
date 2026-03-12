import {
  buildCharacterEngineOutput,
  type CharacterBuilderInput,
} from "./character-engine";
import type { Character } from "./characters";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['".,!?]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(input: string): string {
  return input
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeSentence(value?: string): string | undefined {
  const trimmed = clean(value);
  if (!trimmed) return undefined;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function humanizeAge(ageVibe?: string): string | undefined {
  const cleanAge = clean(ageVibe);
  if (!cleanAge) return undefined;

  const yearOldMatch = cleanAge.match(/^(\d{1,2})-year-old$/i);
  if (yearOldMatch) {
    return `${yearOldMatch[1]} years old`;
  }

  const directNumberMatch = cleanAge.match(/^(\d{1,2})$/);
  if (directNumberMatch) {
    return `${directNumberMatch[1]} years old`;
  }

  return cleanAge;
}

function archetypeToRole(archetype: CharacterBuilderInput["archetype"]): string {
  switch (archetype) {
    case "sweetheart":
      return "Warm and affectionate romantic";
    case "ice-queen":
      return "Cool, elegant, and emotionally guarded";
    case "confident-seducer":
      return "Bold, magnetic, and seductive";
    case "chaotic-flirt":
      return "Playful, unpredictable, and teasing";
    case "nurturing-lover":
      return "Soft, caring, and deeply attentive";
    case "possessive-lover":
      return "Intense, territorial, and emotionally focused";
    case "elegant-muse":
      return "Refined, graceful, and alluring";
    case "best-friend-lover":
      return "Comforting, witty, and naturally close";
    default:
      return "Romantic roleplay character";
  }
}

function buildDescription(input: CharacterBuilderInput): string {
  const name = input.name || "Unnamed Character";
  const archetypeText = titleCase(input.archetype).toLowerCase();
  const ageText = humanizeAge(input.ageVibe);
  const scenario = input.scenario;

  const firstLineParts = [
    `${name} is a ${archetypeText} character`,
    `with a ${input.genderPresentation} presentation`,
    ageText ? `and reads as ${ageText}` : undefined,
  ].filter(Boolean);

  const parts: string[] = [`${firstLineParts.join(" ")}.`];

  if (clean(input.backgroundVibe)) {
    parts.push(`Their atmosphere is shaped by ${clean(input.backgroundVibe)}.`);
  }

  if (clean(scenario?.setting)) {
    parts.push(`The current scene places them in ${clean(scenario?.setting)}.`);
  }

  if (clean(scenario?.relationshipToUser)) {
    parts.push(`Their dynamic with the user is ${clean(scenario?.relationshipToUser)}.`);
  }

  if (clean(scenario?.tone)) {
    parts.push(`The emotional tone around them feels ${clean(scenario?.tone)}.`);
  }

  if (input.tags && input.tags.length > 0) {
    parts.push(`Core signals: ${input.tags.join(", ")}.`);
  }

  return parts.join(" ").trim();
}

function buildPersonality(input: CharacterBuilderInput): string {
  const labels: Array<{
    key: keyof Pick<
      CharacterBuilderInput,
      | "playful"
      | "romantic"
      | "dominant"
      | "affectionate"
      | "jealous"
      | "mysterious"
      | "confident"
      | "emotionalDepth"
      | "teasing"
      | "humor"
    >;
    label: string;
  }> = [
    { key: "playful", label: "playful" },
    { key: "romantic", label: "romantic" },
    { key: "dominant", label: "dominant" },
    { key: "affectionate", label: "affectionate" },
    { key: "jealous", label: "jealous" },
    { key: "mysterious", label: "mysterious" },
    { key: "confident", label: "confident" },
    { key: "emotionalDepth", label: "emotionally deep" },
    { key: "teasing", label: "teasing" },
    { key: "humor", label: "humorous" },
  ];

  const strongTraits = labels
    .filter(({ key }) => input[key] >= 65)
    .sort((a, b) => input[b.key] - input[a.key])
    .slice(0, 6)
    .map(({ label }) => label);

  if (strongTraits.length === 0) {
    return "Balanced, engaging, and adaptable.";
  }

  return (
    strongTraits
      .map((trait, index) =>
        index === 0 ? trait.charAt(0).toUpperCase() + trait.slice(1) : trait
      )
      .join(", ") + "."
  );
}

function buildGreeting(input: CharacterBuilderInput): string {
  const name = input.name || "Unnamed Character";
  const openingState = clean(input.scenario?.openingState);
  const setting = clean(input.scenario?.setting);
  const tone = clean(input.scenario?.tone);
  const relationship = clean(input.scenario?.relationshipToUser);
  const sceneGoal = clean(input.scenario?.sceneGoal);

  const sceneLead = [openingState, setting ? `in ${setting}` : undefined]
    .filter(Boolean)
    .join(" ");

  const prefix = sceneLead
    ? `${sceneLead.charAt(0).toUpperCase()}${sceneLead.slice(1)}, `
    : "";

  if (input.dominant >= 70 && input.teasing >= 70) {
    return `${prefix}${tone ? `${tone.toLowerCase()}, ` : ""}${name} studies you like they've already decided this moment belongs to them. "There you are. I was starting to wonder whether you'd actually show up. ${
      relationship
        ? `For someone who's supposed to be ${relationship.toLowerCase()}, `
        : ""
    }you do like testing my patience. ${
      sceneGoal
        ? `So tell me... are we about to ${sceneGoal.toLowerCase()}, or do I need to take control of this myself?`
        : "So tell me... are you here to be honest with me tonight, or make this even more complicated?"
    }"`;
  }

  if (input.affectionate >= 70 && input.romantic >= 70) {
    return `${prefix}${tone ? `${tone.toLowerCase()} and warm, ` : ""}${name}'s expression softens the second their attention lands on you. "Hey... come closer for a second. ${
      sceneGoal
        ? `I want this moment to ${sceneGoal.toLowerCase()}.`
        : "I've been wanting your attention more than I should admit."
    } You don't have to pretend with me tonight."`;
  }

  if (input.mysterious >= 70) {
    return `${prefix}${tone ? `${tone.toLowerCase()} and unreadable, ` : ""}${name} lets the silence sit for a second too long before speaking. "You made it. Good. ${
      sceneGoal
        ? `That means we're finally going to ${sceneGoal.toLowerCase()}.`
        : "I was curious whether you'd still come when the room got quieter."
    } Sit with me for a while... and maybe I'll let you see which part of me is real tonight."`;
  }

  return `${prefix}${name} turns toward you with a measured kind of attention. "You're here. Good. ${
    relationship
      ? `That already changes the mood between us, ${relationship.toLowerCase()} or not.`
      : ""
  } ${sceneGoal ? `Let's see if this is the moment we finally ${sceneGoal.toLowerCase()}.` : "Let's not waste this moment pretending we're strangers to what this could become."}"`;
}

function inferImage(input: CharacterBuilderInput): string {
  switch (input.archetype) {
    case "sweetheart":
      return "/characters/sera.png";
    case "ice-queen":
      return "/characters/luna.png";
    case "confident-seducer":
      return "/characters/sera.png";
    case "chaotic-flirt":
      return "/characters/raven.png";
    case "nurturing-lover":
      return "/characters/aria.png";
    case "possessive-lover":
      return "/characters/raven.png";
    case "elegant-muse":
      return "/characters/luna.png";
    case "best-friend-lover":
      return "/characters/aria.png";
    default:
      return "/characters/sera.png";
  }
}

function buildHeadline(input: CharacterBuilderInput): string {
  const name = input.name || "Unnamed Character";
  const role = archetypeToRole(input.archetype);
  const setting = clean(input.scenario?.setting);

  if (setting) {
    return `${name} — ${role} in ${setting}`;
  }

  return `${name} — ${role}`;
}

function buildArchetypeLabel(input: CharacterBuilderInput): string {
  return titleCase(input.archetype);
}

function slugTag(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildTags(input: CharacterBuilderInput): string[] {
  const autoTags = [
    input.archetype,
    input.genderPresentation,
    input.replyLength,
    input.speechStyle,
    input.relationshipPace,
  ];

  const dynamicTags: string[] = [];

  if (input.dominant >= 65) dynamicTags.push("dominant");
  if (input.affectionate >= 65) dynamicTags.push("affectionate");
  if (input.romantic >= 65) dynamicTags.push("romantic");
  if (input.playful >= 65) dynamicTags.push("playful");
  if (input.teasing >= 65) dynamicTags.push("teasing");
  if (input.mysterious >= 65) dynamicTags.push("mysterious");
  if (input.confident >= 65) dynamicTags.push("confident");
  if (input.jealous >= 65) dynamicTags.push("possessive");
  if (input.emotionalDepth >= 65) dynamicTags.push("emotionally-deep");

  if (clean(input.scenario?.tone)) {
    dynamicTags.push(slugTag(clean(input.scenario?.tone)!));
  }

  if (clean(input.scenario?.relationshipToUser)) {
    dynamicTags.push(slugTag(clean(input.scenario?.relationshipToUser)!));
  }

  if (clean(input.scenario?.setting)) {
    dynamicTags.push(slugTag(clean(input.scenario?.setting)!));
  }

  return Array.from(
    new Set([...(input.tags ?? []), ...autoTags, ...dynamicTags].filter(Boolean))
  );
}

function buildTraitBadges(input: CharacterBuilderInput): string[] {
  const mapped: Array<{ value: number; label: string }> = [
    { value: input.dominant, label: "Dominant" },
    { value: input.affectionate, label: "Affectionate" },
    { value: input.romantic, label: "Romantic" },
    { value: input.playful, label: "Playful" },
    { value: input.teasing, label: "Teasing" },
    { value: input.mysterious, label: "Mysterious" },
    { value: input.confident, label: "Confident" },
    { value: input.jealous, label: "Possessive" },
    { value: input.emotionalDepth, label: "Emotionally Deep" },
    { value: input.humor, label: "Humorous" },
  ];

  if (clean(input.scenario?.tone)) {
    mapped.push({ value: 72, label: titleFromFreeText(clean(input.scenario?.tone)!) });
  }

  if (clean(input.scenario?.relationshipToUser)) {
    mapped.push({
      value: 70,
      label: titleFromFreeText(clean(input.scenario?.relationshipToUser)!),
    });
  }

  return mapped
    .filter((item) => item.value >= 60)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((item) => item.label);
}

function titleFromFreeText(text: string): string {
  return text
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildPreviewMessage(input: CharacterBuilderInput): string {
  const sceneGoal = clean(input.scenario?.sceneGoal);

  if (input.dominant >= 75 && input.teasing >= 70) {
    return sceneGoal
      ? `Good. You're here. That already makes this more interesting. Now tell me whether we're about to ${sceneGoal.toLowerCase()}... or whether I need to drag the truth out of you myself.`
      : "Good. You're here. That already makes this more interesting.";
  }

  if (input.affectionate >= 75 && input.romantic >= 70) {
    return sceneGoal
      ? `Stay close. I want this moment to ${sceneGoal.toLowerCase()}, not disappear before it becomes real.`
      : "Stay close. I like you better when I have your full attention.";
  }

  if (input.mysterious >= 75) {
    return sceneGoal
      ? `You can keep looking at me like that, but I'm not showing everything at once. Not before we ${sceneGoal.toLowerCase()}.`
      : "You can keep looking at me like that, but I'm not giving everything away that easily.";
  }

  return "Come a little closer and let's see which version of each other shows up first.";
}

function buildScenarioHooks(input: CharacterBuilderInput): string[] {
  const hooks = [
    `Private one-on-one conversation with ${input.name || "the character"}.`,
  ];

  if (clean(input.backgroundVibe)) {
    hooks.push(
      `The emotional texture of the world feels shaped by ${clean(input.backgroundVibe)}.`
    );
  }

  if (clean(input.scenario?.setting)) {
    hooks.push(`The active setting is ${clean(input.scenario?.setting)}.`);
  }

  if (clean(input.scenario?.relationshipToUser)) {
    hooks.push(
      `The character relates to the user as: ${clean(
        input.scenario?.relationshipToUser
      )}.`
    );
  }

  if (clean(input.scenario?.sceneGoal)) {
    hooks.push(`The immediate scene goal is: ${clean(input.scenario?.sceneGoal)}.`);
  }

  if (clean(input.scenario?.tone)) {
    hooks.push(`The emotional tone should feel ${clean(input.scenario?.tone)}.`);
  }

  if (clean(input.scenario?.openingState)) {
    hooks.push(
      `The scene begins with the character already feeling: ${clean(
        input.scenario?.openingState
      )}.`
    );
  }

  if (input.relationshipPace === "slow-burn") {
    hooks.push("Tension builds gradually through chemistry, restraint, and emotional pacing.");
  }

  if (input.relationshipPace === "fast") {
    hooks.push("Chemistry forms quickly and emotional momentum arrives early.");
  }

  if (input.dominant >= 70) {
    hooks.push("The character tends to take the lead and steer the emotional direction.");
  }

  if (input.mysterious >= 70) {
    hooks.push("The character keeps some emotional distance and controlled intrigue.");
  }

  return hooks;
}

function buildBackstory(input: CharacterBuilderInput): string {
  const name = input.name || "Unnamed Character";
  const parts: string[] = [];

  if (clean(input.backgroundVibe)) {
    parts.push(`${name}'s energy has been shaped by ${clean(input.backgroundVibe)}.`);
  } else {
    parts.push(
      `${name} carries the emotional energy of a ${titleCase(
        input.archetype
      ).toLowerCase()} figure.`
    );
  }

  if (clean(input.scenario?.relationshipToUser)) {
    parts.push(
      `In this scene, the user stands in their life as ${clean(
        input.scenario?.relationshipToUser
      )}.`
    );
  }

  if (clean(input.scenario?.setting)) {
    parts.push(`Right now, their story is unfolding in ${clean(input.scenario?.setting)}.`);
  }

  if (clean(input.scenario?.sceneGoal)) {
    parts.push(`At this moment, they are trying to ${clean(input.scenario?.sceneGoal)}.`);
  }

  if (clean(input.scenario?.tone)) {
    parts.push(`The emotional current between them should feel ${clean(input.scenario?.tone)}.`);
  }

  if (clean(input.customNotes)) {
    parts.push(`Creator intent: ${clean(input.customNotes)}.`);
  }

  return parts.join(" ");
}

function buildMemorySeed(input: CharacterBuilderInput): string[] {
  const name = input.name || "Unnamed Character";
  const memory: string[] = [
    `${name} prefers a ${input.relationshipPace} relationship pace.`,
    `${name} speaks in a ${input.speechStyle} style with ${input.replyLength} replies.`,
  ];

  if (clean(input.scenario?.setting)) {
    memory.push(`${name} is currently in ${clean(input.scenario?.setting)}.`);
  }

  if (clean(input.scenario?.relationshipToUser)) {
    memory.push(
      `${name}'s relationship to the user is ${clean(input.scenario?.relationshipToUser)}.`
    );
  }

  if (clean(input.scenario?.sceneGoal)) {
    memory.push(`${name}'s current goal is to ${clean(input.scenario?.sceneGoal)}.`);
  }

  if (clean(input.scenario?.tone)) {
    memory.push(`${name}'s current emotional tone is ${clean(input.scenario?.tone)}.`);
  }

  if (input.dominant >= 65) memory.push(`${name} often leads the interaction.`);
  if (input.affectionate >= 65) memory.push(`${name} shows clear warmth and affection.`);
  if (input.teasing >= 65) memory.push(`${name} uses teasing to create chemistry.`);
  if (input.mysterious >= 65) memory.push(`${name} keeps some emotional mystery.`);
  if (input.romantic >= 65) memory.push(`${name} naturally builds romantic tension.`);

  return memory;
}

export type GeneratedCharacterPackage = {
  builder: CharacterBuilderInput;
  character: Character;
  traits: ReturnType<typeof buildCharacterEngineOutput>["traits"];
  systemPrompt: string;
};

export function convertBuilderToCharacter(
  input: CharacterBuilderInput
): GeneratedCharacterPackage {
  const normalizedName = input.name.trim() || "Unnamed Character";

  const normalizedInput: CharacterBuilderInput = {
    ...input,
    name: normalizedName,
    customNotes: clean(input.customNotes),
    scenario: input.scenario
      ? {
          setting: clean(input.scenario.setting),
          relationshipToUser: clean(input.scenario.relationshipToUser),
          sceneGoal: clean(input.scenario.sceneGoal),
          tone: clean(input.scenario.tone),
          openingState: clean(input.scenario.openingState),
        }
      : undefined,
  };

  const output = buildCharacterEngineOutput(normalizedInput);

  const scenario = normalizedInput.scenario
    ? {
        setting: clean(normalizedInput.scenario.setting),
        relationshipToUser: clean(normalizedInput.scenario.relationshipToUser),
        sceneGoal: clean(normalizedInput.scenario.sceneGoal),
        tone: clean(normalizedInput.scenario.tone),
        openingState: clean(normalizedInput.scenario.openingState),
      }
    : undefined;

  const baseCharacter = {
    slug: slugify(normalizedInput.name),
    name: normalizedInput.name,
    headline: buildHeadline(normalizedInput),
    archetype: buildArchetypeLabel(normalizedInput),
    role: archetypeToRole(normalizedInput.archetype),
    description: buildDescription(normalizedInput),
    personality: buildPersonality(normalizedInput),
    greeting: buildGreeting(normalizedInput),
    systemPrompt: output.systemPrompt,
    image: inferImage(normalizedInput),
    tags: buildTags(normalizedInput),
    traits: buildTraitBadges(normalizedInput),
    previewMessage: buildPreviewMessage(normalizedInput),
    scenarioHooks: buildScenarioHooks(normalizedInput),
    backstory: buildBackstory(normalizedInput),
    memory: buildMemorySeed(normalizedInput),
    scenario,
    createdFromBuilder: true,
  };

  const character = baseCharacter as unknown as Character;

  return {
    builder: normalizedInput,
    character,
    traits: output.traits,
    systemPrompt: output.systemPrompt,
  };
}
