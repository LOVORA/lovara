import {
  extractOpenRouterText,
  requestOpenRouterChat,
} from "@/lib/chat/openrouter";

export type ScenarioGenerationResult = {
  scenarioSummary: string;
  openingBeat: string;
  greeting: string;
  previewMessage: string;
  sceneAnchors: string[];
  memorySeeds: string[];
};

export type ScenarioGenerationInput = {
  apiKey: string;
  characterName: string;
  archetype?: string;
  role?: string;
  description?: string;
  personality?: string;
  backstory?: string;
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
  customScenario?: string;
  userRole?: string;
  tags?: string[];
  visualHints?: string[];
  identityHints?: string[];
  recognitionHints?: string[];
  existingGreeting?: string;
  existingPreviewMessage?: string;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function clamp(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function compactList(values: Array<string | null | undefined>, limit = 6) {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const value of values) {
    const cleaned = clean(value);
    if (!cleaned) continue;
    const key = cleaned.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(cleaned);
    if (items.length >= limit) break;
  }

  return items;
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const candidate = fencedMatch[1].trim();
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      return candidate;
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

function sanitizeList(value: unknown, limit = 5) {
  if (!Array.isArray(value)) return [];

  return compactList(
    value.map((item) => (typeof item === "string" ? item : "")),
    limit,
  ).map((item) => clamp(item, 120));
}

function sanitizeString(value: unknown, fallback: string, max: number) {
  if (typeof value !== "string") return fallback;
  const cleaned = clean(value);
  return cleaned ? clamp(cleaned, max) : fallback;
}

function buildFallbackResult(input: ScenarioGenerationInput): ScenarioGenerationResult {
  const scenarioSummary = clamp(
    [
      clean(input.setting) ? `In ${clean(input.setting)}` : "The scene opens immediately",
      clean(input.relationshipToUser)
        ? `${clean(input.characterName) || "The character"} meets the user as ${clean(input.relationshipToUser)}`
        : `${clean(input.characterName) || "The character"} meets the user with direct presence`,
      clean(input.tone) ? `with a ${clean(input.tone)} tone` : "",
      clean(input.sceneGoal) ? `while the moment leans toward ${clean(input.sceneGoal)}` : "",
      clean(input.customScenario),
    ]
      .filter(Boolean)
      .join(", ") + ".",
    220,
  );

  const openingBeat = clamp(
    [
      clean(input.openingState)
        ? `${clean(input.characterName) || "The character"} is already carrying ${clean(input.openingState)}.`
        : `${clean(input.characterName) || "The character"} is already tuned into the emotional temperature of the room.`,
      clean(input.relationshipToUser)
        ? `The connection lands through the frame of ${clean(input.relationshipToUser)}.`
        : "",
      clean(input.sceneGoal)
        ? `Underneath it, the scene is pushing toward ${clean(input.sceneGoal)}.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    240,
  );

  const greeting = clamp(
    clean(input.existingGreeting) ||
      `Come closer. This scene already started the second you stepped into it.`,
    260,
  );

  const previewMessage = clamp(
    clean(input.existingPreviewMessage) ||
      `The scene is already alive, intimate, and ready to move the instant the user replies.`,
    220,
  );

  return {
    scenarioSummary,
    openingBeat,
    greeting,
    previewMessage,
    sceneAnchors: compactList(
      [
        input.setting,
        input.relationshipToUser,
        input.sceneGoal,
        input.tone,
        input.openingState,
      ],
      4,
    ),
    memorySeeds: compactList(
      [
        input.archetype,
        input.role,
        input.personality,
        input.backstory,
      ],
      4,
    ),
  };
}

export async function generateScenarioOpeningPack(
  input: ScenarioGenerationInput,
): Promise<ScenarioGenerationResult> {
  const fallback = buildFallbackResult(input);

  const tags = compactList(input.tags ?? [], 8);
  const visualHints = compactList(input.visualHints ?? [], 5);
  const identityHints = compactList(input.identityHints ?? [], 6);
  const recognitionHints = compactList(input.recognitionHints ?? [], 4);

  const userPrompt = [
    "Create a richer opening pack for a fictional one-on-one roleplay character.",
    "Use the provided scenario fields as anchors, but expand them into a more cinematic, emotionally believable opening.",
    "Make it feel like a living scene, not a generic romantic setup.",
    "The first line must feel like the user is already dropped into the scene.",
    "Include more story specificity: scene pressure, an implied offscreen context, and a sharper reason this exact moment matters now.",
    "Return strict JSON only with these keys:",
    `{"scenarioSummary":"...","openingBeat":"...","greeting":"...","previewMessage":"...","sceneAnchors":["..."],"memorySeeds":["..."]}`,
    "",
    "Rules:",
    "- same fictional adult character",
    "- grounded and emotionally believable",
    "- vary the scenario texture and avoid generic late-night flirt defaults",
    "- no assistant, policy, or meta language",
    "- no markdown or code fences",
    "- scenarioSummary: 2 vivid sentences with clear setting, tension, and story leverage",
    "- openingBeat: 3-5 sentences describing emotional pressure, hidden want, and why the moment is unstable or alive",
    "- greeting: one in-character opening message to the user that drops them directly into the active scene",
    "- previewMessage: one short teaser sentence for UI",
    "- sceneAnchors: 3-5 short continuity anchors",
    "- memorySeeds: 3-5 short relational/personality anchors",
    "- use concrete scene language, not vague chemistry filler",
    "- build in one micro-conflict, one immediate emotional hook, and one role-specific pressure point",
    "",
    `Character name: ${clean(input.characterName) || "Character"}`,
    clean(input.archetype) ? `Archetype: ${clean(input.archetype)}` : "",
    clean(input.role) ? `Role: ${clean(input.role)}` : "",
    clean(input.description) ? `Description: ${clean(input.description)}` : "",
    clean(input.personality) ? `Personality: ${clean(input.personality)}` : "",
    clean(input.backstory) ? `Backstory: ${clean(input.backstory)}` : "",
    clean(input.setting) ? `Setting seed: ${clean(input.setting)}` : "",
    clean(input.relationshipToUser)
      ? `Relationship to user seed: ${clean(input.relationshipToUser)}`
      : "",
    clean(input.sceneGoal) ? `Scene goal seed: ${clean(input.sceneGoal)}` : "",
    clean(input.tone) ? `Tone seed: ${clean(input.tone)}` : "",
    clean(input.openingState) ? `Opening state seed: ${clean(input.openingState)}` : "",
    clean(input.customScenario) ? `Custom scenario seed: ${clean(input.customScenario)}` : "",
    clean(input.userRole) ? `User role seed: ${clean(input.userRole)}` : "",
    tags.length > 0 ? `Tags: ${tags.join(" | ")}` : "",
    visualHints.length > 0 ? `Visual hints: ${visualHints.join(" | ")}` : "",
    identityHints.length > 0 ? `Identity hints: ${identityHints.join(" | ")}` : "",
    recognitionHints.length > 0
      ? `Recognition/personalization hints: ${recognitionHints.join(" | ")}`
      : "",
    clean(input.existingGreeting)
      ? `Existing greeting to stay loosely aligned with: ${clean(input.existingGreeting)}`
      : "",
    clean(input.existingPreviewMessage)
      ? `Existing preview message to stay loosely aligned with: ${clean(input.existingPreviewMessage)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const openRouterResult = await requestOpenRouterChat({
    apiKey: input.apiKey,
    maxTokens: 850,
    temperature: 1.12,
    title: "Lovora Scenario Opening Generation",
    messages: [
      {
        role: "system",
        content:
          "You generate structured roleplay opening packs for fictional characters. Return only valid JSON. Make it immersive, grounded, and immediately scene-starting.",
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const rawText = extractOpenRouterText(openRouterResult.data);
  if (!rawText) {
    return fallback;
  }

  const jsonCandidate = extractJsonObject(rawText);
  if (!jsonCandidate) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;

    return {
      scenarioSummary: sanitizeString(parsed.scenarioSummary, fallback.scenarioSummary, 280),
      openingBeat: sanitizeString(parsed.openingBeat, fallback.openingBeat, 320),
      greeting: sanitizeString(parsed.greeting, fallback.greeting, 320),
      previewMessage: sanitizeString(
        parsed.previewMessage,
        fallback.previewMessage,
        220,
      ),
      sceneAnchors: sanitizeList(parsed.sceneAnchors, 5),
      memorySeeds: sanitizeList(parsed.memorySeeds, 5),
    };
  } catch {
    return fallback;
  }
}
