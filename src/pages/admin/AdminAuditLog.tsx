import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Clock,
} from 'lucide-react';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { useToast } from '../../components/admin/Toast';
import { apiUrl, getAuthHeaders } from '../../services/api';

export const AdminAuditLog = () => {
  const toast = useToast();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actorSearch, setActorSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(actorSearch ? { actor: actorSearch } : {}),
        ...(actionFilter ? { action: actionFilter } : {}),
      });

      const res = await fetch(apiUrl(`/admin/audit-log?${params.toString()}`), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      toast.error('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actorSearch, actionFilter, toast]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const getActionBadge = (action: string) => {
    let color = 'bg-slate-100 text-slate-700 border-slate-200';
    if (action.includes('ROLE')) color = 'bg-purple-50 text-purple-700 border-purple-200';
    else if (action.includes('SUSPEND') || action.includes('DELETE')) color = 'bg-rose-50 text-rose-700 border-rose-200';
    else if (action.includes('ACTIVATE') || action.includes('RESOLVE')) color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (action.includes('MODERATE') || action.includes('FLAG')) color = 'bg-amber-50 text-amber-700 border-amber-200';

    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${color}`}>
        {action}
      </span>
    );
  };

  const columns: Column<any>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'createdAt',
      render: (log) => (
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{new Date(log.createdAt).toLocaleString()}</span>
        </div>
      ),
    },
    {
      header: 'Admin Actor',
      accessorKey: 'actorName',
      render: (log) => (
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px]">
            {log.actorName ? log.actorName[0].toUpperCase() : 'A'}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs">{log.actorName || 'System / Direct'}</p>
            <p className="text-[10px] text-slate-400 font-mono">{log.actorEmail || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Action',
      accessorKey: 'action',
      render: (log) => getActionBadge(log.action),
    },
    {
      header: 'Target',
      render: (log) => (
        <div className="text-xs">
          <span className="font-semibold uppercase text-slate-600 text-[10px] tracking-wider block">
            {log.targetType || 'Resource'}
          </span>
          <span className="font-mono text-[11px] text-slate-500">
            {log.targetId ? `${log.targetId.slice(0, 8)}...` : '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Metadata / Details',
      render: (log) => {
        let metaString = '';
        if (typeof log.metadata === 'object' && log.metadata !== null) {
          metaString = JSON.stringify(log.metadata);
        } else if (log.metadata) {
          metaString = String(log.metadata);
        }

        return (
          <div className="max-w-xs font-mono text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg p-1.5 truncate">
            {metaString || '—'}
          </div>
        );
      },
    },
    {
      header: 'IP Address',
      accessorKey: 'ipAddress',
      render: (log) => (
        <span className="text-[11px] font-mono text-slate-400">
          {log.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Logs
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Immutable audit trail recording state-changing actions performed by platform administrators
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search by actor */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={actorSearch}
            onChange={(e) => {
              setActorSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by administrator name or email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
          />
        </div>

        {/* Filter by action */}
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
        >
          <option value="">All Actions</option>
          <option value="USER_ROLE_UPDATED">USER_ROLE_UPDATED</option>
          <option value="USER_SUSPENDED">USER_SUSPENDED</option>
          <option value="USER_ACTIVATED">USER_ACTIVATED</option>
          <option value="USER_DELETED">USER_DELETED</option>
          <option value="LISTING_MODERATED">LISTING_MODERATED</option>
          <option value="REPORT_REVIEWED">REPORT_REVIEWED</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={logs}
        isLoading={loading}
        pagination={{
          page,
          pageSize,
          total,
          totalPages,
          onPageChange: (p) => setPage(p),
          onPageSizeChange: (ps) => {
            setPageSize(ps);
            setPage(1);
          },
        }}
        emptyMessage="No audit records found"
        emptySubtitle="No administrative state-changing actions recorded for this filter."
      />
    </div>
  );
};
