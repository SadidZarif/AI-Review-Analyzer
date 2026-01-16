"""
Enhanced chat handler for AI review analysis.
Handles date range parsing, review filtering, and all user intents.
"""

import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple

# Try to use dateutil, fallback to manual parsing
try:
    from dateutil import parser as date_parser
    HAS_DATEUTIL = True
except ImportError:
    HAS_DATEUTIL = False
    
    def date_parser_parse(s: str):
        """Simple fallback parser for dates."""
        s = str(s).strip()
        try:
            return datetime.strptime(s, "%Y-%m-%d")
        except:
            try:
                return datetime.strptime(s, "%Y-%m-%dT%H:%M:%S")
            except:
                try:
                    return datetime.strptime(s.split("T")[0], "%Y-%m-%d")
                except:
                    raise ValueError(f"Could not parse date: {s}")
    
    # Create a mock parser object
    class MockParser:
        parse = staticmethod(date_parser_parse)
    date_parser = MockParser()


def parse_date_range(question: str) -> Optional[Dict[str, str]]:
    """
    Parse date range from user question.
    Returns {start: "YYYY-MM-DD", end: "YYYY-MM-DD"} or None.
    """
    ql = question.lower()
    today = datetime.now()
    
    # Relative ranges
    if any(k in ql for k in ["last 7 days", "past 7 days", "7 days", "last week"]):
        end = today
        start = today - timedelta(days=7)
        return {"start": start.strftime("%Y-%m-%d"), "end": end.strftime("%Y-%m-%d")}
    
    if any(k in ql for k in ["last 30 days", "past 30 days", "30 days", "last month"]):
        end = today
        start = today - timedelta(days=30)
        return {"start": start.strftime("%Y-%m-%d"), "end": end.strftime("%Y-%m-%d")}
    
    if any(k in ql for k in ["this month", "current month"]):
        start = today.replace(day=1)
        end = today
        return {"start": start.strftime("%Y-%m-%d"), "end": end.strftime("%Y-%m-%d")}
    
    if any(k in ql for k in ["previous month", "last month"]):
        first_day_this_month = today.replace(day=1)
        last_day_prev_month = first_day_this_month - timedelta(days=1)
        start = last_day_prev_month.replace(day=1)
        end = last_day_prev_month
        return {"start": start.strftime("%Y-%m-%d"), "end": end.strftime("%Y-%m-%d")}
    
    # Bengali/English year ranges:
    # - "from 2023 to 2026"
    # - "2023 theke 2026 porjonto"
    # - "2023 থেকে 2026 পর্যন্ত"
    # - "2023 theke" (end=today)
    # - "2023 theke 2026 jan" (end=Jan end_year)
    YEAR = r"(\d{4})"
    SEP = r"(?:to|until|through|till|পর্যন্ত|porjonto|poro?jonto|theke|থেকে|থেকে\s+আজ\s+পর্যন্ত|aj\s+porjonto|-|–|—)"

    # Pattern A: explicit start year + end year
    year_range_pattern = rf"(?:from\s+)?{YEAR}\s*{SEP}\s*{YEAR}(?:\s+(?:first|january|jan|1st|জানুয়ারি|janury)\b.*)?"
    m = re.search(year_range_pattern, question, re.IGNORECASE)
    if m:
        try:
            start_year = int(m.group(1))
            end_year = int(m.group(2))
            if re.search(r"(?:first|january|jan|1st|জানুয়ারি)", question, re.IGNORECASE):
                start_date = datetime(start_year, 1, 1)
                end_date = datetime(end_year, 1, 31)
            else:
                start_date = datetime(start_year, 1, 1)
                end_date = datetime(end_year, 12, 31)
            return {"start": start_date.strftime("%Y-%m-%d"), "end": end_date.strftime("%Y-%m-%d")}
        except Exception as e:
            print(f"Year range parsing error: {e}")

    # Pattern B: "2023 theke" (end=today)
    year_from_pattern = rf"{YEAR}\s*(?:theke|থেকে)\b"
    m2 = re.search(year_from_pattern, question, re.IGNORECASE)
    if m2:
        try:
            start_year = int(m2.group(1))
            start_date = datetime(start_year, 1, 1)
            end_date = today
            return {"start": start_date.strftime("%Y-%m-%d"), "end": end_date.strftime("%Y-%m-%d")}
        except Exception as e:
            print(f"Year-from parsing error: {e}")
    
    # Explicit date ranges: "Dec 10 - Jan 9", "2025-12-10 to 2026-01-09", etc.
    date_patterns = [
        r"(\w+\s+\d+)\s*[-–—]\s*(\w+\s+\d+)",  # "Dec 10 - Jan 9"
        r"(\d{4}-\d{2}-\d{2})\s*[-–—]\s*(\d{4}-\d{2}-\d{2})",  # "2025-12-10 - 2026-01-09"
        r"(\d{1,2}/\d{1,2}/\d{4})\s*[-–—]\s*(\d{1,2}/\d{1,2}/\d{4})",  # "12/10/2025 - 01/09/2026"
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, question, re.IGNORECASE)
        if match:
            try:
                start_str = match.group(1).strip()
                end_str = match.group(2).strip()
                if HAS_DATEUTIL:
                    start_date = date_parser.parse(start_str)
                    end_date = date_parser.parse(end_str)
                else:
                    start_date = date_parser_parse(start_str)
                    end_date = date_parser_parse(end_str)
                return {
                    "start": start_date.strftime("%Y-%m-%d"),
                    "end": end_date.strftime("%Y-%m-%d")
                }
            except Exception:
                continue
    
    return None


