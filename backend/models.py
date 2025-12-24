# ============ IMPORTS ============

# re হলো Regular Expression library - text clean করতে ব্যবহার করব
# যেমন: special characters, extra spaces সরাতে
import re

# numpy হলো numerical computing library
# array operations, calculations এর জন্য দরকার
import numpy as np

# TfidfVectorizer: Text কে numbers এ convert করে (vectors)
# TF-IDF = Term Frequency - Inverse Document Frequency
# যে word বেশি আসে কিন্তু সব document এ না, সেটা important
from sklearn.feature_extraction.text import TfidfVectorizer

# LogisticRegression: Simple কিন্তু effective classification algorithm
# Binary classification এর জন্য perfect (positive vs negative)
from sklearn.linear_model import LogisticRegression

# train_test_split: Data কে training ও testing এ ভাগ করে
# Model কতটা ভালো কাজ করছে সেটা check করতে
from sklearn.model_selection import train_test_split

# Counter: কোন item কতবার আছে সেটা count করে
# Topic extraction এ keyword frequency বের করতে ব্যবহার করব
from collections import Counter

# typing: Type hints এর জন্য - code readable করে
from typing import List, Tuple, Dict


# ============ TRAINING DATA ============
# এটা আমাদের baseline training data
# Real project এ এটা অনেক বড় dataset হবে (হাজার হাজার reviews)
# এখন শুধু demo এর জন্য ছোট dataset ব্যবহার করছি

# Positive reviews - যেগুলো ভালো কথা বলছে
POSITIVE_REVIEWS = [
    "This product is amazing and works perfectly",
    "Great quality, highly recommend",
    "Love it, best purchase ever",
    "Excellent value for money",
    "Very satisfied with this product",
    "Works as expected, great buy",
    "Fantastic product, will buy again",
    "Super happy with my purchase",
    "Outstanding quality and fast delivery",
    "Perfect, exactly what I needed",
    "The quality is superb and delivery was fast",
    "Absolutely love this, exceeded expectations",
    "Best product I have ever bought",
    "Amazing features and easy to use",
    "Highly recommended for everyone",
]

# Negative reviews - যেগুলো complain করছে
NEGATIVE_REVIEWS = [
    "Terrible product, waste of money",
    "Very disappointed with the quality",
    "Does not work as advertised",
    "Broke after one week of use",
    "Worst purchase ever, do not buy",
    "Poor quality and bad customer service",
    "Not worth the price at all",
    "Completely useless product",
    "Very bad experience, returning it",
    "Cheap material, breaks easily",
    "Disappointed with this purchase",
    "Product arrived damaged and broken",
    "Horrible quality, do not recommend",
    "Waste of money, very poor quality",
    "Bad product, stopped working quickly",
]


# ============ SENTIMENT ANALYZER CLASS ============
# এই class টা মূল AI/ML logic handle করে
# Text নিয়ে predict করে সেটা positive না negative

