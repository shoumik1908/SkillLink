import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Check,
  Flag,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Code,
  Trophy,
} from 'lucide-react';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { useToast } from '../../components/admin/Toast';
import { apiUrl, getAuthHeaders } from '../../services/api';

export const AdminListings = () => {
  const toast = useToast();

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    variant?: 'danger' | 'warning' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search ? { search } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(expiredOnly ? { expired: 'true' } : {}),
      });

      const res = await fetch(apiUrl(`/admin/listings?${params.toString()}`), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings || []);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to load listings:', err);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, typeFilter, statusFilter, expiredOnly, toast]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const updateListingStatus = (
    listing: any,
    newStatus: 'OPEN' | 'FLAGGED' | 'REMOVED' | 'CLOSED',
    variant: 'primary' | 'warning' | 'danger'
  ) => {
    const actionLabel =
      newStatus === 'OPEN'
        ? 'Approve'
        : newStatus === 'FLAGGED'
        ? 'Flag for Review'
        : newStatus === 'REMOVED'
        ? 'Remove'
        : 'Close';

    setConfirmModal({
      isOpen: true,
      title: `${actionLabel} Listing`,
      message: `Are you sure you want to change "${listing.title}" to ${newStatus}?`,
      variant,
      action: async () => {
        try {
          const res = await fetch(apiUrl(`/admin/listings/${listing.id}/status`), {
            method: 'PATCH',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ status: newStatus }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to update listing');

          toast.success(`Listing status updated to ${newStatus}`);
          fetchListings();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          toast.error(err.message);
        }
      },
    });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'Project':
        return <Code className="w-3.5 h-3.5 text-purple-600 mr-1" />;
      case 'Hackathon Team':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-600 mr-1" />;
      case 'Competition':
        return <Trophy className="w-3.5 h-3.5 text-emerald-600 mr-1" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-500 mr-1" />;
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Listing Title',
      accessorKey: 'title',
      render: (l) => (
        <div className="max-w-xs sm:max-w-md">
          <div className="font-semibold text-slate-900 truncate">{l.title}</div>
          <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{l.description}</div>
          {l.requiredSkills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {l.requiredSkills.slice(0, 3).map((s: string) => (
                <span
                  key={s}
                  className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px]"
                >
                  {s}
                </span>
              ))}
              {l.requiredSkills.length > 3 && (
                <span className="text-[10px] text-slate-400">+{l.requiredSkills.length - 3}</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Type',
      accessorKey: 'type',
      render: (l) => (
        <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-lg">
          {getIconForType(l.type)}
          {l.type}
        </span>
      ),
    },
    {
      header: 'Owner',
      accessorKey: 'ownerName',
      render: (l) => (
        <div>
          <p className="font-medium text-slate-800 text-xs">{l.ownerName}</p>
          <p className="text-[11px] text-slate-400 font-mono">{l.ownerEmail}</p>
        </div>
      ),
    },
    {
      header: 'Deadline & Status',
      render: (l) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5">
            <StatusBadge status={l.status} variant="listing" />
            {l.isExpired && <StatusBadge status="EXPIRED" variant="listing" />}
          </div>
          {l.deadline && (
            <div className="text-[11px] text-slate-400 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(l.deadline).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Moderation Actions',
      className: 'text-right',
      render: (l) => (
        <div className="flex items-center justify-end space-x-1.5">
          {/* Approve / Set Open */}
          {l.status !== 'OPEN' && (
            <button
              onClick={() => updateListingStatus(l, 'OPEN', 'primary')}
              title="Approve / Open Listing"
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
          )}

          {/* Flag */}
          {l.status !== 'FLAGGED' && (
            <button
              onClick={() => updateListingStatus(l, 'FLAGGED', 'warning')}
              title="Flag Listing for Review"
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}

          {/* Remove */}
          {l.status !== 'REMOVED' && (
            <button
              onClick={() => updateListingStatus(l, 'REMOVED', 'danger')}
              title="Remove Listing"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Listings Moderation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review, approve, flag policy violations, and remove project listings
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title or description..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="">All Types</option>
            <option value="Project">Project</option>
            <option value="Hackathon Team">Hackathon Team</option>
            <option value="Competition">Competition</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="FLAGGED">Flagged</option>
            <option value="REMOVED">Removed</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Expired Checkbox */}
          <label className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={expiredOnly}
              onChange={(e) => {
                setExpiredOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded text-purple-600 focus:ring-purple-400"
            />
            <span>Expired Only</span>
          </label>
        </div>
      </div>

      {/* Listings Table */}
      <DataTable
        columns={columns}
        data={listings}
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
        emptyMessage="No listings match your criteria"
        emptySubtitle="Try resetting the type or status filters."
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
};
