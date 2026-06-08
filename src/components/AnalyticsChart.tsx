'use client';

import { useState } from 'react';

interface ChartProps {
  type: 'line' | 'bar' | 'donut';
  data: any[];
  title?: string;
}

export default function AnalyticsChart({ type, data, title }: ChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (type === 'line') {
    // Line Chart rendering (Admissions Trend)
    // data shape: [{ label: 'Jun 1', value: 12 }, ...]
    const maxVal = Math.max(...data.map(d => d.value), 10);
    const height = 180;
    const width = 500;
    const padding = 30;
    
    const points = data.map((d, i) => {
      const x = padding + (i * (width - padding * 2)) / (data.length - 1 || 1);
      const y = height - padding - (d.value * (height - padding * 2)) / maxVal;
      return { x, y, label: d.label, value: d.value };
    });

    const pathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaD = points.length > 0 
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        {title && <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>{title}</h3>}
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="220" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(15, 118, 110, 0.4)" />
              <stop offset="100%" stopColor="rgba(15, 118, 110, 0.0)" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padding + p * (height - padding * 2);
            const gridVal = Math.round(maxVal * (1 - p));
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={padding - 8} y={y + 4} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">{gridVal}</text>
              </g>
            );
          })}

          {/* Area under line */}
          {areaD && <path d={areaD} fill="url(#lineGrad)" />}

          {/* Actual Line */}
          {pathD && <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Points & Tooltips */}
          {points.map((p, i) => (
            <g key={i}>
              {/* Vertical tracking line on hover */}
              {hoveredIndex === i && (
                <line x1={p.x} y1={padding} x2={p.x} y2={height - padding} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" />
              )}
              
              {/* Point circle */}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r={hoveredIndex === i ? 6 : 4} 
                fill={hoveredIndex === i ? 'var(--color-primary-hover)' : 'var(--color-primary)'} 
                stroke="#ffffff" 
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* X Axis Label */}
              <text x={p.x} y={height - 8} fill="var(--color-text-secondary)" fontSize="9" textAnchor="middle">{p.label}</text>

              {/* Tooltip */}
              {hoveredIndex === i && (
                <g transform={`translate(${p.x - 35}, ${p.y - 32})`}>
                  <rect width="70" height="24" rx="4" fill="var(--color-secondary)" />
                  <text x="35" y="15" fill="#ffffff" fontSize="9" fontWeight="600" textAnchor="middle">
                    Admissions: {p.value}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  }

  if (type === 'bar') {
    // Bar Chart rendering (Disease prevalence counts)
    // data shape: [{ label: 'Diabetes', value: 42, color: '#...' }]
    const maxVal = Math.max(...data.map(d => d.value), 5);
    const height = 180;
    const width = 450;
    const paddingLeft = 100;
    const paddingRight = 30;
    const paddingTop = 10;
    const paddingBottom = 10;

    const barHeight = (height - paddingTop - paddingBottom) / data.length - 10;

    return (
      <div style={{ width: '100%' }}>
        {title && <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>{title}</h3>}
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="220" style={{ overflow: 'visible' }}>
          {data.map((d, i) => {
            const y = paddingTop + i * (barHeight + 10);
            const barWidth = ((width - paddingLeft - paddingRight) * d.value) / maxVal;
            const fillCol = d.color || 'var(--color-primary)';
            
            return (
              <g key={i}>
                {/* Y Axis Label */}
                <text x={paddingLeft - 12} y={y + barHeight / 2 + 4} fill="var(--color-text-secondary)" fontSize="11" fontWeight="550" textAnchor="end">{d.label}</text>
                
                {/* Background Track bar */}
                <rect x={paddingLeft} y={y} width={width - paddingLeft - paddingRight} height={barHeight} rx="3" fill="#f8fafc" stroke="#f1f5f9" strokeWidth="1" />
                
                {/* Value Bar */}
                <rect 
                  x={paddingLeft} 
                  y={y} 
                  width={barWidth} 
                  height={barHeight} 
                  rx="3" 
                  fill={fillCol}
                  style={{ transition: 'width 0.5s ease', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Value text label */}
                <text x={paddingLeft + barWidth + 8} y={y + barHeight / 2 + 4} fill="var(--color-text-primary)" fontSize="11" fontWeight="600">{d.value}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (type === 'donut') {
    // Donut Chart (Risk category ratios)
    // data shape: [{ label: 'High', value: 30, color: '#...' }]
    const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
    let accumulatedAngle = 0;
    const radius = 65;
    const strokeWidth = 18;
    const cx = 90;
    const cy = 90;
    const circumference = 2 * Math.PI * radius;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', width: '100%' }}>
        <div style={{ position: 'relative', width: '180px', height: '180px' }}>
          <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
            {data.map((d, i) => {
              const percentage = d.value / total;
              const strokeDashoffset = circumference - percentage * circumference;
              const strokeDasharray = `${circumference} ${circumference}`;
              const rotation = accumulatedAngle;
              accumulatedAngle += percentage * 360;

              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="transparent"
                  stroke={d.color || 'var(--color-primary)'}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                  style={{ transition: 'stroke-dashoffset 0.5s ease, stroke-width 0.2s', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
            {/* White center to create donut */}
            <circle cx={cx} cy={cy} r={radius - strokeWidth / 2 - 1} fill="var(--color-surface)" />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{total}</span>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 650 }}>Total Cases</span>
          </div>
        </div>

        {/* Custom Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1 }}>
          {title && <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>{title}</h4>}
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: hoveredIndex === i ? '#f8fafc' : 'transparent', transition: 'background-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: d.color }} />
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{d.label}</span>
              </div>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {d.value} ({Math.round((d.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
