export const packageImages: Record<string, string> = {
  "queue-priority": "/images/pkg-queue.jpg",
  "vip": "/images/pkg-vip.jpg",
  "vip-plus": "/images/pkg-vipplus.jpg",
  "support": "/images/pkg-support.jpg",
};

export function imageForSlug(slug: string): string {
  return packageImages[slug] ?? "/images/pkg-support.jpg";
}
