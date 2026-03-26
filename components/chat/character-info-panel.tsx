import Image from "next/image";
import Link from "next/link";

export type CharacterInfoPanelProps = {
  avatarUrl?: string | null;
  name: string;
  ageLabel?: string | null;
  roleLabel?: string | null;
  identityChips?: string[];
  storySummary?: string | null;
  scenarioSummary?: string | null;
  photoStudioHref: string;
  photoStudioLabel?: string;
};

export default function CharacterInfoPanel({
  avatarUrl,
  name,
  ageLabel,
  roleLabel,
  identityChips = [],
  storySummary,
  scenarioSummary,
  photoStudioHref,
  photoStudioLabel = "Open Photo Studio",
}: CharacterInfoPanelProps) {
  const summaryLines = [ageLabel, roleLabel].filter(Boolean).join(" • ");

  return (
    <aside className="space-y-4">
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-fuchsia-500/20 via-slate-900 to-cyan-500/20">
          {avatarUrl ? (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]">
              <Image
                src={avatarUrl}
                alt={`${name} avatar`}
                fill
                unoptimized
                sizes="(min-width: 1280px) 360px, 100vw"
                className="object-contain object-center"
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-black/35 text-3xl font-semibold text-white/88">
                {name.slice(0, 1)}
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,8,22,0.82),transparent_48%)]" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="rounded-[26px] border border-white/10 bg-black/35 p-4 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/70">
                Character
              </div>
              <div className="mt-2 text-lg font-semibold text-white">{name}</div>
              {summaryLines ? (
                <div className="mt-2 text-sm text-white/72">{summaryLines}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
        <div className="space-y-4">
          {identityChips.length > 0 ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Quick Info
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {identityChips.slice(0, 4).map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {storySummary ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Character
              </div>
              <div className="mt-2 text-sm leading-6 text-white/74">{storySummary}</div>
            </div>
          ) : null}

          {scenarioSummary ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Scenario
              </div>
              <div className="mt-2 text-sm leading-6 text-white/74">{scenarioSummary}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <Link
            href={photoStudioHref}
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
          >
            {photoStudioLabel}
          </Link>
        </div>
      </div>
    </aside>
  );
}
