import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type TypedSupabaseClient = SupabaseClient<Database>;

export type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
export type DbMessageRow = Database["public"]["Tables"]["messages"]["Row"];

export type CharacterChatConfig = {
  slug: string;
  name: string;
  greeting: string;
};

function buildConversationTitle(characterName: string): string {
  return `Chat with ${characterName}`;
}

async function findExistingConversation(
  supabase: TypedSupabaseClient,
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

  return data?.[0] ?? null;
}

async function createConversation(
  supabase: TypedSupabaseClient,
  userId: string,
  character: CharacterChatConfig,
  firstAssistantMessage: string
): Promise<ConversationRow> {
  const cleanedFirstMessage = firstAssistantMessage.trim() || character.greeting;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      character_slug: character.slug,
      title: buildConversationTitle(character.name),
    })
    .select("id, user_id, character_slug, title, updated_at, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create conversation.");
  }

  const insertedConversation = data;

  const { error: greetingError } = await supabase.from("messages").insert({
    conversation_id: insertedConversation.id,
    role: "assistant",
    content: cleanedFirstMessage,
  });

  if (greetingError) {
    await supabase.from("conversations").delete().eq("id", insertedConversation.id);
    throw new Error(greetingError.message);
  }

  return insertedConversation;
}

export async function getOrCreateConversationForCharacter(
  supabase: TypedSupabaseClient,
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

  return createConversation(supabase, userId, character, character.greeting);
}

export async function createFreshConversationForCharacter(
  supabase: TypedSupabaseClient,
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
  supabase: TypedSupabaseClient,
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

  const messages = (data ?? []).filter(
    (message) => message.role === "assistant" || message.role === "user"
  );

  if (messages.length > 0) {
    return messages;
  }

  const cleanedFallbackGreeting = fallbackGreeting.trim();

  const { data: greetingRow, error: greetingError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: cleanedFallbackGreeting,
    })
    .select("id, conversation_id, role, content, created_at")
    .single();

  if (greetingError || !greetingRow) {
    throw new Error(
      greetingError?.message || "Could not restore the greeting message."
    );
  }

  return [greetingRow];
}
