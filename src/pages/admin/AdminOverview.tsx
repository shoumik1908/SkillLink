import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Layers,
  Clock,
  AlertTriangle,
  Activity,
  UserPlus,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { apiUrl, getAuthHeaders } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/admin/StatusBadge';

export const AdminOverview = () => {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [attention, setAttention] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, analyticsRes, attentionRes] = await Promise.all([
        fetch(apiUrl('/admin/stats'), { credentials: 'include', headers: getAuthHeaders() }),
        fetch(apiUrl('/admin/analytics'), { credentials: 'include', headers: getAuthHeaders() }),
        fetch(apiUrl('/admin/attention'), { credentials: 'include', headers: getAuthHeaders() }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (attentionRes.ok) setAttention(await attentionRes.json());
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute SVG coordinates for 30-day signup line chart
  const signupsData = analytics?.signupsByDay || [];
  const maxSignups = Math.max(...signupsData.map((d: any) => d.count), 5);
  const chartHeight = 120;
  const chartWidth = 500;

  const points = signupsData.map((d: any, i: number) => {
    const x = (i / Math.max(signupsData.length - 1, 1)) * chartWidth;
    const y = chartHeight - (d.count / maxSignups) * (chartHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Administrator Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time platform metrics, moderation queues, and campus engagement analytics
          </p>
        </div>
        <Button
          onClick={fetchDashboardData}
          disabled={isLoading}
          variant="outline"
          className="rounded-xl border-slate-200 self-start sm:self-auto text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          Refresh Metrics
        </Button>
      </div>

      {/* 1. Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Users */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">All</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers ?? '—'}</p>
            <p className="text-[11px] text-slate-500 font-medium">Total Users</p>
          </CardContent>
        </Card>

        {/* New Signups this week */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <UserPlus className="w-4 h-4" />
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">+7d</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.newSignupsThisWeek ?? '—'}</p>
            <p className="text-[11px] text-slate-500 font-medium">New This Week</p>
          </CardContent>
        </Card>

        {/* Active Listings */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <Layers className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.activeListings ?? '—'}</p>
            <p className="text-[11px] text-slate-500 font-medium">Active Listings</p>
          </CardContent>
        </Card>

        {/* Expired Listings */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-orange-600">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">Past</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.expiredListings ?? '—'}</p>
            <p className="text-[11px] text-slate-500 font-medium">Expired Listings</p>
          </CardContent>
        </Card>

        {/* Total Requests */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-blue-600">
              <Activity className="w-4 h-4" />
              <span className="text-[10px] font-semibold text-slate-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalRequests ?? '—'}</p>
            <p className="text-[11px] text-slate-500 font-medium">Join Requests</p>
          </CardContent>
        </Card>

        {/* Pending Reports */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-rose-600">
              <AlertTriangle className="w-4 h-4" />
              {stats?.pendingReports > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-rose-500" />
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats?.pendingReports ?? '—'}</p>
            <p className="text-[11px] text-slate-500 font-medium">Open Reports</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-Day Signups Trend Line Chart */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                  <TrendingUp className="w-4 h-4 text-purple-600 mr-2" />
                  Signups Velocity (Last 30 Days)
                </CardTitle>
                <CardDescription className="text-xs">
                  New campus registrations over time
                </CardDescription>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                Peak: {maxSignups} / day
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {signupsData.length > 0 ? (
              <div className="w-full">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-36 overflow-visible"
                >
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9333ea" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="60" x2={chartWidth} y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="100" x2={chartWidth} y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />

                  {/* Filled area */}
                  {points && (
                    <polygon
                      points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
                      fill="url(#purpleGradient)"
                    />
                  )}

                  {/* Polyline */}
                  {points && (
                    <polyline
                      fill="none"
                      stroke="#9333ea"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                  )}
                </svg>

                {/* Date Axis Sample */}
                <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-1">
                  <span>{signupsData[0]?.label}</span>
                  <span>{signupsData[Math.floor(signupsData.length / 2)]?.label}</span>
                  <span>{signupsData[signupsData.length - 1]?.label}</span>
                </div>
              </div>
            ) : (
              <div className="h-36 flex items-center justify-center text-xs text-slate-400">
                Loading analytics data...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Listings by Type Breakdown */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900">
              Listings by Category
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of collaborative formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {(analytics?.listingsByType || []).map((item: any) => {
              const total = (analytics?.listingsByType || []).reduce((acc: number, curr: any) => acc + curr.count, 0) || 1;
              const percentage = Math.round((item.count / total) * 100);

              const color =
                item.type === 'Project'
                  ? 'bg-purple-600'
                  : item.type === 'Hackathon Team'
                  ? 'bg-indigo-600'
                  : 'bg-emerald-600';

              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{item.type}</span>
                    <span className="font-semibold text-slate-900">{item.count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 3. Top Skills & "Needs Attention" Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 In-Demand Skills Bar Chart */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center">
              <Award className="w-4 h-4 text-indigo-600 mr-2" />
              Top 10 In-Demand Skills
            </CardTitle>
            <CardDescription className="text-xs">
              Most requested skills across active listings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {(analytics?.topSkills || []).length > 0 ? (
              (analytics.topSkills || []).map((skill: any) => {
                const maxSkillCount = analytics.topSkills[0]?.count || 1;
                const percent = Math.round((skill.count / maxSkillCount) * 100);

                return (
                  <div key={skill.skill} className="flex items-center justify-between text-xs">
                    <span className="w-24 truncate font-medium text-slate-700">{skill.skill}</span>
                    <div className="flex-1 mx-3 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-800 w-6 text-right">{skill.count}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No skills recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Needs Attention Panel */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
                  Needs Attention
                </CardTitle>
                <CardDescription className="text-xs">
                  Prioritized actions required by platform administrators
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Open Reports list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mr-2" />
                  Pending Reports ({attention?.openReports?.length || 0})
                </span>
                <Link to="/admin/reports" className="text-purple-600 hover:text-purple-700 flex items-center">
                  View Queue <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                {(attention?.openReports || []).length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">No open reports at this time.</div>
                ) : (
                  (attention?.openReports || []).slice(0, 3).map((rep: any) => (
                    <div key={rep.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-slate-800 truncate max-w-sm">"{rep.reason}"</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Reported by {rep.reporterName}</p>
                      </div>
                      <StatusBadge status={rep.status} variant="report" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expired Listings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                  Listings Past Deadline ({attention?.expiredListings?.length || 0})
                </span>
                <Link to="/admin/listings?expired=true" className="text-purple-600 hover:text-purple-700 flex items-center">
                  Moderate <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                {(attention?.expiredListings || []).length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">No expired listings pending.</div>
                ) : (
                  (attention?.expiredListings || []).slice(0, 3).map((l: any) => (
                    <div key={l.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-slate-800">{l.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">By {l.ownerName} • Deadline: {new Date(l.deadline).toLocaleDateString()}</p>
                      </div>
                      <StatusBadge status="EXPIRED" variant="listing" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
