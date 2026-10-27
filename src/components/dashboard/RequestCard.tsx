import React, { useState } from 'react';
import { Check, X, Zap, Loader2 } from 'lucide-react';

export interface IncomingRequestItem {
  id: string;
  listingId: string;
  listingTitle: string;
  listingType?: string;
  listingRequiredSkills?: string[];
  intendedTeamSize?: number;
  currentTeamCount?: number;
  student: {
    id: string;
    name: string;
    college?: string;
    skills: string[];
    email?: string;
  };
  status: 'pending' | 'approved' | 'denied';
  message?: string;
  createdAt: string;
  matchPercentage: number;
  overlappingSkills?: string[];
}

interface RequestCardProps {
  request: IncomingRequestItem;
  onAccept: (id: string) => Promise<void>;
  onDecline: (id: string) => Promise<void>;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  onAccept,
  onDecline,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const initials = request.student.name
    ? request.student.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ST';

  const handleAction = async (action: 'accept' | 'decline') => {
    setIsProcessing(true);
    try {
      if (action === 'accept') {
        await onAccept(request.id);
      } else {
        await onDecline(request.id);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Color badge based on match %
  const getMatchBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 50) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Avatar & Student Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-sm font-bold text-purple-700 shadow-xs shrink-0">
              {initials}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 leading-tight">
                {request.student.name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Applied to <span className="font-semibold text-purple-700">{request.listingTitle}</span>
              </p>
            </div>
          </div>

          {/* Match Score Badge */}
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center shrink-0 ${getMatchBadgeColor(
              request.matchPercentage
            )}`}
          >
            <Zap className="w-3 h-3 mr-1 fill-current" />
            <span>{request.matchPercentage}% Match</span>
          </div>
        </div>

        {/* Note / Message if provided */}
        {request.message && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2.5 mb-3 italic">
            "{request.message}"
          </p>
        )}

        {/* Applicant Skills */}
        <div className="space-y-1 mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Applicant Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {request.student.skills.map((skill) => {
              const isOverlapping = (request.overlappingSkills || []).includes(skill);
              return (
                <span
                  key={skill}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    isOverlapping
                      ? 'bg-purple-100 text-purple-800 border-purple-200 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {skill}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {new Date(request.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>

        <div className="flex items-center space-x-2">
          {request.status === 'pending' ? (
            <>
              <button
                disabled={isProcessing}
                onClick={() => handleAction('decline')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                <span>Decline</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={() => handleAction('accept')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <Check className="w-3.5 h-3.5 mr-1" />
                )}
                <span>Accept</span>
              </button>
            </>
          ) : (
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                request.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {request.status === 'approved' ? 'Accepted' : 'Declined'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
