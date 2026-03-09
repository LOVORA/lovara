"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { characters } from "../../lib/characters";

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

type ChatCard = {
  id: string;
  characterSlug: string;
  characterName: string;
  characterRole: string;
  characterImage?: string;
  updatedAt: string;
  preview: string;
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

export default function ChatsList() {
  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<ConversationItem[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
      const character = characters.find((item) => item.slug === chat.character_slug);

      return {
        id: chat.id,
        characterSlug: chat.character_slug,
        characterName: character?.name ?? chat.character_slug,
        characterRole: character?.role ?? "Private character chat",
        characterImage: character?.image,
        updatedAt: chat.updated_at,
        preview:
          previews[chat.id] ||
          "No messages yet. Open this chat to start the conversation.",
      };
    });
  }, [chats, previews]);

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return chatCards;

    return chatCards.filter((chat) => {
      return (
        chat.characterName.toLowerCase().includes(query) ||
        chat.characterSlug.toLowerCase().includes(query) ||
        chat.characterRole.toLowerCase().includes(query) ||
        chat.preview.toLowerCase().includes(query)
      );
    });
  }, [chatCards, search]);

  async function handleDelete(characterSlug: string) {
    if (!userId || deletingSlug) return;

    const confirmed = window.confirm(
      "This will delete your saved conversation for this character. Continue?"
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
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-white/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-pink-400" />
          <p className="text-sm uppercase tracking-[0.18em] text-white/60">
            Loading chats...
          </p>
        </div>
      </div>
    );
  }

  if (message && chatCards.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-white/70 backdrop-blur-md">
        {message}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-pink-200/70">
              Search
            </p>
            <p className="mt-2 text-sm text-white/55">
              Find a saved conversation by character, role, or message preview.
            </p>
          </div>

          <div className="w-full md:max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
            />
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/70 backdrop-blur-md">
          {message}
        </div>
      )}

      {filteredCards.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur-md">
          <p className="text-xl font-semibold text-white">No chats found</p>
          <p className="mt-3 text-sm leading-7 text-white/60">
            {chatCards.length === 0
              ? "Start a conversation with a character first."
              : "Try a different search keyword."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredCards.map((chat) => (
            <div
              key={chat.id}
              className="group overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] transition duration-300 hover:border-pink-400/20 hover:bg-white/[0.06]"
            >
              <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
                <Link href={`/chat/${chat.characterSlug}`} className="min-w-0 flex-1">
                  <div className="flex items-start gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[22px] border border-white/10 bg-white/10 shadow-[0_12px_30px_rgba(236,72,153,0.18)]">
                      {chat.characterImage ? (
                        <Image
                          src={chat.characterImage}
                          alt={chat.characterName}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-500 to-fuchsia-600 text-2xl font-bold text-white">
                          {chat.characterName.charAt(0)}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xl font-semibold tracking-tight text-white">
                          {chat.characterName}
                        </p>

                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-pink-300/80">
                          {chat.characterSlug}
                        </span>

                        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200/75">
                          Saved
                        </span>
                      </div>

                      <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/40">
                        {chat.characterRole}
                      </p>

                      <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-7 text-white/65">
                        {chat.preview}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <p className="text-xs text-white/45">
                          Updated {formatRelativeTime(chat.updatedAt)}
                        </p>

                        <span className="text-xs text-white/25">•</span>

                        <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                          Private conversation
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/chat/${chat.characterSlug}`}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-white/85 transition hover:bg-white/15"
                  >
                    Open chat
                  </Link>

                  <button
                    type="button"
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
