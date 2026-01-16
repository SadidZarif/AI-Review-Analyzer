// ============ METRIC CARD COMPONENT ============
// Reusable metric card - icon, value, change indicator এবং progress bar সহ

interface MetricCardProps {
  label: string;              // Card এর label (e.g., "Sentiment Score")
  value: string | number;     // Main value to display
  unit?: string;              // Optional unit (e.g., "/100")
  icon: string;               // Material Symbols icon name
  iconColor: string;          // Icon background gradient color
  iconTextColor?: string;     // Icon এর actual color (text color)
  changeValue?: string;       // Change indicator (e.g., "+5.2%")
  changeLabel?: string;       // Change label (e.g., "vs last week")
  changeType?: 'positive' | 'negative' | 'neutral';  // Change type
  progressValue?: number;     // Progress bar percentage (0-100)
  progressType?: 'positive' | 'negative' | 'primary';  // Progress bar color
  miniChart?: React.ReactNode;  // Optional mini chart element
  onClick?: () => void;
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  iconColor,
  iconTextColor = '#fff',
  changeValue,
  changeLabel,
  changeType = 'neutral',
  progressValue,
  progressType = 'primary',
  miniChart,
  onClick
}: MetricCardProps) {
  
  // বাংলা: আগে Tailwind-style class string ছিল (bg-green-500/10 etc) — আমাদের project এ Tailwind নেই।
  // তাই এখন আমরা deterministic CSS classes ব্যবহার করছি।
  
  const clickable = typeof onClick === 'function';
  const Container: any = clickable ? 'button' : 'div';

  return (
    <Container
      className={`metric-card glass-panel${clickable ? ' metric-card-clickable' : ''}`}
      onClick={onClick}
      type={clickable ? 'button' : undefined}
      style={clickable ? { textAlign: 'left' } : undefined}
    >
      {/* Icon - Top right corner - Material Symbols icon */}
      <div className="metric-icon" style={{ background: iconColor }}>
        <span className="material-symbols-outlined" style={{ color: iconTextColor }}>{icon}</span>
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
            <span className={`change-badge ${changeType}`}>
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
                className={`metric-progress-fill ${progressType}`}
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
    </Container>
  );
}

export default MetricCard;

