// ============ MOCK DATA GENERATORS ============
// Development এবং testing এর জন্য realistic mock data তৈরি করে

import { randomDateWithinDays } from './helpers';

// ============ MOCK REVIEWER NAMES ============

const firstNames = [
  'Sarah', 'Michael', 'Emma', 'James', 'Olivia', 'William', 'Ava', 'Robert',
  'Isabella', 'David', 'Sophia', 'Joseph', 'Mia', 'Charles', 'Charlotte', 'Thomas',
  'Amelia', 'Daniel', 'Harper', 'Matthew', 'Evelyn', 'Anthony', 'Abigail', 'Mark',
  'Emily', 'Donald', 'Elizabeth', 'Steven', 'Sofia', 'Andrew', 'Avery', 'Joshua',
  'Ella', 'Kevin', 'Madison', 'Brian', 'Scarlett', 'George', 'Victoria', 'Timothy',
  'Aria', 'Ronald', 'Grace', 'Edward', 'Chloe', 'Jason', 'Camila', 'Jeffrey', 'Penelope',
  'Ryan', 'Riley', 'Jacob', 'Layla', 'Gary', 'Lillian', 'Nicholas', 'Nora', 'Eric'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker'
];

// Random name generate করে
export function generateRandomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

// ============ AI REPLY TEMPLATES ============

export const aiReplyTemplates = {
  positive: [
    "Thank you for your wonderful feedback! We're thrilled to hear you're enjoying your purchase.",
    "We really appreciate your kind words! It's customers like you that make our day.",
    "Thank you so much for taking the time to share your positive experience!",
    "We're so glad you love it! Thank you for being such a valued customer.",
    "Your feedback means the world to us. Thank you for choosing our product!",
    "We're happy to hear you're satisfied! Thank you for your support.",
  ],
  negative: [
    "We sincerely apologize for your experience. Please contact our support team so we can make this right.",
    "We're sorry to hear about this issue. Our team is here to help resolve it immediately.",
    "Thank you for bringing this to our attention. We take your feedback seriously and will address this.",
    "We apologize for falling short of your expectations. Please let us help fix this situation.",
    "We're sorry you had this experience. Your satisfaction is our priority, and we'd like to make it right.",
    "We appreciate your honest feedback and apologize for the inconvenience. Let's work together to resolve this.",
  ],
  neutral: [
    "Thank you for your feedback. We're always working to improve our products and services.",
    "We appreciate you sharing your thoughts. Is there anything specific we can help with?",
    "Thank you for taking the time to review. We value your input and will continue to improve.",
    "We hear you! Your feedback helps us make our products better. Thank you!",
  ]
};

// Sentiment অনুযায়ী AI reply template generate করে
export function generateAIReply(sentiment: 'positive' | 'negative' | 'neutral'): string {
  const templates = aiReplyTemplates[sentiment] || aiReplyTemplates.neutral;
  return templates[Math.floor(Math.random() * templates.length)];
}

// ============ TREND CHART DATA ============

export interface TrendDataPoint {
  date: string;              // ISO date string
  day: string;               // Day label (Mon, Tue, etc.)
  sentimentScore: number;    // 0-100 sentiment score
  positiveCount: number;     // Positive reviews count
  negativeCount: number;     // Negative reviews count
  totalReviews: number;      // Total reviews
}

// Weekly trend data generate করে (last 7 days)
export function generateWeeklyTrendData(): TrendDataPoint[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data: TrendDataPoint[] = [];
  
  // শুরুর sentiment score 75-90 এর মধ্যে random
  let baseScore = 75 + Math.random() * 15;
  
  // শেষ 7 দিনের জন্য data generate করছি
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // কিছু variation যোগ করছি (±5 points)
    const variation = (Math.random() - 0.5) * 10;
    const score = Math.max(60, Math.min(95, baseScore + variation));
    
    const totalReviews = Math.floor(150 + Math.random() * 100);
    const positiveCount = Math.floor((score / 100) * totalReviews);
    const negativeCount = totalReviews - positiveCount;
    
    data.push({
      date: date.toISOString().split('T')[0],
      day: days[6 - i],
      sentimentScore: Math.round(score),
      positiveCount,
      negativeCount,
      totalReviews
    });
    
    baseScore = score; // Trend আগের দিন থেকে continue করে
  }
  
  return data;
}

// Monthly trend data generate করে (4 weeks = 4 data points)
export function generateMonthlyTrendData(): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  let baseScore = 75 + Math.random() * 15;
  
  // 4 weeks এর জন্য 4 টা data point generate করছি
  for (let week = 4; week >= 1; week--) {
    // প্রতিটি week এর জন্য average date calculate করছি
    const daysAgo = (week - 1) * 7 + 3.5; // Week এর মাঝামাঝি দিন
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    // Week-to-week variation (±5 points)
    const variation = (Math.random() - 0.5) * 10;
    const score = Math.max(65, Math.min(92, baseScore + variation));
    
    // Weekly total reviews (7 দিনের aggregate)
    const totalReviews = Math.floor(800 + Math.random() * 400); // 800-1200 per week
    const positiveCount = Math.floor((score / 100) * totalReviews);
    const negativeCount = totalReviews - positiveCount;
    
    data.push({
      date: date.toISOString().split('T')[0],
      day: `Week ${week}`, // "Week 1", "Week 2", "Week 3", "Week 4"
      sentimentScore: Math.round(score),
      positiveCount,
      negativeCount,
      totalReviews
    });
    
    baseScore = score; // Trend আগের week থেকে continue করে
  }
  
  return data;
}

