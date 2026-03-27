"use client";

import { useState } from "react";

type CommunityCharacterEditorProps = {
  character: {
    id: string;
    name: string;
    slug: string;
    archetype: string;
    headline: string;
    description: string;
    payload: Record<string, unknown> | null;
    adminVisibility: {
      showInCommunityList: boolean;
      chatEnabled: boolean;
      showInChatsSidebar: boolean;
      showInPhotoStudio: boolean;
    };
  };
};

type SaveState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export default function CommunityCharacterEditor({
  character,
}: CommunityCharacterEditorProps) {
  const payload = toRecord(character.payload);

  const [name, setName] = useState(character.name);
  const [archetype, setArchetype] = useState(character.archetype);
  const [headline, setHeadline] = useState(character.headline);
  const [description, setDescription] = useState(character.description);
  const [visibility, setVisibility] = useState(
    payload.visibility === "public" ? "public" : "private",
  );
  const [publicShareId, setPublicShareId] = useState(
    typeof payload.publicShareId === "string" ? payload.publicShareId : "",
  );
  const [publicTagline, setPublicTagline] = useState(
    typeof payload.publicTagline === "string" ? payload.publicTagline : "",
  );
  const [publicTeaser, setPublicTeaser] = useState(
    typeof payload.publicTeaser === "string" ? payload.publicTeaser : "",
  );
  const [showInCommunityList, setShowInCommunityList] = useState(
    character.adminVisibility.showInCommunityList,
  );
  const [chatEnabled, setChatEnabled] = useState(
    character.adminVisibility.chatEnabled,
  );
  const [showInChatsSidebar, setShowInChatsSidebar] = useState(
    character.adminVisibility.showInChatsSidebar,
  );
  const [showInPhotoStudio, setShowInPhotoStudio] = useState(
    character.adminVisibility.showInPhotoStudio,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveState(null);

    try {
      const response = await fetch(
        `/api/admin/characters/community/${encodeURIComponent(character.id)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            archetype,
            headline,
            description,
            visibility,
            publicShareId,
            publicTagline,
            publicTeaser,
            showInCommunityList,
            chatEnabled,
            showInChatsSidebar,
            showInPhotoStudio,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not save community character.");
      }

      setSaveState({ type: "success", message: "Community character updated." });
    } catch (error) {
      setSaveState({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not save community character.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-[32px] border border-white/10 bg-white/[0.03] p-6"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">Name</div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
          />
        </label>

        <label className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Archetype
          </div>
          <input
            value={archetype}
            onChange={(event) => setArchetype(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
          />
        </label>
      </div>

      <label className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">Headline</div>
        <input
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
        />
      </label>

      <label className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">Description</div>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          className="w-full rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-cyan-400/35"
        />
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Public visibility
          </div>
          <select
            value={visibility}
            onChange={(event) =>
              setVisibility(event.target.value === "public" ? "public" : "private")
            }
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </label>

        <label className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Public share ID
          </div>
          <input
            value={publicShareId}
            onChange={(event) => setPublicShareId(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Public tagline
          </div>
          <input
            value={publicTagline}
            onChange={(event) => setPublicTagline(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
          />
        </label>

        <label className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Public teaser
          </div>
          <input
            value={publicTeaser}
            onChange={(event) => setPublicTeaser(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/35"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          {
            label: "Show in Community list",
            checked: showInCommunityList,
            onChange: setShowInCommunityList,
          },
          {
            label: "Chat enabled",
            checked: chatEnabled,
            onChange: setChatEnabled,
          },
          {
            label: "Show in chats sidebar",
            checked: showInChatsSidebar,
            onChange: setShowInChatsSidebar,
          },
          {
            label: "Show in Photo Studio",
            checked: showInPhotoStudio,
            onChange: setShowInPhotoStudio,
          },
        ].map((item) => (
          <label
            key={item.label}
            className="flex items-center justify-between rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/80"
          >
            <span>{item.label}</span>
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(event) => item.onChange(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/30 text-cyan-400"
            />
          </label>
        ))}
      </div>

      {saveState ? (
        <div
          className={
            saveState.type === "success"
              ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
              : "rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
          }
        >
          {saveState.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
