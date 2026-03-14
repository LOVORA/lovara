"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  createMyCustomCharacter,
  type CharacterDraftInput,
} from "@/lib/account";

const AuthGuard = dynamic(() => import("@/components/auth/auth-guard"), {
  ssr: false,
});

type BannerState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

type TraitTone = "neutral" | "soft" | "warm" | "bold" | "mysterious";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toTagArray(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 16);
}

function toTraitBadges(value: string) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  return items.map((label) => ({
    label,
    tone: "neutral" as TraitTone,
  }));
}

function buildHeadline(name: string, archetype: string, setting: string) {
  const safeName = name.trim() || "Custom Character";
  const safeArchetype = archetype.trim() || "Original Persona";
  if (setting.trim()) {
    return `${safeName} • ${safeArchetype} in ${setting.trim()}`;
  }
  return `${safeName} • ${safeArchetype}`;
}

function buildDescription(
  name: string,
  description: string,
  setting: string,
  relationshipToUser: string,
  tone: string,
) {
  const chunks = [
    description.trim(),
    setting.trim() ? `Scene: ${setting.trim()}.` : "",
    relationshipToUser.trim()
      ? `Dynamic: ${relationshipToUser.trim()}.`
      : "",
    tone.trim() ? `Tone: ${tone.trim()}.` : "",
  ].filter(Boolean);

  if (chunks.length > 0) return chunks.join(" ");
  return `${name.trim() || "This character"} is ready for a personalized roleplay-driven conversation.`;
}

function buildGreeting(
  name: string,
  setting: string,
  openingState: string,
  relationshipToUser: string,
) {
  const safeName = name.trim() || "Your character";
  const scene = setting.trim()
    ? `We're in ${setting.trim()}. `
    : "";
  const state = openingState.trim()
    ? `I'm coming into this moment feeling ${openingState.trim()}. `
    : "";
  const relationship = relationshipToUser.trim()
    ? `Between us, the dynamic is ${relationshipToUser.trim()}. `
    : "";

  return `${scene}${state}${relationship}${safeName} is here with you now.`;
}

function buildPreviewMessage(name: string, sceneGoal: string, tone: string) {
  const safeName = name.trim() || "This character";
  const goal = sceneGoal.trim()
    ? `The scene is moving toward ${sceneGoal.trim()}. `
    : "";
  const voice = tone.trim() ? `The energy feels ${tone.trim()}.` : "";
  return `${safeName} is ready to reply in-character. ${goal}${voice}`.trim();
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-white/60">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/85">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          rows={4}
          className="min-h-[120px] w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30 focus:bg-black/40"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="h-12 w-full rounded-[20px] border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30 focus:bg-black/40"
        />
      )}
    </label>
  );
}

