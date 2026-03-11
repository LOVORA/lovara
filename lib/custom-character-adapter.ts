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
  const archetypeText = titleCase(input.archetype);
  const styleBits = [
    `${input.name} is a ${archetypeText.toLowerCase()} character`,
    `with a ${input.ageVibe} vibe`,
    `and a ${input.genderPresentation} presentation`,
  ];

  const tags =
    input.tags && input.tags.length > 0
      ? ` Core traits include ${input.tags.join(", ")}.`
      : "";

  return `${styleBits.join(" ")}. Background vibe: ${input.backgroundVibe}.${tags}`;
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
  const dominantHigh = input.dominant >= 70;
  const affectionateHigh = input.affectionate >= 70;
  const teasingHigh = input.teasing >= 70;
  const mysteriousHigh = input.mysterious >= 70;

  if (dominantHigh && teasingHigh) {
    return `There you are. I was starting to think I'd have to come find you myself. So... are you going to behave for me tonight, or make this more interesting?`;
  }

  if (affectionateHigh && input.romantic >= 70) {
    return `Hey... come here for a second. I've been wanting your attention, and now that you're finally here, I don't really want to share it.`;
  }

  if (mysteriousHigh) {
    return `You made it. Good. Sit with me for a while and maybe I'll let you discover what kind of trouble you've just walked into.`;
  }

  return `Hey you. Come closer... I want to see what kind of chemistry we're going to create together tonight.`;
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
  const role = archetypeToRole(input.archetype);
  return `${input.name} — ${role}`;
}

function buildArchetypeLabel(input: CharacterBuilderInput): string {
  return titleCase(input.archetype);
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

  return mapped
    .filter((item) => item.value >= 60)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((item) => item.label);
}

function buildPreviewMessage(input: CharacterBuilderInput): string {
  if (input.dominant >= 75 && input.teasing >= 70) {
    return "Good. You’re here. That already makes this more interesting.";
  }

  if (input.affectionate >= 75 && input.romantic >= 70) {
    return "Stay close. I like you better when I have your full attention.";
  }

  if (input.mysterious >= 75) {
    return "You can keep looking at me like that, but I’m not giving everything away that easily.";
  }

  return "Come a little closer and let’s see what kind of story we create.";
}

function buildScenarioHooks(input: CharacterBuilderInput): string[] {
  const hooks = [
    `Private late-night chat with ${input.name}.`,
    `A slow personal conversation shaped by ${input.backgroundVibe}.`,
  ];

  if (input.relationshipPace === "slow-burn") {
    hooks.push("Tension builds gradually through chemistry, curiosity, and emotional pacing.");
  }

  if (input.relationshipPace === "fast") {
    hooks.push("Chemistry forms quickly and the character engages with immediate emotional momentum.");
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
  const parts = [
    `${input.name} carries the energy of a ${titleCase(input.archetype).toLowerCase()} figure.`,
    `Their world feels rooted in ${input.backgroundVibe}.`,
    `They present as ${input.genderPresentation} with a ${input.ageVibe} age vibe.`,
    `Their relational pace is ${input.relationshipPace}, and their speech style leans ${input.speechStyle}.`,
  ];

  if (input.customNotes?.trim()) {
    parts.push(`Additional creator intent: ${input.customNotes.trim()}`);
  }

  return parts.join(" ");
}

function buildMemorySeed(input: CharacterBuilderInput): string[] {
  const memory: string[] = [
    `${input.name} prefers a ${input.relationshipPace} relationship pace.`,
    `${input.name} speaks in a ${input.speechStyle} style with ${input.replyLength} replies.`,
  ];

  if (input.dominant >= 65) memory.push(`${input.name} often leads the interaction.`);
  if (input.affectionate >= 65) memory.push(`${input.name} shows clear warmth and affection.`);
  if (input.teasing >= 65) memory.push(`${input.name} uses teasing to create chemistry.`);
  if (input.mysterious >= 65) memory.push(`${input.name} keeps some emotional mystery.`);
  if (input.romantic >= 65) memory.push(`${input.name} naturally builds romantic tension.`);

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
  const output = buildCharacterEngineOutput(input);

  const baseCharacter = {
    slug: slugify(input.name),
    name: input.name,
    headline: buildHeadline(input),
    archetype: buildArchetypeLabel(input),
    role: archetypeToRole(input.archetype),
    description: buildDescription(input),
    personality: buildPersonality(input),
    greeting: buildGreeting(input),
    systemPrompt: output.systemPrompt,
    image: inferImage(input),
    tags: buildTags(input),
    traits: buildTraitBadges(input),
    previewMessage: buildPreviewMessage(input),
    scenarioHooks: buildScenarioHooks(input),

    backstory: buildBackstory(input),
    memory: buildMemorySeed(input),

    createdFromBuilder: true,
  };

  const character = baseCharacter as unknown as Character;

  return {
    builder: input,
    character,
    traits: output.traits,
    systemPrompt: output.systemPrompt,
  };
}
