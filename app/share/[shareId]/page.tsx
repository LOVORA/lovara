"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Globe,
  Lock,
  MessageCircle,
  Sparkles,
  UserPlus,
  Shield,
  HeartHandshake,
  ScrollText,
  Tags,
  Star,
  Copy,
  CheckCircle2,
} from "lucide-react";
import {
  createMyCustomCharacter,
  getMyCustomCharacterBySlug,
  type DbCustomCharacter,
} from "@/lib/account";
import { CHARACTER_IMAGES_BUCKET } from "@/lib/character-images";
import { supabase } from "@/lib/supabase";
import {
  getPublicCustomCharacterByShareId,
  type PublicCustomCharacter,
} from "@/lib/public-characters";
import {
  getIdentitySummary,
  getVisibilityFromPayload,
} from "@/lib/custom-character-studio";

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

type CharacterImageLookupRow = {
  id: string;
  character_id: string;
  storage_path: string | null;
  public_url: string | null;
  is_primary: boolean;
  created_at: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function safePayload(
  character: PublicCustomCharacter | DbCustomCharacter,
): Record<string, unknown> {
  return typeof character.payload === "object" && character.payload
    ? (character.payload as Record<string, unknown>)
    : {};
}

function getScenarioSummary(
  scenario?: {
    setting?: string;
    relationshipToUser?: string;
    sceneGoal?: string;
    tone?: string;
    openingState?: string;
  },
) {
  const parts = [
    scenario?.setting,
    scenario?.relationshipToUser,
    scenario?.sceneGoal,
    scenario?.tone,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Open-ended roleplay dynamic";
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function DetailCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/80">
          {icon}
        </div>
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">
          {label}
        </div>
      </div>

      <div className="mt-4 text-sm leading-7 text-white/78">{children}</div>
    </section>
  );
}

function StatChip({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "cyan" | "amber";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium",
        tone === "default" && "border-white/10 bg-white/5 text-white/75",
        tone === "success" &&
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        tone === "cyan" &&
          "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
        tone === "amber" &&
          "border-amber-400/20 bg-amber-400/10 text-amber-100",
      )}
    >
      {label}
    </span>
  );
}

function PreviewBubble({
  title,
  content,
  tone = "default",
}: {
  title: string;
  content: string;
  tone?: "default" | "soft" | "dark";
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border px-4 py-4",
        tone === "default" && "border-white/10 bg-white/[0.03]",
        tone === "soft" && "border-cyan-400/15 bg-cyan-400/10",
        tone === "dark" && "border-fuchsia-400/15 bg-fuchsia-400/10",
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
        {title}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/82">
        {content}
      </p>
    </div>
  );
}

function HeroStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="text-sm text-white/45">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-white/55">{helper}</div>
    </div>
  );
}