class SentimentAnalyzer:
    """
    Sentiment Analysis করার main class
    TF-IDF + Logistic Regression ব্যবহার করে
    """
    
    def __init__(self):
        """
        Constructor - object তৈরি হওয়ার সময় এটা run হয়
        Model initialize এবং train করে
        """
        
        # TfidfVectorizer তৈরি করছি
        # max_features=1000: সবচেয়ে important 1000 টা word রাখবে
        # stop_words='english': common words বাদ দেবে (the, is, a, etc.)
        # ngram_range=(1,2): single words + 2-word combinations দেখবে
        #   যেমন: "good" এবং "very good" দুটোই consider করবে
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
        # LogisticRegression classifier তৈরি করছি
        # max_iter=500: maximum 500 বার try করবে optimal solution খুঁজতে
        # random_state=42: reproducibility এর জন্য - প্রতিবার same result আসবে
        self.classifier = LogisticRegression(
            max_iter=500,
            random_state=42
        )
        
        # Model train হয়েছে কিনা track করার জন্য
        self.is_trained = False
        
        # Model টা train করে ফেলছি
        self._train_model()
    
    def _train_model(self):
        """
        Model কে training data দিয়ে train করে
        Private method (underscore দিয়ে শুরু) - বাইরে থেকে call করা উচিত না
        """
        
        # Training data তৈরি করছি
        # সব positive এবং negative reviews একসাথে করছি
        all_reviews = POSITIVE_REVIEWS + NEGATIVE_REVIEWS
        
        # Labels তৈরি করছি
        # 1 = positive, 0 = negative
        # প্রথমে সব positive reviews এর জন্য 1, তারপর negative এর জন্য 0
        labels = [1] * len(POSITIVE_REVIEWS) + [0] * len(NEGATIVE_REVIEWS)
        
        # Text কে TF-IDF vectors এ convert করছি
        # fit_transform: প্রথমে vocabulary শেখে, তারপর convert করে
        X = self.vectorizer.fit_transform(all_reviews)
        
        # Labels কে numpy array এ convert করছি
        y = np.array(labels)
        
        # Classifier কে train করছি
        # X = features (TF-IDF vectors), y = labels (0 or 1)
        self.classifier.fit(X, y)
        
        # Training complete হয়েছে mark করছি
        self.is_trained = True
        
        # Console এ জানাচ্ছি training হয়ে গেছে
        print(f"Model trained with {len(all_reviews)} reviews")
    
    def predict(self, reviews: List[str]) -> List[Dict]:
        """
        নতুন reviews এর sentiment predict করে
        
        Args:
            reviews: List of review texts to analyze
            
        Returns:
            List of dicts with 'sentiment' and 'confidence' for each review
        """
        
        # Model train না হলে error
        if not self.is_trained:
            raise ValueError("Model is not trained yet!")
        
        # Results store করার জন্য empty list
        results = []
        
        # প্রতিটা review এর জন্য prediction করব
        for review in reviews:
            # Single review কে TF-IDF vector এ convert করছি
            # transform (not fit_transform): আগে শেখা vocabulary ব্যবহার করছি
            X = self.vectorizer.transform([review])
            
            # Prediction করছি (0 or 1)
            prediction = self.classifier.predict(X)[0]
            
            # Probability বের করছি (কতটা confident)
            # predict_proba returns [prob_class_0, prob_class_1]
            probabilities = self.classifier.predict_proba(X)[0]
            
            # যে class predict করেছি তার probability নিচ্ছি
            # এটাই confidence score
            confidence = float(max(probabilities))
            
            # Sentiment string এ convert করছি
            sentiment = "positive" if prediction == 1 else "negative"
            
            # Result add করছি
            results.append({
                "text": review,
                "sentiment": sentiment,
                "confidence": round(confidence, 3)  # 3 decimal places
            })
        
        return results
    
    def get_prediction_summary(self, predictions: List[Dict]) -> Dict:
        """
        সব predictions এর summary তৈরি করে
        Counts, percentages বের করে
        
        Args:
            predictions: List of prediction results from predict()
            
        Returns:
            Dict with counts and percentages
        """
        
        # Total কতগুলো review
        total = len(predictions)
        
        # Edge case: যদি কোনো review না থাকে
        if total == 0:
            return {
                "total": 0,
                "positive_count": 0,
                "negative_count": 0,
                "positive_percentage": 0.0,
                "negative_percentage": 0.0
            }
        
        # Positive কতগুলো count করছি
        positive_count = sum(1 for p in predictions if p["sentiment"] == "positive")
        
        # Negative = total - positive
        negative_count = total - positive_count
        
        # Percentage calculate করছি
        positive_percentage = round((positive_count / total) * 100, 1)
        negative_percentage = round((negative_count / total) * 100, 1)
        
        return {
            "total": total,
            "positive_count": positive_count,
            "negative_count": negative_count,
            "positive_percentage": positive_percentage,
            "negative_percentage": negative_percentage
        }


# ============ TOPIC EXTRACTOR CLASS ============
# Reviews থেকে common topics/keywords বের করে
# যেমন: "battery", "screen", "delivery" etc.