export default function CreateCharacterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState("");
  const [description, setDescription] = useState("");
  const [backstory, setBackstory] = useState("");
  const [tags, setTags] = useState("");
  const [traits, setTraits] = useState("");

  const [setting, setSetting] = useState("");
  const [relationshipToUser, setRelationshipToUser] = useState("");
  const [sceneGoal, setSceneGoal] = useState("");
  const [tone, setTone] = useState("");
  const [openingState, setOpeningState] = useState("");

  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);

  const preview = useMemo(() => {
    return {
      headline: buildHeadline(name, archetype, setting),
      description: buildDescription(
        name,
        description,
        setting,
        relationshipToUser,
        tone,
      ),
      greeting: buildGreeting(name, setting, openingState, relationshipToUser),
      previewMessage: buildPreviewMessage(name, sceneGoal, tone),
      tags: toTagArray(tags),
      traitBadges: toTraitBadges(traits),
    };
  }, [
    name,
    archetype,
    setting,
    description,
    relationshipToUser,
    tone,
    openingState,
    sceneGoal,
    tags,
    traits,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setBanner(null);

    try {
      const payload: CharacterDraftInput = {
        name: name.trim(),
        archetype: archetype.trim() || "custom",
        headline: preview.headline,
        description: preview.description,
        greeting: preview.greeting,
        previewMessage: preview.previewMessage,
        backstory: backstory.trim(),
        tags: preview.tags,
        traitBadges: preview.traitBadges,
        scenario: {
          setting: setting.trim() || undefined,
          relationshipToUser: relationshipToUser.trim() || undefined,
          sceneGoal: sceneGoal.trim() || undefined,
          tone: tone.trim() || undefined,
          openingState: openingState.trim() || undefined,
        },
        payload: {
          builderVersion: 1,
          source: "create-character-page",
        },
      };

      const created = await createMyCustomCharacter(payload);

      setBanner({
        type: "success",
        message: `"${created.name}" was created successfully.`,
      });

      router.push(`/chat/custom/${created.slug}`);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create character.";

      setBanner({
        type: "error",
        message:
          message === "AUTH_REQUIRED"
            ? "You need to log in before creating a character."
            : message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#050816] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-white/5 to-cyan-400/10 p-8 shadow-2xl shadow-fuchsia-500/10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_28%)]" />
            <div className="relative">
              <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-fuchsia-200">
                Character Studio
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Create a character that belongs to your account
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                This version saves directly to Supabase, so every character is
                tied to the logged-in user and appears only in that user’s own
                vault.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={handleSubmit} className="space-y-6">
              {banner ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    banner.type === "success"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-100",
                  )}
                >
                  {banner.message}
                </div>
              ) : null}

              <Section
                title="Identity"
                description="Define who this character is before the scene starts."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Name"
                    value={name}
                    onChange={setName}
                    placeholder="Ayla"
                    required
                  />
                  <Field
                    label="Archetype"
                    value={archetype}
                    onChange={setArchetype}
                    placeholder="Mysterious medic"
                  />
                </div>

                <div className="mt-4">
                  <Field
                    label="Core description"
                    value={description}
                    onChange={setDescription}
                    placeholder="Confident, observant, emotionally controlled, but unexpectedly warm in private."
                    textarea
                  />
                </div>

                <div className="mt-4">
                  <Field
                    label="Backstory"
                    value={backstory}
                    onChange={setBackstory}
                    placeholder="A short history that explains how the character became who they are."
                    textarea
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    label="Tags"
                    value={tags}
                    onChange={setTags}
                    placeholder="romance, slow burn, protective"
                  />
                  <Field
                    label="Trait badges"
                    value={traits}
                    onChange={setTraits}
                    placeholder="calm, teasing, loyal"
                  />
                </div>
              </Section>

              <Section
                title="Scenario"
                description="These fields shape the roleplay context directly inside the character."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Setting"
                    value={setting}
                    onChange={setSetting}
                    placeholder="Night hospital shift"
                  />
                  <Field
                    label="Relationship to user"
                    value={relationshipToUser}
                    onChange={setRelationshipToUser}
                    placeholder="Trusted but emotionally guarded colleague"
                  />
                  <Field
                    label="Scene goal"
                    value={sceneGoal}
                    onChange={setSceneGoal}
                    placeholder="Build tension while staying professional"
                  />
                  <Field
                    label="Tone"
                    value={tone}
                    onChange={setTone}
                    placeholder="Low-key, intimate, restrained"
                  />
                </div>

                <div className="mt-4">
                  <Field
                    label="Opening state"
                    value={openingState}
                    onChange={setOpeningState}
                    placeholder="Tired after a long shift but unusually honest tonight"
                    textarea
                  />
                </div>
              </Section>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Creating..." : "Create character"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/my-characters")}
                  className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                >
                  Go to my characters
                </button>
              </div>
            </form>

            <aside className="space-y-6">
              <Section
                title="Live preview"
                description="This is the shape that will be saved to the current account."
              >
                <div className="rounded-[24px] border border-white/10 bg-black/25 p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-fuchsia-200/80">
                    Preview
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    {name.trim() || "Unnamed Character"}
                  </h3>
                  <p className="mt-2 text-sm text-white/65">
                    {preview.headline}
                  </p>

                  <div className="mt-5 space-y-4 text-sm text-white/75">
                    <div>
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                        Description
                      </div>
                      <p>{preview.description}</p>
                    </div>

                    <div>
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                        Greeting
                      </div>
                      <p>{preview.greeting}</p>
                    </div>

                    <div>
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/40">
                        Preview message
                      </div>
                      <p>{preview.previewMessage}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {preview.tags.length > 0 ? (
                      preview.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-white/35">
                        No tags yet
                      </span>
                    )}
                  </div>
                </div>
              </Section>

              <Section
                title="What this fixes"
                description="This is the stable model you asked for."
              >
                <ul className="space-y-3 text-sm text-white/68">
                  <li>• Character is saved to the logged-in user only.</li>
                  <li>• Another account cannot see this character.</li>
                  <li>• Chat page can load the character from Supabase.</li>
                  <li>• You are no longer depending on browser localStorage.</li>
                </ul>
              </Section>
            </aside>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