export default function PublicSharePage() {
  const params = useParams<{ shareId?: string | string[] }>();
  const router = useRouter();

  const shareId =
    typeof params?.shareId === "string"
      ? params.shareId
      : Array.isArray(params?.shareId)
        ? params.shareId[0]
        : "";

  const [character, setCharacter] = useState<PublicCustomCharacter | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerState>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [importing, setImporting] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadPrimaryAvatar(characterId: string) {
    try {
      const db = supabase;

      const { data: rowRaw, error } = await db
        .from("character_images")
        .select("id, character_id, storage_path, public_url, is_primary, created_at")
        .eq("character_id", characterId)
        .eq("is_primary", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !rowRaw) {
        setAvatarUrl(null);
        return;
      }

      const row = rowRaw as CharacterImageLookupRow;

      if (row.public_url) {
        setAvatarUrl(row.public_url);
        return;
      }

      if (!row.storage_path) {
        setAvatarUrl(null);
        return;
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from(CHARACTER_IMAGES_BUCKET)
        .createSignedUrl(row.storage_path, 60 * 60);

      if (!signedError && signedData?.signedUrl) {
        setAvatarUrl(signedData.signedUrl);
        return;
      }

      setAvatarUrl(null);
    } catch {
      setAvatarUrl(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setBanner(null);
      setAvatarUrl(null);

      try {
        const publicCharacter = await getPublicCustomCharacterByShareId(shareId);

        if (!publicCharacter) {
          throw new Error("NOT_FOUND");
        }

        if (cancelled) return;
        setCharacter(publicCharacter);

        await loadPrimaryAvatar(publicCharacter.id);

        setCheckingOwner(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!cancelled && user) {
          setIsOwner(user.id === publicCharacter.user_id);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not load character.";

        if (!cancelled) {
          setBanner({
            type: "error",
            message:
              message === "NOT_FOUND"
                ? "This public character could not be found."
                : message,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCheckingOwner(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const identitySummary = useMemo(() => {
    if (!character) return [];
    return getIdentitySummary(safePayload(character));
  }, [character]);

  async function handleImport() {
    if (!character || importing) return;

    setImporting(true);
    setBanner(null);

    try {
      const existing = await getMyCustomCharacterBySlug(character.slug);

      if (existing) {
        setBanner({
          type: "success",
          message: "This character is already in your account.",
        });
        router.push(`/chat/custom/${existing.slug}`);
        router.refresh();
        return;
      }

      const payload = safePayload(character);
      const nextPayload: Record<string, unknown> = {
        ...payload,
        visibility: "private",
      };

      delete nextPayload.publicShareId;

      const created = await createMyCustomCharacter({
        name: character.name,
        archetype: character.archetype || "custom",
        headline: character.headline || "",
        description: character.description || "",
        greeting: character.greeting || "",
        previewMessage: character.preview_message || "",
        backstory: character.backstory || "",
        tags: character.tags ?? [],
        traitBadges: [],
        scenario: character.scenario ?? {},
        payload: nextPayload,
      });

      setBanner({
        type: "success",
        message: `"${created.name}" was added to your account.`,
      });

      router.push(`/chat/custom/${created.slug}`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not add character.";

      setBanner({
        type: "error",
        message:
          message === "AUTH_REQUIRED"
            ? "You need to log in before adding this character."
            : message,
      });
    } finally {
      setImporting(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setBanner({
        type: "success",
        message: "Public link copied.",
      });

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setBanner({
        type: "error",
        message: "Could not copy the public link.",
      });
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-white/10 bg-white/[0.03] p-8 text-sm text-white/65">
          Loading public character...
        </div>
      </main>
    );
  }

  if (!character) {
    return (
      <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
          <h1 className="text-2xl font-semibold text-white">Character unavailable</h1>
          <p className="mt-3 text-sm text-white/60">
            {banner?.message || "This public character could not be loaded."}
          </p>
          <div className="mt-6">
            <Link
              href="/characters"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
            >
              Back to discover
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const visibility = getVisibilityFromPayload(safePayload(character));
  const scenarioSummary = getScenarioSummary(character.scenario);
  const tagList = character.tags ?? [];
  const greetingPreview =
    character.greeting || character.preview_message || "No greeting added.";
  const shortDescription =
    character.headline || truncate(character.description || "", 180);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-fuchsia-500/12 via-white/[0.05] to-cyan-400/12 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.14),transparent_24%)]" />
          <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-fuchsia-200">
                <Sparkles className="h-4 w-4" />
                Public Character
              </div>

              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                {character.name}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
                {shortDescription}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <StatChip label={character.archetype || "custom"} />
                <StatChip
                  label={visibility === "public" ? "Public" : "Private"}
                  tone={visibility === "public" ? "success" : "default"}
                />
                {isOwner ? <StatChip label="Owner view" tone="cyan" /> : null}
                {!isOwner ? <StatChip label="Community visible" tone="amber" /> : null}
              </div>

              {identitySummary.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {identitySummary.map((item) => (
                    <StatChip key={item} label={item} tone="cyan" />
                  ))}
                </div>
              ) : null}

              <div className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]">
                <div className="relative h-[360px] w-full bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${character.name} avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-end p-6">
                      <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/70 backdrop-blur">
                        No avatar yet
                      </span>
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.55),transparent_45%)]" />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </button>

                <Link
                  href="/characters"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                >
                  Back to discover
                </Link>

                {isOwner ? (
                  <>
                    <Link
                      href="/my-characters"
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10"
                    >
                      My characters
                    </Link>
                    <Link
                      href={`/chat/custom/${character.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
                    >
                      Open private chat
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing || checkingOwner}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <UserPlus className="h-4 w-4" />
                    {importing ? "Adding..." : "Add to my characters"}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-white/45">
                Why this page matters
              </div>

              <div className="mt-4 grid gap-3">
                <HeroStat
                  label="Profile"
                  value="Public showcase"
                  helper="A polished share page for discovery, trust, and imports."
                />
                <HeroStat
                  label="Workflow"
                  value={isOwner ? "Owner access active" : "Import-ready"}
                  helper={
                    isOwner
                      ? "You can keep using your private copy while this page stays public."
                      : "Save this character into your vault and continue privately."
                  }
                />
                <HeroStat
                  label="Scenario"
                  value={character.scenario?.setting || "Open setting"}
                  helper="The roleplay setup stays visible before import."
                />
              </div>
            </div>
          </div>
        </section>

        {banner ? (
          <div
            className={cn(
              "mt-6 rounded-2xl border px-4 py-3 text-sm",
              banner.type === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : "border-rose-400/20 bg-rose-400/10 text-rose-100",
            )}
          >
            {banner.message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <DetailCard icon={<ScrollText className="h-4 w-4" />} label="Description">
              <p className="whitespace-pre-wrap">
                {character.description || "No description added."}
              </p>
            </DetailCard>

            <DetailCard icon={<MessageCircle className="h-4 w-4" />} label="Greeting Preview">
              <PreviewBubble
                title="First impression"
                content={greetingPreview}
                tone="dark"
              />
            </DetailCard>

            <DetailCard icon={<HeartHandshake className="h-4 w-4" />} label="Backstory">
              <p className="whitespace-pre-wrap">
                {character.backstory || "No backstory added."}
              </p>
            </DetailCard>
          </section>

          <aside className="space-y-6">
            <DetailCard icon={<Sparkles className="h-4 w-4" />} label="Scenario Summary">
              <p>{scenarioSummary}</p>

              <div className="mt-4 grid gap-3">
                {character.scenario?.setting ? (
                  <PreviewBubble title="Setting" content={character.scenario.setting} tone="soft" />
                ) : null}
                {character.scenario?.relationshipToUser ? (
                  <PreviewBubble
                    title="Relationship"
                    content={character.scenario.relationshipToUser}
                  />
                ) : null}
                {character.scenario?.sceneGoal ? (
                  <PreviewBubble title="Scene Goal" content={character.scenario.sceneGoal} />
                ) : null}
                {character.scenario?.tone ? (
                  <PreviewBubble title="Tone" content={character.scenario.tone} tone="soft" />
                ) : null}
                {character.scenario?.openingState ? (
                  <PreviewBubble
                    title="Opening State"
                    content={character.scenario.openingState}
                    tone="dark"
                  />
                ) : null}
              </div>
            </DetailCard>

            <DetailCard icon={<Tags className="h-4 w-4" />} label="Tags">
              <div className="flex flex-wrap gap-2">
                {tagList.length > 0 ? (
                  tagList.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-white/50">No tags added</span>
                )}
              </div>
            </DetailCard>

            <DetailCard icon={<Shield className="h-4 w-4" />} label="Access & Usage">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    {visibility === "public" ? (
                      <Globe className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <Lock className="h-4 w-4 text-white/70" />
                    )}
                    {visibility === "public" ? "Publicly discoverable" : "Private"}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-white/68">
                    {visibility === "public"
                      ? "This character is visible in discover and can be viewed by other users."
                      : "This character is not visible in discover right now."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    {isOwner ? (
                      <MessageCircle className="h-4 w-4 text-cyan-300" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-cyan-300" />
                    )}
                    {isOwner ? "Owner controls" : "Import into your vault"}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-white/68">
                    {isOwner
                      ? "You own this character. Keep using your private chat flow while this public page stays visible for discovery."
                      : "Add this character to your account to create a private copy and start chatting with it from your own vault."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Star className="h-4 w-4 text-amber-300" />
                    Why import it
                  </div>
                  <p className="mt-2 text-sm leading-7 text-white/68">
                    Importing creates your own private version, so you can refine tone, keep it in
                    your library, and continue the character inside your personal workflow.
                  </p>
                </div>

                {isOwner ? (
                  <Link
                    href={`/chat/custom/${character.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black"
                  >
                    Open private chat
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing || checkingOwner}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <UserPlus className="h-4 w-4" />
                    {importing ? "Adding..." : "Add to my characters"}
                  </button>
                )}
              </div>
            </DetailCard>
          </aside>
        </div>
      </div>
    </main>
  );
}
