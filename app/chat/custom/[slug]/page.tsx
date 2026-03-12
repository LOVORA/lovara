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

type CustomCharacterScenario = {
  setting?: string;
  relationshipToUser?: string;
  sceneGoal?: string;
  tone?: string;
  openingState?: string;
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
  tags?: Array<CustomCharacterTag | string>;
  traits?: Array<CustomCharacterTrait | string>;
  backstory?: string;
  memory?: CustomCharacterMemory | string[];
  scenario?: CustomCharacterScenario;
  previewMessage?: string;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toDisplayText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = ["label", "name", "title", "value", "text", "slug", "id", "key"];

    for (const key of preferredKeys) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function toDisplayList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayText(item)).filter(Boolean);
  }

  if (value == null) return [];

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidateArrays = [
      record.items,
      record.entries,
      record.memories,
      record.list,
      record.values,
      record.lines,
    ];

    for (const candidate of candidateArrays) {
      if (Array.isArray(candidate)) {
        return candidate.map((item) => toDisplayText(item)).filter(Boolean);
      }
    }

    if (
      typeof record.remembersName === "boolean" ||
      typeof record.remembersPreferences === "boolean" ||
      typeof record.remembersPastChats === "boolean"
    ) {
      const entries: string[] = [];

      if (typeof record.remembersName === "boolean") {
        entries.push(`Remembers name: ${record.remembersName ? "yes" : "no"}`);
      }

      if (typeof record.remembersPreferences === "boolean") {
        entries.push(
          `Remembers preferences: ${record.remembersPreferences ? "yes" : "no"}`
        );
      }

      if (typeof record.remembersPastChats === "boolean") {
        entries.push(
          `Remembers past chats: ${record.remembersPastChats ? "yes" : "no"}`
        );
      }

      return entries;
    }
  }

  const text = toDisplayText(value);
  return text ? [text] : [];
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
      : `*${name} looks at you quietly.* Hey.\nI’ve been waiting for you.`;

  const scenario = isRecord(value.scenario)
    ? {
        setting: getOptionalString(value.scenario.setting),
        relationshipToUser: getOptionalString(value.scenario.relationshipToUser),
        sceneGoal: getOptionalString(value.scenario.sceneGoal),
        tone: getOptionalString(value.scenario.tone),
        openingState: getOptionalString(value.scenario.openingState),
      }
    : undefined;

  return {
    slug: value.slug.trim(),
    name,
    role: getString(value.role),
    description: getString(value.description),
    personality: getString(value.personality),
    greeting,
    systemPrompt: getString(value.systemPrompt),
    image: getString(value.image),
    headline: getString(value.headline),
    archetype: getString(value.archetype),
    tags: Array.isArray(value.tags)
      ? (value.tags as Array<CustomCharacterTag | string>)
      : [],
    traits: Array.isArray(value.traits)
      ? (value.traits as Array<CustomCharacterTrait | string>)
      : [],
    backstory: getString(value.backstory),
    memory: Array.isArray(value.memory) || isRecord(value.memory)
      ? (value.memory as CustomCharacterMemory | string[])
      : undefined,
    scenario,
    previewMessage: getString(value.previewMessage),
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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );

  const conversationSlug = useMemo(() => {
    if (!character) return "";
    return `custom:${character.slug}`;
  }, [character]);

  const displayTags = useMemo(
    () => toDisplayList(character?.tags),
    [character?.tags]
  );
  const displayTraits = useMemo(
    () => toDisplayList(character?.traits),
    [character?.traits]
  );
  const displayMemory = useMemo(
    () => toDisplayList(character?.memory),
    [character?.memory]
  );

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
              character.greeting || `*${character.name} looks at you softly.* Hey.`,
          }
        );

        if (!isMounted) return;

        setActiveConversationId(conversation.id);

        const dbMessages = await loadConversationMessages(
          supabase,
          conversation.id,
          character.greeting || `*${character.name} looks at you softly.* Hey.`
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
        character.greeting || `*${character.name} looks at you softly.* Hey.\nI’ve been waiting for you.`;

      const { error: greetingInsertError } = await supabase.from("messages").insert({
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
        setChatStatus("Chat reset, but conversation title could not be updated.");
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

  async function handleSubmit(e: FormEvent) {
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
      const { error: userMessageError } = await supabase.from("messages").insert({
        conversation_id: activeConversationId,
        role: "user",
        content: trimmedMessage,
      });

      if (userMessageError) {
        setChatStatus("Message sent, but the user message could not be saved.");
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
        setChatStatus("Reply received, but the assistant message could not be saved.");
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
        setChatStatus("Reply saved, but conversation title could not be updated.");
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
        <div className="min-h-screen bg-[#07070b] text-white">
          <Navbar />
          <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
              <h1 className="text-3xl font-semibold">Character not found</h1>
              <p className="mt-3 text-sm text-white/65">
                This custom character could not be loaded from local storage.
              </p>
              <Link
                href="/my-characters"
                className="mt-6 inline-flex rounded-2xl bg-white/10 px-5 py-3 text-sm text-white/85 transition hover:bg-white/15"
              >
                Back to My Characters
              </Link>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#07070b] text-white">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.28em] text-pink-300/70">
                Private Chat
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {character?.name ?? "Custom Character"}
              </h1>
              <p className="mt-2 text-sm text-white/60">
                {character?.headline || "Live custom session"}
              </p>
            </div>

            <Link
              href="/my-characters"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
            >
              Back
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur">
              <div className="mb-5 flex items-start gap-4">
                {character?.image ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/10">
                    <Image
                      src={character.image}
                      alt={character.name ?? "Custom Character"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/25 to-fuchsia-500/20 text-2xl font-semibold text-pink-200">
                    {character?.name?.charAt(0) || "C"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold">
                    {character?.name ?? "Custom Character"}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {isInitializing ? "Loading..." : "Online now"}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {character?.archetype ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Archetype
                    </div>
                    <div className="text-sm text-white/80">{character.archetype}</div>
                  </div>
                ) : null}

                {character?.role ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Role
                    </div>
                    <div className="text-sm text-white/80">{character.role}</div>
                  </div>
                ) : null}

                {character?.description ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Description
                    </div>
                    <p className="text-sm leading-6 text-white/75">
                      {character.description}
                    </p>
                  </div>
                ) : null}

                {character?.previewMessage ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Preview Message
                    </div>
                    <div className="rounded-2xl border border-pink-400/15 bg-pink-500/5 p-4 text-sm leading-6 text-white/85">
                      {character.previewMessage}
                    </div>
                  </div>
                ) : null}

                {character?.scenario ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Scenario
                    </div>

                    <div className="space-y-2">
                      {character.scenario.setting ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Setting:</span>{" "}
                          {character.scenario.setting}
                        </div>
                      ) : null}

                      {character.scenario.relationshipToUser ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Relationship:</span>{" "}
                          {character.scenario.relationshipToUser}
                        </div>
                      ) : null}

                      {character.scenario.sceneGoal ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Goal:</span>{" "}
                          {character.scenario.sceneGoal}
                        </div>
                      ) : null}

                      {character.scenario.tone ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Tone:</span>{" "}
                          {character.scenario.tone}
                        </div>
                      ) : null}

                      {character.scenario.openingState ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75">
                          <span className="text-white/45">Opening:</span>{" "}
                          {character.scenario.openingState}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {displayTags.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {displayTags.map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {displayTraits.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Traits
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {displayTraits.map((trait, index) => (
                        <span
                          key={`${trait}-${index}`}
                          className="rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-xs text-pink-200"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {displayMemory.length > 0 ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Memory
                    </div>
                    <div className="space-y-2">
                      {displayMemory.map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {character?.backstory ? (
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                      Backstory
                    </div>
                    <p className="text-sm leading-6 text-white/75">
                      {character.backstory}
                    </p>
                  </div>
                ) : null}

                <button
                  onClick={handleResetChat}
                  disabled={
                    !activeConversationId || isTyping || isInitializing || isResetting
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResetting ? "Resetting..." : "Reset chat"}
                </button>
              </div>
            </aside>

            <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {character?.name ?? "Custom Character"}
                    </h2>
                    <p className="mt-1 text-sm text-white/55">
                      {activeConversationId ? "Private chat saved" : "Private chat"}
                    </p>
                  </div>
                </div>

                {chatStatus ? (
                  <div className="mt-4 rounded-2xl border border-pink-400/15 bg-pink-500/10 px-4 py-3 text-sm text-pink-100">
                    {chatStatus}
                  </div>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="mx-auto flex max-w-3xl flex-col gap-4">
                  {messages.map((message) => {
                    const isUser = message.role === "user";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-lg ${
                            isUser
                              ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white"
                              : "border border-white/10 bg-white/5 text-white/85"
                          }`}
                        >
                          {!isUser ? (
                            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                              {character?.name ?? "Character"}
                            </div>
                          ) : null}

                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    );
                  })}

                  {(isTyping || isInitializing) && character ? (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75 shadow-lg">
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">
                          {character.name}
                        </div>
                        {isInitializing ? "Loading..." : "Typing..."}
                      </div>
                    </div>
                  ) : null}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="border-t border-white/10 p-4">
                <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
                  <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/20 px-2 py-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={`Message ${character?.name ?? "your character"}...`}
                      disabled={
                        isTyping || isInitializing || isResetting || !activeConversationId
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
                      className="rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isTyping ? "Waiting..." : "Send"}
                    </button>
                  </div>

                  <p className="mt-3 text-center text-xs text-white/40">
                    Private conversation • Messages are saved automatically
                  </p>
                </form>
              </div>
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
