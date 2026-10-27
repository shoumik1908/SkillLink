import React from 'react';
import { Calendar, Users, Edit3, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { ListingType } from '../../types';

interface ListingProgressCardProps {
  id: string;
  title: string;
  description?: string;
  type: ListingType | string;
  requiredSkills: string[];
  currentTeamCount: number;
  intendedTeamSize: number;
  deadline?: string | null;
  status: string;
  isExpired?: boolean;
  onEdit: (id: string) => void;
  onClose: (id: string) => void;
}

export const ListingProgressCard: React.FC<ListingProgressCardProps> = ({
  id,
  title,
  description,
  type,
  requiredSkills,
  currentTeamCount,
  intendedTeamSize,
  deadline,
  status,
  isExpired: initialIsExpired,
  onEdit,
  onClose,
}) => {
  // Real-time evaluation against Oct 27, 2026
  const now = new Date();
  const deadlineDate = deadline ? new Date(deadline) : null;
  const isPastDeadline = deadlineDate ? deadlineDate < now : false;
  const isExpired = initialIsExpired || isPastDeadline;
  const isClosed = status === 'CLOSED';

  // Team fill calculation
  const fillPercentage = Math.min(
    100,
    Math.round((currentTeamCount / (intendedTeamSize || 1)) * 100)
  );

  // Type color badge
  const getTypeBadge = (listingType: string) => {
    switch (listingType) {
      case 'Competition':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Hackathon Team':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  // Format deadline countdown
  const getDeadlineText = () => {
    if (!deadlineDate) return 'No deadline set';
    if (isExpired) return `Expired on ${deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Due today!';
    if (diffDays === 1) return 'Due tomorrow';
    return `${diffDays} days remaining`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Header badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getTypeBadge(
                type
              )}`}
            >
              {type}
            </span>

            {isExpired && !isClosed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
                Expired
              </span>
            )}

            {isClosed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Closed
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => onEdit(id)}
              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              title="Edit listing details"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            {!isClosed && (
              <button
                onClick={() => onClose(id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Close listing"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h4 className="text-base font-bold text-slate-800 line-clamp-1 mb-1">{title}</h4>
        {description && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{description}</p>}

        {/* Skill Pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(requiredSkills || []).slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60"
            >
              {skill}
            </span>
          ))}
          {(requiredSkills || []).length > 4 && (
            <span className="px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
              +{requiredSkills.length - 4} more
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 space-y-2.5">
        {/* Team Fill Progress */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-600">
            <span className="flex items-center">
              <Users className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
              Team Roster
            </span>
            <span className="text-slate-800 font-bold">
              {currentTeamCount} / {intendedTeamSize} spots ({fillPercentage}%)
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                fillPercentage >= 100
                  ? 'bg-emerald-500'
                  : fillPercentage > 50
                  ? 'bg-purple-600'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Deadline countdown */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span className="flex items-center">
            {isExpired ? (
              <Clock className="w-3.5 h-3.5 mr-1.5 text-red-500" />
            ) : (
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            )}
            <span className={isExpired ? 'text-red-600 font-medium' : ''}>
              {getDeadlineText()}
            </span>
          </span>

          <span className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 cursor-pointer">
            View applicants
          </span>
        </div>
      </div>
    </div>
  );
};
