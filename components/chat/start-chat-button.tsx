"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StartChatButtonProps = {
  characterSlug: string;
  characterName: string;
  characterGreeting: string;
};

export default function StartChatButton({
  characterSlug,
  characterName,
}: StartChatButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStartChat() {
    if (loading) return;

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push(`/login?next=${encodeURIComponent(`/chat/${characterSlug}`)}`);
        return;
      }

      const response = await fetch(
        `/api/chat/bootstrap?slug=${encodeURIComponent(characterSlug)}`,
        {
          credentials: "include",
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || `Could not open chat with ${characterName}.`);
      }

      router.push(`/chat/${characterSlug}`);
    } catch (error) {
      console.error(error);
      alert("Could not open this chat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleStartChat}
      disabled={loading}
      className="inline-flex rounded-full bg-white px-6 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-60"
    >
      {loading ? "Opening chat..." : `Chat with ${characterName}`}
    </button>
  );
}
