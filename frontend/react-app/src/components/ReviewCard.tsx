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
  onClick
}: ReviewCardProps) {
  
  // Sentiment badge এর colors
  const sentimentColors = {
    positive: 'bg-green-500/10 text-green-400 border-green-500/20',
    negative: 'bg-red-500/10 text-red-400 border-red-500/20',
    neutral: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  };
  
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
        <span className={`sentiment-badge ${sentimentColors[sentiment]}`}>
          {sentiment === 'positive' && '😊 Positive'}
          {sentiment === 'negative' && '😞 Negative'}
          {sentiment === 'neutral' && '😐 Neutral'}
        </span>
      </div>
      
      {/* Star Rating */}
      <div className="review-rating-section">
        <StarRating rating={rating} size="medium" />
      </div>
      
      {/* Review Text */}
      <p className="review-text-content">{reviewText}</p>
      
      {/* AI Suggestion Section - যদি available থাকে */}
      {aiSuggestion && (
        <div className="ai-suggestion-section">
          <div className="ai-suggestion-header">
            <span className="ai-icon">🤖</span>
            <span className="ai-label">AI Suggestion:</span>
          </div>
          <p className="ai-suggestion-text">{aiSuggestion}</p>
          
          {/* Quick Reply Button */}
          {onQuickReply && (
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

