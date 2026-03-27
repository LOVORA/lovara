import type { PlanDefinition, PlanId } from "@/lib/monetization";

export type MonetizationValuePillar = {
  title: string;
  description: string;
};

export function getMonetizationValuePillars(): MonetizationValuePillar[] {
  return [
    {
      title: "Private custom companions",
      description:
        "Keep a more personal companion setup inside a premium-feeling private product.",
    },
    {
      title: "Character consistency",
      description:
        "Hold onto stronger continuity across repeated chats instead of restarting the same dynamic.",
    },
    {
      title: "Premium visual variations",
      description:
        "Leave room for future token-based premium actions without cluttering the core subscription plans.",
    },
    {
      title: "Simple upgrade language",
      description:
        "Make plans easy to understand now so checkout can attach cleanly later without re-explaining the product.",
    },
  ];
}

export function getCurrentPlanNarrative(planId: PlanId): string {
  switch (planId) {
    case "free":
      return "You are on the starter access layer with a limited chat cap and the clearest entry into Lovora.";
    case "plus":
      return "You already sit on the balanced premium tier with unlimited chat and the most mainstream upgrade path.";
    case "pro":
      return "You are on the top Lovora tier prepared in the product today, with the strongest premium positioning.";
  }
}

export function getPlanHeadline(plan: PlanDefinition): string {
  switch (plan.id) {
    case "free":
      return "Clean entry";
    case "plus":
      return "Best balance";
    case "pro":
      return "Highest access";
  }
}
