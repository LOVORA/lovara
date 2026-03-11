import type { SupabaseClient } from "@supabase/supabase-js";

export type ConversationRow = {
  id: string;
  user_id: string;
  character_slug: string;
  title: string;
  updated_at: string;
  created_at?: string;
};

export type DbMessageRow = {
  id: string;
  conversation_id: string;
  role: "assistant" | "user" | "system";
  content: string;
  created_at: string;
};

export type CharacterChatConfig = {
  slug: string;
  name: string;
  greeting: string;
};

async function findExistingConversation(
  supabase: SupabaseClient,
  userId: string,
  characterSlug: string
): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, user_id, character_slug, title, updated_at, created_at")
    .eq("user_id", userId)
    .eq("character_slug", characterSlug)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data as ConversationRow[] | null) ?? [];
  return rows[0] ?? null;
}

async function createConversation(
  supabase: SupabaseClient,
  userId: string,
  character: CharacterChatConfig,
  firstAssistantMessage: string
): Promise<ConversationRow> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      character_slug: character.slug,
      title: `Chat with ${character.name}`,
    })
    .select("id, user_id, character_slug, title, updated_at, created_at");

  const insertedConversation = ((data as ConversationRow[] | null) ?? [])[0] ?? null;

  if (!insertedConversation) {
    throw new Error(error?.message || "Could not create conversation.");
  }

  const { error: greetingError } = await supabase.from("messages").insert({
    conversation_id: insertedConversation.id,
    role: "assistant",
    content: firstAssistantMessage,
  });

  if (greetingError) {
    throw new Error(greetingError.message);
  }

  return insertedConversation;
}

export async function getOrCreateConversationForCharacter(
  supabase: SupabaseClient,
  userId: string,
  character: CharacterChatConfig
): Promise<ConversationRow> {
  const existingConversation = await findExistingConversation(
    supabase,
    userId,
    character.slug
  );

  if (existingConversation) {
    return existingConversation;
  }

  const createdConversation = await createConversation(
    supabase,
    userId,
    character,
    character.greeting
  );

  return createdConversation;
}

export async function createFreshConversationForCharacter(
  supabase: SupabaseClient,
  userId: string,
  character: CharacterChatConfig,
  firstAssistantMessage?: string
): Promise<ConversationRow> {
  return createConversation(
    supabase,
    userId,
    character,
    firstAssistantMessage?.trim() || character.greeting
  );
}

export async function loadConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  fallbackGreeting: string
): Promise<DbMessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const messages = ((data as DbMessageRow[] | null) ?? []).filter(
    (message) => message.role === "assistant" || message.role === "user"
  );

  if (messages.length > 0) {
    return messages;
  }

  const { data: greetingRows, error: greetingError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: fallbackGreeting,
    })
    .select("id, conversation_id, role, content, created_at");

  const greeting = ((greetingRows as DbMessageRow[] | null) ?? [])[0] ?? null;

  if (greetingError || !greeting) {
    throw new Error(
      greetingError?.message || "Could not restore the greeting message."
    );
  }

  return [greeting];
}
