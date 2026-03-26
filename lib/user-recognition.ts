import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type RecognitionClient = SupabaseClient<Database>;

export type RecognitionScope =
  | { builtInCharacterSlug: string; customCharacterId?: never }
  | { builtInCharacterSlug?: never; customCharacterId: string };

export type UserRecognitionMemory = {
  id?: string;
  userId: string;
  builtInCharacterSlug?: string;
  customCharacterId?: string;
  knownName?: string;
  knowsUser: boolean;
  recognitionBasis: string;
  introducedByUser: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UserRecognitionContract = {
  knowsUser: boolean;
  knownName?: string;
  recognitionBasis: string;
  shouldAskName: boolean;
  shouldUseKnownName: boolean;
  isAmbiguous: boolean;
};

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function lower(value?: string | null) {
  return clean(value).toLocaleLowerCase("en");
}

function containsAny(value: string, parts: string[]) {
  return parts.some((part) => value.includes(part));
}

function mapRecognitionRow(
  row: Record<string, unknown>,
): UserRecognitionMemory | null {
  const userId = typeof row.user_id === "string" ? clean(row.user_id) : "";
  if (!userId) return null;

  return {
    id: typeof row.id === "string" ? clean(row.id) : undefined,
    userId,
    builtInCharacterSlug:
      typeof row.built_in_character_slug === "string"
        ? clean(row.built_in_character_slug)
        : undefined,
    customCharacterId:
      typeof row.custom_character_id === "string"
        ? clean(row.custom_character_id)
        : undefined,
    knownName:
      typeof row.known_name === "string" ? clean(row.known_name) : undefined,
    knowsUser: row.knows_user === true,
    recognitionBasis:
      typeof row.recognition_basis === "string"
        ? clean(row.recognition_basis)
        : "unknown",
    introducedByUser: row.introduced_by_user === true,
    createdAt:
      typeof row.created_at === "string" ? clean(row.created_at) : undefined,
    updatedAt:
      typeof row.updated_at === "string" ? clean(row.updated_at) : undefined,
  };
}

export async function getProfileDisplayName(
  supabase: RecognitionClient,
  userId: string,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data && typeof data.display_name === "string"
    ? clean(data.display_name)
    : undefined;
}

export async function getUserRecognitionMemory(
  supabase: RecognitionClient,
  userId: string,
  scope: RecognitionScope,
): Promise<UserRecognitionMemory | null> {
  let query = supabase
    .from("user_character_recognition_memory" as never)
    .select("*")
    .eq("user_id", userId);

  if ("builtInCharacterSlug" in scope) {
    query = query.eq("built_in_character_slug", clean(scope.builtInCharacterSlug));
  } else {
    query = query.eq("custom_character_id", clean(scope.customCharacterId));
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data && typeof data === "object"
    ? mapRecognitionRow(data as Record<string, unknown>)
    : null;
}

export async function upsertUserRecognitionMemory(
  supabase: RecognitionClient,
  input: UserRecognitionMemory,
): Promise<UserRecognitionMemory> {
  const payload = {
    user_id: input.userId,
    built_in_character_slug: input.builtInCharacterSlug ?? null,
    custom_character_id: input.customCharacterId ?? null,
    known_name: input.knownName ?? null,
    knows_user: input.knowsUser,
    recognition_basis: clean(input.recognitionBasis) || "unknown",
    introduced_by_user: input.introducedByUser,
    updated_at: new Date().toISOString(),
  };

  const onConflict = input.builtInCharacterSlug
    ? "user_id,built_in_character_slug"
    : "user_id,custom_character_id";

  const { data, error } = await supabase
    .from("user_character_recognition_memory" as never)
    .upsert(payload as never, { onConflict })
    .select("*")
    .single();

  if (error || !data || typeof data !== "object") {
    throw new Error(error?.message || "Could not save recognition memory.");
  }

  const mapped = mapRecognitionRow(data as Record<string, unknown>);
  if (!mapped) {
    throw new Error("Recognition memory payload was invalid.");
  }

  return mapped;
}

export function inferRecognitionFromRole(args: {
  relationshipToUser?: string;
  openingState?: string;
  userRole?: string;
}): UserRecognitionContract {
  const corpus = [
    lower(args.relationshipToUser),
    lower(args.openingState),
    lower(args.userRole),
  ]
    .filter(Boolean)
    .join(" | ");

  const knownTokens = [
    "ex",
    "girlfriend",
    "boyfriend",
    "wife",
    "husband",
    "partner",
    "step mom",
    "stepmom",
    "step mother",
    "stepmother",
    "üvey",
    "best friend",
    "boss",
    "teacher",
    "neighbor",
    "neighbour",
    "roommate",
    "coworker",
    "co-worker",
    "colleague",
    "landlord",
    "friend",
    "protector",
    "bodyguard",
  ];
  const unknownTokens = [
    "stranger",
    "new",
    "met tonight",
    "first meeting",
    "just met",
    "unknown",
    "blind date",
  ];
  const ambiguousTokens = ["rival", "enemy", "competitor", "guarded"];

  if (containsAny(corpus, unknownTokens)) {
    return {
      knowsUser: false,
      recognitionBasis: "role_inference_unknown",
      shouldAskName: true,
      shouldUseKnownName: false,
      isAmbiguous: false,
    };
  }

  if (containsAny(corpus, knownTokens)) {
    return {
      knowsUser: true,
      recognitionBasis: "role_inference_known",
      shouldAskName: false,
      shouldUseKnownName: true,
      isAmbiguous: false,
    };
  }

  return {
    knowsUser: containsAny(corpus, ambiguousTokens),
    recognitionBasis: containsAny(corpus, ambiguousTokens)
      ? "role_inference_ambiguous_known"
      : "role_inference_ambiguous_unknown",
    shouldAskName: !containsAny(corpus, ambiguousTokens),
    shouldUseKnownName: containsAny(corpus, ambiguousTokens),
    isAmbiguous: true,
  };
}

export async function ensureUserRecognitionMemory(args: {
  supabase: RecognitionClient;
  userId: string;
  scope: RecognitionScope;
  relationshipToUser?: string;
  openingState?: string;
  userRole?: string;
  profileDisplayName?: string;
}): Promise<UserRecognitionMemory> {
  const existing = await getUserRecognitionMemory(args.supabase, args.userId, args.scope);
  if (existing) return existing;

  const inferred = inferRecognitionFromRole({
    relationshipToUser: args.relationshipToUser,
    openingState: args.openingState,
    userRole: args.userRole,
  });

  return upsertUserRecognitionMemory(args.supabase, {
    userId: args.userId,
    builtInCharacterSlug:
      "builtInCharacterSlug" in args.scope ? args.scope.builtInCharacterSlug : undefined,
    customCharacterId:
      "customCharacterId" in args.scope ? args.scope.customCharacterId : undefined,
    knownName: inferred.knowsUser ? clean(args.profileDisplayName) || undefined : undefined,
    knowsUser: inferred.knowsUser,
    recognitionBasis: inferred.recognitionBasis,
    introducedByUser: false,
  });
}

export function buildUserRecognitionContract(args: {
  memory: UserRecognitionMemory | null;
  profileDisplayName?: string;
  relationshipToUser?: string;
  openingState?: string;
  userRole?: string;
}): UserRecognitionContract {
  const inferred = inferRecognitionFromRole({
    relationshipToUser: args.relationshipToUser,
    openingState: args.openingState,
    userRole: args.userRole,
  });

  if (args.memory) {
    const knownName = clean(args.memory.knownName) || undefined;
    return {
      knowsUser: args.memory.knowsUser,
      knownName,
      recognitionBasis: args.memory.recognitionBasis,
      shouldAskName: !args.memory.knowsUser && !knownName,
      shouldUseKnownName: args.memory.knowsUser && Boolean(knownName),
      isAmbiguous: args.memory.recognitionBasis.includes("ambiguous"),
    };
  }

  const knownName = inferred.knowsUser
    ? clean(args.profileDisplayName) || undefined
    : undefined;

  return {
    ...inferred,
    knownName,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractIntroducedUserName(text: string): string | undefined {
  const value = clean(text);
  if (!value) return undefined;

  const patterns = [
    /\bmy name is\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{0,40})/i,
    /\bi am\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{0,40})/i,
    /\bi'm\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{0,40})/i,
    /\bcall me\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{0,40})/i,
    /\bbenim adım\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{0,40})/i,
    /\badenim\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{0,40})/i,
    /\bbana\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]{0,40})\s+de\b/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    const candidate = clean(match?.[1]);
    if (candidate) return candidate.replace(/[.,!?;:]+$/, "");
  }

  return undefined;
}

