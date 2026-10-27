import React, { useState } from 'react';
import { Flag, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { apiUrl, getAuthHeaders } from '../../services/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId?: string;
  reportedUserId?: string;
  targetTitle?: string;
  onSuccess?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  listingId,
  reportedUserId,
  targetTitle,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 5) {
      setError('Please provide a specific reason (at least 5 characters).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/reports'), {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          listingId: listingId || null,
          reportedUserId: reportedUserId || null,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit report');
      }

      setReason('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Report Content</h3>
              <p className="text-xs text-slate-500">Flag policy violations for moderation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {targetTitle && (
          <div className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Target:</span> {targetTitle}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Reason for reporting
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this listing or user violates community guidelines (e.g. spam, harassment, misleading info)..."
              disabled={isLoading}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-slate-800 placeholder-slate-400 resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
