import { useState, useEffect, useCallback } from 'react';
import {
  CheckCheck,
  XCircle,
  FileText,
  User as UserIcon,
  Layers,
  X,
  Loader2,
} from 'lucide-react';
import { DataTable, type Column } from '../../components/admin/DataTable';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { useToast } from '../../components/admin/Toast';
import { Button } from '../../components/ui/Button';
import { apiUrl, getAuthHeaders } from '../../services/api';

export const AdminReports = () => {
  const toast = useToast();

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    report: any | null;
    status: 'reviewed' | 'resolved' | 'dismissed';
    note: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    report: null,
    status: 'resolved',
    note: '',
    isLoading: false,
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}),
      });

      const res = await fetch(apiUrl(`/admin/reports?${params.toString()}`), {
        credentials: 'include',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error('Failed to load reports queue');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openReviewModal = (report: any, actionStatus: 'reviewed' | 'resolved' | 'dismissed') => {
    setReviewModal({
      isOpen: true,
      report,
      status: actionStatus,
      note: report.adminNote || '',
      isLoading: false,
    });
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal.report) return;

    setReviewModal((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(apiUrl(`/admin/reports/${reviewModal.report.id}`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          status: reviewModal.status,
          note: reviewModal.note.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update report');

      toast.success(`Report marked as ${reviewModal.status}`);
      setReviewModal((prev) => ({ ...prev, isOpen: false }));
      fetchReports();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReviewModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Reason & Violation Details',
      accessorKey: 'reason',
      render: (r) => (
        <div className="max-w-md">
          <p className="font-semibold text-slate-800 text-xs">"{r.reason}"</p>
          {r.adminNote && (
            <p className="text-[11px] text-purple-700 bg-purple-50 border border-purple-100 rounded-lg p-1.5 mt-1.5 flex items-start">
              <FileText className="w-3 h-3 mr-1 mt-0.5 shrink-0" />
              <span>Admin Note: {r.adminNote}</span>
            </p>
          )}
          <span className="text-[10px] text-slate-400 mt-1 block">
            Submitted {new Date(r.createdAt).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Reported Target',
      render: (r) => {
        if (r.listingTitle) {
          return (
            <div className="flex items-start space-x-1.5 text-xs text-slate-700">
              <Layers className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-slate-900 truncate max-w-xs">{r.listingTitle}</p>
                <span className="text-[10px] text-slate-400">Listing</span>
              </div>
            </div>
          );
        }
        if (r.reportedUserName) {
          return (
            <div className="flex items-start space-x-1.5 text-xs text-slate-700">
              <UserIcon className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-slate-900">{r.reportedUserName}</p>
                <p className="text-[10px] text-slate-400 font-mono">{r.reportedUserEmail}</p>
              </div>
            </div>
          );
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      header: 'Reporter',
      accessorKey: 'reporterName',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800 text-xs">{r.reporterName}</p>
          <p className="text-[11px] text-slate-400 font-mono">{r.reporterEmail}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      render: (r) => <StatusBadge status={r.status} variant="report" />,
    },
    {
      header: 'Resolution Actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end space-x-1.5">
          {/* Resolve Button */}
          {r.status !== 'resolved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openReviewModal(r, 'resolved')}
              className="h-7 text-xs rounded-lg text-emerald-700 hover:bg-emerald-50 border-emerald-200"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Resolve
            </Button>
          )}

          {/* Dismiss Button */}
          {r.status !== 'dismissed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openReviewModal(r, 'dismissed')}
              className="h-7 text-xs rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <XCircle className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Dismiss
            </Button>
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
          Reports Queue
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review community flagged listings and users, attach resolution notes, and enforce campus guidelines
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-1 w-full sm:w-auto">
        {[
          { label: 'Open Reports', value: 'open' },
          { label: 'Reviewed', value: 'reviewed' },
          { label: 'Resolved', value: 'resolved' },
          { label: 'Dismissed', value: 'dismissed' },
          { label: 'All History', value: 'all' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === tab.value
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={reports}
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
        emptyMessage="No reports found"
        emptySubtitle="The moderation queue is clear for this filter status."
      />

      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Mark Report as {reviewModal.status.toUpperCase()}
              </h3>
              <button
                onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs space-y-1">
              <p className="text-slate-500">Report Reason:</p>
              <p className="font-medium text-slate-800">"{reviewModal.report?.reason}"</p>
            </div>

            <form onSubmit={handleUpdateReport} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Admin Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reviewModal.note}
                  onChange={(e) =>
                    setReviewModal((prev) => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="e.g. Warning sent to owner, listing removed, or verified legitimate..."
                  disabled={reviewModal.isLoading}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-slate-800 placeholder-slate-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                  disabled={reviewModal.isLoading}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reviewModal.isLoading}
                  className={`rounded-xl font-semibold shadow-xs ${
                    reviewModal.status === 'resolved'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {reviewModal.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    `Confirm ${reviewModal.status}`
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
