import Link from "next/link";
import PlanCard from "@/components/monetization/plan-card";
import TokenPackCard from "@/components/monetization/token-pack-card";
import { buildMonetizationSnapshot } from "@/lib/monetization";
import { getMonetizationValuePillars } from "@/lib/monetization-copy";

export default function PricingPage() {
  const monetization = buildMonetizationSnapshot({
    usage: {
      characterCount: 0,
      conversationCount: 0,
      publicCharacterCount: 0,
      rerollsThisMonth: 0,
      messagesThisMonth: 0,
    },
  });

  const valuePillars = getMonetizationValuePillars();

  return (
    <main className="min-h-screen bg-[#050816] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="mx-auto max-w-4xl text-center">
          <div className="inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-fuchsia-200">
            Plans
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            Simple plans for private companion access
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/62 md:text-base">
            Choose the Lovora access layer that fits your monthly chat volume. Billing is not
            live yet, but the product structure is ready and clear.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs uppercase tracking-[0.18em] text-white/45">
            {valuePillars.map((pillar) => (
              <span
                key={pillar.title}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2"
              >
                {pillar.title}
              </span>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <Link
              href="/my-profile"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/10"
            >
              View your account
            </Link>
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-3">
          {monetization.availablePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={false}
              ctaHref="/my-profile"
              ctaLabel={`Choose ${plan.label}`}
              billingNote="Displayed for product preparation only. Checkout is not active yet."
            />
          ))}
        </section>

        <section className="mt-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/78">
              Token packs
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Extra token plans prepared for later
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/58">
              These token packs are display-only for now. They are shown so future premium
              actions can attach to a clean catalog later.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {monetization.tokenPacks.map((pack) => (
              <TokenPackCard key={pack.id} pack={pack} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
