"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeSavedCharacterFromAccount } from "@/lib/account";
import { type CharacterListCardView } from "@/lib/character-builder/list-item-mappers";

type CharacterListCardProps = {
  item: CharacterListCardView;
  ctaLabel?: string;
  href?: string;
  showAccountActions?: boolean;
  onDeleteSuccess?: (characterId: string) => void;
};

const FAVORITES_STORAGE_KEY = "lovora.favorite.characters";
const RECENT_STORAGE_KEY = "lovora.recent.characters";

function pruneStorageList(key: string, value: string) {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    window.localStorage.setItem(
      key,
      JSON.stringify(parsed.filter((item) => item !== value)),
    );
  } catch {
    return;
  }
}

export default function CharacterListCard({
  item,
  ctaLabel = "Open",
  href,
  showAccountActions = false,
  onDeleteSuccess,
}: CharacterListCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const originLine = [item.ageLabel, item.originLabel].filter(Boolean).join(" • ");
  const sourceLabel =
    item.source === "custom"
      ? "Your character"
      : item.source === "community"
        ? "Saved community character"
        : "Saved professional character";

  async function handleDelete() {
    if (deleting) return;

    setDeleting(true);

    try {
      await removeSavedCharacterFromAccount({
        source: item.source,
        characterId: item.deleteCharacterId,
        slug: item.slug,
      });
      pruneStorageList(FAVORITES_STORAGE_KEY, item.slug);
      pruneStorageList(RECENT_STORAGE_KEY, item.slug);
      onDeleteSuccess?.(item.deleteCharacterId);
      if (!onDeleteSuccess) {
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      window.alert(
        error instanceof Error ? error.message : "Could not delete this character.",
      );
    } finally {
      setConfirmingDelete(false);
      setDeleting(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_18px_56px_rgba(0,0,0,0.2)]">
      <div className="relative">
        {item.imageUrl ? (
          <div className="relative h-[19rem] w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.28))] md:h-[21.5rem]">
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={1200}
              height={768}
              unoptimized
              className="h-full w-full object-cover object-top"
            />
          </div>
        ) : (
          <div className="flex h-[19rem] w-full items-center justify-center bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20 md:h-[21.5rem]">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-black/30 text-2xl font-semibold text-white/88">
                {item.name.slice(0, 1)}
              </div>
              <div className="mt-2 text-sm text-white/45">
                Saved avatar
              </div>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.82),rgba(5,8,22,0.16)_34%,transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_24%)] opacity-70" />

        <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,11,22,0.68),rgba(9,11,22,0.88))] px-4 py-3 backdrop-blur-xl md:px-5 md:py-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/42">
              {sourceLabel}
            </div>
            <div className="mt-2 line-clamp-2 text-[1.45rem] font-semibold leading-[1.05] tracking-tight text-white md:text-[1.6rem]">
              {item.name}
            </div>
            {originLine ? (
              <p className="mt-2 text-sm leading-6 text-white/66">{originLine}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <p className="line-clamp-2 text-sm leading-7 text-white/70 md:text-[0.95rem]">
          {item.storySummary || "Saved in your account and ready to reopen."}
        </p>

        {showAccountActions ? (
          <div className="mt-5 flex items-center gap-3 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={() => router.push(item.chatHref)}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
            >
              Chat
            </button>
            {confirmingDelete ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={deleting}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            )}
          </div>
        ) : href ? (
          <div className="mt-5 border-t border-white/8 pt-4">
            <Link
              href={href}
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
            >
              {ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}
