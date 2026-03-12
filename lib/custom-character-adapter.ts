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

  const parts: string[] = [
    `${name} is a ${archetypeText} character with a ${input.genderPresentation} presentation`,
  ];

  if (clean(input.ageVibe)) {
    parts.push(`and a ${clean(input.ageVibe)} age vibe`);
  }

  let sentence = `${parts.join(" ")}.`;

  if (clean(input.backgroundVibe)) {
    sentence += ` Their atmosphere is shaped by ${clean(input.backgroundVibe)}.`;
  }

  if (clean(input.history?.occupation)) {
    sentence += ` In the world around them, they move through life as ${clean(
      input.history?.occupation
    )}.`;
  }

  if (clean(input.history?.publicMask) && clean(input.history?.privateSelf)) {
    sentence += ` Most people read them as ${clean(
      input.history?.publicMask
    )}, but underneath that they are ${clean(input.history?.privateSelf)}.`;
  } else if (clean(input.history?.publicMask)) {
    sentence += ` They tend to come across as ${clean(input.history?.publicMask)}.`;
  } else if (clean(input.history?.privateSelf)) {
    sentence += ` Beneath the surface, they are ${clean(input.history?.privateSelf)}.`;
  }

  if (clean(input.scenario?.setting)) {
    sentence += ` The current scene places them in ${clean(input.scenario?.setting)}.`;
  }

  if (input.tags && input.tags.length > 0) {
    sentence += ` Core signals: ${input.tags.join(", ")}.`;
  }

  return sentence.trim();
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

  const historyInfluence: string[] = [];
  if (clean(input.history?.publicMask)) historyInfluence.push(clean(input.history?.publicMask)!);
  if (clean(input.history?.privateSelf)) historyInfluence.push(clean(input.history?.privateSelf)!);

  const combined = [...strongTraits, ...historyInfluence].slice(0, 6);

  if (combined.length === 0) {
    return "Balanced, engaging, and adaptable.";
  }

  return (
    combined
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
  const wound = clean(input.history?.emotionalWound);
  const desire = clean(input.history?.definingDesire);

  const sceneLead = [openingState, setting ? `in ${setting}` : undefined]
    .filter(Boolean)
    .join(" ");

  const prefix = sceneLead
    ? `${sceneLead.charAt(0).toUpperCase()}${sceneLead.slice(1)}, `
    : "";

  if (input.dominant >= 70 && input.teasing >= 70) {
    return `${prefix}${tone ? `${tone.toLowerCase()} and controlled, ` : ""}${name} studies you like they've already decided this conversation belongs to them.

"There you are. I was starting to wonder whether you'd actually show up. ${
      relationship ? `For someone who's supposed to be ${relationship.toLowerCase()},` : ""
    } you do like testing my patience.

So tell me... are you here to be honest with me tonight, or make this even more complicated?"`;
  }

  if (input.affectionate >= 70 && input.romantic >= 70) {
    return `${prefix}${tone ? `${tone.toLowerCase()} and warm, ` : ""}${name}'s expression softens the second their attention lands on you.

"Hey... come closer for a second. ${
      desire ? `I've been wanting something simple lately—${desire.toLowerCase()}.` : "I've been wanting your attention more than I should admit."
    }

You don't have to pretend with me tonight."`;
  }

  if (input.mysterious >= 70) {
    return `${prefix}${tone ? `${tone.toLowerCase()} and unreadable, ` : ""}${name} lets the silence sit for a second too long before speaking.

"You made it. Good. ${
      wound
        ? `Most people only notice the version of me that's easiest to survive.`
        : `I was curious whether you'd still come when the room got quieter.`
    }

