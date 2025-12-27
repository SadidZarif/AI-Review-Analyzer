# ============ UTILS.PY ============
# এই file এ reusable helper functions থাকবে
# যেগুলো বিভিন্ন জায়গায় ব্যবহার করা যায়

# re = Regular Expression library
# Text cleaning এর জন্য ব্যবহার করব
import re

# typing = type hints এর জন্য
from typing import List, Set


# ============ CONSTANTS ============
# এগুলো fixed values যা বারবার ব্যবহার হয়

# Stop words = common words যেগুলো analysis এ কাজে আসে না
# এগুলো বাদ দিলে important words খুঁজে পাওয়া সহজ হয়
STOP_WORDS: Set[str] = {
    # Articles & Conjunctions
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then',
    
    # Prepositions
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about',
    
    # Pronouns
    'i', 'me', 'my', 'mine', 'we', 'our', 'us', 'you', 'your', 'yours',
    'he', 'she', 'it', 'they', 'them', 'their', 'his', 'her', 'its',
    
    # Demonstratives
    'this', 'that', 'these', 'those',
    
    # Verbs (common)
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'can', 'get', 'got', 'make', 'made',
    
    # Question words
    'what', 'which', 'who', 'when', 'where', 'why', 'how',
    
    # Others
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than', 'too',
    'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once',
    'one', 'two', 'first', 'new', 'way', 'even', 'back', 'after',
    'use', 'because', 'any', 'work', 'well', 'much', 'really', 'still',
    'own', 'never', 'say', 'said',
    
    # Generic review words (না রাখলে সব review তে এগুলো top এ আসে)
    'great', 'good', 'bad', 'best', 'worst', 'product', 'item', 'thing',
    'buy', 'bought', 'purchase', 'purchased', 'recommend', 'recommended',
    'love', 'like', 'want', 'need', 'got', 'came', 'amazon'
}


# ============ TEXT CLEANING FUNCTIONS ============

def clean_text(text: str) -> str:
    """
    Text clean করে - lowercase, special characters remove
    
    Args:
        text: Raw input text
        
    Returns:
        Cleaned text (lowercase, only letters and spaces)
        
    Example:
        clean_text("Hello, World! 123")
        # Returns: "hello world"
    """
    
    # Step 1: Lowercase এ convert
    # "GREAT Product" → "great product"
    text = text.lower()
    
    # Step 2: শুধু letters (a-z) এবং spaces রাখছি
    # [^a-z\s] মানে "a-z এবং whitespace ছাড়া সব"
    # এগুলো empty string দিয়ে replace হবে (মানে delete)
    text = re.sub(r'[^a-z\s]', '', text)
    
    # Step 3: Multiple spaces কে single space করছি
    # "hello    world" → "hello world"
    text = re.sub(r'\s+', ' ', text)
    
    # Step 4: শুরু ও শেষের extra spaces remove
    # " hello world " → "hello world"
    return text.strip()


def extract_words(text: str, remove_stopwords: bool = True, min_length: int = 3) -> List[str]:
    """
    Text থেকে meaningful words বের করে
    
    Args:
        text: Input text (raw or cleaned)
        remove_stopwords: Stop words বাদ দেবে কিনা
        min_length: Minimum word length (এর চেয়ে ছোট বাদ)
        
    Returns:
        List of words
        
    Example:
        extract_words("The battery is amazing!")
        # Returns: ["battery", "amazing"]
    """
    
    # প্রথমে text clean করছি
    cleaned = clean_text(text)
    
    # Words এ split করছি
    words = cleaned.split()
    
    # Filter করছি
    result = []
    for word in words:
        # Minimum length check
        if len(word) < min_length:
            continue
            
        # Stop words check (যদি remove করতে বলা হয়)
        if remove_stopwords and word in STOP_WORDS:
            continue
            
        result.append(word)
    
    return result


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """
    লম্বা text কে ছোট করে
    
    Args:
        text: Input text
        max_length: Maximum length
        suffix: শেষে কী যোগ করবে (default: "...")
        
    Returns:
        Truncated text
        
    Example:
        truncate_text("This is a very long text", max_length=10)
        # Returns: "This is a..."
    """
    
    if len(text) <= max_length:
        return text
    
    # max_length থেকে suffix এর length বাদ দিয়ে cut করছি
    return text[:max_length - len(suffix)] + suffix


def is_valid_review(review: str, min_words: int = 2) -> bool:
    """
    Review valid কিনা check করে
    
    Args:
        review: Review text
        min_words: Minimum কত words থাকতে হবে
        
    Returns:
        True if valid, False otherwise
        
    Example:
        is_valid_review("Good")  # False (1 word)
        is_valid_review("Great product!")  # True (2 words)
    """
    
    if not review or not review.strip():
        return False
    
    words = review.strip().split()
    return len(words) >= min_words


def batch_clean_reviews(reviews: List[str]) -> List[str]:
    """
    Multiple reviews একসাথে clean করে
    Invalid reviews বাদ দেয়
    
    Args:
        reviews: List of raw reviews
        
    Returns:
        List of cleaned, valid reviews
    """
    
    cleaned = []
    for review in reviews:
        # Valid কিনা check
        if not is_valid_review(review):
            continue
        
        # Strip করে add (extra spaces remove)
        cleaned.append(review.strip())
    
    return cleaned
