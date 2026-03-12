"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../../components/landing/navbar";
import AuthGuard from "../../../../components/auth/auth-guard";
import { supabase } from "../../../../lib/supabase";
import {
  getOrCreateConversationForCharacter,
  loadConversationMessages,
  type DbMessageRow,
} from "../../../../lib/chat";
import { getCustomCharacters } from "../../../../lib/custom-characters-storage";

type CustomCharacterTag = {
  label?: string;
  category?: string;
};

type CustomCharacterTrait = {
  label?: string;
  score?: number;
};

type CustomCharacterMemory = {
  remembersName?: boolean;
  remembersPreferences?: boolean;
  remembersPastChats?: boolean;
};

type CustomCharacter = {
  slug: string;
  name: string;
  role?: string;
  description?: string;
  personality?: string;
  greeting?: string;
  systemPrompt?: string;
  image?: string;
  headline?: string;
  archetype?: string;
  tags?: CustomCharacterTag[];
  traits?: CustomCharacterTrait[];
  backstory?: string;
  memory?: CustomCharacterMemory;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCharacter(value: unknown): CustomCharacter | null {
  if (!isRecord(value)) return null;
  if (typeof value.slug !== "string" || !value.slug.trim()) return null;

  const name =
    typeof value.name === "string" && value.name.trim()
      ? value.name.trim()
      : "Custom Character";

  const greeting =
    typeof value.greeting === "string" && value.greeting.trim()
      ? value.greeting.trim()
      : `*${name} looks at you quietly.* Hey. I’ve been waiting for you.`;

  return {
    slug: value.slug.trim(),
    name,
    role: typeof value.role === "string" ? value.role : "",
    description: typeof value.description === "string" ? value.description : "",
    personality: typeof value.personality === "string" ? value.personality : "",
    greeting,
    systemPrompt:
      typeof value.systemPrompt === "string" ? value.systemPrompt : "",
    image: typeof value.image === "string" ? value.image : "",
    headline: typeof value.headline === "string" ? value.headline : "",
    archetype: typeof value.archetype === "string" ? value.archetype : "",
    tags: Array.isArray(value.tags) ? (value.tags as CustomCharacterTag[]) : [],
    traits: Array.isArray(value.traits)
      ? (value.traits as CustomCharacterTrait[])
      : [],
    backstory: typeof value.backstory === "string" ? value.backstory : "",
    memory: isRecord(value.memory)
      ? (value.memory as CustomCharacterMemory)
      : undefined,
  };
}

export default function CustomCharacterChatPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const [character, setCharacter] = useState<CustomCharacter | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [chatStatus, setChatStatus] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const conversationSlug = useMemo(() => {
    if (!character) return "";
    return `custom:${character.slug}`;
  }, [character]);

  useEffect(() => {
    try {
      const all = getCustomCharacters();
      const found = Array.isArray(all)
        ? all.find((item) => {
            const normalized = normalizeCharacter(item);
            return normalized?.slug === slug;
          })
        : null;

      const normalized = normalizeCharacter(found);
      setCharacter(normalized ?? null);
    } catch (error) {
      console.error(error);
      setCharacter(null);
    }
  }, [slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    let isMounted = true;
    requestIdRef.current += 1;

    async function initializeConversation() {
      if (!character) {
        if (!isMounted) return;
        setMessages([]);
        setActiveConversationId(null);
        setChatStatus("Custom character not found.");
        setIsInitializing(false);
        return;
      }

      setIsInitializing(true);
      setIsTyping(false);
      setChatStatus("Loading chat...");
      setMessages([]);
      setActiveConversationId(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (userError || !user) {
          setChatStatus("You need to sign in to open this chat.");
          setIsInitializing(false);
          return;
        }

        const conversation = await getOrCreateConversationForCharacter(
          supabase,
          user.id,
          {
            slug: conversationSlug,
            name: character.name,
            greeting:
              character.greeting ||
              `*${character.name} looks at you softly.* Hey.`,
          }
        );

        if (!isMounted) return;

        setActiveConversationId(conversation.id);

        const dbMessages = await loadConversationMessages(
          supabase,
          conversation.id,
          character.greeting ||
            `*${character.name} looks at you softly.* Hey.`
        );

        if (!isMounted) return;

        const formattedMessages: Message[] = dbMessages.flatMap(
          (message: DbMessageRow) => {
            if (message.role !== "assistant" && message.role !== "user") {
              return [];
            }

            return [
              {
                id: message.id,
                role: message.role,
                content: message.content,
              },
            ];
          }
        );

        setMessages(formattedMessages);
        setChatStatus("");
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setMessages([]);
        setActiveConversationId(null);
        setChatStatus("Could not load this conversation.");
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    initializeConversation();

    return () => {
      isMounted = false;
    };
  }, [character, conversationSlug]);

  async function handleResetChat() {
    if (
      !character ||
      !activeConversationId ||
      isTyping ||
      isInitializing ||
      isResetting
    ) {
      return;
    }

    const confirmed = window.confirm(
      "This will clear the current chat and start again from the first message.\n\nContinue?"
    );
    if (!confirmed) return;

    setIsResetting(true);
    setChatStatus("Resetting chat...");

    try {
      const { error: deleteMessagesError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", activeConversationId);

      if (deleteMessagesError) {
        setChatStatus(
          `Could not clear chat messages: ${deleteMessagesError.message}`
        );
        return;
      }

      const greeting =
        character.greeting ||
        `*${character.name} looks at you softly.* Hey. I’ve been waiting for you.`;

      const { error: greetingInsertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConversationId,
          role: "assistant",
          content: greeting,
        });

      if (greetingInsertError) {
        setChatStatus("Chat cleared, but greeting could not be restored.");
        return;
      }

      const { error: updateConversationError } = await supabase
        .from("conversations")
        .update({
          title: `Chat with ${character.name}`,
        })
        .eq("id", activeConversationId);

      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: greeting,
        },
      ]);

      if (updateConversationError) {
        setChatStatus(
          "Chat reset, but conversation title could not be updated."
        );
      } else {
        setChatStatus("Chat reset successfully.");
      }
    } catch (error) {
      console.error(error);
      setChatStatus("Something went wrong while resetting the chat.");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedMessage = input.trim();

    if (
      !character ||
      !activeConversationId ||
      !trimmedMessage ||
      isTyping ||
      isInitializing ||
      isResetting
    ) {
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedMessage,
    };

    const nextMessages = [...messages, newUserMessage];

    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);
    setChatStatus("");

    try {
      const { error: userMessageError } = await supabase.from("messages").insert(
        {
          conversation_id: activeConversationId,
          role: "user",
          content: trimmedMessage,
        }
      );

      if (userMessageError) {
        setChatStatus(
          "Message sent, but the user message could not be saved."
        );
      }

      const response = await fetch("/api/chat/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          character,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      if (!response.ok) {
        const errorMessage =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string" &&
          data.error
            ? data.error
            : "Failed to get a reply from the AI.";

        setChatStatus(errorMessage);
        return;
      }

      const reply =
        data &&
        typeof data === "object" &&
        "reply" in data &&
        typeof data.reply === "string"
          ? data.reply.trim()
          : "";

      if (!reply) {
        setChatStatus("The AI returned an empty reply.");
        return;
      }

      const assistantReply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, assistantReply]);

      const { error: assistantMessageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConversationId,
          role: "assistant",
          content: reply,
        });

      if (assistantMessageError) {
        setChatStatus(
          "Reply received, but the assistant message could not be saved."
        );
      }

      const nextTitle =
        trimmedMessage.length > 40
          ? `${trimmedMessage.slice(0, 40)}...`
          : trimmedMessage;

      const { error: updateConversationError } = await supabase
        .from("conversations")
        .update({
          title: nextTitle,
        })
        .eq("id", activeConversationId);

      if (updateConversationError) {
        setChatStatus(
          "Reply saved, but conversation title could not be updated."
        );
      } else if (!assistantMessageError) {
        setChatStatus("");
      }
    } catch (error) {
      console.error(error);
      if (requestIdRef.current !== currentRequestId) {
        return;
      }
      setChatStatus("Could not reach the chat server.");
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsTyping(false);
      }
    }
  }

  if (!character && !isInitializing) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-[#0a0a0f] text-white">
          <Navbar />
          <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center px-6 py-16">
            <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
              <h1 className="text-2xl font-semibold">Character not found</h1>
              <p className="mt-3 text-sm text-white/65">
                This custom character could not be loaded from local storage.
              </p>
              <Link
                href="/my-characters"
                className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Back to My Characters
              </Link>
            </div>
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#0a0a0f] text-white">
        <Navbar />

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-pink-300/70">
                Private Chat
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {character?.name ?? "Custom Character"}
              </h1>
              <p className="mt-1 text-sm text-white/55">
                {character?.headline || "Live custom session"}
              </p>
            </div>

            <Link
              href="/my-characters"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
            >
              Back
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-4">
                {character?.image ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10">
                    <Image
                      src={character.image}
                      alt={character.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-pink-500/10 text-xl font-semibold text-pink-200">
                    {character?.name?.charAt(0) || "C"}
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-semibold">
                    {character?.name ?? "Custom Character"}
                  </h2>
                  <p className="text-sm text-white/55">
                    {isInitializing ? "Loading..." : "Online now"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4 text-sm">
                {character?.archetype ? (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                      Archetype
                    </p>
                    <p className="text-white/80">{character.archetype}</p>
                  </div>
                ) : null}

                {character?.role ? (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                      Role
                    </p>
                    <p className="text-white/80">{character.role}</p>
                  </div>
                ) : null}

                {character?.description ? (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                      Description
                    </p>
                    <p className="text-white/80">{character.description}</p>
                  </div>
                ) : null}

                <div className="pt-2">
                  <button
                    onClick={handleResetChat}
                    disabled={
                      !activeConversationId ||
                      isTyping ||
                      isInitializing ||
                      isResetting
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isResetting ? "Resetting..." : "Reset chat"}
                  </button>
                </div>
              </div>
            </aside>

            <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {character?.name ?? "Custom Character"}
                    </p>
                    <p className="text-xs text-white/45">
                      {activeConversationId
                        ? "Private chat saved"
                        : "Private chat"}
                    </p>
                  </div>
                </div>

                {chatStatus ? (
                  <div className="mt-3 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-3 py-2 text-xs text-pink-100">
                    {chatStatus}
                  </div>
                ) : null}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
                {messages.map((message) => {
                  const isUser = message.role === "user";

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 ${
                          isUser
                            ? "bg-pink-500 text-white"
                            : "border border-white/10 bg-white/6 text-white/90"
                        }`}
                      >
                        {!isUser ? (
                          <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-pink-200/90">
                            {character?.name ?? "Character"}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  );
                })}

                {(isTyping || isInitializing) && character ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-3xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/80">
                      <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-pink-200/90">
                        {character.name}
                      </p>
                      <p>{isInitializing ? "Loading..." : "Typing..."}</p>
                    </div>
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSubmit}
                className="border-t border-white/10 p-4 sm:p-5"
              >
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/30 pr-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message ${character?.name ?? "your character"}...`}
                    disabled={
                      isTyping ||
                      isInitializing ||
                      isResetting ||
                      !activeConversationId
                    }
                    className="h-12 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/30 disabled:opacity-60"
                  />

                  <button
                    type="submit"
                    disabled={
                      !input.trim() ||
                      isTyping ||
                      isInitializing ||
                      isResetting ||
                      !activeConversationId
                    }
                    className="rounded-2xl bg-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isTyping ? "Waiting..." : "Send"}
                  </button>
                </div>

                <p className="mt-3 text-xs text-white/35">
                  Private conversation • Messages are saved automatically
                </p>
              </form>
            </section>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
