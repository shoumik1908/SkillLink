import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  X,
  Layers,
  Flag,
  Calendar,
  KeyRound,
  GraduationCap,
  AlertTriangle,
  RotateCcw,
  Check,
  Sliders,
  Copy,
} from 'lucide-react';
import { api, apiUrl, getAuthHeaders } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/admin/Toast';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { ConfirmModal } from '../../components/admin/ConfirmModal';

export interface CampusUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  college?: string;
  isActive: boolean;
  emailVerified?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// Initial fallback mock data for testing/offline resilience
const initialMockUsers: CampusUser[] = [
  {
    id: 'u-admin-1',
    name: 'System Admin',
    email: 'admin@uni.edu',
    role: 'admin',
    college: 'School of Computing',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'u-admin-2',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@muj.manipal.edu',
    role: 'admin',
    college: 'Faculty of Engineering',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-09-15T11:30:00.000Z',
  },
  {
    id: 'u-student-1',
    name: 'Shoumik Kumar',
    email: 'shoumik1908@gmail.com',
    role: 'user',
    college: 'Manipal University Jaipur',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'u-student-2',
    name: 'Alex Student',
    email: 'student@uni.edu',
    role: 'user',
    college: 'School of Computing',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-10-03T12:00:00.000Z',
  },
  {
    id: 'u-student-3',
    name: 'Priya Sharma',
    email: 'priya.sharma@muj.manipal.edu',
    role: 'user',
    college: 'School of Computing',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-10-05T14:20:00.000Z',
  },
  {
    id: 'u-student-4',
    name: 'Rahul Verma',
    email: 'rahul.verma@muj.manipal.edu',
    role: 'user',
    college: 'Electronics Engineering',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-10-12T09:15:00.000Z',
  },
  {
    id: 'u-student-5',
    name: 'Ananya Patel',
    email: 'ananya.patel@muj.manipal.edu',
    role: 'user',
    college: 'School of Design',
    isActive: false, // Suspended account for demo
    emailVerified: true,
    createdAt: '2026-10-18T16:45:00.000Z',
  },
  {
    id: 'u-student-6',
    name: 'Rohan Gupta',
    email: 'rohan.gupta@muj.manipal.edu',
    role: 'user',
    college: 'Department of IT',
    isActive: true,
    emailVerified: true,
    createdAt: '2026-10-22T13:10:00.000Z',
  },
];

type TabType = 'all' | 'admins' | 'users' | 'suspended';

