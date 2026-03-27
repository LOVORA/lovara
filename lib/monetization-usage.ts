import type { MonetizationSnapshot } from "@/lib/monetization";

type CountClient = {
  from: (table: string) => {
    select: (
      columns?: string,
      options?: { count?: "exact"; head?: boolean },
    ) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          gte: (
            column: string,
            value: string,
          ) => Promise<{ count: number | null; error: { message: string } | null }>;
        };
      };
    };
  };
};

export type MessageLimitPayload = {
  ok: false;
  error: "MONTHLY_MESSAGE_LIMIT_REACHED";
  currentPlan: string;
  messagesThisMonth: number;
  messageLimit: number;
  remainingMessages: number;
  messageUsageLabel: string;
  upgradeReasons: string[];
};

export function getUtcMonthStart() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  return monthStart;
}

async function countTableMessages(args: {
  client: CountClient;
  table: "messages" | "custom_messages";
  userId: string;
  monthStartIso: string;
}) {
  const { count, error } = await args.client
    .from(args.table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", args.userId)
    .eq("role", "user")
    .gte("created_at", args.monthStartIso);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function countMonthlyUserMessages(args: {
  client: CountClient;
  userId: string;
}) {
  const monthStartIso = getUtcMonthStart().toISOString();
  const [builtInCount, customCount] = await Promise.all([
    countTableMessages({
      client: args.client,
      table: "messages",
      userId: args.userId,
      monthStartIso,
    }),
    countTableMessages({
      client: args.client,
      table: "custom_messages",
      userId: args.userId,
      monthStartIso,
    }),
  ]);

  return builtInCount + customCount;
}

export function buildMessageLimitPayload(
  monetization: MonetizationSnapshot,
): MessageLimitPayload {
  return {
    ok: false,
    error: "MONTHLY_MESSAGE_LIMIT_REACHED",
    currentPlan: monetization.currentPlan.label,
    messagesThisMonth: monetization.usage.messagesThisMonth,
    messageLimit: monetization.messageLimit,
    remainingMessages: monetization.remainingMessages,
    messageUsageLabel: monetization.messageUsageLabel,
    upgradeReasons: monetization.upgradeReasons,
  };
}

export function hasReachedMonthlyMessageLimit(monetization: MonetizationSnapshot) {
  return monetization.messageLimit > 0 && monetization.remainingMessages <= 0;
}
