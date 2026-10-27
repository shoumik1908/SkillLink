import type { User, Listing, JoinRequest, Notification, Match } from '../types';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export const apiUrl = (endpoint: string): string => {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${clean}`;
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('skilllink_token');
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('skilllink_token', token);
  } else {
    localStorage.removeItem('skilllink_token');
  }
};

export const getAuthHeaders = (extraHeaders?: HeadersInit): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
};

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(apiUrl(endpoint), {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: {
    name: string;
    email: string;
    password: string;
    college: string;
    yearOfStudy: number;
    skills: string[];
    bio?: string;
  }) => apiFetch<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  resendVerification: (email: string) =>
    apiFetch<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: { token: string; newPassword: string; confirmPassword: string }) =>
    apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => apiFetch<{ user: User }>('/auth/me'),

  getUsers: () => apiFetch<{ users: User[] }>('/auth/users'),

  updateProfile: (data: Partial<User>) =>
    apiFetch<{ user: User }>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  uploadResume: async (file: File): Promise<{ user: User; message: string }> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('resume', file);

    const response = await fetch(apiUrl('/auth/resume'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed with status ${response.status}`);
    }

    return response.json();
  },

  deleteResume: () =>
    apiFetch<{ user: User; message: string }>('/auth/resume', { method: 'DELETE' }),

  // Listings
  getListings: (params?: { college?: string; type?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ listings: Listing[] }>(`/listings${query ? `?${query}` : ''}`);
  },

  getListingById: (id: string) => apiFetch<{ listing: Listing }>(`/listings/${id}`),

  createListing: (data: Omit<Listing, 'id' | 'ownerId' | 'currentTeamIds'>) =>
    apiFetch<{ listing: Listing }>('/listings', { method: 'POST', body: JSON.stringify(data) }),

  deleteListing: (id: string) => apiFetch<{ message: string }>(`/listings/${id}`, { method: 'DELETE' }),

  // Matching
  getMatches: () => apiFetch<{ matches: Match[] }>('/matches'),

  // Join Requests
  getRequests: () =>
    apiFetch<{ requests: JoinRequest[]; incoming: any[]; outgoing: any[] }>('/requests'),

  createRequest: (listingId: string, message?: string) =>
    apiFetch<{ request: JoinRequest }>('/requests', {
      method: 'POST',
      body: JSON.stringify({ listingId, message }),
    }),

  respondToRequest: (id: string, status: 'approved' | 'denied') =>
    apiFetch<{ request: JoinRequest }>(`/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Notifications
  getNotifications: () => apiFetch<{ notifications: Notification[] }>('/notifications'),

  markNotificationRead: (id: string) =>
    apiFetch<{ notification: Notification }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    apiFetch<{ message: string }>('/notifications/read-all', { method: 'PATCH' }),

  // Student Dashboard
  getDashboardSummary: () =>
    apiFetch<{
      activeListingsCount: number;
      pendingRequestsCount: number;
      spotsFilled: number;
      totalSpotsCapacity: number;
      avgMatchScore: number;
    }>('/dashboard/summary'),

  getDashboardMyListings: () =>
    apiFetch<{ listings: any[] }>('/dashboard/my-listings'),

  getDashboardIncomingRequests: () =>
    apiFetch<{ requests: any[] }>('/dashboard/incoming-requests'),

  getDashboardSkillDemand: () =>
    apiFetch<{
      skillDemand: Array<{ skill: string; count: number; demandLevel: string }>;
      studentSkills: string[];
      coverage: {
        coveredSkills: string[];
        nonCoveredSkills: string[];
        coveragePercentage: number;
      };
    }>('/dashboard/skill-demand'),

  getDashboardRecommended: () =>
    apiFetch<{ recommended: any[] }>('/dashboard/recommended'),

  getDashboardActivity: () =>
    apiFetch<{ timeline: Array<{ id: string; user: string; action: string; target: string; timestamp: string }> }>('/dashboard/activity'),

  // Listing Lifecycle
  editListing: (id: string, data: { title?: string; description?: string; status?: string }) =>
    apiFetch<{ listing: any }>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  closeListing: (id: string) =>
    apiFetch<{ listing: any }>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CLOSED' }),
    }),

  // Admin User Actions
  adminResetUserPassword: (userId: string) =>
    apiFetch<{
      message: string;
      newPassword: string;
      userName: string;
      userEmail: string;
    }>(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
    }),
};

