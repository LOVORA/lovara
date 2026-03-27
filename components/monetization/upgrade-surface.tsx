import Link from "next/link";

export type UpgradeSurfaceProps = {
  eyebrow: string;
  title: string;
  description: string;
  reasons: string[];
  featuredValues: string[];
  primaryHref: string;
  primaryLabel: string;
};

export default function UpgradeSurface({
  eyebrow,
  title,
  description,
  reasons,
  featuredValues,
  primaryHref,
  primaryLabel,
}: UpgradeSurfaceProps) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
      <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">{eyebrow}</div>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-white/65">{description}</p>

      <div className="mt-5 space-y-3">
        {reasons.map((reason) => (
          <div
            key={reason}
            className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/68"
          >
            {reason}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/80">
          Premium layers
        </div>
        <div className="mt-3 grid gap-2 text-sm text-white/72">
          {featuredValues.map((value) => (
            <div key={value}>{value}</div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Link
          href={primaryHref}
          className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
        >
          {primaryLabel}
        </Link>
      </div>
    </section>
  );
}
