// ============ REVIEW ANALYTICS (FRONTEND) ============
// Dashboard এ date range অনুযায়ী metrics/topics recompute করার জন্য helper
// Backend call না করেই cached Judge.me reviews থেকে summary বানায়

import type { AnalysisResponse, ReviewResult, TopicInfo } from '../api';
import type { JudgeMeReview } from '../api';
import type { DateRange } from '../components/DateRangePicker';
import type { TrendDataPoint } from '../types/trend';

// ============ HELPERS ============

// Date string parse করার safe helper
function safeParseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// Judge.me review থেকে sentiment map (rating based)
function mapRatingToSentiment(rating?: number | null): 'positive' | 'negative' | 'neutral' {
  if (!rating) return 'neutral';
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}

// ============ TOKENIZER / STOPWORDS ============
// Simple keyword extractor (Demo quality)

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'was', 'were', 'are', 'you', 'your', 'but',
  'not', 'have', 'has', 'had', 'too', 'very', 'just', 'from', 'they', 'them', 'their',
  'its', 'our', 'out', 'all', 'any', 'can', 'could', 'would', 'should', 'did', 'does',
  'product', 'item', 'shop', 'store', 'buy', 'bought', 'purchase', 'purchased'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ') // HTML remove
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation remove
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

// ============ CORE FUNCTIONS ============

// Date range অনুযায়ী reviews filter করে
export function filterReviewsByDate(reviews: JudgeMeReview[], range: DateRange): JudgeMeReview[] {
  const { startDate, endDate } = range;
  if (!startDate || !endDate) return reviews;

  // End date inclusive করার জন্য end-of-day ধরে নিচ্ছি
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return reviews.filter((r) => {
    const d = safeParseDate(r.created_at);
    if (!d) return false;
    return d >= start && d <= end;
  });
}

// Filtered reviews থেকে AnalysisResponse বানায় (Dashboard metrics + keyword cloud এর জন্য)
export function buildAnalysisFromReviews(reviews: JudgeMeReview[]): AnalysisResponse {
  // Counts
  let positive_count = 0;
  let negative_count = 0;

  // Topic counters
  const posCounts = new Map<string, number>();
  const negCounts = new Map<string, number>();

  // Sample reviews: latest first
  const sorted = [...reviews].sort((a, b) => {
    const da = safeParseDate(a.created_at)?.getTime() || 0;
    const db = safeParseDate(b.created_at)?.getTime() || 0;
    return db - da;
  });

  // Iterate
  for (const r of reviews) {
    const sentiment = mapRatingToSentiment(r.rating);
    if (sentiment === 'positive') positive_count += 1;
    if (sentiment === 'negative') negative_count += 1;

    // Topics
    const words = tokenize(r.body || '');
    const target = sentiment === 'negative' ? negCounts : posCounts; // neutral -> positive bucket
    for (const w of words) {
      target.set(w, (target.get(w) || 0) + 1);
    }
  }

  const total_reviews = reviews.length;
  const positive_percentage = total_reviews > 0 ? Math.round((positive_count / total_reviews) * 1000) / 10 : 0;
  const negative_percentage = total_reviews > 0 ? Math.round((negative_count / total_reviews) * 1000) / 10 : 0;

  // Top topics pick helper
  const topN = (m: Map<string, number>, sentiment: 'positive' | 'negative', n = 3): TopicInfo[] => {
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([topic, count]) => ({ topic, count, sentiment }));
  };

  // Sample reviews -> ReviewResult format (metadata সহ)
  const sample_reviews: ReviewResult[] = sorted.slice(0, 10).map((r) => {
    const sentiment = mapRatingToSentiment(r.rating);
    return {
      text: r.body || '',
      sentiment,
      confidence: 1, // rating based sentiment, so confidence placeholder
      reviewer_name: r.reviewer_name || undefined,
      review_date: r.created_at || undefined,
      product_name: r.product_title || undefined,
      product_id: r.product_id || undefined,
      rating: r.rating || undefined
    };
  });

  return {
    total_reviews,
    positive_count,
    negative_count,
    positive_percentage,
    negative_percentage,
    top_positive_topics: topN(posCounts, 'positive', 5),
    top_negative_topics: topN(negCounts, 'negative', 5),
    sample_reviews
  };
}

// ============ TREND DATA BUILDER ============
// TrendChart এর জন্য data series বানায় (dateRange অনুযায়ী)

