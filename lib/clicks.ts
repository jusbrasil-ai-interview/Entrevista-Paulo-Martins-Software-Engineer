import { addClick, getClicks } from "./store";
import type { Click, DayBucket, ReferrerCount, Stats } from "./types";

const DIRECT_UNKNOWN = "Direct / Unknown";
const CLICKS_BY_DAY_WINDOW_DAYS = 30;
const TOP_REFERRERS_LIMIT = 5;

export function recordClick(shortCode: string, data: Omit<Click, "shortCode">): void {
  addClick(shortCode, { shortCode, ...data });
}

export function getStats(shortCode: string): Stats {
  const clicks = getClicks(shortCode);
  return {
    shortCode,
    totalClicks: clicks.length,
    clicksByDay: buildClicksByDay(clicks),
    topReferrers: buildTopReferrers(clicks),
  };
}

function buildClicksByDay(clicks: Click[]): DayBucket[] {
  const counts = new Map<string, number>();
  for (const click of clicks) {
    const day = click.timestamp.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const buckets: DayBucket[] = [];
  const today = new Date();
  for (let i = CLICKS_BY_DAY_WINDOW_DAYS - 1; i >= 0; i--) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    day.setUTCDate(day.getUTCDate() - i);
    const date = day.toISOString().slice(0, 10);
    buckets.push({ date, count: counts.get(date) ?? 0 });
  }
  return buckets;
}

function buildTopReferrers(clicks: Click[]): ReferrerCount[] {
  const counts = new Map<string, number>();
  for (const click of clicks) {
    const key = click.referrer && click.referrer.trim() !== "" ? click.referrer : DIRECT_UNKNOWN;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count || (a.referrer < b.referrer ? -1 : a.referrer > b.referrer ? 1 : 0))
    .slice(0, TOP_REFERRERS_LIMIT);
}
