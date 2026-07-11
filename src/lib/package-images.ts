import pkgQueue from "@/assets/pkg-queue.jpg";
import pkgVip from "@/assets/pkg-vip.jpg";
import pkgVipPlus from "@/assets/pkg-vipplus.jpg";
import pkgSupport from "@/assets/pkg-support.jpg";

export const packageImages: Record<string, string> = {
  "queue-priority": pkgQueue,
  "vip": pkgVip,
  "vip-plus": pkgVipPlus,
  "support": pkgSupport,
};

export function imageForSlug(slug: string): string {
  return packageImages[slug] ?? pkgSupport;
}
