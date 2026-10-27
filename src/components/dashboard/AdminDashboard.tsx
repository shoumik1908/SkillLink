import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck,
  History,
  CheckCircle2,
  List,
} from 'lucide-react';
import { apiUrl, getAuthHeaders } from '../../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge } from '../admin/StatusBadge';
import { StudentDashboard } from './StudentDashboard';

const COLORS = ['#7c3aed', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'my-activity'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [attention, setAttention] = useState<any>(null);
  const [recentAudit, setRecentAudit] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, analyticsRes, attentionRes, auditRes] = await Promise.allSettled([
        fetch(apiUrl('/admin/stats'), { credentials: 'include', headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : null)),
        fetch(apiUrl('/admin/analytics'), { credentials: 'include', headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : null)),
        fetch(apiUrl('/admin/attention'), { credentials: 'include', headers: getAuthHeaders() }).then((r) => (r.ok ? r.json() : null)),
        fetch(apiUrl('/admin/audit-log?limit=6'), { credentials: 'include', headers: getAuthHeaders() }).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) setStats(statsRes.value);
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) setAnalytics(analyticsRes.value);
      if (attentionRes.status === 'fulfilled' && attentionRes.value) setAttention(attentionRes.value);
      if (auditRes.status === 'fulfilled' && auditRes.value?.logs) setRecentAudit(auditRes.value.logs);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Format Recharts data
  const signupsData = (analytics?.signupsByDay || []).map((d: any) => ({
    name: d.label,
    signups: d.count,
  }));

  const listingsTypeData = (analytics?.listingsByType || []).map((d: any) => ({
    name: d.type,
    value: d.count,
  }));

  const requestsStatusData = (analytics?.requestsByStatus || [
    { status: 'pending', count: 12 },
    { status: 'approved', count: 24 },
    { status: 'denied', count: 5 },
  ]).map((d: any) => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    count: d.count,
  }));

  const topSkillsData = (analytics?.topSkills || []).slice(0, 10).map((d: any) => ({
    skill: d.skill,
    count: d.count,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header: Admin Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Admin Overview</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
              Campus Management
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Platform governance, automated moderations, database health, and campus collaboration analytics.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Button
            onClick={fetchAdminData}
            disabled={isLoading}
            variant="outline"
            className="rounded-xl border-slate-200 text-xs flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
            <span>Refresh Metrics</span>
          </Button>

          <Link
            to="/admin/users"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs: "Overview & Analytics" vs "My Activity" */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Overview & System Metrics
        </button>

        <button
          onClick={() => setActiveTab('my-activity')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'my-activity'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>My Activity (Student View)</span>
        </button>
      </div>

      {activeTab === 'my-activity' ? (
        <div className="pt-2">
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-800 mb-6 flex items-center justify-between">
            <span>
              <strong>Admin Self-Activity:</strong> You are viewing your own created listings, incoming applicant requests, and skill coverage widget.
            </span>
            <button
              onClick={() => setActiveTab('overview')}
              className="font-bold underline text-purple-900 ml-4 hover:text-purple-700 cursor-pointer"
            >
              Back to Overview
            </button>
          </div>
          <StudentDashboard />
        </div>
      ) : (
        <>
          {/* 2. Stat cards (6) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Users */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-purple-600">
                  <Users className="w-4 h-4" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers ?? '—'}</p>
                <p className="text-[11px] text-slate-500 font-medium">Total Users</p>
              </CardContent>
            </Card>

            {/* New Signups (7 days) */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-indigo-600">
                  <UserPlus className="w-4 h-4" />
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                    +7d
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.newSignupsThisWeek ?? '—'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">New Signups</p>
              </CardContent>
            </Card>

            {/* Active Listings */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white">
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
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-orange-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                    Past
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats?.expiredListings ?? '—'}</p>
                <p className="text-[11px] text-slate-500 font-medium">Expired Listings</p>
              </CardContent>
            </Card>

            {/* Total Requests */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-blue-600">
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] font-semibold text-slate-400">Total</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalRequests ?? '—'}</p>
                <p className="text-[11px] text-slate-500 font-medium">Total Requests</p>
              </CardContent>
            </Card>

            {/* Open Reports */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white">
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

          {/* 3. Recharts Section: 30-Day Signups Line Chart & Listings by Type Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recharts Signups Line Chart */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white lg:col-span-8">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                      <TrendingUp className="w-4 h-4 text-purple-600 mr-2" />
                      Signups Velocity (Last 30 Days)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Daily authenticated student registrations via Recharts
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {signupsData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Loading velocity metrics...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={signupsData}
                        margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          tickLine={false}
                          interval={4}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="signups"
                          stroke="#7c3aed"
                          strokeWidth={2.5}
                          dot={{ r: 2, fill: '#7c3aed' }}
                          activeDot={{ r: 5, fill: '#9333ea' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recharts Listings by Type Donut Chart */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white lg:col-span-4 flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">Listings by Type</CardTitle>
                <CardDescription className="text-xs">
                  Collaborative category breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 flex-1 flex flex-col items-center justify-center">
                <div className="h-56 w-full">
                  {listingsTypeData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No listings data
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={listingsTypeData}
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {listingsTypeData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recharts Requests by Status & Top 10 In-Demand Skills */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top 10 Skills Bar Chart */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white lg:col-span-7">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                  <Award className="w-4 h-4 text-purple-600 mr-2" />
                  Top 10 In-Demand Skills
                </CardTitle>
                <CardDescription className="text-xs">
                  Frequency of required skills across all active campus teams
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  {topSkillsData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No skills data recorded
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topSkillsData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 35, bottom: 5 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="skill"
                          tick={{ fontSize: 11, fill: '#475569' }}
                          axisLine={false}
                          tickLine={false}
                          width={85}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Requests by Status Bar Chart */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white lg:col-span-5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Requests by Status
                </CardTitle>
                <CardDescription className="text-xs">
                  Teaming pipeline throughput
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={requestsStatusData}
                      margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          color: '#fff',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
                        {requestsStatusData.map((entry: any, index: number) => {
                          const fill =
                            entry.name === 'Approved'
                              ? '#10b981'
                              : entry.name === 'Denied'
                              ? '#ef4444'
                              : '#7c3aed';
                          return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 4. "Needs Attention" Panel & 5. Recent Activity Feed from Audit Log */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Needs Attention Panel */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white lg:col-span-7">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
                    Needs Attention
                  </CardTitle>
                  <span className="text-xs text-slate-400">Action items</span>
                </div>
                <CardDescription className="text-xs">
                  Prioritized moderation items requiring administrator intervention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Pending Reports */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-rose-500 mr-2" />
                      Pending Reports ({attention?.openReports?.length || 0})
                    </span>
                    <Link
                      to="/admin/reports"
                      className="text-purple-600 hover:text-purple-700 flex items-center"
                    >
                      <span>Resolve Queue</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                    {(attention?.openReports || []).length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 text-center">
                        ✓ No unresolved reports in queue.
                      </div>
                    ) : (
                      (attention?.openReports || []).slice(0, 3).map((rep: any) => (
                        <div key={rep.id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-medium text-slate-800 truncate max-w-sm">
                              "{rep.reason}"
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Reported by {rep.reporterName}
                            </p>
                          </div>
                          <StatusBadge status={rep.status} variant="report" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Expired Listings Still Active */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                      Expired Listings Still Active ({attention?.expiredListings?.length || 0})
                    </span>
                    <Link
                      to="/admin/listings?expired=true"
                      className="text-purple-600 hover:text-purple-700 flex items-center"
                    >
                      <span>Moderate</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                    {(attention?.expiredListings || []).length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 text-center">
                        ✓ All expired listings moderated.
                      </div>
                    ) : (
                      (attention?.expiredListings || []).slice(0, 3).map((l: any) => (
                        <div key={l.id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-medium text-slate-800">{l.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              By {l.ownerName} • Due: {new Date(l.deadline).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusBadge status="EXPIRED" variant="listing" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Newest Users */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2" />
                      Newest Campus Registrations
                    </span>
                    <Link
                      to="/admin/users"
                      className="text-purple-600 hover:text-purple-700 flex items-center"
                    >
                      <span>View Directory</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/50 overflow-hidden">
                    {(attention?.recentUsers || []).slice(0, 3).map((u: any) => (
                      <div key={u.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800">{u.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {u.email} • {u.college || 'State University'}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. Recent Activity Feed from Audit Log */}
            <Card className="rounded-xl border-slate-200/80 shadow-xs bg-white lg:col-span-5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center">
                    <History className="w-4 h-4 text-purple-600 mr-2" />
                    Audit Log Feed
                  </CardTitle>
                  <Link
                    to="/admin/audit-log"
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                  >
                    View All
                  </Link>
                </div>
                <CardDescription className="text-xs">
                  Immutable record of recent administrative actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {recentAudit.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No administrative audit actions recorded yet.
                  </p>
                ) : (
                  recentAudit.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start space-x-3 text-xs"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-purple-600 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 font-semibold leading-snug">
                          <span className="text-purple-700 font-bold">{log.actorName || 'Admin'}</span>{' '}
                          executed <span className="font-mono text-[11px] text-slate-900">{log.action}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Target: {log.targetType} ({log.targetId?.slice(0, 8)}...)
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
