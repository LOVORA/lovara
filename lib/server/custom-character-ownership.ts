import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

type ServerSupabase = SupabaseClient<Database>;
type CustomCharacterRow = Database["public"]["Tables"]["custom_characters"]["Row"];

export type SavedCharacterSource = "custom" | "community" | "professional";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchOwnedCustomCharacterBySlugWithRetry(args: {
  supabase: ServerSupabase;
  userId: string;
  slug: string;
  attempts?: number;
}): Promise<CustomCharacterRow | null> {
  const attempts = args.attempts ?? 6;

  for (let index = 0; index < attempts; index += 1) {
    const { data, error } = await args.supabase
      .from("custom_characters")
      .select("*")
      .eq("user_id", args.userId)
      .eq("slug", args.slug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data as CustomCharacterRow;
    }

    if (index < attempts - 1) {
      await sleep(150);
    }
  }

  return null;
}

export async function resolveAccessibleCustomCharacterBySlug(args: {
  supabase: ServerSupabase;
  userId: string;
  slug: string;
  attempts?: number;
}): Promise<CustomCharacterRow | null> {
  const ownedCharacter = await fetchOwnedCustomCharacterBySlugWithRetry(args);

  if (ownedCharacter) {
    return ownedCharacter;
  }

  const attempts = args.attempts ?? 4;

  for (let index = 0; index < attempts; index += 1) {
    const { data: slugMatches, error: slugError } = await args.supabase
      .from("custom_characters")
      .select("id, user_id")
      .eq("slug", args.slug)
      .limit(8);

    if (slugError) {
      throw new Error(slugError.message);
    }

    const candidateIds = (slugMatches ?? [])
      .map((row) => (typeof row.id === "string" ? row.id : ""))
      .filter(Boolean);

    if (candidateIds.length > 0) {
      const { data: linkedConversation, error: conversationError } = await args.supabase
        .from("custom_conversations")
        .select("custom_character_id")
        .eq("user_id", args.userId)
        .in("custom_character_id", candidateIds)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conversationError) {
        throw new Error(conversationError.message);
      }

      const linkedCharacterId =
        typeof linkedConversation?.custom_character_id === "string"
          ? linkedConversation.custom_character_id
          : "";

      if (linkedCharacterId) {
        const { data: linkedCharacter, error: linkedCharacterError } = await args.supabase
          .from("custom_characters")
          .select("*")
          .eq("id", linkedCharacterId)
          .single();

        if (linkedCharacterError) {
          throw new Error(linkedCharacterError.message);
        }

        if (linkedCharacter) {
          return linkedCharacter as CustomCharacterRow;
        }
      }
    }

    if (index < attempts - 1) {
      await sleep(150);
    }
  }

  return null;
}

export async function resolveAccessibleCustomCharacterById(args: {
  supabase: ServerSupabase;
  userId: string;
  characterId: string;
  attempts?: number;
}): Promise<CustomCharacterRow | null> {
  const attempts = args.attempts ?? 4;

  for (let index = 0; index < attempts; index += 1) {
    const { data: ownedCharacter, error: ownedError } = await args.supabase
      .from("custom_characters")
      .select("*")
      .eq("id", args.characterId)
      .eq("user_id", args.userId)
      .maybeSingle();

    if (ownedError) {
      throw new Error(ownedError.message);
    }

    if (ownedCharacter) {
      return ownedCharacter as CustomCharacterRow;
    }

    const { data: linkedConversation, error: conversationError } = await args.supabase
      .from("custom_conversations")
      .select("custom_character_id")
      .eq("user_id", args.userId)
      .eq("custom_character_id", args.characterId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conversationError) {
      throw new Error(conversationError.message);
    }

    const linkedCharacterId =
      typeof linkedConversation?.custom_character_id === "string"
        ? linkedConversation.custom_character_id
        : "";

    if (linkedCharacterId) {
      const { data: linkedCharacter, error: linkedCharacterError } = await args.supabase
        .from("custom_characters")
        .select("*")
        .eq("id", linkedCharacterId)
        .single();

      if (linkedCharacterError) {
        throw new Error(linkedCharacterError.message);
      }

      if (linkedCharacter) {
        return linkedCharacter as CustomCharacterRow;
      }
    }

    if (index < attempts - 1) {
      await sleep(150);
    }
  }

  return null;
}

async function deleteRowsForConversationIds(args: {
  supabase: ServerSupabase;
  userId: string;
  conversationIds: string[];
  messageTable: "messages" | "custom_messages";
}) {
  if (args.conversationIds.length === 0) return;

  const { error: deleteMessagesError } = await args.supabase
    .from(args.messageTable)
    .delete()
    .in("conversation_id", args.conversationIds)
    .eq("user_id", args.userId);

  if (deleteMessagesError) {
    throw new Error(deleteMessagesError.message);
  }

  const { error: deleteMemoryError } = await args.supabase
    .from("conversation_memory_state")
    .delete()
    .in("conversation_id", args.conversationIds)
    .eq("user_id", args.userId);

  if (deleteMemoryError) {
    throw new Error(deleteMemoryError.message);
  }
}

