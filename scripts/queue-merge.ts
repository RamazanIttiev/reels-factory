import type { QueueItem } from "./queue";

const isDecision = (item: QueueItem): boolean => item.state === "approved" || item.state === "rejected";

export const mergeQueues = (local: QueueItem[], remote: QueueItem[]): QueueItem[] => {
  const remoteBySlug = new Map(remote.map((item) => [item.slug, item]));
  const merged = local.map((item) => {
    const counterpart = remoteBySlug.get(item.slug);
    return item.state === "awaiting_approval" && counterpart && isDecision(counterpart) ? counterpart : item;
  });
  const localSlugs = new Set(local.map((item) => item.slug));
  return [...merged, ...remote.filter((item) => !localSlugs.has(item.slug))];
};
