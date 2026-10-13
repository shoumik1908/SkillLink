import type { User, Listing, JoinRequest, Notification, Match } from '../types';

const API_BASE = '/api';

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

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
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

  getMe: () => apiFetch<{ user: User }>('/auth/me'),

  getUsers: () => apiFetch<{ users: User[] }>('/auth/users'),

  updateProfile: (data: Partial<User>) =>
    apiFetch<{ user: User }>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

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
};
