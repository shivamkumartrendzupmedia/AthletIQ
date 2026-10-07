import React from 'react';
import { motion } from 'framer-motion';

// 1. ATHLETIQ RADAR / SPIDER CHART
interface RadarMetric {
  label: string;
  value: number; // 0 - 100
}

interface AthletiqRadarChartProps {
  metrics: RadarMetric[];
  size?: number;
  colorScheme?: 'lime' | 'orange' | 'purple';
}

export const AthletiqRadarChart: React.FC<AthletiqRadarChartProps> = ({
  metrics,
  size = 300,
  colorScheme = 'lime',
}) => {
  const center = size / 2;
  const radius = size * 0.38;
  const total = metrics.length;
  const angleStep = (Math.PI * 2) / total;

  const primaryColor = colorScheme === 'lime' ? '#D8F500' : colorScheme === 'orange' ? '#FF5A00' : '#4B2A9B';
  const strokeColor = colorScheme === 'lime' ? '#D8F500' : colorScheme === 'orange' ? '#FF5A00' : '#4B2A9B';
  const fillColor = colorScheme === 'lime' ? 'rgba(216, 245, 0, 0.25)' : colorScheme === 'orange' ? 'rgba(255, 90, 0, 0.25)' : 'rgba(75, 42, 155, 0.25)';

  // Calculate web rings (20%, 40%, 60%, 80%, 100%)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Helper to convert value & index to (x, y) coordinates
  const getCoordinates = (val: number, index: number, maxRadius: number = radius) => {
    const angle = index * angleStep - Math.PI / 2; // start from top
    const r = (val / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Generate polygon points string for data
  const dataPoints = metrics.map((m, i) => getCoordinates(m.value, i));
  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Concentric Rings */}
        {rings.map((ring, rIdx) => {
          const ringPoints = metrics
            .map((_, i) => getCoordinates(100 * ring, i))
            .map((p) => `${p.x},${p.y}`)
            .join(' ');
          return (
            <polygon
              key={rIdx}
              points={ringPoints}
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1.5"
              strokeDasharray={rIdx === 4 ? '0' : '3 3'}
            />
          );
        })}

        {/* Axis Lines radiating from center */}
        {metrics.map((_, i) => {
          const outer = getCoordinates(100, i);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="1"
            />
          );
        })}

        {/* Animated Data Polygon */}
        <motion.polygon
          points={polygonPoints}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Data Point Glowing Nodes */}
        {dataPoints.map((p, i) => (
          <motion.g
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
          >
            <circle cx={p.x} cy={p.y} r="5" fill={primaryColor} />
            <circle cx={p.x} cy={p.y} r="8" fill="none" stroke={primaryColor} strokeWidth="1.5" className="animate-ping opacity-30" />
          </motion.g>
        ))}

        {/* Labels & Values */}
        {metrics.map((m, i) => {
          const labelPos = getCoordinates(118, i);
          const isLeft = labelPos.x < center - 10;
          const isRight = labelPos.x > center + 10;
          const textAnchor = isLeft ? 'end' : isRight ? 'start' : 'middle';

          return (
            <g key={i}>
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor={textAnchor}
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="800"
                fontFamily="Outfit, sans-serif"
                className="uppercase tracking-wider"
              >
                {m.label}
              </text>
              <text
                x={labelPos.x}
                y={labelPos.y + 13}
                textAnchor={textAnchor}
                fill={primaryColor}
                fontSize="12"
                fontWeight="900"
                fontFamily="Outfit, sans-serif"
              >
                {m.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// 2. ATHLETIQ BAR CHART
interface BarItem {
  label: string;
  value: number;
  color?: string;
  badgeText?: string;
}

interface AthletiqBarChartProps {
  data: BarItem[];
  maxVal?: number;
  height?: number;
}

export const AthletiqBarChart: React.FC<AthletiqBarChartProps> = ({
  data,
  maxVal = 100,
  height = 180,
}) => {
  return (
    <div className="w-full flex items-end justify-between gap-3 pt-6 pb-2" style={{ height: `${height}px` }}>
      {data.map((item, idx) => {
        const heightPct = Math.min(100, Math.max(10, (item.value / maxVal) * 100));
        const barColor = item.color || '#FF5A00';

        return (
          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
            {/* Value Badge on Hover / Always */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="text-[10px] font-black text-[#171044] bg-white px-2 py-0.5 rounded-full shadow-sm mb-2 opacity-90 group-hover:opacity-100 group-hover:-translate-y-1 transition-all"
            >
              {item.value}
            </motion.div>

            {/* Bar Container */}
            <div className="w-full bg-[#171044]/10 rounded-2xl overflow-hidden flex items-end p-1 relative h-full">
              <motion.div
                className="w-full rounded-xl shadow-md transition-all relative overflow-hidden"
                style={{ backgroundColor: barColor, height: `${heightPct}%` }}
                initial={{ height: '0%' }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.8, delay: idx * 0.08, ease: 'easeOut' }}
              >
                {/* Glossy Top Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/40 rounded-t-xl" />
              </motion.div>
            </div>

            {/* Label */}
            <span className="text-[11px] font-extrabold uppercase text-[#171044]/70 mt-2 tracking-wider text-center truncate w-full">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// 3. ATHLETIQ RADIAL PROGRESS GAUGE
interface AthletiqProgressGaugeProps {
  score: number; // 0 - 100
  label: string;
  size?: number;
  strokeWidth?: number;
  colorScheme?: 'lime' | 'orange' | 'purple';
}

export const AthletiqProgressGauge: React.FC<AthletiqProgressGaugeProps> = ({
  score,
  label,
  size = 140,
  strokeWidth = 12,
  colorScheme = 'lime',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = colorScheme === 'lime' ? '#D8F500' : colorScheme === 'orange' ? '#FF5A00' : '#4B2A9B';

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={strokeWidth}
        />
        {/* Animated Progress Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black font-display text-white tracking-tight">{score}</span>
        <span className="text-[10px] font-extrabold uppercase text-white/70 tracking-widest">{label}</span>
      </div>
    </div>
  );
};

// 4. ATHLETIQ LINE CHART
interface LinePoint {
  label: string;
  value: number;
}

interface AthletiqLineChartProps {
  points: LinePoint[];
  height?: number;
  colorScheme?: 'orange' | 'lime' | 'purple';
}

export const AthletiqLineChart: React.FC<AthletiqLineChartProps> = ({
  points,
  height = 140,
  colorScheme = 'orange',
}) => {
  const color = colorScheme === 'orange' ? '#FF5A00' : colorScheme === 'lime' ? '#D8F500' : '#4B2A9B';
  const width = 400; // viewBox width
  const padding = 30;
  const maxVal = Math.max(...points.map((p) => p.value), 100);
  const minVal = Math.min(...points.map((p) => p.value), 60);

  const dx = (width - padding * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = padding + i * dx;
    const y = height - padding - ((p.value - minVal) / (maxVal - minVal + 1)) * (height - padding * 2);
    return { x, y, ...p };
  });

  // Construct SVG Path
  const pathD = coords.reduce((acc, point, i) => {
    return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - 10} L ${coords[0].x} ${height - 10} Z`;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id={`lineGrad-${colorScheme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient Area Fill */}
        <motion.path
          d={areaD}
          fill={`url(#lineGrad-${colorScheme})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Animated Main Curve */}
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Data Point Dots */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="5" fill="#171044" stroke={color} strokeWidth="3" />
            <text
              x={c.x}
              y={c.y - 10}
              textAnchor="middle"
              fill="#171044"
              fontSize="10"
              fontWeight="900"
              fontFamily="Outfit, sans-serif"
            >
              {c.value}
            </text>
            <text
              x={c.x}
              y={height - 2}
              textAnchor="middle"
              fill="rgba(23, 16, 68, 0.6)"
              fontSize="9"
              fontWeight="800"
              fontFamily="Plus Jakarta Sans, sans-serif"
              className="uppercase"
            >
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
