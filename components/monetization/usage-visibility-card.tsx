import Link from "next/link";

export type UsageVisibilityItem = {
  label: string;
  value: string;
  helper: string;
};

export type UsageVisibilityCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: UsageVisibilityItem[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function UsageVisibilityCard({
  eyebrow,
  title,
  description,
  items,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: UsageVisibilityCardProps) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(217,70,239,0.14),rgba(255,255,255,0.04))] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-fuchsia-200/80">
            {eyebrow}
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-white/68">{description}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
              {item.label}
            </div>
            <div className="mt-2 text-xl font-semibold text-white">{item.value}</div>
            <div className="mt-2 text-sm text-white/58">{item.helper}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={primaryHref}
          className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90"
        >
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link
            href={secondaryHref}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