def filter_reviews_by_date(reviews: List[Dict], date_range: Optional[Dict[str, str]]) -> List[Dict]:
    """Filter reviews by date range."""
    if not date_range or not reviews:
        return reviews
    
    try:
        start = datetime.strptime(date_range["start"], "%Y-%m-%d")
        end = datetime.strptime(date_range["end"], "%Y-%m-%d")
        end = end.replace(hour=23, minute=59, second=59)
    except Exception:
        return reviews
    
    filtered = []
    for r in reviews:
        created_at = r.get("created_at")
        if not created_at:
            continue
        try:
            if HAS_DATEUTIL:
                review_date = date_parser.parse(created_at)
            else:
                review_date = date_parser_parse(str(created_at))
            if start <= review_date <= end:
                filtered.append(r)
        except Exception:
            continue
    
    return filtered


def compute_stats_from_reviews(reviews: List[Dict]) -> Dict[str, Any]:
    """Compute statistics from raw reviews."""
    if not reviews:
        return {
            "total": 0,
            "positive_count": 0,
            "negative_count": 0,
            "neutral_count": 0,
            "positive_pct": 0.0,
            "negative_pct": 0.0,
            "neutral_pct": 0.0,
            "avg_rating": None,
        }
    
    total = len(reviews)
    positive = 0
    negative = 0
    neutral = 0
    ratings = []
    
    for r in reviews:
        rating = r.get("rating")
        if isinstance(rating, (int, float)) and 1 <= rating <= 5:
            ratings.append(rating)
            if rating >= 4:
                positive += 1
            elif rating <= 2:
                negative += 1
            else:
                neutral += 1
        else:
            # Try sentiment_label if rating not available
            sentiment = (r.get("sentiment_label") or r.get("sentiment") or "").lower()
            if sentiment == "positive":
                positive += 1
            elif sentiment == "negative":
                negative += 1
            else:
                neutral += 1
    
    avg_rating = sum(ratings) / len(ratings) if ratings else None
    
    return {
        "total": total,
        "positive_count": positive,
        "negative_count": negative,
        "neutral_count": neutral,
        "positive_pct": round((positive / total * 100) if total > 0 else 0, 1),
        "negative_pct": round((negative / total * 100) if total > 0 else 0, 1),
        "neutral_pct": round((neutral / total * 100) if total > 0 else 0, 1),
        "avg_rating": round(avg_rating, 2) if avg_rating else None,
    }


def _mask_emails(text: str) -> str:
    # mask emails like a***@b.com
    def repl(m: re.Match) -> str:
        email = m.group(0)
        parts = email.split("@", 1)
        if len(parts) != 2:
            return "***@***"
        local, domain = parts
        if not local:
            return "***@" + domain
        return (local[0] + "***@" + domain)

    return re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", repl, text or "")


def _quote_max_words(text: str, max_words: int = 12) -> str:
    t = _mask_emails((text or "").strip())
    t = re.sub(r"\s+", " ", t)
    words = t.split(" ")
    if len(words) <= max_words:
        return t
    return " ".join(words[:max_words]) + "…"


def retrieve_relevant_reviews(question: str, reviews: List[Dict], k: int = 8) -> List[Dict]:
    """
    Lightweight retrieval: score reviews by token overlap with question.
    Returns top-k reviews (dicts) for evidence/snippets.
    """
    if not reviews:
        return []
    q = (question or "").lower()
    q = re.sub(r"[^a-z0-9\s]", " ", q)
    q_terms = [w for w in q.split() if len(w) >= 3]
    if not q_terms:
        return reviews[:k]

    scored: List[Tuple[int, Dict]] = []
    for r in reviews:
        body = (r.get("body") or r.get("text") or "").lower()
        score = 0
        for t in q_terms:
            if t in body:
                score += 2
        # Slight boost if product mentioned in question and exists
        prod = (r.get("product_title") or "").lower()
        for t in q_terms:
            if t in prod:
                score += 1
        if score > 0:
            scored.append((score, r))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = [r for _, r in scored[:k]]
    if len(top) < k:
        # fill with recent items to avoid empty evidence
        rest = [r for r in reviews if r not in top]
        top.extend(rest[: (k - len(top))])
    return top[:k]


