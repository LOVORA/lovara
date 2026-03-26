"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteImageButton({
  imageId,
  characterId,
}: {
  imageId: string;
  characterId: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
          const response = await fetch("/api/image/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ imageId, characterId }),
          });
          const payload = (await response.json().catch(() => null)) as
            | { ok?: boolean; error?: string }
            | null;
          if (!response.ok || !payload?.ok) {
            throw new Error(payload?.error || "Could not delete image.");
          }
          router.refresh();
        } catch (error) {
          window.alert(
            error instanceof Error ? error.message : "Could not delete image.",
          );
        } finally {
          setIsDeleting(false);
        }
      }}
      disabled={isDeleting}
      className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-rose-100 transition hover:border-rose-400/35 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
