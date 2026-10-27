import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'role' | 'userStatus' | 'listing' | 'report';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'listing', className = '' }) => {
  const norm = status?.toUpperCase() || '';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (variant === 'role') {
    if (norm === 'ADMIN') {
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
      dotColor = 'bg-purple-600';
    } else {
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
      dotColor = 'bg-slate-400';
    }
  } else if (variant === 'userStatus') {
    if (norm === 'ACTIVE') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
    } else if (norm === 'SUSPENDED') {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      dotColor = 'bg-amber-500';
    } else if (norm === 'DELETED') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      dotColor = 'bg-rose-500';
    }
  } else if (variant === 'report') {
    if (['OPEN', 'PENDING'].includes(norm)) {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      dotColor = 'bg-rose-500';
    } else if (norm === 'REVIEWED') {
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      dotColor = 'bg-blue-500';
    } else if (norm === 'RESOLVED') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
    } else if (norm === 'DISMISSED') {
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
    }
  } else {
    // listing
    if (norm === 'OPEN') {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotColor = 'bg-emerald-500';
    } else if (norm === 'FLAGGED') {
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
      dotColor = 'bg-amber-500';
    } else if (norm === 'REMOVED') {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 line-through';
      dotColor = 'bg-rose-500';
    } else if (norm === 'FILLED') {
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      dotColor = 'bg-blue-500';
    } else if (norm === 'CLOSED') {
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
    } else if (norm === 'EXPIRED') {
      colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
      dotColor = 'bg-orange-500';
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${colorClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1.5 shrink-0`} />
      {status}
    </span>
  );
};
