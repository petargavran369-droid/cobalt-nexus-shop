export type Tier = "queue" | "vip" | "vipplus" | "support";

export const tierMeta: Record<Tier, { label: string; badgeClass: string; ringClass: string; accentVar: string }> = {
  queue: {
    label: "Queue Priority",
    badgeClass: "tier-badge-queue",
    ringClass: "ring-[color:var(--tier-queue)]/40",
    accentVar: "var(--tier-queue)",
  },
  vip: {
    label: "VIP",
    badgeClass: "tier-badge-vip",
    ringClass: "ring-[color:var(--tier-vip)]/40",
    accentVar: "var(--tier-vip)",
  },
  vipplus: {
    label: "VIP+",
    badgeClass: "tier-badge-vipplus",
    ringClass: "ring-[color:var(--tier-vipplus)]/40",
    accentVar: "var(--tier-vipplus)",
  },
  support: {
    label: "Supporter",
    badgeClass: "tier-badge-support",
    ringClass: "ring-[color:var(--tier-support)]/40",
    accentVar: "var(--tier-support)",
  },
};

export function tierFromSlug(slug: string): Tier {
  if (slug === "queue-priority") return "queue";
  if (slug === "vip") return "vip";
  if (slug === "vip-plus") return "vipplus";
  return "support";
}
