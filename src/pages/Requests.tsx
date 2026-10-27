import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Bell, Check, X, Clock, FileText, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from '../utils/formatDate';

export const Requests = () => {
  const { 
    currentUser, 
    requests, 
    listings, 
    users, 
    respondToRequest,
    notifications,
    markNotificationRead
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'requests' | 'notifications'>('requests');

  // Requests for listings owned by current user
  const receivedRequests = requests.filter(r => 
    listings.find(l => l.id === r.listingId)?.ownerId === currentUser?.id
  );

  // Requests sent by current user
  const sentRequests = requests.filter(r => r.studentId === currentUser?.id);

  // Notifications for current user
  const myNotifications = notifications.filter(n => n.userId === currentUser?.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inbox</h1>
        <p className="text-slate-500 mt-1">Manage your team requests and notifications.</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'requests' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
          onClick={() => setActiveTab('requests')}
        >
          Join Requests
        </button>
        <button
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'notifications' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
          onClick={() => setActiveTab('notifications')}
        >
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'requests' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Received Requests</h3>
            {receivedRequests.length === 0 ? (
              <p className="text-slate-500 text-sm">No pending requests for your listings.</p>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map(request => {
                  const student = users.find(u => u.id === request.studentId);
                  const listing = listings.find(l => l.id === request.listingId);
                  if (!student || !listing) return null;

                  return (
                    <Card key={request.id}>
                      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-slate-900">{student.name}</span>
                            <span className="text-slate-500 text-sm">wants to join</span>
                            <span className="font-medium text-primary-700">{listing.title}</span>
                          </div>
                          <p className="text-sm text-slate-500 mb-2">{student.college} • Year {student.yearOfStudy}</p>
                          {student.resumeUrl && (
                            <div className="mb-2">
                              <a
                                href={student.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-primary-600" />
                                <span>Candidate Resume: {student.resumeName || 'View PDF'}</span>
                                <ExternalLink className="w-3 h-3 text-primary-500" />
                              </a>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {student.skills.map(skill => (
                              <span key={skill} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 w-full sm:w-auto">
                          {request.status === 'pending' ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={() => respondToRequest(request.id, 'denied')}
                              >
                                <X className="w-4 h-4 mr-1" /> Deny
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                                onClick={() => respondToRequest(request.id, 'approved')}
                              >
                                <Check className="w-4 h-4 mr-1" /> Approve
                              </Button>
                            </>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                              request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {request.status}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Sent Requests</h3>
            {sentRequests.length === 0 ? (
              <p className="text-slate-500 text-sm">You haven't sent any requests yet.</p>
            ) : (
              <div className="space-y-4">
                {sentRequests.map(request => {
                  const listing = listings.find(l => l.id === request.listingId);
                  if (!listing) return null;

                  return (
                    <Card key={request.id}>
                      <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            Requested to join <span className="text-primary-700">{listing.title}</span>
                          </p>
                          <div className="flex items-center text-xs text-slate-500 mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {request.createdAt ? formatDistanceToNow(new Date(request.createdAt)) : 'recently'}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          request.status === 'denied' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status}
                        </span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {myNotifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">You're all caught up!</p>
            </div>
          ) : (
            myNotifications.map(notification => (
              <div 
                key={notification.id} 
                className={`p-4 rounded-xl border flex items-start space-x-4 transition-colors ${
                  notification.read ? 'bg-white border-slate-200' : 'bg-primary-50 border-primary-200'
                }`}
                onClick={() => !notification.read && markNotificationRead(notification.id)}
              >
                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${notification.read ? 'bg-transparent' : 'bg-primary-600'}`} />
                <div className="flex-1">
                  <p className={`text-sm ${notification.read ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt))}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
