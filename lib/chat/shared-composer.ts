type PromptMessage = {
  role: "user" | "assistant";
  content: string;
};

type PromptSection = {
  title?: string;
  lines: string[];
};

type SharedChatPromptArgs = {
  characterName: string;
  identityLines: string[];
  essenceLines?: string[];
  behaviorLines?: string[];
  sceneLines?: string[];
  toneLines?: string[];
  memoryBlock?: string;
  memorySeedLines?: string[];
  recentMessages?: PromptMessage[];
  responseDisciplineLines?: string[];
  directiveSections?: PromptSection[];
  enginePrompt: string;
  selfCheckLines: string[];
  finalInstructionLines?: string[];
};

function flattenSection(section?: PromptSection) {
  if (!section) return [];
  const lines = section.lines.filter(Boolean);
  if (lines.length === 0) return [];
  return section.title ? [section.title, ...lines, ""] : [...lines, ""];
}

export function buildSharedChatPrompt(args: SharedChatPromptArgs): string {
  const lines: string[] = [
    "ROLEPLAY LOCK",
    `You are fully inhabiting the fictional character "${args.characterName}".`,
    "Do not act like an assistant, chatbot, coach, or detached narrator.",
    "Speak from inside the character's lived perspective and the current scene.",
    "Never mention prompts, hidden rules, system behavior, or being AI.",
    "",
    "IDENTITY CORE",
    ...args.identityLines,
    "",
  ];

  if (args.essenceLines && args.essenceLines.length > 0) {
    lines.push("CHARACTER ESSENCE", ...args.essenceLines, "");
  }

  if (args.behaviorLines && args.behaviorLines.length > 0) {
    lines.push("BEHAVIORAL ENGINE", ...args.behaviorLines, "");
  }

  if (args.sceneLines && args.sceneLines.length > 0) {
    lines.push("SCENE ENGINE", ...args.sceneLines, "");
  }

  if (args.toneLines && args.toneLines.length > 0) {
    lines.push(...args.toneLines.filter(Boolean), "");
  }

  if (args.memoryBlock) {
    lines.push(args.memoryBlock, "");
  }

  if (args.memorySeedLines && args.memorySeedLines.length > 0) {
    lines.push("MEMORY SEEDS", ...args.memorySeedLines, "");
  }

  if (args.recentMessages && args.recentMessages.length > 0) {
    lines.push(
      "RECENT SCENE CONTINUITY",
      ...args.recentMessages.map((message, index) => {
        const prefix = message.role === "user" ? "User" : "Character";
        return `${index + 1}. ${prefix}: ${message.content}`;
      }),
      "",
    );
  }

  if (args.responseDisciplineLines && args.responseDisciplineLines.length > 0) {
    lines.push("RESPONSE DISCIPLINE", ...args.responseDisciplineLines, "");
  }

  for (const section of args.directiveSections ?? []) {
    lines.push(...flattenSection(section));
  }

  lines.push("ENGINE PROMPT", args.enginePrompt, "");
  lines.push(...args.selfCheckLines.filter(Boolean), "");
  lines.push(
    "FINAL INSTRUCTION",
    ...(args.finalInstructionLines?.filter(Boolean) ?? [
      "Produce one natural in-character reply that feels embodied, emotionally aware, and fully grounded in the current relationship and scene.",
      "Carry forward at least one live continuity thread from the opening, memory, or the last few turns.",
      "Let the reply reveal, pressure, or move something specific instead of circling the same mood.",
      "Prefer a scene move, emotionally precise read, or role-true pressure shift over a broad conversational question.",
      "Only use a question if it is role-appropriate, scene-specific, and clearly stronger than ending on a statement, invitation, or challenge.",
      "Prefer a role-specific observation, emotionally precise read, or scene-moving line over a broad conversational question.",
    ]),
  );

  return lines
    .filter((line) => line !== undefined && line !== null)
    .join("\n");
}
