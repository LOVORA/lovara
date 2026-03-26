"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCharacterBySlug } from "@/lib/characters";
import MessageRichText from "@/components/chat/message-rich-text";
import type { DbMessageRow } from "@/lib/chat";

type ChatWindowProps = {
  characterSlug: string;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type RetentionState = "fresh-start" | "warming-up" | "settled-in" | "ongoing";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getMeaningfulMessageCount(messages: Message[]) {
  return messages.filter((message, index) => !(index === 0 && message.role === "assistant")).length;
}

function getRetentionState(messages: Message[]): RetentionState {
  const meaningfulCount = getMeaningfulMessageCount(messages);

  if (meaningfulCount === 0) return "fresh-start";
  if (meaningfulCount <= 4) return "warming-up";
  if (meaningfulCount <= 14) return "settled-in";
  return "ongoing";
}

function getRetentionLabel(state: RetentionState) {
  switch (state) {
    case "fresh-start":
      return "Fresh start";
    case "warming-up":
      return "Chemistry building";
    case "settled-in":
      return "Connection active";
    case "ongoing":
      return "Ongoing thread";
  }
}

function getRetentionTone(state: RetentionState): "neutral" | "success" | "warm" {
  if (state === "fresh-start") return "warm";
  if (state === "warming-up") return "warm";
  return "success";
}

function getRetentionHint(state: RetentionState, characterName: string) {
  switch (state) {
    case "fresh-start":
      return `${characterName} already has the opening mood. A simple first line is enough.`;
    case "warming-up":
      return "This chat has started to take shape. Keep the momentum going with one clear move.";
    case "settled-in":
      return "You are already past the first exchange. Pick up from the mood that is there.";
    case "ongoing":
      return "This thread already has history. Referencing the moment usually feels strongest.";
  }
}

function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warm";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.16em]",
        tone === "success" && "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        tone === "warm" && "border-amber-400/20 bg-amber-400/10 text-amber-100",
        tone === "neutral" && "border-white/10 bg-white/5 text-white/60",
      )}
    >
      {label}
    </span>
  );
}

