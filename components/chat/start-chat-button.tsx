"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getOrCreateConversationForCharacter } from "../../lib/chat";

type StartChatButtonProps = {
  characterSlug: string;
  characterName: string;
  characterGreeting: string;
};

export default function StartChatButton({
  characterSlug,
  characterName,
  characterGreeting,
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

      await getOrCreateConversationForCharacter(supabase, user.id, {
        slug: characterSlug,
        name: characterName,
        greeting: characterGreeting,
      });

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
