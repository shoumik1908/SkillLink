import React, { useState, useEffect, useCallback } from 'react';
import {
  List,
  Users,
  Sparkles,
  PlusCircle,
  RefreshCw,
  FolderPlus,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../services/api';
import { StatCard } from './StatCard';
import { ListingProgressCard } from './ListingProgressCard';
import { RequestCard, type IncomingRequestItem } from './RequestCard';
import { SkillDemandChart } from './SkillDemandChart';
import { RecommendedList, type RecommendedListingItem } from './RecommendedList';
import { ActivityTimeline, type ActivityEvent } from './ActivityTimeline';
import { useToast } from '../admin/Toast';
import { ConfirmModal } from '../admin/ConfirmModal';
import {
  mockDashboardListings,
  mockIncomingRequests,
  mockSkillDemand,
  mockStudentSummary,
  mockActivityTimeline,
} from '../../data/dashboardMock';

type FilterType = 'All' | 'Project' | 'Hackathon Team' | 'Competition';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentUser, sendRequest } = useAppContext();
  const toast = useToast();

  const activeUser = user || currentUser;
  const firstName = activeUser?.name?.split(' ')[0] || 'Student';

  // Filters
  const [activeTab, setActiveTab] = useState<FilterType>('All');

  // Loading & error state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard Data State
  const [summary, setSummary] = useState(mockStudentSummary);
  const [myListings, setMyListings] = useState<any[]>(mockDashboardListings.slice(0, 3));
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequestItem[]>(
    mockIncomingRequests as IncomingRequestItem[]
  );
  const [skillDemandData, setSkillDemandData] = useState<any[]>(mockSkillDemand);
  const [recommendedList, setRecommendedList] = useState<RecommendedListingItem[]>(
    mockDashboardListings.slice(3) as any
  );
  const [activityTimeline, setActivityTimeline] = useState<ActivityEvent[]>(
    mockActivityTimeline as ActivityEvent[]
  );

  // Join request state tracking
  const [pendingJoinIds, setPendingJoinIds] = useState<string[]>([]);

  // Close listing modal state
  const [closingListingId, setClosingListingId] = useState<string | null>(null);

  // Edit listing state
  const [editingListing, setEditingListing] = useState<any | null>(null);

  // Load Dashboard Data
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, listRes, reqRes, skillRes, recRes, actRes] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getDashboardMyListings(),
        api.getDashboardIncomingRequests(),
        api.getDashboardSkillDemand(),
        api.getDashboardRecommended(),
        api.getDashboardActivity(),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value) {
        setSummary(sumRes.value);
      }
      if (listRes.status === 'fulfilled' && listRes.value?.listings) {
        setMyListings(
          listRes.value.listings.length > 0 ? listRes.value.listings : mockDashboardListings.slice(0, 3)
        );
      }
      if (reqRes.status === 'fulfilled' && reqRes.value?.requests) {
        setIncomingRequests(
          reqRes.value.requests.length > 0 ? reqRes.value.requests : (mockIncomingRequests as any)
        );
      }
      if (skillRes.status === 'fulfilled' && skillRes.value?.skillDemand) {
        setSkillDemandData(
          skillRes.value.skillDemand.length > 0 ? skillRes.value.skillDemand : mockSkillDemand
        );
      }
      if (recRes.status === 'fulfilled' && recRes.value?.recommended) {
        setRecommendedList(
          recRes.value.recommended.length > 0 ? recRes.value.recommended : (mockDashboardListings.slice(3) as any)
        );
      }
      if (actRes.status === 'fulfilled' && actRes.value?.timeline) {
        setActivityTimeline(
          actRes.value.timeline.length > 0 ? actRes.value.timeline : (mockActivityTimeline as any)
        );
      }
    } catch (err: any) {
      console.warn('Backend dashboard sync failed, using realistic mock cache:', err);
      setError('Live sync failed. Showing campus dashboard cache.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Request to Join Handler
  const handleRequestJoin = async (listingId: string) => {
    setPendingJoinIds((prev) => [...prev, listingId]);
    try {
      await sendRequest(listingId);
      toast.success('Join request sent successfully!');
      // Update recommended listing state
      setRecommendedList((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, hasRequested: true } : l))
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
      setPendingJoinIds((prev) => prev.filter((id) => id !== listingId));
    }
  };

  // Accept Request Handler (Optimistic with Rollback)
  const handleAcceptRequest = async (requestId: string) => {
    const originalRequests = [...incomingRequests];

    // Optimistic UI Update
    setIncomingRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'approved' } : r))
    );
    toast.success('Applicant accepted to team!');

    try {
      await api.respondToRequest(requestId, 'approved');
      // Update summary spots filled
      setSummary((prev) => ({
        ...prev,
        pendingRequestsCount: Math.max(0, prev.pendingRequestsCount - 1),
        spotsFilled: prev.spotsFilled + 1,
      }));
    } catch (err: any) {
      // Rollback on error
      setIncomingRequests(originalRequests);
      toast.error(err.message || 'Failed to accept request. Team may be full.');
    }
  };

  // Decline Request Handler (Optimistic with Rollback)
  const handleDeclineRequest = async (requestId: string) => {
    const originalRequests = [...incomingRequests];

    // Optimistic UI Update
    setIncomingRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'denied' } : r))
    );
    toast.info('Applicant declined.');

    try {
      await api.respondToRequest(requestId, 'denied');
      setSummary((prev) => ({
        ...prev,
        pendingRequestsCount: Math.max(0, prev.pendingRequestsCount - 1),
      }));
    } catch (err: any) {
      // Rollback on error
      setIncomingRequests(originalRequests);
      toast.error(err.message || 'Failed to decline request');
    }
  };

  // Close Listing Confirm
  const handleConfirmClose = async () => {
    if (!closingListingId) return;
    try {
      await api.closeListing(closingListingId);
      setMyListings((prev) =>
        prev.map((l) => (l.id === closingListingId ? { ...l, status: 'CLOSED' } : l))
      );
      toast.success('Listing closed successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to close listing');
    } finally {
      setClosingListingId(null);
    }
  };

  // Save Listing Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    try {
      await api.editListing(editingListing.id, {
        title: editingListing.title,
        description: editingListing.description,
      });

      setMyListings((prev) =>
        prev.map((l) => (l.id === editingListing.id ? { ...l, ...editingListing } : l))
      );
      toast.success('Listing updated.');
      setEditingListing(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update listing');
    }
  };

  // Filter listings & requests by tab
  const filteredMyListings = myListings.filter((l) => {
    if (activeTab === 'All') return true;
    return l.type === activeTab;
  });

  const filteredIncomingRequests = incomingRequests.filter((r) => {
    if (activeTab === 'All') return true;
    return r.listingType === activeTab;
  });

  const filteredRecommended = recommendedList.filter((r) => {
    if (activeTab === 'All') return true;
    return r.type === activeTab;
  });

  const tabs: FilterType[] = ['All', 'Project', 'Hackathon Team', 'Competition'];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header: Welcome back, {firstName} */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Welcome back, {firstName}
            </h1>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Track your team rosters, manage incoming applicant requests, and discover matching campus projects.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={loadDashboard}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs cursor-pointer"
            title="Refresh dashboard stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          <Link
            to="/listings/create"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-colors flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Listing</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboard}
            className="font-bold underline text-amber-900 hover:text-amber-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Type Filter Tabs (All / Project / Hackathon Team / Competition) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === tab
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3. Stat Cards (4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Listings"
          value={summary.activeListingsCount}
          subtitle="Currently recruiting teammates"
          icon={List}
        />

        <StatCard
          title="Pending Requests"
          value={summary.pendingRequestsCount}
          subtitle="Awaiting your approval"
          icon={Users}
          badge={summary.pendingRequestsCount > 0 ? summary.pendingRequestsCount : undefined}
          badgeColor="bg-red-500 text-white"
          to="/requests"
        />

        <StatCard
          title="Team Spots Filled"
          value={`${summary.spotsFilled} / ${summary.totalSpotsCapacity || 1}`}
          subtitle={`${Math.round(
            (summary.spotsFilled / (summary.totalSpotsCapacity || 1)) * 100
          )}% overall capacity filled`}
          icon={Users}
        />

        <StatCard
          title="Avg Match Score"
          value={`${summary.avgMatchScore}%`}
          subtitle="Across campus skill demands"
          icon={Sparkles}
        />
      </div>

      {/* 4. Two Columns: LEFT "My Listings" | RIGHT "Incoming Requests" */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: My Listings */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-800">My Listings</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                {filteredMyListings.length}
              </span>
            </div>
            <Link
              to="/listings/create"
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center space-x-1"
            >
              <span>+ New Listing</span>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse p-5" />
              ))}
            </div>
          ) : filteredMyListings.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <FolderPlus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">No {activeTab !== 'All' ? activeTab : ''} listings found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  You haven't posted any listings in this category yet. Create one to start forming your team.
                </p>
              </div>
              <Link
                to="/listings/create"
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs"
              >
                Create a Listing
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMyListings.map((listing) => (
                <ListingProgressCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  description={listing.description}
                  type={listing.type}
                  requiredSkills={listing.requiredSkills}
                  currentTeamCount={listing.currentTeamCount || (listing.currentTeamIds || []).length || 1}
                  intendedTeamSize={listing.intendedTeamSize}
                  deadline={listing.deadline}
                  status={listing.status}
                  isExpired={listing.isExpired}
                  onEdit={() => setEditingListing(listing)}
                  onClose={() => setClosingListingId(listing.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Incoming Requests */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-800">Incoming Requests</h2>
              {summary.pendingRequestsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {summary.pendingRequestsCount} Pending
                </span>
              )}
            </div>
            <Link
              to="/requests"
              className="text-xs font-semibold text-purple-600 hover:text-purple-700"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse p-5" />
              ))}
            </div>
          ) : filteredIncomingRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No incoming requests</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                When campus students request to join your teams, their skill match breakdowns will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIncomingRequests.map((req) => (
                <RequestCard
                  key={req.id}
                  request={req}
                  onAccept={handleAcceptRequest}
                  onDecline={handleDeclineRequest}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Insights Section: In-Demand Skills Chart & Recommended Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recharts Bar Chart & Coverage */}
        <div className="lg:col-span-6">
          <SkillDemandChart
            data={skillDemandData}
            studentSkills={activeUser?.skills || ['React', 'Python', 'Node.js']}
          />
        </div>

        {/* Right: Recommended For You */}
        <div className="lg:col-span-6">
          <RecommendedList
            listings={filteredRecommended}
            onRequestJoin={handleRequestJoin}
            pendingRequestIds={pendingJoinIds}
          />
        </div>
      </div>

      {/* 6. Activity Timeline */}
      <div>
        <ActivityTimeline events={activityTimeline} />
      </div>

      {/* Close Listing Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(closingListingId)}
        title="Close Listing"
        message="Are you sure you want to close this listing? Teammates will no longer be able to submit join requests."
        confirmText="Close Listing"
        variant="danger"
        onConfirm={handleConfirmClose}
        onClose={() => setClosingListingId(null)}
      />

      {/* Quick Edit Modal */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Edit Listing</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingListing.title}
                  onChange={(e) => setEditingListing({ ...editingListing, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingListing.description}
                  onChange={(e) => setEditingListing({ ...editingListing, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
