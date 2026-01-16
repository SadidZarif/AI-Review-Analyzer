// ============ TREND CHART COMPONENT ============
// SVG-based sentiment trend chart - area chart with gradient fill

import { useState, useRef, useEffect, useMemo } from 'react';
import type { TrendDataPoint } from '../types/trend';

interface TrendChartProps {
  dateRange?: { startDate: Date | null; endDate: Date | null };
  // Real data from backend/cached reviews (Dashboard will pass this)
  data?: TrendDataPoint[];
  // Mock comparison line (default false, কারণ real chart এ confuse করে)
  showComparison?: boolean;
}

function TrendChart({ dateRange, data: providedData, showComparison = false }: TrendChartProps = {}) {
  // State management
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<TrendDataPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const chartRef = useRef<HTMLDivElement>(null);
  
  // শুধুমাত্র dateRange change হলে নতুন data load করছি
  useEffect(() => {
    // Real data provided হলে সেটাই use করব
    if (providedData && providedData.length > 0) {
      // Edge case: single point হলে duplicate করে 2 points বানাচ্ছি
      if (providedData.length === 1) {
        setData([providedData[0], providedData[0]]);
      } else {
        setData(providedData);
      }
      return;
    }

    // Provided data না থাকলে (fallback) - dateRange থাকলেও empty দেখাব
    // কারণ mock trend এখন UI expectations ভাঙে
    setData([]);
  }, [dateRange, providedData]);
  
  // Dashed comparison line এর জন্য random offsets
  // useMemo MUST be called before any conditional returns (React hooks rule)
  const compareOffsets = useMemo(() => {
    if (!showComparison) return [];
    return data.map(() => 5 + Math.random() * 10);
  }, [data, showComparison]);
  
  // Data না থাকলে empty state message show করছি
  if (data.length === 0) {
    return (
      <div className="trend-chart-container">
        <div className="trend-chart-header">
          <div>
            <h3 className="chart-title">Sentiment Trend</h3>
            <p className="chart-subtitle">Review volume vs. positive sentiment</p>
          </div>
        </div>
        <div className="chart-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Please select a date range to view the sentiment trend
          </p>
        </div>
      </div>
    );
  }
  
  // Chart dimensions
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // FIXED: Absolute 0-100 scale ব্যবহার করছি
  // আগে relative min-max ব্যবহার করতাম যেটা wrong position দেখাতো
  // এখন fixed 0-100 এর মধ্যে score কে chart height এ map করছি
  
  // Points calculate করছি
  const xStep = chartWidth / (data.length - 1);
  const points = data.map((d, i) => {
    const x = padding.left + (i * xStep);
    // Fixed: 0-100 এর মধ্যে score কে chart height এ map করছি
    // 84 score → 0.84 → chart এর 84% উচ্চতায়
    const normalizedScore = d.sentimentScore / 100;
    const y = padding.top + chartHeight - (normalizedScore * chartHeight);
    return { x, y, data: d };
  });
  
  // SVG path string তৈরি করছি (smooth curve)
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev.x + (curr.x - prev.x) / 3;
    const cp1y = prev.y;
    const cp2x = curr.x - (curr.x - prev.x) / 3;
    const cp2y = curr.y;
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }
  
  // Area path (filled region)
  const areaPathD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
  
  // Dashed comparison line (optional)
  const comparePathD = showComparison ? points.map((p, i) => {
    const prevPeriodScore = Math.max(0, data[i].sentimentScore - (compareOffsets[i] || 0));
    const normalizedPrevScore = prevPeriodScore / 100;
    const compareY = padding.top + chartHeight - (normalizedPrevScore * chartHeight);
    return `${i === 0 ? 'M' : 'L'} ${p.x} ${compareY}`;
  }).join(' ') : '';
  
  // Mouse move handler - tooltip position update করছি
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // নিকটতম data point খুঁজে বের করছি
    let nearest = points[0];
    let minDist = Math.abs(x - points[0].x);
    
    for (const point of points) {
      const dist = Math.abs(x - point.x);
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }
    
    // যদি mouse chart area তে থাকে
    if (x >= padding.left && x <= width - padding.right) {
      setHoveredPoint(nearest.data);
      setMousePos({ x: nearest.x, y: nearest.y });
    } else {
      setHoveredPoint(null);
    }
  };
  
  return (
    <div className="trend-chart-container">
      {/* Header */}
      <div className="trend-chart-header">
        <div>
          <h3 className="chart-title">Sentiment Trend</h3>
          <p className="chart-subtitle">Review volume vs. positive sentiment</p>
        </div>
      </div>
      
      {/* Chart SVG */}
      <div className="chart-wrapper" ref={chartRef}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            {/* Gradient for area fill */}
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#135bec" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#135bec" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Grid Lines */}
          <g className="grid-lines">
            {[0, 25, 50, 75, 100].map(val => {
              const y = padding.top + chartHeight - (val / 100 * chartHeight);
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                  >
                    {val}
                  </text>
                </g>
              );
            })}
          </g>
          
          {/* Area (filled) */}
          <path
            d={areaPathD}
            fill="url(#chartGradient)"
          />
          
          {/* Main Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#135bec"
            strokeWidth="4"
            strokeLinecap="round"
            filter="drop-shadow(0 0 8px rgba(19, 91, 236, 0.5))"
          />
          
          {/* Comparison Line (dashed) */}
          {showComparison && (
            <path
              d={comparePathD}
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="6,6"
            />
          )}
          
          {/* Hover Point Indicator */}
          {hoveredPoint && (
            <circle
              cx={mousePos.x}
              cy={mousePos.y}
              r="6"
              fill="#135bec"
              stroke="white"
              strokeWidth="2"
            />
          )}
        </svg>
        
        {/* Tooltip - hover করলে দেখাবে */}
        {hoveredPoint && (
          <div
            className="chart-tooltip"
            style={{
              left: `${mousePos.x}px`,
              top: `${mousePos.y - 60}px`
            }}
          >
            <p className="tooltip-date">{hoveredPoint.date}</p>
            <div className="tooltip-value">
              <div className="tooltip-indicator"></div>
              <span className="tooltip-score">{hoveredPoint.sentimentScore} Score</span>
            </div>
          </div>
        )}
      </div>
      
      {/* X-axis Labels - removed (no numbers/labels shown) */}
    </div>
  );
}

export default TrendChart;

