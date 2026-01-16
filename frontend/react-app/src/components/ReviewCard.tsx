// ============ ENHANCED REVIEW CARD COMPONENT ============
// Individual review card - avatar, star rating, AI suggestions এবং quick actions সহ

import StarRating from './StarRating';
import { getRelativeTime } from '../utils/helpers';

interface ReviewCardProps {
  // Reviewer info
  reviewerName: string;
  reviewerInitials: string;
  reviewerAvatarColor: string;
  timestamp: Date | string;
  
  // Review content
  reviewText: string;
  rating: number;               // 1-5 stars
  sentiment: 'positive' | 'negative' | 'neutral';
  
  // AI features
  aiSuggestion?: string;        // AI generated reply suggestion
  onQuickReply?: () => void;   // Quick reply button callback
  onGenerateSuggestion?: () => void; // AI suggestion generate trigger
  isGeneratingSuggestion?: boolean;  // loading state
  
  // Navigation
  onClick?: () => void;         // Card click করলে ReviewDetails page এ যাবে
}

function ReviewCard({
  reviewerName,
  reviewerInitials,
  reviewerAvatarColor,
  timestamp,
  reviewText,
  rating,
  sentiment,
  aiSuggestion,
  onQuickReply,
  onGenerateSuggestion,
  isGeneratingSuggestion,
  onClick
}: ReviewCardProps) {
  
  // বাংলা: Tailwind-style class string বাদ দিয়ে simple CSS classes ব্যবহার করছি
  
  return (
    <div 
      className="review-card-enhanced glass-panel"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Top Section: User info + Sentiment badge */}
      <div className="review-header-section">
        <div className="reviewer-info">
          {/* Avatar */}
          <div 
            className="reviewer-avatar"
            style={{ backgroundColor: reviewerAvatarColor }}
          >
            {reviewerInitials}
          </div>
          
          {/* Name & Time */}
          <div className="reviewer-details">
            <h4 className="reviewer-name">{reviewerName}</h4>
            <span className="review-time">• {getRelativeTime(timestamp)}</span>
          </div>
        </div>
        
        {/* Sentiment Badge */}
        <span className={`sentiment-badge ${sentiment}`}>
          {sentiment === 'positive' && (
            <>
              <span className="material-symbols-outlined sentiment-icon">sentiment_satisfied</span>
              Positive
            </>
          )}
          {sentiment === 'negative' && (
            <>
              <span className="material-symbols-outlined sentiment-icon">sentiment_dissatisfied</span>
              Negative
            </>
          )}
          {sentiment === 'neutral' && (
            <>
              <span className="material-symbols-outlined sentiment-icon">sentiment_neutral</span>
              Neutral
            </>
          )}
        </span>
      </div>
      
      {/* Star Rating */}
      <div className="review-rating-section">
        <StarRating rating={rating} size="medium" />
      </div>
      
      {/* Review Text */}
      <p className="review-text-content">{reviewText}</p>
      
      {/* AI Suggestion Section - যদি available থাকে */}
      {(aiSuggestion || onGenerateSuggestion) && (
        <div className="ai-suggestion-section">
          <div className="ai-suggestion-header">
            <span className="ai-icon">🤖</span>
            <span className="ai-label">AI Suggestion:</span>
          </div>
          {aiSuggestion ? (
            <p className="ai-suggestion-text">{aiSuggestion}</p>
          ) : (
            <p className="ai-suggestion-text ai-placeholder">
              {/* বাংলা: dummy text দেখাব না; user click করলে real Groq API call হবে */}
              Click “Generate” to create a real-time AI reply.
            </p>
          )}
          
          {/* Generate Button (যদি suggestion না থাকে) */}
          {!aiSuggestion && onGenerateSuggestion && (
            <button
              className="quick-reply-btn"
              onClick={(e) => {
                e.stopPropagation();
                onGenerateSuggestion();
              }}
              disabled={isGeneratingSuggestion}
            >
              {isGeneratingSuggestion ? "Generating..." : "Generate"}
            </button>
          )}

          {/* Quick Reply Button (যদি suggestion থাকে) */}
          {aiSuggestion && onQuickReply && (
            <button 
              className="quick-reply-btn"
              onClick={(e) => {
                e.stopPropagation(); // Card এর onClick trigger হবে না
                onQuickReply();
              }}
            >
              Quick Reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewCard;