export default function ChatWindow({ characterSlug }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const initIdRef = useRef(0);

  const character = useMemo(
    () => getCharacterBySlug(characterSlug) ?? null,
    [characterSlug],
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [chatStatus, setChatStatus] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [justReset, setJustReset] = useState(false);

  const retentionState = useMemo(() => getRetentionState(messages), [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isInitializing]);

  useEffect(() => {
    let isMounted = true;
    const currentInitId = ++initIdRef.current;

    async function initializeConversation() {
      if (!character) {
        if (!isMounted) return;
        setMessages([]);
        setActiveConversationId(null);
        setChatStatus("Character not found.");
        setIsInitializing(false);
        return;
      }

      setIsInitializing(true);
      setIsTyping(false);
      setChatStatus("Loading chat...");
      setMessages([]);
      setActiveConversationId(null);
      setJustReset(false);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isMounted || initIdRef.current !== currentInitId) return;

        if (userError || !user) {
          setChatStatus("You need to sign in to open this chat.");
          setIsInitializing(false);
          return;
        }

        const response = await fetch(
          `/api/chat/bootstrap?slug=${encodeURIComponent(character.slug)}`,
          {
            credentials: "include",
          },
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              error?: string;
              conversation?: { id: string };
              messages?: DbMessageRow[];
            }
          | null;

        if (!response.ok || !payload?.ok || !payload.conversation) {
          throw new Error(payload?.error || "Could not load this conversation.");
        }

        if (!isMounted || initIdRef.current !== currentInitId) return;

        setActiveConversationId(payload.conversation.id);

        if (!isMounted || initIdRef.current !== currentInitId) return;

        const formattedMessages: Message[] = (payload.messages ?? []).flatMap(
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
          },
        );

        setMessages(formattedMessages);
        setChatStatus(
          formattedMessages.length <= 1
            ? `${character.name} is ready. Start with one clear line.`
            : `Back where you left it with ${character.name}.`,
        );
      } catch (error) {
        console.error(error);

        if (!isMounted || initIdRef.current !== currentInitId) return;

        setMessages([]);
        setActiveConversationId(null);
        setChatStatus("Could not load this conversation.");
      } finally {
        if (isMounted && initIdRef.current === currentInitId) {
          setIsInitializing(false);
        }
      }
    }

    initializeConversation();

    return () => {
      isMounted = false;
    };
  }, [character]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setMessages([]);
        setActiveConversationId(null);
        setIsTyping(false);
        setIsResetting(false);
        setIsInitializing(false);
        setChatStatus("You need to sign in to open this chat.");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      "This will clear the current chat and start again from the first message. Continue?",
    );

    if (!confirmed) return;

    setIsResetting(true);
    setChatStatus("Resetting chat...");

    try {
      const response = await fetch("/api/chat/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          conversationId: activeConversationId,
          slug: character.slug,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; messages?: DbMessageRow[] }
        | null;

      if (!response.ok || !payload?.ok) {
        setChatStatus(payload?.error || "Could not reset this chat.");
        return;
      }

      setMessages(
        (payload.messages ?? []).flatMap((message) => {
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
        }),
      );

      setJustReset(true);
      setChatStatus("Reset completed. This chat is fresh again.");
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
    setJustReset(false);

    try {
      const { error: userMessageError } = await supabase.from("messages").insert({
        conversation_id: activeConversationId,
        role: "user",
        content: trimmedMessage,
      });

      if (userMessageError) {
        setChatStatus("Message sent, but the user message could not be saved.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token ?? "";

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: character.slug,
          conversationId: activeConversationId,
          accessToken,
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
            : "Could not get a reply right now.";

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
        setChatStatus("The reply came back empty. Please try again.");
        return;
      }

      const assistantReply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, assistantReply]);

      const nextTitle =
        trimmedMessage.length > 40
          ? `${trimmedMessage.slice(0, 40)}...`
          : trimmedMessage;

      const { error: updateConversationError } = await supabase
        .from("conversations")
        .update({
          title: nextTitle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeConversationId);

      if (updateConversationError) {
        setChatStatus("Reply received, but the chat title could not be updated.");
      } else {
        setChatStatus(getRetentionHint(getRetentionState([...nextMessages, assistantReply]), character.name));
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

  if (!character) {
    return (
      <div className="flex h-[78vh] items-center justify-center rounded-[28px] border border-white/10 bg-[#0b0b12]/80 p-6 text-center text-white/70 backdrop-blur-xl">
        Character not found.
      </div>
    );
  }

  return (
    <div className="flex h-[78vh] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] backdrop-blur-xl">
      <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-[20px] border border-white/15 bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
              {character.image ? (
                <Image
                  src={character.image}
                  alt={character.name}
                  fill
                  className="object-contain bg-black/30 object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/90">
                  {character.name.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <p className="text-base font-semibold text-white">{character.name}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-white/55">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <p>{isInitializing ? "Loading conversation..." : "Private session active"}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={getRetentionLabel(retentionState)}
              tone={getRetentionTone(retentionState)}
            />
            {justReset ? <StatusBadge label="Reset completed" tone="success" /> : null}

            <button
              type="button"
              onClick={handleResetChat}
              disabled={isTyping || isInitializing || isResetting || !activeConversationId}
              className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/70 transition hover:bg-white/10 disabled:opacity-50"
            >
              {isResetting ? "Resetting..." : "Reset chat"}
            </button>
          </div>
        </div>
      </div>

      {chatStatus && (
        <div className="border-b border-white/10 bg-black/15 px-4 py-3 text-xs text-white/50 md:px-6">
          {chatStatus}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.01),rgba(0,0,0,0.02))] px-4 py-5 md:px-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          {messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[88%] items-end gap-3 md:max-w-[75%] ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {!isUser && (
                    <div className="relative mb-1 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/10">
                      {character.image ? (
                        <Image
                          src={character.image}
                          alt={character.name}
                          fill
                          className="object-contain bg-black/30 object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/85">
                          {character.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`overflow-hidden rounded-[24px] px-4 py-3 text-sm leading-7 shadow-[0_16px_40px_rgba(0,0,0,0.18)] ${
                      isUser
                        ? "rounded-br-md border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(245,245,245,0.96))] text-black"
                        : "rounded-bl-md border border-fuchsia-300/20 bg-[linear-gradient(135deg,rgba(255,79,163,0.96),rgba(217,70,239,0.92),rgba(99,102,241,0.9))] text-white"
                    }`}
                  >
                    {!isUser && (
                      <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/75">
                        {character.name}
                      </p>
                    )}

                    <div className="text-sm leading-7">
                      <MessageRichText
                        content={message.content}
                        tone={isUser ? "dark" : "light"}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {(isTyping || isInitializing) && (
            <div className="flex justify-start">
              <div className="flex max-w-[88%] items-end gap-3 md:max-w-[75%]">
                <div className="relative mb-1 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/10">
                  {character.image ? (
                    <Image
                      src={character.image}
                      alt={character.name}
                      fill
                      className="object-contain bg-black/30 object-center"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/85">
                      {character.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] rounded-bl-md border border-white/10 bg-white/[0.05] px-4 py-3 text-white shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
                  <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-white/75">
                    {character.name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-white/82">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/90" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/75 [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/60 [animation-delay:240ms]" />
                    <span className="text-sm lowercase tracking-[0.02em] text-white/78">
                      typing...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-4 md:px-6"
      >
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end gap-3 rounded-[26px] border border-white/10 bg-black/25 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-md">
            <input
              type="text"
              placeholder={`Message ${character.name}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping || isInitializing || isResetting || !activeConversationId}
              className="h-12 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/30 disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={
                isTyping ||
                isInitializing ||
                isResetting ||
                !activeConversationId ||
                !input.trim()
              }
              className="inline-flex h-12 items-center justify-center rounded-[18px] bg-white px-5 text-sm font-semibold text-black shadow-[0_18px_40px_rgba(255,255,255,0.1)] transition hover:scale-[1.02] hover:opacity-95 disabled:opacity-60"
            >
              {isTyping ? "Thinking..." : "Send"}
            </button>
          </div>

          <p className="mt-3 px-2 text-xs text-white/35">
            Private conversation • Messages save automatically • {getRetentionHint(retentionState, character.name)}
          </p>
        </div>
      </form>
    </div>
  );
}
