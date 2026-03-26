const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenRouterRouteConfig = {
  primaryModel: string;
  fallbackModel: string;
  routingStrategy: "primary_then_fallback";
  choiceWeightVersion: "life_stage_choice_weighting_v1";
  lifeStageMode: "adult_realism_v1";
  behaviorDerivationMode: "hidden_choice_weighting_v1";
  earlyTurnProfile: "early_turn_excellence_v2";
  scenarioEngineVersion: "scenario_truth_v1";
  roleplayTruthProfile: "scenario_first_realism_v1";
  questionDisciplineMode: "scene_first_no_broad_questions_v1";
  intimacyGateMode: "earned_mature_romantic_v1";
  rejectionStyle: "realistic_pushback_v1";
  matureToneProfile: "mature_romantic_realism_v1";
  realismProfile: "grounded_human_v1";
  qualityPassMode: "selective_second_pass_v1";
  pushbackPolicy: "strong_pushback_v1";
  permissionModel: "earned_permission_v2";
  sceneEngineVersion: "scene_engine_v2";
  rewriteCriticMode: "human_realism_critic_v2";
  initiativePolicy: "character_leads_often_v1";
};

type OpenRouterRequestArgs = {
  apiKey: string;
  messages: OpenRouterMessage[];
  maxTokens: number;
  temperature: number;
  siteUrl?: string;
  title?: string;
};

type OpenRouterRequestResult = {
  data: unknown;
  modelUsed: string;
  route: OpenRouterRouteConfig;
};

function getStringEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getOpenRouterRouteConfig(): OpenRouterRouteConfig {
  const primaryModel =
    getStringEnv("OPENROUTER_ROLEPLAY_MODEL") ??
    getStringEnv("OPENROUTER_MODEL") ??
    "x-ai/grok-4-fast";
  const fallbackModel =
    getStringEnv("OPENROUTER_FALLBACK_MODEL") ??
    getStringEnv("OPENROUTER_MODEL") ??
    "x-ai/grok-3-mini";

  return {
    primaryModel,
    fallbackModel,
    routingStrategy: "primary_then_fallback",
    choiceWeightVersion: "life_stage_choice_weighting_v1",
    lifeStageMode: "adult_realism_v1",
    behaviorDerivationMode: "hidden_choice_weighting_v1",
    earlyTurnProfile: "early_turn_excellence_v2",
    scenarioEngineVersion: "scenario_truth_v1",
    roleplayTruthProfile: "scenario_first_realism_v1",
    questionDisciplineMode: "scene_first_no_broad_questions_v1",
    intimacyGateMode: "earned_mature_romantic_v1",
    rejectionStyle: "realistic_pushback_v1",
    matureToneProfile: "mature_romantic_realism_v1",
    realismProfile: "grounded_human_v1",
    qualityPassMode: "selective_second_pass_v1",
    pushbackPolicy: "strong_pushback_v1",
    permissionModel: "earned_permission_v2",
    sceneEngineVersion: "scene_engine_v2",
    rewriteCriticMode: "human_realism_critic_v2",
    initiativePolicy: "character_leads_often_v1",
  };
}

export function extractOpenRouterText(data: unknown): string | null {
  return data &&
    typeof data === "object" &&
    "choices" in data &&
    Array.isArray(data.choices) &&
    data.choices[0] &&
    typeof data.choices[0] === "object" &&
    data.choices[0] &&
    "message" in data.choices[0] &&
    data.choices[0].message &&
    typeof data.choices[0].message === "object" &&
    "content" in data.choices[0].message &&
    typeof data.choices[0].message.content === "string"
    ? data.choices[0].message.content.trim() || null
    : null;
}

async function callOpenRouter(args: OpenRouterRequestArgs & { model: string }) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      ...(args.siteUrl ? { "HTTP-Referer": args.siteUrl } : {}),
      ...(args.title ? { "X-Title": args.title } : {}),
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      messages: args.messages,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      data.error &&
      typeof data.error === "object" &&
      "message" in data.error &&
      typeof data.error.message === "string"
        ? data.error.message
        : data &&
            typeof data === "object" &&
            "message" in data &&
            typeof data.message === "string"
          ? data.message
          : "OpenRouter request failed.";

    throw new Error(message);
  }

  return data;
}

export async function requestOpenRouterChat(
  args: OpenRouterRequestArgs,
): Promise<OpenRouterRequestResult> {
  const route = getOpenRouterRouteConfig();

  try {
    const data = await callOpenRouter({
      ...args,
      model: route.primaryModel,
    });

    return {
      data,
      modelUsed: route.primaryModel,
      route,
    };
  } catch (primaryError) {
    if (route.fallbackModel === route.primaryModel) {
      throw primaryError;
    }

    const data = await callOpenRouter({
      ...args,
      model: route.fallbackModel,
    });

    return {
      data,
      modelUsed: route.fallbackModel,
      route,
    };
  }
}
