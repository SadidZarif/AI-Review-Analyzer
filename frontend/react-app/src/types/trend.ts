// Shared types (not mock) for analytics visualizations

export interface TrendDataPoint {
  date: string; // YYYY-MM-DD
  day: string; // UI label (e.g. Mon)
  sentimentScore: number; // 0-100
  positiveCount?: number;
  negativeCount?: number;
  totalReviews?: number;
}

