import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: number | string;
  badgeColor?: string;
  to?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'bg-red-500 text-white',
  to,
  trend,
  className = '',
}) => {
  const content = (
    <div
      className={`bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group ${
        to ? 'cursor-pointer hover:border-purple-300' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
            {badge !== undefined && badge !== null && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          {trend && (
            <p
              className={`text-xs font-semibold mt-1 flex items-center ${
                trend.isPositive ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              {trend.value}
            </p>
          )}
        </div>

        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-105 group-hover:bg-purple-100/70 transition-all shrink-0">
          <Icon className="w-5 h-5 text-purple-600" />
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
};
