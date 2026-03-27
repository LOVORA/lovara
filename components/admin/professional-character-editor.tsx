"use client";

import { useState } from "react";

type ProfessionalCharacterEditorProps = {
  character: {
    slug: string;
    name: string;
    role: string;
    headline: string;
    description: string;
    adminVisibility: {
      showInProfessionalList: boolean;
      chatEnabled: boolean;
      showInChatsSidebar: boolean;
      showInPhotoStudio: boolean;
    };
    adminSortOrder: number;
  };
};

type SaveState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

export default function ProfessionalCharacterEditor({
  character,
}: ProfessionalCharacterEditorProps) {
  const [roleLabel, setRoleLabel] = useState(character.role);
  const [headline, setHeadline] = useState(character.headline);
  const [description, setDescription] = useState(character.description);
  const [showInProfessionalList, setShowInProfessionalList] = useState(
    character.adminVisibility.showInProfessionalList,
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
  const [sortOrder, setSortOrder] = useState(String(character.adminSortOrder));
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveState(null);

    try {
      const response = await fetch(
        `/api/admin/characters/professional/${encodeURIComponent(character.slug)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            roleLabel,
            headline,
            description,
            showInProfessionalList,
            chatEnabled,
            showInChatsSidebar,
            showInPhotoStudio,
            sortOrder: sortOrder.trim() === "" ? null : Number(sortOrder),
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Could not save character override.");
      }

      setSaveState({ type: "success", message: "Professional character updated." });
    } catch (error) {
      setSaveState({
        type: "error",
        message:
          error instanceof Error ? error.message : "Could not save character override.",
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
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Role label
          </div>
          <input
            value={roleLabel}
            onChange={(event) => setRoleLabel(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-400/35"
          />
        </label>

        <label className="space-y-2">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">
            Sort order
          </div>
          <input
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            inputMode="numeric"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-400/35"
          />
        </label>
      </div>

      <label className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">Headline</div>
        <input
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-400/35"
        />
      </label>

      <label className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-white/40">Description</div>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={6}
          className="w-full rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-fuchsia-400/35"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          {
            label: "Show in Professional list",
            checked: showInProfessionalList,
            onChange: setShowInProfessionalList,
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
              className="h-4 w-4 rounded border-white/20 bg-black/30 text-fuchsia-400"
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
