import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Shield, Users, Layers, Activity, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { apiUrl, getAuthHeaders } from '../services/api';

export const AdminPlaceholder = () => {
  const { user, role } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchAdminData = async () => {
    setLoadingStats(true);
    try {
      const [overviewRes, usersRes] = await Promise.all([
        fetch(apiUrl('/admin/overview'), { credentials: 'include', headers: getAuthHeaders() }),
        fetch(apiUrl('/admin/users'), { credentials: 'include', headers: getAuthHeaders() }),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setStats(data.stats);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.warn('Failed to fetch admin overview:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Control Center</h1>
            <Badge className="bg-purple-600 text-white border-transparent">
              <Shield className="w-3 h-3 mr-1" />
              Role: {role}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-800">{user?.name}</span> ({user?.email}) • Phase 1 Admin Placeholder
          </p>
        </div>

        <Button
          onClick={fetchAdminData}
          disabled={loadingStats}
          variant="outline"
          className="rounded-xl border-slate-200"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Real-time DB Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {stats?.totalUsers ?? '...'}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Active Listings</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {stats?.totalListings ?? '...'}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Join Requests</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {stats?.totalRequests ?? '...'}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users table */}
      <Card className="rounded-2xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Registered Users Directory</CardTitle>
          <CardDescription>
            Live user records with verified roles and active status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-t border-slate-100">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-slate-400 text-xs">
                      {loadingStats ? 'Loading user directory...' : 'No users registered yet.'}
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
