import Link from "next/link";
import { buildMonetizationSnapshot } from "@/lib/monetization";
import { createClient } from "@/lib/supabase/server";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: characterCount } = await supabase
    .from("custom_characters")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id ?? "");

  const { count: conversationCount } = await supabase
    .from("custom_conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user?.id ?? "");

  const { data: characterRows } = await supabase
    .from("custom_characters")
    .select("id, payload")
    .eq("user_id", user?.id ?? "");

  const characterIds = (characterRows ?? [])
    .map((row) => (typeof row.id === "string" ? row.id : ""))
    .filter(Boolean);

  let rerollsThisMonth = 0;

  if (characterIds.length > 0) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("character_image_jobs")
      .select("*", { count: "exact", head: true })
      .in("character_id", characterIds)
      .eq("kind", "variation")
      .gte("created_at", monthStart.toISOString());

    rerollsThisMonth = count ?? 0;
  }

  const publicCharacterCount = (characterRows ?? []).filter((row) => {
    if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) {
      return false;
    }

    return row.payload.visibility === "public";
  }).length;

  const monetization = buildMonetizationSnapshot({
    user,
    usage: {
      characterCount: characterCount ?? 0,
      conversationCount: conversationCount ?? 0,
      publicCharacterCount,
      rerollsThisMonth,
    },
  });

  return (
    <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,rgba(217,70,239,0.12),rgba(255,255,255,0.05),rgba(34,211,238,0.08))] p-8 shadow-[0_28px_100px_rgba(0,0,0,0.3)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_24%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-fuchsia-200">
                Plans preview
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                A preview of how plans can grow later
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                Payments are not the focus right now. This page only shows how limits
                and future plan tiers are expected to work.
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/25 p-5 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/80">
                Your current level
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {monetization.currentPlan.label}
              </div>
              <p className="mt-3 text-sm leading-7 text-white/65">
                {monetization.currentPlan.summary}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  {monetization.slotUsageLabel}
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-cyan-100">
                  {monetization.rerollUsageLabel}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          {monetization.availablePlans.map((plan) => {
            const isCurrent = plan.id === monetization.currentPlan.id;

            return (
              <article
                key={plan.id}
                className={`rounded-[32px] border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] ${plan.accentClassName}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">
                      {plan.badge}
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

                <div className="mt-5 text-4xl font-semibold text-white">
                  {plan.monthlyPrice}
                  <span className="text-base font-normal text-white/48"> planned monthly</span>
                </div>
                <div className="mt-1 text-sm text-white/48">
                  {plan.yearlyPrice} planned yearly
                </div>

                <p className="mt-4 text-sm leading-7 text-white/65">{plan.summary}</p>

                <div className="mt-6 space-y-3">
                  {plan.featuredPerks.map((perk) => (
                    <div
                      key={perk}
                      className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/72"
                    >
                      {perk}
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">
                  <div>{plan.customCharacterSlots} locked character slots</div>
                  <div>{plan.monthlyRerolls} image rerolls each month</div>
                  <div>{plan.premiumScenePacks} premium scene packs</div>
                  <div>{plan.premiumArchetypes} premium archetypes</div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/my-profile"
                    className={
                      isCurrent
                        ? "block rounded-full border border-white/10 bg-white/5 px-5 py-3 text-center text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
                        : "block rounded-full bg-white px-5 py-3 text-center text-sm font-medium text-black transition hover:opacity-90"
                    }
                  >
                    {isCurrent ? "View current level" : `Preview ${plan.label}`}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
