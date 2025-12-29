// ============ METRIC CARD COMPONENT ============
// Reusable metric card - icon, value, change indicator এবং progress bar সহ

interface MetricCardProps {
  label: string;              // Card এর label (e.g., "Sentiment Score")
  value: string | number;     // Main value to display
  unit?: string;              // Optional unit (e.g., "/100")
  icon: string;               // Emoji icon
  iconColor: string;          // Icon background gradient color
  changeValue?: string;       // Change indicator (e.g., "+5.2%")
  changeLabel?: string;       // Change label (e.g., "vs last week")
  changeType?: 'positive' | 'negative' | 'neutral';  // Change type
  progressValue?: number;     // Progress bar percentage (0-100)
  progressType?: 'positive' | 'negative' | 'primary';  // Progress bar color
  miniChart?: React.ReactNode;  // Optional mini chart element
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  iconColor,
  changeValue,
  changeLabel,
  changeType = 'neutral',
  progressValue,
  progressType = 'primary',
  miniChart
}: MetricCardProps) {
  
  // Change badge এর color classes
  const changeColors = {
    positive: 'bg-green-500/10 text-green-400 border-green-500/20',
    negative: 'bg-red-500/10 text-red-400 border-red-500/20',
    neutral: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  };
  
  // Progress bar এর gradient classes
  const progressGradients = {
    positive: 'from-green-400 to-green-600',
    negative: 'from-red-400 to-red-600',
    primary: 'from-blue-500 to-blue-600'
  };
  
  return (
    <div className="metric-card glass-panel">
      {/* Icon - Top right corner */}
      <div className="metric-icon" style={{ background: iconColor }}>
        <span>{icon}</span>
      </div>
      
      <div className="metric-content">
        {/* Label */}
        <p className="metric-label">{label}</p>
        
        {/* Value */}
        <div className="metric-value">
          {value}
          {unit && <span className="metric-unit">{unit}</span>}
        </div>
        
        {/* Change Indicator */}
        {changeValue && (
          <div className="metric-change">
            <span className={`change-badge ${changeColors[changeType]}`}>
              {changeValue}
            </span>
            {changeLabel && (
              <span className="change-label">{changeLabel}</span>
            )}
          </div>
        )}
        
        {/* Progress Bar */}
        {progressValue !== undefined && (
          <div className="metric-progress-wrapper">
            <div className="metric-progress-track">
              <div 
                className={`metric-progress-fill bg-gradient-to-r ${progressGradients[progressType]}`}
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Mini Chart */}
        {miniChart && (
          <div className="metric-mini-chart">
            {miniChart}
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricCard;

