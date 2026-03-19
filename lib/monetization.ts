import type { User } from "@supabase/supabase-js";

export type PlanId = "free" | "plus" | "pro";

export type PlanDefinition = {
  id: PlanId;
  label: string;
  monthlyPrice: string;
  yearlyPrice: string;
  badge: string;
  summary: string;
  customCharacterSlots: number;
  monthlyRerolls: number;
  premiumScenePacks: number;
  premiumArchetypes: number;
  featuredPerks: string[];
  accentClassName: string;
};

export type UsageSnapshot = {
  characterCount: number;
  rerollsThisMonth: number;
  conversationCount: number;
  publicCharacterCount: number;
};

export type MonetizationSnapshot = {
  currentPlan: PlanDefinition;
  availablePlans: PlanDefinition[];
  usage: UsageSnapshot;
  remainingCharacterSlots: number;
  remainingRerolls: number;
  slotUsageLabel: string;
  rerollUsageLabel: string;
  upgradeReasons: string[];
};

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    badge: "Starter",
    summary: "Enough to build your first characters and feel the product.",
    customCharacterSlots: 6,
    monthlyRerolls: 12,
    premiumScenePacks: 0,
    premiumArchetypes: 0,
    featuredPerks: [
      "Up to 6 locked custom characters",
      "12 image rerolls each month",
      "Core roleplay and visual builder",
      "Community sharing",
    ],
    accentClassName: "border-white/12 bg-white/[0.04]",
  },
  plus: {
    id: "plus",
    label: "Plus",
    monthlyPrice: "$14",
    yearlyPrice: "$132",
    badge: "Most popular",
    summary: "More room, more rerolls, and access to premium scene packs.",
    customCharacterSlots: 24,
    monthlyRerolls: 60,
    premiumScenePacks: 8,
    premiumArchetypes: 8,
    featuredPerks: [
      "Up to 24 locked custom characters",
      "60 image rerolls each month",
      "Premium scene packs",
      "Premium archetypes and faster creative loops",
    ],
    accentClassName:
      "border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.14),rgba(255,255,255,0.04))]",
  },
  pro: {
    id: "pro",
    label: "Pro",
    monthlyPrice: "$29",
    yearlyPrice: "$276",
    badge: "Power creators",
    summary:
      "For heavy creators who want deep libraries, more experimentation, and future premium packs included.",
    customCharacterSlots: 80,
    monthlyRerolls: 220,
    premiumScenePacks: 999,
    premiumArchetypes: 999,
    featuredPerks: [
      "Up to 80 locked custom characters",
      "220 image rerolls each month",
      "All premium scene packs",
      "All premium archetypes and early access drops",
    ],
    accentClassName:
      "border-cyan-400/25 bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(255,255,255,0.04))]",
  },
};

function clampRemaining(limit: number, used: number) {
  return Math.max(limit - used, 0);
}

function readPlanCandidate(user?: User | null): string | undefined {
  if (!user) return undefined;

  const candidates = [
    user.app_metadata?.subscription_plan,
    user.app_metadata?.plan,
    user.user_metadata?.subscription_plan,
    user.user_metadata?.plan,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return undefined;
}

export function resolvePlanId(user?: User | null): PlanId {
  const candidate = readPlanCandidate(user);

  if (candidate === "pro") return "pro";
  if (candidate === "plus") return "plus";
  return "free";
}

export function buildMonetizationSnapshot(input: {
  user?: User | null;
  usage: UsageSnapshot;
}): MonetizationSnapshot {
  const planId = resolvePlanId(input.user);
  const currentPlan = PLAN_DEFINITIONS[planId];
  const remainingCharacterSlots = clampRemaining(
    currentPlan.customCharacterSlots,
    input.usage.characterCount,
  );
  const remainingRerolls = clampRemaining(
    currentPlan.monthlyRerolls,
    input.usage.rerollsThisMonth,
  );

  const upgradeReasons: string[] = [];

  if (remainingCharacterSlots <= 2) {
    upgradeReasons.push("You are close to your locked character limit.");
  }

  if (remainingRerolls <= 4) {
    upgradeReasons.push("Your monthly image rerolls are running low.");
  }

  if (currentPlan.id === "free") {
    upgradeReasons.push("Premium scene packs and archetypes stay locked on Free.");
  }

  return {
    currentPlan,
    availablePlans: [PLAN_DEFINITIONS.free, PLAN_DEFINITIONS.plus, PLAN_DEFINITIONS.pro],
    usage: input.usage,
    remainingCharacterSlots,
    remainingRerolls,
    slotUsageLabel: `${input.usage.characterCount}/${currentPlan.customCharacterSlots} character slots used`,
    rerollUsageLabel: `${input.usage.rerollsThisMonth}/${currentPlan.monthlyRerolls} rerolls used this month`,
    upgradeReasons,
  };
}