export function buildRecognitionPromptLines(
  contract: UserRecognitionContract,
): string[] {
  if (contract.knowsUser && contract.knownName) {
    return [
      `This character already knows the user's name: ${contract.knownName}.`,
      "Use the known name naturally when it fits the role and scene.",
      "Do not ask the user's name again unless the scene explicitly makes that necessary.",
    ];
  }

  if (contract.knowsUser) {
    return [
      "This role plausibly already knows the user.",
      "Behave with existing familiarity rather than first-meeting distance.",
      "Do not ask for the user's name like this is a first introduction.",
    ];
  }

  return [
    "This character does not firmly know the user's name yet.",
    "Do not act like the user is already personally known by name.",
    "If the moment naturally allows it, the character may ask what to call the user.",
  ];
}

function injectKnownNameIntoGreeting(baseGreeting: string, knownName: string) {
  const greeting = clean(baseGreeting);
  const name = clean(knownName);
  if (!greeting || !name) return greeting;
  if (new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(greeting)) {
    return greeting;
  }

  const replacements: Array<[RegExp, string]> = [
    [/\bHey you\b/i, `Hey ${name}`],
    [/\bthere you are\b/i, `there you are, ${name}`],
    [/\bWelcome back\b/i, `Welcome back, ${name}`],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(greeting)) {
      return greeting.replace(pattern, replacement);
    }
  }

  const punctMatch = greeting.match(/[.!?]/);
  if (punctMatch && typeof punctMatch.index === "number") {
    const index = punctMatch.index;
    return `${greeting.slice(0, index)}, ${name}${greeting.slice(index)}`;
  }

  return `${greeting} ${name}.`;
}

export function buildRecognitionAwareGreeting(args: {
  baseGreeting?: string;
  contract: UserRecognitionContract;
}): string {
  const baseGreeting = clean(args.baseGreeting);
  const fallbackGreeting = '"What should I call you?"';

  if (args.contract.knowsUser && args.contract.knownName) {
    return injectKnownNameIntoGreeting(baseGreeting || fallbackGreeting, args.contract.knownName);
  }

  if (!args.contract.knowsUser && args.contract.shouldAskName) {
    if (/what should i call you|adın ne|sana ne diyeyim/i.test(baseGreeting)) {
      return baseGreeting || fallbackGreeting;
    }
    if (!baseGreeting) {
      return fallbackGreeting;
    }
    return `${baseGreeting} "What should I call you?"`;
  }

  return baseGreeting || fallbackGreeting;
}
