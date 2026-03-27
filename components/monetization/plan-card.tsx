import Link from "next/link";
import type { PlanDefinition } from "@/lib/monetization";
import { getPlanHeadline } from "@/lib/monetization-copy";

export type PlanCardProps = {
  plan: PlanDefinition;
  isCurrent?: boolean;
  ctaHref: string;
  ctaLabel: string;
  billingNote?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ListRow({
  label,
  tone,
}: {
  label: string;
  tone: "positive" | "negative";
}) {
  return (
    <div className="flex items-start gap-3 text-sm leading-6">
      <span
        className={cn(
          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          tone === "positive" && "bg-emerald-400/15 text-emerald-200",
          tone === "negative" && "bg-rose-400/15 text-rose-200",
        )}
      >
        {tone === "positive" ? "✓" : "✕"}
      </span>
      <span className={tone === "positive" ? "text-white/78" : "text-white/52"}>{label}</span>
    </div>
  );
}

export default function PlanCard({
  plan,
  isCurrent = false,
  ctaHref,
  ctaLabel,
  billingNote,
}: PlanCardProps) {
  return (
    <article
      className={cn(
        "rounded-[32px] border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]",
        plan.accentClassName,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">
            {getPlanHeadline(plan)}
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {plan.label}
          </h2>
        </div>
        {isCurrent ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
            Current
          </span>
        ) : null}
      </div>

      <div className="mt-5 text-4xl font-semibold text-white">{plan.monthlyPrice}</div>
      <div className="mt-1 text-sm text-white/48">per month</div>

      <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
          Yearly
        </div>
        <div className="mt-2 text-xl font-semibold text-white">{plan.yearlyPrice}</div>
        <div className="mt-1 text-sm text-white/52">Pay yearly and save 30%</div>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">
          Chat access
        </div>
        <div className="mt-2 text-lg font-semibold text-white">{plan.chatLimitLabel}</div>
      </div>

      <p className="mt-5 text-sm leading-7 text-white/68">{plan.summary}</p>

      <div className="mt-6 space-y-3">
        {plan.featuredPerks.map((perk) => (
          <ListRow key={perk} label={perk} tone="positive" />
        ))}
      </div>

      <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
        {plan.featuredTradeoffs.map((tradeoff) => (
          <ListRow key={tradeoff} label={tradeoff} tone="negative" />
        ))}
      </div>

      {billingNote ? <div className="mt-5 text-sm leading-6 text-white/48">{billingNote}</div> : null}

      <div className="mt-6">
        <Link
          href={ctaHref}
          className={
            isCurrent
              ? "block rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
              : "block rounded-full bg-white px-5 py-3 text-center text-sm font-medium text-black transition hover:opacity-90"
          }
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