class TopicExtractor:
    """
    Reviews থেকে important topics/keywords extract করে
    Frequency based approach ব্যবহার করে
    """
    
    # Common words যেগুলো topic হিসেবে meaningful না
    # এগুলো বাদ দেব
    STOP_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'this', 'that', 'these', 'those', 'is',
        'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
        'might', 'must', 'it', 'its', 'i', 'my', 'me', 'we', 'our', 'you',
        'your', 'he', 'she', 'they', 'them', 'their', 'what', 'which', 'who',
        'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
        'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same',
        'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
        'then', 'once', 'can', 'get', 'got', 'one', 'two', 'first', 'new',
        'way', 'even', 'back', 'after', 'use', 'because', 'any', 'work',
        'well', 'much', 'really', 'still', 'own', 'never', 'say', 'great',
        'good', 'bad', 'best', 'worst', 'product', 'item', 'thing', 'buy',
        'bought', 'purchase', 'purchased', 'recommend', 'recommended'
    }
    
    @staticmethod
    def clean_text(text: str) -> str:
        """
        Text clean করে - lowercase, special chars remove
        
        Args:
            text: Raw text to clean
            
        Returns:
            Cleaned text
        """
        
        # Lowercase এ convert করছি
        text = text.lower()
        
        # শুধু letters এবং spaces রাখছি, বাকি সব remove
        # [^a-z\s] মানে a-z এবং whitespace ছাড়া সব
        text = re.sub(r'[^a-z\s]', '', text)
        
        # Multiple spaces কে single space এ convert করছি
        text = re.sub(r'\s+', ' ', text)
        
        # Leading/trailing spaces remove করছি
        return text.strip()
    
    @classmethod
    def extract_topics(
        cls,
        reviews: List[str],
        sentiments: List[str],
        top_k: int = 5
    ) -> Tuple[List[Dict], List[Dict]]:
        """
        Reviews থেকে top topics extract করে
        Positive এবং negative reviews আলাদা করে topics বের করে
        
        Args:
            reviews: List of review texts
            sentiments: List of sentiments ("positive"/"negative") for each review
            top_k: কতগুলো top topics return করবে
            
        Returns:
            Tuple of (positive_topics, negative_topics)
        """
        
        # Positive এবং negative reviews আলাদা করছি
        positive_words = []
        negative_words = []
        
        # প্রতিটা review process করছি
        for review, sentiment in zip(reviews, sentiments):
            # Text clean করছি
            cleaned = cls.clean_text(review)
            
            # Words এ split করছি
            words = cleaned.split()
            
            # Stop words বাদ দিয়ে meaningful words রাখছি
            # এবং minimum 3 character এর words নিচ্ছি
            meaningful_words = [
                word for word in words 
                if word not in cls.STOP_WORDS and len(word) >= 3
            ]
            
            # Sentiment অনুযায়ী সঠিক list এ add করছি
            if sentiment == "positive":
                positive_words.extend(meaningful_words)
            else:
                negative_words.extend(meaningful_words)
        
        # Word frequency count করছি
        positive_counts = Counter(positive_words)
        negative_counts = Counter(negative_words)
        
        # Top K topics বের করছি
        # most_common(k) returns [(word, count), ...] format এ
        top_positive = [
            {"topic": word, "count": count, "sentiment": "positive"}
            for word, count in positive_counts.most_common(top_k)
        ]
        
        top_negative = [
            {"topic": word, "count": count, "sentiment": "negative"}
            for word, count in negative_counts.most_common(top_k)
        ]
        
        return top_positive, top_negative


# ============ GLOBAL INSTANCE ============
# Application start হওয়ার সময় একবার model load হবে
# এরপর সব requests এই instance ব্যবহার করবে
# এটাকে "singleton pattern" বলে

# SentimentAnalyzer এর global instance
# এটা import করলেই trained model পাওয়া যাবে
analyzer = SentimentAnalyzer()

# TopicExtractor এর instance দরকার নেই কারণ সব methods static/class methods
# সরাসরি TopicExtractor.extract_topics() call করলেই হবে
