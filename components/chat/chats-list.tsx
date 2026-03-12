"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { characters } from "../../lib/characters";
import { getCustomCharacters } from "../../lib/custom-characters-storage";

type ConversationItem = {
  id: string;
  user_id: string;
  character_slug: string;
  title: string;
  updated_at: string;
  created_at: string;
};

type MessagePreviewRow = {
  id: string;
  conversation_id: string;
  role: "assistant" | "user" | "system";
  content: string;
  created_at: string;
};

type BuiltInCharacter = {
  slug: string;
  name: string;
  role: string;
  image?: string;
};

type SavedCustomCharacter = {
  slug: string;
  name?: string;
  role?: string;
  image?: string;
};

type ChatCard = {
  id: string;
  characterSlug: string;
  realSlug: string;
  isCustom: boolean;
  characterName: string;
  characterRole: string;
  characterImage?: string;
  updatedAt: string;
  preview: string;
  href: string;
};

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

function parseCharacterSlug(characterSlug: string) {
  const isCustom = characterSlug.startsWith("custom:");
  const realSlug = isCustom ? characterSlug.slice("custom:".length) : characterSlug;

  return {
    isCustom,
    realSlug,
    href: isCustom ? `/chat/custom/${realSlug}` : `/chat/${realSlug}`,
  };
}

export default function ChatsList() {
  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<ConversationItem[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [customCharacters, setCustomCharacters] = useState<SavedCustomCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const saved = getCustomCharacters();
      setCustomCharacters(Array.isArray(saved) ? (saved as SavedCustomCharacter[]) : []);
    } catch (error) {
      console.error(error);
      setCustomCharacters([]);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadChats() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !user) {
        setUserId(null);
        setChats([]);
        setPreviews({});
        setMessage("You need to sign in to view your chats.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: conversationRows, error: conversationError } = await supabase
        .from("conversations")
        .select("id, user_id, character_slug, title, updated_at, created_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!isMounted) return;

      if (conversationError) {
        setChats([]);
        setPreviews({});
        setMessage("Could not load your chats.");
        setLoading(false);
        return;
      }

      const loadedChats = (conversationRows as ConversationItem[] | null) ?? [];
      setChats(loadedChats);

      if (loadedChats.length === 0) {
        setPreviews({});
        setLoading(false);
        return;
      }

      const conversationIds = loadedChats.map((chat) => chat.id);

      const { data: messageRows, error: messageError } = await supabase
        .from("messages")
        .select("id, conversation_id, role, content, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (messageError) {
        setPreviews({});
        setMessage("Chats loaded, but previews could not be loaded.");
        setLoading(false);
        return;
      }

      const latestPreviewByConversation: Record<string, string> = {};

      for (const row of ((messageRows as MessagePreviewRow[] | null) ?? [])) {
        if (latestPreviewByConversation[row.conversation_id]) continue;
        if (row.role !== "assistant" && row.role !== "user") continue;
        latestPreviewByConversation[row.conversation_id] = row.content;
      }

      setPreviews(latestPreviewByConversation);
      setLoading(false);
    }

    loadChats();

    return () => {
      isMounted = false;
    };
  }, []);

  const chatCards = useMemo<ChatCard[]>(() => {
    return chats.map((chat) => {
      const parsed = parseCharacterSlug(chat.character_slug);

      const builtInCharacter = characters.find(
        (item) => item.slug === parsed.realSlug
      ) as BuiltInCharacter | undefined;

      const customCharacter = customCharacters.find(
        (item) => item.slug === parsed.realSlug
      );

      const resolvedCharacter = parsed.isCustom ? customCharacter : builtInCharacter;

      return {
        id: chat.id,
        characterSlug: chat.character_slug,
        realSlug: parsed.realSlug,
        isCustom: parsed.isCustom,
        characterName:
          resolvedCharacter?.name ??
          (parsed.isCustom ? parsed.realSlug : chat.character_slug),
        characterRole:
          resolvedCharacter?.role ??
          (parsed.isCustom ? "Custom character chat" : "Private character chat"),
        characterImage: resolvedCharacter?.image,
        updatedAt: chat.updated_at,
        preview:
          previews[chat.id] ||
          "No messages yet.\nOpen this chat to start the conversation.",
        href: parsed.href,
      };
    });
  }, [chats, previews, customCharacters]);

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return chatCards;

    return chatCards.filter((chat) => {
      return (
        chat.characterName.toLowerCase().includes(query) ||
        chat.characterSlug.toLowerCase().includes(query) ||
        chat.realSlug.toLowerCase().includes(query) ||
        chat.characterRole.toLowerCase().includes(query) ||
        chat.preview.toLowerCase().includes(query)
      );
    });
  }, [chatCards, search]);

  async function handleDelete(characterSlug: string) {
    if (!userId || deletingSlug) return;

    const confirmed = window.confirm(
      "This will delete your saved conversation for this character.\nContinue?"
    );

    if (!confirmed) return;

    setDeletingSlug(characterSlug);
    setMessage("");

    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("user_id", userId)
        .eq("character_slug", characterSlug);

      if (error) {
        setMessage("Could not delete this chat.");
        return;
      }

      setChats((prev) => prev.filter((chat) => chat.character_slug !== characterSlug));

      setPreviews((prev) => {
        const next = { ...prev };
        for (const chat of chats) {
          if (chat.character_slug === characterSlug) {
            delete next[chat.id];
          }
        }
        return next;
      });
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong while deleting this chat.");
    } finally {
      setDeletingSlug(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-white/70">
        Loading chats...
      </div>
    );
  }

  if (message && chatCards.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-white/70">
        {message}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-pink-200/75">
          Search
        </div>
        <p className="mb-4 text-sm text-white/60">
          Find a saved conversation by character, role, or message preview.
        </p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats..."
          className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
        />
      </div>

      {message && (
        <div className="mb-6 rounded-[20px] border border-pink-400/15 bg-pink-500/10 px-4 py-3 text-sm text-pink-100">
          {message}
        </div>
      )}

      {filteredCards.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center">
          <h3 className="text-xl font-semibold text-white">No chats found</h3>
          <p className="mt-2 text-sm text-white/60">
            {chatCards.length === 0
              ? "Start a conversation with a character first."
              : "Try a different search keyword."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCards.map((chat) => (
            <div
              key={chat.id}
              className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  {chat.characterImage ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10">
                      <Image
                        src={chat.characterImage}
                        alt={chat.characterName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/25 to-fuchsia-500/20 text-lg font-semibold text-pink-200">
                      {chat.characterName.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold text-white">
                        {chat.characterName}
                      </h3>

                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                        {chat.isCustom ? "Custom" : "Built-in"}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                        Saved
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-white/60">{chat.characterRole}</p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/72">
                      {chat.preview}
                    </p>

                    <div className="mt-3 text-xs text-white/45">
                      Updated {formatRelativeTime(chat.updatedAt)} • Private conversation
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={chat.href}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95"
                  >
                    Open chat
                  </Link>

                  <button
                    onClick={() => handleDelete(chat.characterSlug)}
                    disabled={deletingSlug === chat.characterSlug}
                    className="inline-flex items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {deletingSlug === chat.characterSlug ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
