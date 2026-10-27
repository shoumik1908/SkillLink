import React from 'react';
import { Sparkles, Users, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface RecommendedListingItem {
  id: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  description: string;
  type: string;
  college: string;
  intendedTeamSize: number;
  currentTeamCount?: number;
  deadline?: string;
  requiredSkills: string[];
  matchPercentage: number;
  overlappingSkills?: string[];
  hasRequested?: boolean;
  isFull?: boolean;
}

interface RecommendedListProps {
  listings: RecommendedListingItem[];
  onRequestJoin: (listingId: string) => Promise<void>;
  pendingRequestIds?: string[];
}

export const RecommendedList: React.FC<RecommendedListProps> = ({
  listings,
  onRequestJoin,
  pendingRequestIds = [],
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="text-base font-bold text-slate-800">Recommended for You</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Top open listings ranked by your profile skill compatibility
          </p>
        </div>
        <Link
          to="/matches"
          className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center space-x-1"
        >
          <span>View All Matches</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {listings.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm font-semibold text-slate-600">No matching open listings right now</p>
            <p className="text-xs text-slate-400 mt-1">Check back later or update your profile skills.</p>
          </div>
        ) : (
          listings.slice(0, 3).map((item) => {
            const isRequested = item.hasRequested || pendingRequestIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-purple-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                      {item.type}
                    </span>
                    <span className="text-xs text-slate-400 truncate">• {item.college}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.matchPercentage}% Skill Match
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.requiredSkills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                  <span className="text-xs text-slate-500 flex items-center font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400 mr-1" />
                    {item.currentTeamCount || 1} / {item.intendedTeamSize} spots
                  </span>

                  {isRequested ? (
                    <button
                      disabled
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center space-x-1 cursor-default"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Request Sent</span>
                    </button>
                  ) : item.isFull ? (
                    <button
                      disabled
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    >
                      Team Full
                    </button>
                  ) : (
                    <button
                      onClick={() => onRequestJoin(item.id)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-colors cursor-pointer"
                    >
                      Request to Join
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