// Date -> YYYY-MM-DD string
function toISODateOnly(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Day label (UI only)
function toDayLabel(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

// Date range data points বানায়
export function buildTrendDataFromReviews(
  range: DateRange,
  filtered: JudgeMeReview[]
): TrendDataPoint[] {
  const { startDate, endDate } = range;
  if (!startDate || !endDate) return [];

  // End inclusive
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Per-day counts
  const dayCounts = new Map<string, { total: number; pos: number; neg: number }>();
  for (const r of filtered) {
    const d = safeParseDate(r.created_at);
    if (!d) continue;
    if (d < start || d > end) continue;

    const key = toISODateOnly(d);
    const entry = dayCounts.get(key) || { total: 0, pos: 0, neg: 0 };
    entry.total += 1;
    const s = mapRatingToSentiment(r.rating);
    if (s === 'positive') entry.pos += 1;
    if (s === 'negative') entry.neg += 1;
    dayCounts.set(key, entry);
  }

  // Build daily points across the whole range
  const points: TrendDataPoint[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  // Fallback baseline (when a day has 0 reviews)
  const totalAll = filtered.length;
  const posAll = filtered.reduce((acc, r) => acc + (mapRatingToSentiment(r.rating) === 'positive' ? 1 : 0), 0);
  const fallbackScore = totalAll > 0 ? Math.round((posAll / totalAll) * 100) : 0;
  let lastKnownScore: number | null = null;

  while (cursor <= endDate) {
    const key = toISODateOnly(cursor);
    const c = dayCounts.get(key) || { total: 0, pos: 0, neg: 0 };
    const dailyScore: number =
      c.total > 0
        ? Math.round((c.pos / c.total) * 100)
        : (lastKnownScore ?? fallbackScore);
    lastKnownScore = dailyScore;
    points.push({
      date: key,
      day: toDayLabel(cursor),
      sentimentScore: Math.max(0, Math.min(100, dailyScore)),
      positiveCount: c.pos,
      negativeCount: c.neg,
      totalReviews: c.total
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}

// ============ TRUST INDEX CALCULATION ============
// Review এর trustworthiness calculate করে multiple factors এর উপর ভিত্তি করে

export interface TrustIndexInput {
  // ML model এর confidence score (0.0 - 1.0) (optional; rating-based sentiment may not have this)
  confidence?: number | null;
  // Review text (length check করার জন্য)
  reviewText: string;
  // Rating (1-5)
  rating?: number;
  // Predicted sentiment
  sentiment?: 'positive' | 'negative' | 'neutral';
  // Customer এর total review count (optional)
  customerReviewCount?: number;
}

/**
 * Trust Index calculate করে multiple factors এর উপর ভিত্তি করে
 * Returns: "High" | "Medium" | "Low"
 */
export function calculateTrustIndex(input: TrustIndexInput): 'High' | 'Medium' | 'Low' {
  const { confidence, reviewText, rating, sentiment, customerReviewCount = 1 } = input;
  
  let trustScore = 0; // 0-100 scale
  
  // 1. ML Confidence Score (0-40 points)
  // Higher confidence = more trustworthy
  if (typeof confidence === 'number' && Number.isFinite(confidence)) {
    trustScore += Math.min(40, confidence * 40);
  }
  
  // 2. Review Length Factor (0-25 points)
  // Longer reviews (up to ~500 chars) are generally more reliable
  // Too short (< 20 chars) = suspicious, too long (> 1000 chars) = might be spam
  const textLength = reviewText.trim().length;
  if (textLength >= 100 && textLength <= 500) {
    trustScore += 25; // Optimal length
  } else if (textLength >= 50 && textLength < 100) {
    trustScore += 15; // Good length
  } else if (textLength >= 20 && textLength < 50) {
    trustScore += 8; // Short but acceptable
  } else if (textLength < 20) {
    trustScore += 2; // Very short, suspicious
  } else if (textLength > 500 && textLength <= 1000) {
    trustScore += 18; // Long but acceptable
  } else if (textLength > 1000) {
    trustScore += 5; // Very long, might be spam
  }
  
  // 3. Rating-Sentiment Consistency (0-20 points)
  // Rating এবং sentiment match করলে trustworthy
  if (rating && sentiment) {
    const ratingSentiment = mapRatingToSentiment(rating);
    if (ratingSentiment === sentiment) {
      trustScore += 20; // Perfect match
    } else if (
      (ratingSentiment === 'positive' && sentiment === 'neutral') ||
      (ratingSentiment === 'negative' && sentiment === 'neutral')
    ) {
      trustScore += 10; // Partial match
    } else {
      trustScore += 2; // Mismatch, suspicious
    }
  }
  
  // 4. Customer History (0-10 points)
  // More reviews = more established customer = more trustworthy
  if (customerReviewCount >= 10) {
    trustScore += 10; // Established customer
  } else if (customerReviewCount >= 5) {
    trustScore += 7; // Regular customer
  } else if (customerReviewCount >= 2) {
    trustScore += 4; // Returning customer
  } else {
    trustScore += 1; // First-time reviewer
  }
  
  // 5. Text Quality Check (0-5 points penalty for spam indicators)
  // Basic spam detection
  const textLower = reviewText.toLowerCase();
  const words = textLower.split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = uniqueWords.size / words.length;
  
  // All caps check
  const allCapsRatio = (reviewText.match(/[A-Z]/g) || []).length / Math.max(1, reviewText.length);
  
  // Penalty for spam indicators
  if (repetitionRatio < 0.3 && words.length > 10) {
    trustScore -= 3; // Too much repetition
  }
  if (allCapsRatio > 0.7 && textLength > 50) {
    trustScore -= 2; // Too many caps (shouting)
  }
  
  // Ensure score is within bounds
  trustScore = Math.max(0, Math.min(100, trustScore));
  
  // Convert to label
  if (trustScore >= 70) {
    return 'High';
  } else if (trustScore >= 40) {
    return 'Medium';
  } else {
    return 'Low';
  }
}


