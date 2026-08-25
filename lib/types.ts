export interface ShortLink {
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface Click {
  shortCode: string;
  referrer: string | null;
  userAgent: string | null;
  ip: string;
  timestamp: string;
}

export interface ShortLinkWithCount extends ShortLink {
  clickCount: number;
}

export interface DayBucket {
  date: string;
  count: number;
}

export interface ReferrerCount {
  referrer: string;
  count: number;
}

export interface Stats {
  shortCode: string;
  totalClicks: number;
  clicksByDay: DayBucket[];
  topReferrers: ReferrerCount[];
}