def build_evidence_quotes(question: str, reviews: List[Dict], max_quotes: int = 3) -> List[str]:
    picks = retrieve_relevant_reviews(question, reviews, k=max(8, max_quotes))
    quotes: List[str] = []
    for r in picks:
        txt = (r.get("body") or r.get("text") or "").strip()
        if not txt:
            continue
        q = _quote_max_words(txt, 12)
        if q and q not in quotes:
            quotes.append(q)
        if len(quotes) >= max_quotes:
            break
    return quotes

def extract_topics_from_reviews(reviews: List[Dict], sentiment: str = "negative", top_k: int = 5) -> List[Tuple[str, int]]:
    """Extract top topics/keywords from reviews."""
    # Simple keyword extraction (can be enhanced with NLP)
    keyword_counts: Dict[str, int] = {}
    
    for r in reviews:
        body = (r.get("body") or r.get("text") or "").lower()
        rating = r.get("rating")
        sentiment_label = (r.get("sentiment_label") or r.get("sentiment") or "").lower()
        
        # Filter by sentiment
        if sentiment == "negative":
            if rating and rating <= 2:
                pass  # Include
            elif sentiment_label == "negative":
                pass  # Include
            else:
                continue
        elif sentiment == "positive":
            if rating and rating >= 4:
                pass  # Include
            elif sentiment_label == "positive":
                pass  # Include
            else:
                continue
        
        # Common keywords to look for
        keywords = [
            "sizing", "size", "small", "large", "fit",
            "quality", "durable", "durability", "lasted",
            "shipping", "delivery", "arrived", "package",
            "battery", "charge", "charging",
            "support", "customer service", "help",
            "price", "expensive", "cheap", "value",
            "material", "fabric", "color", "design",
        ]
        
        for kw in keywords:
            if kw in body:
                keyword_counts[kw] = keyword_counts.get(kw, 0) + 1
    
    # Sort and return top k
    sorted_topics = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)
    return sorted_topics[:top_k]


def format_response_template(
    key_numbers: List[str],
    insight: str,
    next_actions: List[str],
    evidence: Optional[List[str]] = None
) -> str:
    """Format response using the specified template."""
    parts = []
    
    # Key numbers
    if key_numbers:
        parts.append("Answer:")
        for num in key_numbers:
            parts.append(f"- {num}")
    
    # Insight
    if insight:
        parts.append(f"\n{insight}")
    
    # Next actions
    if next_actions:
        parts.append("\nNext:")
        for action in next_actions:
            parts.append(f"- {action}")
    
    # Evidence (optional)
    if evidence:
        parts.append("\nEvidence:")
        for ev in evidence[:3]:  # Max 3 examples
            parts.append(f"- \"{ev[:60]}...\"")
    
    return "\n".join(parts)


def generate_screenshot_guidance(stats: Dict, topics: Dict[str, List[Tuple[str, int]]]) -> str:
    """Generate UI screenshot/report guidance."""
    top_negative = topics.get("negative", [])[:1]
    top_positive = topics.get("positive", [])[:1]
    
    guidance = "Screenshot checklist:\n"
    guidance += "1) Date range selector visible\n"
    guidance += "2) Analysis Report header + Export CSV button\n"
    guidance += "3) Sentiment distribution bar + total\n"
    
    if top_negative:
        kw, count = top_negative[0]
        guidance += f"4) Top negative issue card: '{kw.title()}' ({count} mentions)\n"
    
    if top_positive:
        kw, count = top_positive[0]
        guidance += f"5) Top positive highlight card: '{kw.title()}' ({count} mentions)\n"
    
    guidance += "6) Short topics list\n"
    guidance += "\nVariant: Add 3 example review cards with sentiment badges."
    
    return guidance


def generate_export_guidance() -> str:
    """Generate CSV export guidance."""
    return (
        "CSV Export columns:\n"
        "- date (created_at)\n"
        "- rating (1-5)\n"
        "- sentiment (positive/negative/neutral)\n"
        "- confidence (0-1)\n"
        "- text snippet (first 100 chars)\n"
        "- product (product_title)\n"
        "- reviewer (reviewer_name, masked if email)\n\n"
        "Steps to export:\n"
        "1) Set date range filter\n"
        "2) Click 'Export CSV' button\n"
        "3) Confirm filter scope matches your needs"
    )
