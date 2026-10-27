import React from 'react';
import { History, UserCheck, PlusCircle, AlertCircle, Clock } from 'lucide-react';

export interface ActivityEvent {
  id: string;
  user: string;
  action: string;
  target: string;
  time?: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events }) => {
  const getActionIcon = (action: string) => {
    if (action.includes('request')) {
      return <UserCheck className="w-3.5 h-3.5 text-purple-600" />;
    }
    if (action.includes('created')) {
      return <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />;
    }
    if (action.includes('expired')) {
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    }
    return <Clock className="w-3.5 h-3.5 text-indigo-500" />;
  };

  const formatRelativeTime = (timestamp: string, fallbackTime?: string) => {
    if (fallbackTime) return fallbackTime;
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <History className="w-4 h-4 text-purple-600" />
        <h3 className="text-base font-bold text-slate-800">Recent Activity Timeline</h3>
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No recent activity recorded yet.</p>
        ) : (
          events.slice(0, 6).map((ev, idx) => (
            <div key={ev.id || idx} className="flex items-start space-x-3 text-xs">
              <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                {getActionIcon(ev.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 leading-snug">
                  <span className="font-bold text-slate-900">{ev.user}</span>{' '}
                  <span className="text-slate-500">{ev.action}</span>{' '}
                  <span className="font-semibold text-purple-700">{ev.target}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatRelativeTime(ev.timestamp, ev.time)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