Sit with me for a while... and maybe I'll let you see which part of me is real tonight."`;
  }

  return `${prefix}${name} turns toward you with a measured kind of attention.

"You're here. Good.
${relationship ? `That already changes the mood between us, ${relationship.toLowerCase()} or not.` : ""}
Let's not waste this moment pretending we're strangers to what this could become."`;
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
  const occupation = clean(input.history?.occupation);
  const setting = clean(input.scenario?.setting);

  if (occupation && setting) {
    return `${name} — ${role}, ${occupation} in ${setting}`;
  }

  if (occupation) {
    return `${name} — ${role}, ${occupation}`;
  }

  if (setting) {
    return `${name} — ${role} in ${setting}`;
  }

  return `${name} — ${role}`;
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

  if (clean(input.scenario?.tone)) {
    dynamicTags.push(clean(input.scenario?.tone)!.toLowerCase().replace(/\s+/g, "-"));
  }

  if (clean(input.scenario?.relationshipToUser)) {
    dynamicTags.push(
      clean(input.scenario?.relationshipToUser)!.toLowerCase().replace(/\s+/g, "-")
    );
  }

  if (clean(input.history?.occupation)) {
    dynamicTags.push(clean(input.history?.occupation)!.toLowerCase().replace(/\s+/g, "-"));
  }

  if (clean(input.history?.publicMask)) {
    dynamicTags.push(clean(input.history?.publicMask)!.toLowerCase().replace(/\s+/g, "-"));
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

  if (clean(input.history?.publicMask)) {
    mapped.push({ value: 72, label: titleFromFreeText(clean(input.history?.publicMask)!) });
  }

  if (clean(input.history?.privateSelf)) {
    mapped.push({ value: 74, label: titleFromFreeText(clean(input.history?.privateSelf)!) });
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
  const desire = clean(input.history?.definingDesire);
  const secret = clean(input.history?.secret);

  if (input.dominant >= 75 && input.teasing >= 70) {
    return sceneGoal
      ? `Good. You're here. That already makes this more interesting. Now tell me whether we're about to ${sceneGoal.toLowerCase()}... or whether I need to drag the truth out of you myself.`
      : "Good. You're here. That already makes this more interesting.";
  }

  if (input.affectionate >= 75 && input.romantic >= 70) {
    return desire
      ? `Stay close. I like people better when they stop pretending. Especially when what I want is ${desire.toLowerCase()}.`
      : "Stay close. I like you better when I have your full attention.";
  }

  if (input.mysterious >= 75) {
    return secret
      ? `You can keep looking at me like that, but I'm not careless enough to show everything at once. Not when I still have something to protect.`
      : "You can keep looking at me like that, but I'm not giving everything away that easily.";
  }

  return "Come a little closer and let's see which version of each other shows up first.";
}

function buildScenarioHooks(input: CharacterBuilderInput): string[] {
  const hooks = [
    `Private one-on-one conversation with ${input.name || "the character"}.`,
  ];

  if (clean(input.backgroundVibe)) {
    hooks.push(`The emotional texture of the world feels shaped by ${clean(input.backgroundVibe)}.`);
  }

  if (clean(input.scenario?.setting)) {
    hooks.push(`The active setting is ${clean(input.scenario?.setting)}.`);
  }

  if (clean(input.scenario?.relationshipToUser)) {
    hooks.push(
      `The character relates to the user as: ${clean(input.scenario?.relationshipToUser)}.`
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

  if (clean(input.history?.occupation)) {
    hooks.push(`Their social role in this world is ${clean(input.history?.occupation)}.`);
  }

  if (clean(input.history?.publicMask)) {
    hooks.push(`Outwardly, they appear ${clean(input.history?.publicMask)}.`);
  }

  if (clean(input.history?.privateSelf)) {
    hooks.push(`Privately, they are ${clean(input.history?.privateSelf)}.`);
  }

  if (clean(input.history?.definingDesire)) {
    hooks.push(`What they deeply want is ${clean(input.history?.definingDesire)}.`);
  }

  if (clean(input.history?.emotionalWound)) {
    hooks.push(`They are shaped by the wound of ${clean(input.history?.emotionalWound)}.`);
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
  const history = input.history;

  if (clean(history?.manualBackstory)) {
    return clean(history?.manualBackstory)!;
  }

  const parts: string[] = [];

  if (clean(history?.origin)) {
    parts.push(`${name} comes from ${clean(history?.origin)}.`);
  } else if (clean(input.backgroundVibe)) {
    parts.push(`${name}'s life has been shaped by ${clean(input.backgroundVibe)}.`);
  } else {
    parts.push(
      `${name} carries the emotional energy of a ${titleCase(
        input.archetype
      ).toLowerCase()} figure.`
    );
  }

  if (clean(history?.occupation)) {
    parts.push(`They learned to move through the world as ${clean(history?.occupation)}.`);
  }

  if (clean(history?.publicMask) && clean(history?.privateSelf)) {
    parts.push(
      `To most people, ${name} seems ${clean(history?.publicMask)}, but underneath that exterior they are ${clean(
        history?.privateSelf
      )}.`
    );
  } else if (clean(history?.publicMask)) {
    parts.push(`Most people know ${name} as someone ${clean(history?.publicMask)}.`);
  } else if (clean(history?.privateSelf)) {
    parts.push(`Very few people notice that ${name} is actually ${clean(history?.privateSelf)}.`);
  }

  if (clean(history?.definingDesire)) {
    parts.push(`What drives them most is ${clean(history?.definingDesire)}.`);
  }

  if (clean(history?.emotionalWound)) {
    parts.push(
      `Part of the reason they love, hesitate, test people, or hold back comes from ${clean(
        history?.emotionalWound
      )}.`
    );
  }

  if (clean(history?.secret)) {
    parts.push(`There is also something they rarely admit: ${clean(history?.secret)}.`);
  }

  if (clean(input.scenario?.setting)) {
    parts.push(`Right now, their story is unfolding in ${clean(input.scenario?.setting)}.`);
  }

  if (clean(input.scenario?.relationshipToUser)) {
    parts.push(
      `Inside this scene, the user stands in their life as ${clean(
        input.scenario?.relationshipToUser
      )}.`
    );
  }

  if (clean(input.scenario?.sceneGoal)) {
    parts.push(`At this moment, they are trying to ${clean(input.scenario?.sceneGoal)}.`);
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

  if (clean(input.history?.occupation)) {
    memory.push(`${name}'s role in the world is ${clean(input.history?.occupation)}.`);
  }

  if (clean(input.history?.publicMask)) {
    memory.push(`${name} usually presents as ${clean(input.history?.publicMask)}.`);
  }

  if (clean(input.history?.privateSelf)) {
    memory.push(`${name}'s deeper self is ${clean(input.history?.privateSelf)}.`);
  }

  if (clean(input.history?.definingDesire)) {
    memory.push(`${name} deeply wants ${clean(input.history?.definingDesire)}.`);
  }

  if (clean(input.history?.emotionalWound)) {
    memory.push(`${name} is still shaped by ${clean(input.history?.emotionalWound)}.`);
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

  const history = normalizedInput.history
    ? {
        origin: clean(normalizedInput.history.origin),
        occupation: clean(normalizedInput.history.occupation),
        publicMask: clean(normalizedInput.history.publicMask),
        privateSelf: clean(normalizedInput.history.privateSelf),
        definingDesire: clean(normalizedInput.history.definingDesire),
        emotionalWound: clean(normalizedInput.history.emotionalWound),
        secret: clean(normalizedInput.history.secret),
        manualBackstory: clean(normalizedInput.history.manualBackstory),
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
    history,
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