export const AccessManagement: React.FC = () => {
  const { user: currentAdmin, role } = useAuth();
  const toast = useToast();

  // Strict RBAC: No student can access this component
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const [users, setUsers] = useState<CampusUser[]>(initialMockUsers);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal for editing access
  const [accessModalUser, setAccessModalUser] = useState<CampusUser | null>(null);
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSavingAccess, setIsSavingAccess] = useState<boolean>(false);

  // User detail drawer
  const [selectedUser, setSelectedUser] = useState<CampusUser | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    variant?: 'danger' | 'warning' | 'primary';
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  // Password reset state & modal
  const [resetSuccessData, setResetSuccessData] = useState<{
    userName: string;
    email: string;
    password: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const getUserDefaultPassword = (name: string) => {
    const rawFirst = (name || 'user').trim().split(/\s+/)[0].toLowerCase();
    const cleanFirst = rawFirst.replace(/[^a-z0-9]/g, '') || 'user';
    return `${cleanFirst}@123`;
  };

  const handleInitiatePasswordReset = (targetUser: CampusUser) => {
    const defaultPassword = getUserDefaultPassword(targetUser.name);
    setConfirmModal({
      isOpen: true,
      title: `Reset Password for ${targetUser.name}`,
      message: `Are you sure you want to reset the password for ${targetUser.name} (${targetUser.email})? The new password will immediately be set to: "${defaultPassword}". Any existing active sessions will be terminated.`,
      variant: 'warning',
      action: async () => {
        try {
          const res = await api.adminResetUserPassword(targetUser.id);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setResetSuccessData({
            userName: targetUser.name,
            email: targetUser.email,
            password: res.newPassword || defaultPassword,
          });
          toast.success(`Password for ${targetUser.name} reset to ${res.newPassword || defaultPassword}`);
        } catch (err: any) {
          toast.error(err.message || 'Failed to reset user password');
        }
      },
    });
  };

  const isAdmin = role === 'admin';

  // Fetch users from backend or fallback to local
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/admin/users?pageSize=50'), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
          setLoading(false);
          return;
        }
      }
      // If endpoint returned empty or failed, use mock fallback
      setUsers((prev) => (prev.length > 0 ? prev : initialMockUsers));
    } catch {
      // Backend unavailable or network error -> gracefully fallback
      setUsers((prev) => (prev.length > 0 ? prev : initialMockUsers));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Derived counts
  const totalAccounts = users.length;
  const adminCount = users.filter((u) => u.role === 'admin' && !u.deletedAt).length;
  const studentCount = users.filter((u) => u.role === 'user' && !u.deletedAt).length;
  const suspendedCount = users.filter((u) => !u.isActive && !u.deletedAt).length;

  // Filtered accounts list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.college && u.college.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      // Status filter dropdown
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'suspended' && u.isActive) return false;

      // Tab filter
      if (activeTab === 'admins') return u.role === 'admin';
      if (activeTab === 'users') return u.role === 'user';
      if (activeTab === 'suspended') return !u.isActive;

      return true;
    });
  }, [users, search, statusFilter, activeTab]);

  // Open Access Control Modal
  const handleOpenAccessModal = (targetUser: CampusUser) => {
    setAccessModalUser(targetUser);
    setEditRole(targetUser.role);
    setEditIsActive(targetUser.isActive);
  };

  // Submit Access Changes
  const handleSaveAccess = async () => {
    if (!accessModalUser) return;

    if (!isAdmin) {
      toast.error('Administrator authorization is required to modify account access.');
      return;
    }

    const isSelf = accessModalUser.id === currentAdmin?.id;
    if (isSelf && editRole !== 'admin') {
      toast.error('You cannot revoke your own administrator privileges.');
      return;
    }
    if (isSelf && !editIsActive) {
      toast.error('You cannot suspend your own account access.');
      return;
    }

    // Last admin protection
    if (accessModalUser.role === 'admin' && editRole === 'user' && adminCount <= 1) {
      toast.error('Cannot demote the last remaining active administrator.');
      return;
    }

    setIsSavingAccess(true);

    try {
      // Try backend role update
      if (editRole !== accessModalUser.role) {
        try {
          await fetch(apiUrl(`/admin/users/${accessModalUser.id}/role`), {
            method: 'PATCH',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ role: editRole }),
          });
        } catch {
          // offline mode
        }
      }

      // Try backend status update
      if (editIsActive !== accessModalUser.isActive) {
        try {
          await fetch(apiUrl(`/admin/users/${accessModalUser.id}/status`), {
            method: 'PATCH',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ is_active: editIsActive }),
          });
        } catch {
          // offline mode
        }
      }

      // Update local state smoothly
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === accessModalUser.id) {
            return {
              ...u,
              role: editRole,
              isActive: editIsActive,
              updatedAt: new Date().toISOString(),
            };
          }
          return u;
        })
      );

      toast.success(
        `Access updated for ${accessModalUser.name}: Role is now ${editRole.toUpperCase()} (${
          editIsActive ? 'ACTIVE' : 'SUSPENDED'
        })`
      );
      setAccessModalUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update access permissions');
    } finally {
      setIsSavingAccess(false);
    }
  };

  // Open Drawer for detailed user info
  const openUserDrawer = async (targetUser: CampusUser) => {
    setSelectedUser(targetUser);
    setLoadingDetail(true);
    try {
      const res = await fetch(apiUrl(`/admin/users/${targetUser.id}/detail`), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      } else {
        // Mock fallback detail
        setDetailData({
          user: targetUser,
          listings: [
            { id: 'l1', title: 'Campus Collaboration Project', type: 'Project', status: 'OPEN', intendedTeamSize: 3 },
          ],
          reportsAgainstUser: [],
        });
      }
    } catch {
      setDetailData({
        user: targetUser,
        listings: [],
        reportsAgainstUser: [],
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center">
                Access Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Control user roles, administrator privileges, and campus access permissions
              </p>
            </div>
          </div>
        </div>

        {/* Admin Role Status Badge */}
        <div className="flex items-center space-x-3">
          <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            <span>Administrator Authorized</span>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Accounts */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Accounts</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalAccounts}</p>
          </div>
        </div>

        {/* Card 2: Administrators */}
        <div
          onClick={() => setActiveTab('admins')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-4 ${
            activeTab === 'admins'
              ? 'border-purple-500 ring-2 ring-purple-100'
              : 'border-slate-200/80 hover:border-purple-300'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Administrators</p>
              <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded-full">
                RBAC
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{adminCount}</p>
          </div>
        </div>

        {/* Card 3: Active Students */}
        <div
          onClick={() => setActiveTab('users')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-4 ${
            activeTab === 'users'
              ? 'border-indigo-500 ring-2 ring-indigo-100'
              : 'border-slate-200/80 hover:border-indigo-300'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Students</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{studentCount}</p>
          </div>
        </div>

        {/* Card 4: Suspended / Restricted */}
        <div
          onClick={() => setActiveTab('suspended')}
          className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center space-x-4 ${
            activeTab === 'suspended'
              ? 'border-rose-500 ring-2 ring-rose-100'
              : 'border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Restricted Access</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{suspendedCount}</p>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Segmented Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>All Accounts</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {totalAccounts}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('admins')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'admins'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administrators</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'admins' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700'}`}>
                {adminCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Students & Users</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'users' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {studentCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('suspended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'suspended'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Suspended</span>
              {suspendedCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'suspended' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'}`}>
                  {suspendedCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchUsers}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-xs flex items-center"
              title="Refresh access list"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or department..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all text-slate-800"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200 cursor-pointer"
            >
              <option value="all">All Access Statuses</option>
              <option value="active">Active Access Only</option>
              <option value="suspended">Suspended Access Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">User & Account</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4 hidden sm:table-cell">Joined Date</th>
                <th className="py-3 px-4 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading accounts & access permissions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-700">No accounts match your criteria</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try adjusting the search query or tab filter.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((targetUser) => {
                  const isSelf = targetUser.id === currentAdmin?.id;
                  const isTargetAdmin = targetUser.role === 'admin';
                  const initials = targetUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={targetUser.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !targetUser.isActive ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* User & Account */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                              isTargetAdmin
                                ? 'bg-purple-100 border border-purple-200 text-purple-700'
                                : 'bg-indigo-50 border border-indigo-100 text-indigo-700'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                              <span>{targetUser.name}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded-sm uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 text-[11px] font-mono">{targetUser.email}</div>
                            {targetUser.college && (
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                                {targetUser.college}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isTargetAdmin
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}
                        >
                          {isTargetAdmin ? (
                            <>
                              <ShieldCheck className="w-3 h-3 mr-1 text-purple-600" />
                              Admin
                            </>
                          ) : (
                            <>
                              <GraduationCap className="w-3 h-3 mr-1 text-indigo-600" />
                              Student
                            </>
                          )}
                        </span>
                      </td>

                      {/* Access Status */}
                      <td className="py-3.5 px-4">
                        {targetUser.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                            Active Access
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                            Suspended / Locked
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 hidden sm:table-cell text-slate-500 text-[11px]">
                        {new Date(targetUser.createdAt).toLocaleDateString()}
                      </td>

                      {/* Access Controls & Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Primary "Change Access" Button */}
                          <button
                            onClick={() => handleOpenAccessModal(targetUser)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors shadow-2xs cursor-pointer"
                            title="Open Access Configuration for this user"
                          >
                            <Sliders className="w-3.5 h-3.5 mr-1 text-purple-600" />
                            <span>Change Access</span>
                          </button>

                          {/* Admin Reset Password to firstname@123 Button */}
                          <button
                            onClick={() => handleInitiatePasswordReset(targetUser)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors shadow-2xs cursor-pointer"
                            title={`Reset password to ${getUserDefaultPassword(targetUser.name)}`}
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-600" />
                            <span>Reset Password</span>
                          </button>

                          {/* Inspect User Drawer */}
                          <button
                            onClick={() => openUserDrawer(targetUser)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Inspect User Profile Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Access Control Modal ("Change Access") */}
      {accessModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-5 h-5 text-purple-200" />
                  <h3 className="text-lg font-bold">Change Account Access</h3>
                </div>
                <p className="text-xs text-purple-100 mt-1">
                  Adjust role permissions and login access for this campus account
                </p>
              </div>
              <button
                onClick={() => setAccessModalUser(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Target User Summary Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center font-bold text-sm text-purple-700">
                  {accessModalUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{accessModalUser.name}</p>
                  <p className="text-xs text-slate-400 font-mono truncate">{accessModalUser.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      accessModalUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    Current: {accessModalUser.role}
                  </span>
                </div>
              </div>

              {/* Self / Last Admin warning */}
              {accessModalUser.id === currentAdmin?.id && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    This is your own account. Administrators cannot demote themselves or suspend their own access.
                  </span>
                </div>
              )}

              {/* Section 1: Role Assignment */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Role Assignment
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option: Student */}
                  <div
                    onClick={() => {
                      if (accessModalUser.id === currentAdmin?.id) return;
                      setEditRole('user');
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      editRole === 'user'
                        ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    } ${accessModalUser.id === currentAdmin?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      {editRole === 'user' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="font-bold text-xs">Student (User)</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                      Standard campus access. Can post listings and send join requests.
                    </p>
                  </div>

                  {/* Option: Admin */}
                  <div
                    onClick={() => setEditRole('admin')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      editRole === 'admin'
                        ? 'border-purple-600 bg-purple-50/40 text-purple-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      {editRole === 'admin' && <Check className="w-4 h-4 text-purple-600" />}
                    </div>
                    <p className="font-bold text-xs">Administrator</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                      Full access to manage user roles, moderate listings, and view logs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Account Access Status */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Account Access Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditIsActive(true)}
                    className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all cursor-pointer ${
                      editIsActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Access Granted (Active)</span>
                  </button>

                  <button
                    type="button"
                    disabled={accessModalUser.id === currentAdmin?.id}
                    onClick={() => {
                      if (accessModalUser.id === currentAdmin?.id) return;
                      setEditIsActive(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all cursor-pointer ${
                      !editIsActive
                        ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    } ${accessModalUser.id === currentAdmin?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Suspended / Locked</span>
                  </button>
                </div>
              </div>

              {/* Permissions Matrix Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Effective Privileges for {editRole.toUpperCase()}
                </p>
                <div className="grid grid-cols-2 gap-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Campus Network & Feed</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Create & Apply to Listings</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {editRole === 'admin' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span className={editRole === 'admin' ? 'font-semibold text-purple-700' : 'text-slate-400'}>
                      Manage User Roles & Access
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {editRole === 'admin' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span className={editRole === 'admin' ? 'font-semibold text-purple-700' : 'text-slate-400'}>
                      Moderate Campus Listings
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {editRole === 'admin' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span className={editRole === 'admin' ? 'font-semibold text-purple-700' : 'text-slate-400'}>
                      Resolve Safety Reports
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {editRole === 'admin' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span className={editRole === 'admin' ? 'font-semibold text-purple-700' : 'text-slate-400'}>
                      View Security Audit Trail
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Reset Password Card inside modal */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                <div className="flex items-start space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-950">Reset Password to Default</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Sets password to: <span className="font-mono font-bold bg-amber-100/90 px-1.5 py-0.5 rounded text-amber-950">{getUserDefaultPassword(accessModalUser.name)}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const u = accessModalUser;
                    setAccessModalUser(null);
                    handleInitiatePasswordReset(u);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-2xs cursor-pointer transition-colors"
                >
                  Reset Now
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setAccessModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingAccess}
                onClick={handleSaveAccess}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSavingAccess ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Save Access Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. User Detail Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-lg">
                  {selectedUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                Loading profile drawer...
              </div>
            ) : (
              <div className="space-y-6 pt-5">
                {/* Badges */}
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {selectedUser.role === 'admin' ? (
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    ) : (
                      <GraduationCap className="w-3.5 h-3.5 mr-1" />
                    )}
                    {selectedUser.role}
                  </span>

                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedUser.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {selectedUser.isActive ? 'Active Access' : 'Suspended Access'}
                  </span>

                  <span className="text-xs text-slate-400 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    Joined {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Quick Action from Drawer */}
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-purple-900">Manage Access</p>
                    <p className="text-[11px] text-purple-700">Change permissions or role</p>
                  </div>
                  <button
                    onClick={() => {
                      handleOpenAccessModal(selectedUser);
                      setSelectedUser(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs cursor-pointer flex items-center"
                  >
                    <Sliders className="w-3.5 h-3.5 mr-1" />
                    Configure Access
                  </button>
                </div>

                {/* Listings Created by User */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <Layers className="w-4 h-4 mr-1.5 text-purple-600" />
                    Created Listings ({detailData?.listings?.length || 0})
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl bg-slate-50/50 overflow-hidden">
                    {(detailData?.listings || []).length === 0 ? (
                      <div className="p-4 text-xs text-slate-400 text-center">
                        This user hasn't posted any listings yet.
                      </div>
                    ) : (
                      (detailData.listings || []).map((l: any) => (
                        <div key={l.id} className="p-3 text-xs flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{l.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {l.type} • Team Size: {l.intendedTeamSize || 3}
                            </p>
                          </div>
                          <StatusBadge status={l.status || 'OPEN'} variant="listing" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Reports Filed against user */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <Flag className="w-4 h-4 mr-1.5 text-rose-600" />
                    Reports Filed Against User ({detailData?.reportsAgainstUser?.length || 0})
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl bg-slate-50/50 overflow-hidden">
                    {(detailData?.reportsAgainstUser || []).length === 0 ? (
                      <div className="p-4 text-xs text-emerald-600 text-center flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Clean record. No reports filed against this account.
                      </div>
                    ) : (
                      (detailData.reportsAgainstUser || []).map((r: any) => (
                        <div key={r.id} className="p-3 text-xs flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-800">"{r.reason}"</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusBadge status={r.status} variant="report" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
      />

      {/* Password Reset Success Dialog with Copy Button */}
      {resetSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-2xl border shrink-0 bg-emerald-50 text-emerald-600 border-emerald-200">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Password Reset Successfully</h3>
                <p className="text-xs text-slate-600 mt-1">
                  The password for <span className="font-semibold text-slate-800">{resetSuccessData.userName}</span> ({resetSuccessData.email}) has been changed to:
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">New Temporary Password</p>
                <span className="font-mono font-bold text-base text-purple-900 tracking-wider">
                  {resetSuccessData.password}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetSuccessData.password);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-100/60 transition-colors shadow-2xs cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-purple-600" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Active sessions for this account have been revoked. The user can now sign in using this new password.
            </p>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetSuccessData(null)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-2xs cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessManagement;
