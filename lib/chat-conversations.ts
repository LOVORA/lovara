import { createUserRouteClient } from "@/lib/supabase-route";
import {
  buildNextMemoryState,
  normalizeStoredMemoryState,
  type ConversationMemoryState,
  type MemoryChatMessage,
} from "@/lib/conversation-memory";

type BuiltInConversationRow = {
  id: string;
  user_id: string;
  character_slug: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type BuiltInMessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

type CustomMessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function isMemoryMessageRow(
  row: BuiltInMessageRow,
): row is BuiltInMessageRow & { role: "user" | "assistant" } {
  return row.role === "user" || row.role === "assistant";
}

function mapBuiltInMessages(rows: BuiltInMessageRow[]): MemoryChatMessage[] {
  return rows
    .filter(isMemoryMessageRow)
    .map((row) => ({
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
}

function mapCustomMessages(rows: CustomMessageRow[]): MemoryChatMessage[] {
  return rows.map((row) => ({
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function requireRouteUser(accessToken: string) {
  const client = createUserRouteClient(accessToken);

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  return { client, user };
}

export async function getOrCreateBuiltInConversation(
  accessToken: string,
  characterSlug: string,
  title?: string,
): Promise<BuiltInConversationRow> {
  const { client, user } = await requireRouteUser(accessToken);

  const { data: existing, error: existingError } = await client
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .eq("character_slug", characterSlug)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return existing as BuiltInConversationRow;
  }

  const { data, error } = await client
    .from("conversations")
    .insert({
      user_id: user.id,
      character_slug: characterSlug,
      title: clean(title) || characterSlug,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create built-in conversation.");
  }

  return data as BuiltInConversationRow;
}

export async function listBuiltInConversationMessages(
  accessToken: string,
  conversationId: string,
): Promise<BuiltInMessageRow[]> {
  const { client, user } = await requireRouteUser(accessToken);

  const { data, error } = await client
    .from("messages")
    .select("*")
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BuiltInMessageRow[];
}

export async function insertBuiltInConversationMessage(
  accessToken: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
) {
  const { client, user } = await requireRouteUser(accessToken);

  const { data, error } = await client
    .from("messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content: clean(content),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not save built-in message.");
  }

  await client
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  return data as BuiltInMessageRow;
}

export async function listCustomConversationMessages(
  accessToken: string,
  conversationId: string,
): Promise<CustomMessageRow[]> {
  const { client, user } = await requireRouteUser(accessToken);

  const { data, error } = await client
    .from("custom_messages")
    .select("*")
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CustomMessageRow[];
}

export async function insertCustomConversationMessage(
  accessToken: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
) {
  const { client, user } = await requireRouteUser(accessToken);

  const { data, error } = await client
    .from("custom_messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content: clean(content),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not save custom message.");
  }

  return data as CustomMessageRow;
}

export async function getConversationMemoryState(
  accessToken: string,
  conversationId: string,
): Promise<ConversationMemoryState | null> {
  const { client, user } = await requireRouteUser(accessToken);

  const { data, error } = await client
    .from("conversation_memory_state")
    .select("*")
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return normalizeStoredMemoryState(data);
}

export async function upsertConversationMemoryState(args: {
  accessToken: string;
  conversationId: string;
  conversationType: "built_in" | "custom";
  messages: MemoryChatMessage[];
}) {
  const { accessToken, conversationId, conversationType, messages } = args;
  const { client, user } = await requireRouteUser(accessToken);
  const nextState = buildNextMemoryState(messages);

  const { error } = await client.from("conversation_memory_state").upsert(
    {
      user_id: user.id,
      conversation_id: conversationId,
      conversation_type: conversationType,
      summary: nextState.summary,
      memory_facts: nextState.memoryFacts,
      relationship_state: nextState.relationshipState,
      tone_state: nextState.toneState,
      message_count: nextState.messageCount,
      last_message_at: nextState.lastMessageAt,
    },
    {
      onConflict: "conversation_id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return nextState;
}

export async function deleteConversationMemoryState(
  accessToken: string,
  conversationId: string,
) {
  const { client, user } = await requireRouteUser(accessToken);

  const { error } = await client
    .from("conversation_memory_state")
    .delete()
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function resetBuiltInConversationState(
  accessToken: string,
  conversationId: string,
) {
  const { client, user } = await requireRouteUser(accessToken);

  const { error: deleteMessagesError } = await client
    .from("messages")
    .delete()
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId);

  if (deleteMessagesError) {
    throw new Error(deleteMessagesError.message);
  }

  await deleteConversationMemoryState(accessToken, conversationId);
}

export async function resetCustomConversationState(
  accessToken: string,
  conversationId: string,
) {
  const { client, user } = await requireRouteUser(accessToken);

  const { error: deleteMessagesError } = await client
    .from("custom_messages")
    .delete()
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId);

  if (deleteMessagesError) {
    throw new Error(deleteMessagesError.message);
  }

  await deleteConversationMemoryState(accessToken, conversationId);
}

export function toBuiltInMemoryMessages(rows: BuiltInMessageRow[]) {
  return mapBuiltInMessages(rows);
}

export function toCustomMemoryMessages(rows: CustomMessageRow[]) {
  return mapCustomMessages(rows);
}
