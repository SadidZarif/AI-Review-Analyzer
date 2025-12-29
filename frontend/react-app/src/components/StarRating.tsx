// ============ STAR RATING COMPONENT ============
// 1-5 star rating display করার component

interface StarRatingProps {
  rating: number;           // 1-5 star rating
  maxStars?: number;        // Maximum stars (default 5)
  size?: 'small' | 'medium' | 'large';  // Size variant
  showNumber?: boolean;     // Rating number দেখাবে কিনা
}

function StarRating({ 
  rating, 
  maxStars = 5, 
  size = 'medium',
  showNumber = false 
}: StarRatingProps) {
  // Size classes
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };
  
  // Star icons render করছি
  const stars = [];
  for (let i = 1; i <= maxStars; i++) {
    if (i <= rating) {
      // Filled star - rating এর মধ্যে
      stars.push(
        <span key={i} className="star-filled" style={{ color: '#fbbf24' }}>
          ★
        </span>
      );
    } else {
      // Empty star - rating এর বাইরে
      stars.push(
        <span key={i} className="star-empty" style={{ color: '#64748b' }}>
          ★
        </span>
      );
    }
  }
  
  return (
    <div className={`star-rating ${sizeClasses[size]}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.125rem' }}>
      {stars}
      {showNumber && (
        <span style={{ marginLeft: '0.5rem', fontSize: '0.875em', color: '#94a3b8' }}>
          ({rating}/{maxStars})
        </span>
      )}
    </div>
  );
}

export default StarRating;