async function deleteImageJobsForCharacter(args: {
  supabase: ServerSupabase;
  userId: string;
  characterId: string;
}) {
  const { error } = await args.supabase
    .from("character_image_jobs")
    .delete()
    .eq("user_id", args.userId)
    .eq("character_id", args.characterId);

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteCharacterPromptProfileForUser(args: {
  supabase: ServerSupabase;
  characterId: string;
}) {
  const { error } = await args.supabase
    .from("character_prompt_profiles")
    .delete()
    .eq("character_id", args.characterId);

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteCharacterVisualProfileForUser(args: {
  supabase: ServerSupabase;
  characterId: string;
}) {
  const { error } = await args.supabase
    .from("character_visual_profiles")
    .delete()
    .eq("character_id", args.characterId);

  if (error) {
    throw new Error(error.message);
  }
}

async function ensureCustomCharacterDeleted(args: {
  supabase: ServerSupabase;
  userId: string;
  characterId: string;
}) {
  const { data, error } = await args.supabase
    .from("custom_characters")
    .select("id")
    .eq("user_id", args.userId)
    .eq("id", args.characterId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    throw new Error("Character delete did not complete.");
  }
}

export async function hardDeleteCustomCharacter(args: {
  supabase: ServerSupabase;
  userId: string;
  characterId: string;
}) {
  const { data: customConversations, error: customConversationError } =
    await args.supabase
      .from("custom_conversations")
      .select("id")
      .eq("user_id", args.userId)
      .eq("custom_character_id", args.characterId);

  if (customConversationError) {
    throw new Error(customConversationError.message);
  }

  await deleteRowsForConversationIds({
    supabase: args.supabase,
    userId: args.userId,
    conversationIds: (customConversations ?? []).map((row) => row.id),
    messageTable: "custom_messages",
  });

  const { error: deleteCustomConversationsError } = await args.supabase
    .from("custom_conversations")
    .delete()
    .eq("user_id", args.userId)
    .eq("custom_character_id", args.characterId);

  if (deleteCustomConversationsError) {
    throw new Error(deleteCustomConversationsError.message);
  }

  await deleteCharacterPromptProfileForUser({
    supabase: args.supabase,
    characterId: args.characterId,
  });
  await deleteCharacterVisualProfileForUser({
    supabase: args.supabase,
    characterId: args.characterId,
  });

  const { error: deleteImagesError } = await args.supabase
    .from("character_images")
    .delete()
    .eq("user_id", args.userId)
    .eq("character_id", args.characterId);

  if (deleteImagesError) {
    throw new Error(deleteImagesError.message);
  }

  await deleteImageJobsForCharacter({
    supabase: args.supabase,
    userId: args.userId,
    characterId: args.characterId,
  });

  const { error: deleteCharacterError } = await args.supabase
    .from("custom_characters")
    .delete()
    .eq("user_id", args.userId)
    .eq("id", args.characterId);

  if (deleteCharacterError) {
    throw new Error(deleteCharacterError.message);
  }

  await ensureCustomCharacterDeleted(args);
}

export async function removeSavedCharacterFromAccountServer(args: {
  supabase: ServerSupabase;
  userId: string;
  source: SavedCharacterSource;
  characterId: string;
  slug: string;
}) {
  if (args.source === "custom") {
    await hardDeleteCustomCharacter({
      supabase: args.supabase,
      userId: args.userId,
      characterId: args.characterId,
    });
    return;
  }

  if (args.source === "community") {
    const { data: customConversations, error: customConversationError } =
      await args.supabase
        .from("custom_conversations")
        .select("id")
        .eq("user_id", args.userId)
        .eq("custom_character_id", args.characterId);

    if (customConversationError) {
      throw new Error(customConversationError.message);
    }

    await deleteRowsForConversationIds({
      supabase: args.supabase,
      userId: args.userId,
      conversationIds: (customConversations ?? []).map((row) => row.id),
      messageTable: "custom_messages",
    });

    const { error: deleteCustomConversationsError } = await args.supabase
      .from("custom_conversations")
      .delete()
      .eq("user_id", args.userId)
      .eq("custom_character_id", args.characterId);

    if (deleteCustomConversationsError) {
      throw new Error(deleteCustomConversationsError.message);
    }

    const { error: deleteImagesError } = await args.supabase
      .from("character_images")
      .delete()
      .eq("user_id", args.userId)
      .eq("character_id", args.characterId);

    if (deleteImagesError) {
      throw new Error(deleteImagesError.message);
    }

    await deleteImageJobsForCharacter({
      supabase: args.supabase,
      userId: args.userId,
      characterId: args.characterId,
    });

    const { count, error: verifyError } = await args.supabase
      .from("custom_conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", args.userId)
      .eq("custom_character_id", args.characterId);

    if (verifyError) {
      throw new Error(verifyError.message);
    }

    if ((count ?? 0) > 0) {
      throw new Error("Character remove did not complete.");
    }

    return;
  }

  const { data: conversations, error: conversationsError } = await args.supabase
    .from("conversations")
    .select("id")
    .eq("user_id", args.userId)
    .eq("character_slug", args.slug);

  if (conversationsError) {
    throw new Error(conversationsError.message);
  }

  await deleteRowsForConversationIds({
    supabase: args.supabase,
    userId: args.userId,
    conversationIds: (conversations ?? []).map((row) => row.id),
    messageTable: "messages",
  });

  const { error: deleteConversationsError } = await args.supabase
    .from("conversations")
    .delete()
    .eq("user_id", args.userId)
    .eq("character_slug", args.slug);

  if (deleteConversationsError) {
    throw new Error(deleteConversationsError.message);
  }

  const { error: deleteImagesError } = await args.supabase
    .from("character_images")
    .delete()
    .eq("user_id", args.userId)
    .eq("character_id", args.slug);

  if (deleteImagesError) {
    throw new Error(deleteImagesError.message);
  }

  await deleteImageJobsForCharacter({
    supabase: args.supabase,
    userId: args.userId,
    characterId: args.slug,
  });
}
