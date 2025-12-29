// ============ HELPER UTILITIES ============
// Application এর জন্য reusable helper functions

/**
 * নাম থেকে avatar initials তৈরি করে
 * উদাহরণ: "Sarah Jenkins" → "SJ"
 */
export function generateInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * নামের উপর ভিত্তি করে avatar color তৈরি করে (consistent hashing)
 */
export function generateAvatarColor(name: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#84cc16', // lime
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#ec4899', // pink
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Date কে relative time string এ convert করে
 * উদাহরণ: "2 hours ago", "5 days ago"
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * Sentiment এবং confidence থেকে star rating (1-5) map করে
 * এটা temporary mapping - backend যখন actual ratings দেবে তখন পর্যন্ত
 */
export function mapSentimentToStars(
  sentiment: 'positive' | 'negative' | 'neutral', 
  confidence: number
): number {
  if (sentiment === 'positive') {
    // High confidence positive → 5 stars
    // Medium confidence positive → 4 stars
    if (confidence >= 0.8) return 5;
    if (confidence >= 0.6) return 4;
    return 3;
  } else if (sentiment === 'negative') {
    // High confidence negative → 1 star
    // Medium confidence negative → 2 stars
    if (confidence >= 0.8) return 1;
    if (confidence >= 0.6) return 2;
    return 3;
  } else {
    // Neutral → 3 stars
    return 3;
  }
}

/**
 * বড় numbers কে commas দিয়ে format করে
 * উদাহরণ: 1248 → "1,248"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Text কে নির্দিষ্ট length এ truncate করে
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * শেষ N দিনের মধ্যে random date তৈরি করে
 */
export function randomDateWithinDays(days: number): Date {
  const now = new Date();
  const randomDays = Math.random() * days;
  const randomHours = Math.random() * 24;
  return new Date(now.getTime() - (randomDays * 24 * 60 * 60 * 1000) - (randomHours * 60 * 60 * 1000));
}

/**
 * Percentage change হিসাব করে
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Sign সহ percentage format করে
 * উদাহরণ: 5.2 → "+5.2%", -3.1 → "-3.1%"
 */
export function formatPercentageChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

