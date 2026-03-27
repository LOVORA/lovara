import type { User } from "@supabase/supabase-js";

export type PlanId = "free" | "plus" | "pro";

export type PlanDefinition = {
  id: PlanId;
  label: string;
  monthlyPrice: string;
  yearlyPrice: string;
  badge: string;
  summary: string;
  chatLimitLabel: string;
  chatLimitKind: "limited" | "unlimited";
  monthlyMessageLimit?: number;
  featuredPerks: string[];
  featuredTradeoffs: string[];
  accentClassName: string;
};

export type TokenPackDefinition = {
  id: "starter_100" | "growth_250" | "power_500";
  label: string;
  tokenAmount: number;
  price: string;
  summary: string;
};

export type UsageSnapshot = {
  characterCount: number;
  rerollsThisMonth: number;
  conversationCount: number;
  publicCharacterCount: number;
  messagesThisMonth: number;
};

export type MonetizationSnapshot = {
  currentPlan: PlanDefinition;
  availablePlans: PlanDefinition[];
  tokenPacks: TokenPackDefinition[];
  usage: UsageSnapshot;
  characterSlotLimit: number;
  rerollLimit: number;
  messageLimit: number;
  remainingCharacterSlots: number;
  remainingRerolls: number;
  remainingMessages: number;
  slotUsageLabel: string;
  rerollUsageLabel: string;
  messageUsageLabel: string;
  upgradeReasons: string[];
};

const YEARLY_DISCOUNT_MULTIPLIER = 0.7;

function formatUsdWhole(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsdPretty(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function yearlyTotalFromMonthly(monthly: number) {
  return Math.round(monthly * 12 * YEARLY_DISCOUNT_MULTIPLIER * 100) / 100;
}

const PLAN_USAGE_LIMITS: Record<
  PlanId,
  {
    characterSlotLimit: number;
    rerollLimit: number;
  }
> = {
  free: {
    characterSlotLimit: 6,
    rerollLimit: 12,
  },
  plus: {
    characterSlotLimit: 24,
    rerollLimit: 60,
  },
  pro: {
    characterSlotLimit: 80,
    rerollLimit: 220,
  },
};

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    monthlyPrice: formatUsdWhole(0),
    yearlyPrice: formatUsdWhole(0),
    badge: "Starter",
    summary: "A clean entry point for trying Lovora before moving into a deeper private companion setup.",
    chatLimitLabel: "20 monthly messages",
    chatLimitKind: "limited",
    monthlyMessageLimit: 20,
    featuredPerks: [
      "Private one-to-one companion access",
      "Clean starter entry into Lovora",
      "Profile and plan visibility already included",
    ],
    featuredTradeoffs: [
      "Only 20 chat messages each month",
      "Built for light testing, not ongoing daily chat",
      "Best for testing, not heavy use",
    ],
    accentClassName: "border-white/12 bg-white/[0.04]",
  },
  plus: {
    id: "plus",
    label: "Plus",
    monthlyPrice: formatUsdPretty(14.99),
    yearlyPrice: formatUsdPretty(yearlyTotalFromMonthly(14.99)),
    badge: "Most popular",
    summary: "The balanced tier for users who want a serious private Lovora experience with room for daily use.",
    chatLimitLabel: "5000 monthly messages",
    chatLimitKind: "limited",
    monthlyMessageLimit: 5000,
    featuredPerks: [
      "5000 chat messages each month",
      "Better fit for longer private threads",
      "Stronger premium positioning for daily use",
    ],
    featuredTradeoffs: [
      "Annual billing is paid upfront",
      "Token packs stay separate when activated later",
      "Higher commitment than Free",
    ],
    accentClassName:
      "border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.14),rgba(255,255,255,0.04))]",
  },
  pro: {
    id: "pro",
    label: "Pro",
    monthlyPrice: formatUsdPretty(24.99),
    yearlyPrice: formatUsdPretty(yearlyTotalFromMonthly(24.99)),
    badge: "Highest access",
    summary: "The top tier for users who want the deepest Lovora access and the highest monthly chat room.",
    chatLimitLabel: "10000 monthly messages",
    chatLimitKind: "limited",
    monthlyMessageLimit: 10000,
    featuredPerks: [
      "10000 chat messages each month",
      "Highest-tier plan positioning",
      "Best foundation for future premium add-ons",
    ],
    featuredTradeoffs: [
      "Highest monthly price",
      "Annual billing is paid upfront",
      "Token packs stay separate when activated later",
    ],
    accentClassName:
      "border-cyan-400/25 bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(255,255,255,0.04))]",
  },
};

export const TOKEN_PACK_DEFINITIONS: TokenPackDefinition[] = [
  {
    id: "starter_100",
    label: "100 tokens",
    tokenAmount: 100,
    price: formatUsdPretty(9.99),
    summary: "A small top-up option prepared for lighter premium actions later.",
  },
  {
    id: "growth_250",
    label: "250 tokens",
    tokenAmount: 250,
    price: formatUsdPretty(19.99),
    summary: "A balanced pack designed for users who want more room without moving to a full subscription.",
  },
  {
    id: "power_500",
    label: "500 tokens",
    tokenAmount: 500,
    price: formatUsdPretty(29.99),
    summary: "The largest token pack shown today, positioned for heavier premium usage later on.",
  },
];

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
  const usageLimits = PLAN_USAGE_LIMITS[planId];
  const remainingCharacterSlots = clampRemaining(
    usageLimits.characterSlotLimit,
    input.usage.characterCount,
  );
  const remainingRerolls = clampRemaining(
    usageLimits.rerollLimit,
    input.usage.rerollsThisMonth,
  );
  const messageLimit = currentPlan.monthlyMessageLimit ?? 0;
  const remainingMessages = clampRemaining(messageLimit, input.usage.messagesThisMonth);

  const upgradeReasons: string[] = [];

  if (planId === "free") {
    upgradeReasons.push("Free includes 20 monthly chat messages before an upgrade is needed.");
  }

  if (messageLimit > 0 && remainingMessages === 0) {
    upgradeReasons.push(
      `You have reached the ${currentPlan.label} monthly chat limit for this month.`,
    );
  } else if (
    messageLimit > 0 &&
    remainingMessages <= Math.max(5, Math.ceil(messageLimit * 0.1))
  ) {
    upgradeReasons.push("Your monthly chat allowance is running low.");
  }

  if (remainingCharacterSlots <= 2) {
    upgradeReasons.push("Your account is close to the current locked character limit.");
  }

  if (remainingRerolls <= 4) {
    upgradeReasons.push("Your monthly image rerolls are running low.");
  }

  if (planId !== "pro") {
    upgradeReasons.push("Higher tiers are positioned as the cleaner path for long-term daily use.");
  }

  return {
    currentPlan,
    availablePlans: [PLAN_DEFINITIONS.free, PLAN_DEFINITIONS.plus, PLAN_DEFINITIONS.pro],
    tokenPacks: TOKEN_PACK_DEFINITIONS,
    usage: input.usage,
    characterSlotLimit: usageLimits.characterSlotLimit,
    rerollLimit: usageLimits.rerollLimit,
    messageLimit,
    remainingCharacterSlots,
    remainingRerolls,
    remainingMessages,
    slotUsageLabel: `${input.usage.characterCount}/${usageLimits.characterSlotLimit} character slots used`,
    rerollUsageLabel: `${input.usage.rerollsThisMonth}/${usageLimits.rerollLimit} rerolls used this month`,
    messageUsageLabel: `${input.usage.messagesThisMonth}/${messageLimit} messages used this month`,
    upgradeReasons,
  };
}