// Custom date range এর জন্য trend data generate করে
export function generateCustomDateRangeData(startDate: Date, endDate: Date): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  let baseScore = 75 + Math.random() * 15;
  
  // Date range এর মধ্যে কত দিন আছে
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // যদি 30 দিনের বেশি হয়, তাহলে weekly data points
  // যদি 30 দিনের কম হয়, তাহলে daily data points
  const isLongRange = daysDiff > 30;
  const interval = isLongRange ? 7 : 1; // Weekly বা daily
  
  let currentDate = new Date(startDate);
  let pointIndex = 0;
  
  while (currentDate <= endDate) {
    const variation = (Math.random() - 0.5) * 10;
    const score = Math.max(60, Math.min(95, baseScore + variation));
    
    // Data point এর label
    let dayLabel: string;
    if (isLongRange) {
      // Weekly: "Week 1", "Week 2", etc. বা date format
      const weekNum = Math.floor(pointIndex / 7) + 1;
      dayLabel = `Week ${weekNum}`;
    } else {
      // Daily: Date format (e.g., "Jan 1", "Dec 2")
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      dayLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}`;
    }
    
    const totalReviews = isLongRange 
      ? Math.floor(800 + Math.random() * 400) // Weekly aggregate
      : Math.floor(150 + Math.random() * 100); // Daily
    
    const positiveCount = Math.floor((score / 100) * totalReviews);
    const negativeCount = totalReviews - positiveCount;
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      day: dayLabel,
      sentimentScore: Math.round(score),
      positiveCount,
      negativeCount,
      totalReviews
    });
    
    baseScore = score;
    pointIndex++;
    
    // Next date (interval অনুযায়ী)
    currentDate.setDate(currentDate.getDate() + interval);
  }
  
  return data;
}

// ============ REVIEWER METADATA ============

export interface MockReviewer {
  name: string;              // Full name
  initials: string;          // Initials for avatar
  avatarColor: string;       // Avatar background color
  timestamp: Date;           // Review timestamp
}

// Mock reviewer metadata generate করে
export function generateMockReviewer(): MockReviewer {
  const name = generateRandomName();
  const nameParts = name.split(' ');
  const initials = nameParts[0][0] + nameParts[1][0];
  
  // নামের উপর ভিত্তি করে consistent color generate করছি
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#ec4899'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const avatarColor = colors[Math.abs(hash) % colors.length];
  
  // শেষ 30 দিনের মধ্যে random timestamp
  const timestamp = randomDateWithinDays(30);
  
  return {
    name,
    initials,
    avatarColor,
    timestamp
  };
}

// ============ MOCK METRICS ============

export interface MockMetrics {
  sentimentScore: number;    // Overall sentiment score (0-100)
  totalReviews: number;      // Total reviews count
  positiveReviews: number;   // Positive reviews count
  negativeReviews: number;   // Negative reviews count
  pendingActions: number;    // Pending actions count
  weeklyChange: number;      // Weekly change percentage
  newReviews: number;        // New reviews this week
  positiveChange: number;    // Positive reviews weekly change
  negativeChange: number;    // Negative reviews weekly change
}

// Mock metrics data generate করে
export function generateMockMetrics(): MockMetrics {
  const totalReviews = Math.floor(1000 + Math.random() * 500); // 1000-1500
  const sentimentScore = Math.floor(75 + Math.random() * 20); // 75-95
  const positiveReviews = Math.floor((sentimentScore / 100) * totalReviews);
  const negativeReviews = totalReviews - positiveReviews;
  
  return {
    sentimentScore,
    totalReviews,
    positiveReviews,
    negativeReviews,
    pendingActions: Math.floor(2 + Math.random() * 8), // 2-10
    weeklyChange: parseFloat((Math.random() * 10 - 2).toFixed(1)), // -2 to +8
    newReviews: Math.floor(80 + Math.random() * 60), // 80-140
    positiveChange: parseFloat((Math.random() * 8 + 2).toFixed(1)), // +2 to +10
    negativeChange: parseFloat((Math.random() * 5 - 8).toFixed(1)) // -8 to -3
  };
}

// ============ CHART SVG PATH GENERATOR ============

/**
 * Data points থেকে SVG path generate করে area chart এর জন্য
 */
export function generateChartPath(data: TrendDataPoint[], width: number, height: number): string {
  if (data.length === 0) return '';
  
  const maxScore = Math.max(...data.map(d => d.sentimentScore));
  const minScore = Math.min(...data.map(d => d.sentimentScore));
  const scoreRange = maxScore - minScore || 1;
  
  const xStep = width / (data.length - 1);
  
  // প্রতিটা data point এর জন্য x,y coordinates calculate করছি
  const points = data.map((d, i) => {
    const x = i * xStep;
    const normalizedScore = (d.sentimentScore - minScore) / scoreRange;
    const y = height - (normalizedScore * height * 0.8) - (height * 0.1); // 10% padding
    return { x, y };
  });
  
  // Bezier curves ব্যবহার করে smooth curve তৈরি করছি
  let path = `M${points[0].x},${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    // Control points for smooth curve
    const cp1x = prev.x + (curr.x - prev.x) / 3;
    const cp1y = prev.y;
    const cp2x = curr.x - (curr.x - prev.x) / 3;
    const cp2y = curr.y;
    
    path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
  }
  
  return path;
}

/**
 * Area path generate করে (line এর নিচে filled area)
 */
export function generateAreaPath(data: TrendDataPoint[], width: number, height: number): string {
  const linePath = generateChartPath(data, width, height);
  return `${linePath} L${width},${height} L0,${height} Z`;
}
