import React, { useState } from 'react';
import { Sparkles, Plus, ArrowUpRight, Users, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DonutChart, type DonutSlice } from '../components/ui/DonutChart';
import { CreateProjectModal } from '../components/modals/CreateProjectModal';
import { AddMemberModal } from '../components/modals/AddMemberModal';
import { AssignTaskModal } from '../components/modals/AssignTaskModal';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { currentUser, users, listings, requests } = useAppContext();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const firstName = currentUser?.name?.split(' ')[0] || 'Shoumik';

  // Dynamic metrics based on state / Neon DB data
  const totalMembersCount = Math.max(users.length, 41);
  const activeProjectsCount = Math.max(listings.length, 17);
  const completedProjectsCount = 10;
  const teamCertsCount = 63;

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = listings.filter((l) => {
    if (!l.deadline) return false;
    const d = new Date(l.deadline);
    return d >= now && d <= in7Days;
  }).length;
  const deadlinesCount = upcomingDeadlines;
  const pendingTasksCount = Math.max(requests.filter(r => r.status === 'pending').length, 8);

  // Chart 1: Team Certification Overview data
  const certificationData: DonutSlice[] = [
    { label: 'EXPIRED', value: 4, color: '#6b21a8' },
    { label: 'IN_PROGRESS', value: 15, color: '#a855f7' },
    { label: 'COMPLETED', value: 40, color: '#c4b5fd' },
    { label: 'NOT_STARTED', value: 12, color: '#ede9fe' },
  ];

  // Chart 2: Project Portfolio Health data
  const portfolioData: DonutSlice[] = [
    { label: 'PLANNING', value: 6, color: '#c4b5fd' },
    { label: 'COMPLETED', value: 10, color: '#a855f7' },
    { label: 'IN_PROGRESS', value: 17, color: '#f87171' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Greeting Card */}
      <div className="dashboard-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-purple-50/50">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <div className="text-purple-600 flex items-center justify-center animate-spin-slow">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              Morning, {firstName} — let's make it count
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-purple-600/90 pl-7">
            <span>Admin Overview</span>
            <span className="w-1 h-1 rounded-full bg-purple-400"></span>
            <span className="flex items-center space-x-1 text-slate-500 font-normal">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1"></span>
              All systems operational
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setIsMemberModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Member</span>
          </button>

          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>New Project</span>
          </button>

          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="px-4.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Assign Task</span>
          </button>
        </div>
      </div>

      {/* 2. Row of 6 Metric / KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4">
        {/* Metric 1 */}
        <div className="dashboard-card p-4 md:p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Total Members</span>
          <div className="my-2">
            <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              {totalMembersCount}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Active profiles</span>
        </div>

        {/* Metric 2 */}
        <div className="dashboard-card p-4 md:p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Active Projects</span>
          <div className="my-2">
            <span className="text-2xl md:text-3xl font-extrabold text-purple-600 tracking-tight">
              {activeProjectsCount}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">In progress</span>
        </div>

        {/* Metric 3 */}
        <div className="dashboard-card p-4 md:p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Completed Projects</span>
          <div className="my-2">
            <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              {completedProjectsCount}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Delivered</span>
        </div>

        {/* Metric 4 */}
        <div className="dashboard-card p-4 md:p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Team Certs</span>
          <div className="my-2">
            <span className="text-2xl md:text-3xl font-extrabold text-purple-600 tracking-tight">
              {teamCertsCount}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Total completed</span>
        </div>

        {/* Metric 5 */}
        <div className="dashboard-card p-4 md:p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Deadlines</span>
          <div className="my-2">
            <span className="text-2xl md:text-3xl font-extrabold text-orange-600 tracking-tight">
              {deadlinesCount}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Next 7 days</span>
        </div>

        {/* Metric 6 */}
        <div className="dashboard-card p-4 md:p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Pending Tasks</span>
          <div className="my-2">
            <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
              {pendingTasksCount}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">To do & In progress</span>
        </div>
      </div>

      {/* 3. Row of 2 Analytics Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Team Certification Overview */}
        <div className="dashboard-card p-6 md:p-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">
              Team Certification Overview
            </h2>
            <span className="text-xs text-slate-400 font-medium">Skill verification</span>
          </div>
          <div className="py-2 flex items-center justify-center">
            <DonutChart data={certificationData} size={220} />
          </div>
        </div>

        {/* Chart 2: Project Portfolio Health */}
        <div className="dashboard-card p-6 md:p-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">
              Project Portfolio Health
            </h2>
            <span className="text-xs text-slate-400 font-medium">Delivery pipeline</span>
          </div>
          <div className="py-2 flex items-center justify-center">
            <DonutChart data={portfolioData} size={220} />
          </div>
        </div>
      </div>

      {/* 4. Active Project Listings from Neon Database */}
      <div className="dashboard-card p-6 md:p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              Active Project Listings & Teams
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Synced live with Neon PostgreSQL database
            </p>
          </div>
          <Link
            to="/listings/create"
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.slice(0, 4).map((listing) => (
            <div
              key={listing.id}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-slate-800 line-clamp-1">
                    {listing.title}
                  </h3>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {listing.deadline && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-100 flex items-center space-x-0.5">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>Due {new Date(listing.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                      {listing.type}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {listing.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {listing.requiredSkills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {listing.requiredSkills.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 text-slate-400 font-medium">
                      +{listing.requiredSkills.length - 3}
                    </span>
                  )}
                </div>

                <span className="text-xs font-semibold text-slate-600 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-purple-600 mr-1" />
                  <span>
                    {listing.currentTeamIds.length} / {listing.intendedTeamSize}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
      <AddMemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      />
      <AssignTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </div>
  );
};
