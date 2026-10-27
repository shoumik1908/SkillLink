import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { User, Shield, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPlaceholder = () => {
  const { user, role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Welcome, {user?.name || 'Student'}!
            </h1>
            <Badge
              className={
                role === 'admin'
                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                  : 'bg-indigo-100 text-indigo-700 border-indigo-200'
              }
            >
              {role === 'admin' ? (
                <>
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </>
              ) : (
                <>
                  <User className="w-3 h-3 mr-1" />
                  Student Member
                </>
              )}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">
            SkillLink Phase 1 Dashboard • Authenticated with JWT & Neon PostgreSQL
          </p>
        </div>

        {role === 'admin' && (
          <Link to="/admin">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Open Admin Portal
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-slate-200/80 shadow-xs md:col-span-2">
          <CardHeader>
            <div className="flex items-center space-x-2 text-purple-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Phase 1 Placeholder</span>
            </div>
            <CardTitle className="text-xl">User Dashboard Overview</CardTitle>
            <CardDescription>
              Role-Based Access Control and Session Verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Logged-in User</span>
                <span className="font-semibold text-slate-900">{user?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Verified Email</span>
                <span className="font-mono text-xs text-slate-700">{user?.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Assigned Role</span>
                <span className="font-semibold text-purple-700 uppercase text-xs">{role}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">User ID</span>
                <span className="font-mono text-xs text-slate-600">{user?.id}</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Full personalized dashboard widgets, skill graphs, and project statistics will be connected in Phase 2. Explore the campus feed or inspect active team matching below.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/feed">
                <Button variant="outline" className="rounded-xl">
                  Browse Campus Feed
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/matches">
                <Button variant="outline" className="rounded-xl">
                  View Skill Matches
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Security & Authentication</CardTitle>
            <CardDescription className="text-xs">Active Session Highlights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-medium">httpOnly Cookie Active</span>
            </div>
            <p>
              Your token is securely isolated from JavaScript localStorage to prevent cross-site scripting (XSS) leaks.
            </p>
            <p>
              Role permissions are strictly enforced on every API route and database query.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
