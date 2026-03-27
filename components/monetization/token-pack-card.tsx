import type { TokenPackDefinition } from "@/lib/monetization";

export default function TokenPackCard({ pack }: { pack: TokenPackDefinition }) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/78">
        Token pack
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {pack.label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-white">{pack.price}</div>
      <div className="mt-4 text-sm leading-7 text-white/60">{pack.summary}</div>
    </article>
  );
}
