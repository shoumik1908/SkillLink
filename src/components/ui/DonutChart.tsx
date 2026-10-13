import React, { useState } from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  innerRadiusRatio?: number;
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 240,
  innerRadiusRatio = 0.62,
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const radius = size / 2;
  const strokeWidth = radius * (1 - innerRadiusRatio);
  const chartRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * chartRadius;

  let accumulatedPercent = 0;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* SVG Donut */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 overflow-visible"
        >
          {data.map((slice, i) => {
            const percent = total > 0 ? slice.value / total : 0;
            const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
            const strokeDashoffset = -circumference * accumulatedPercent;
            accumulatedPercent += percent;

            const isHovered = hoveredIndex === i;

            return (
              <circle
                key={slice.label}
                cx={radius}
                cy={radius}
                r={chartRadius}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  filter: isHovered ? 'drop-shadow(0 4px 8px rgba(147, 51, 234, 0.3))' : 'none',
                }}
              />
            );
          })}
        </svg>

        {/* Center Hover Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {hoveredIndex !== null ? (
            <>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {data[hoveredIndex].label}
              </span>
              <span className="text-2xl font-bold text-slate-800">
                {data[hoveredIndex].value}
              </span>
              <span className="text-[11px] font-medium text-purple-600">
                {total > 0 ? Math.round((data[hoveredIndex].value / total) * 100) : 0}%
              </span>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total
              </span>
              <span className="text-2xl font-extrabold text-slate-800">{total}</span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6">
        {data.map((slice, i) => (
          <div
            key={slice.label}
            className={`flex items-center space-x-1.5 cursor-pointer text-[11px] font-semibold tracking-wider transition-opacity ${
              hoveredIndex !== null && hoveredIndex !== i ? 'opacity-40' : 'opacity-100'
            }`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-slate-500 uppercase">{slice.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
