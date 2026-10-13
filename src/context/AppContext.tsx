import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Listing, JoinRequest, Notification, Match } from '../types';
import { api, setAuthToken } from '../services/api';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  listings: Listing[];
  addListing: (listing: Omit<Listing, 'id' | 'ownerId' | 'currentTeamIds'>) => Promise<void>;
  requests: JoinRequest[];
  sendRequest: (listingId: string) => Promise<void>;
  respondToRequest: (requestId: string, status: 'approved' | 'denied') => Promise<void>;
  notifications: Notification[];
  markNotificationRead: (id: string) => Promise<void>;
  matches: Match[];
  refreshData: () => Promise<void>;
}

const fallbackUsers: User[] = [
  { id: 'u1', name: 'Shoumik Kumar', email: 'shoumik1908@gmail.com', college: 'State University', yearOfStudy: 3, skills: ['React', 'UI/UX', 'Tailwind'] },
  { id: 'u2', name: 'Bob Jones', email: 'bob@uni.edu', college: 'State University', yearOfStudy: 2, skills: ['Python', 'Machine Learning'] },
  { id: 'u3', name: 'Charlie Brown', email: 'charlie@uni.edu', college: 'State University', yearOfStudy: 4, skills: ['Node.js', 'PostgreSQL', 'React'] },
];

const fallbackListings: Listing[] = [
  {
    id: 'l1',
    ownerId: 'u2',
    title: 'AI Image Generator Hackathon',
    description: 'Looking for a frontend dev to build the UI for our AI image generation tool for the upcoming Spring Hackathon.',
    type: 'Hackathon Team',
    requiredSkills: ['React', 'Tailwind', 'UI/UX'],
    intendedTeamSize: 4,
    currentTeamIds: ['u2'],
    college: 'State University',
  },
  {
    id: 'l2',
    ownerId: 'u3',
    title: 'Campus Marketplace App',
    description: 'Building a marketplace for students to buy/sell textbooks. Need help with the frontend.',
    type: 'Project',
    requiredSkills: ['React', 'Node.js'],
    intendedTeamSize: 3,
    currentTeamIds: ['u3'],
    college: 'State University',
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(fallbackUsers);
  const [listings, setListings] = useState<Listing[]>(fallbackListings);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  // Fetch initial public data (users & listings)
  const loadPublicData = useCallback(async () => {
    try {
      const [usersRes, listingsRes] = await Promise.all([
        api.getUsers().catch(() => null),
        api.getListings().catch(() => null),
      ]);

      if (usersRes && usersRes.users?.length > 0) {
        setUsers(usersRes.users);
        if (!currentUser) {
          // Default to first user if none selected
          setCurrentUser(usersRes.users[0]);
        }
      }

      if (listingsRes && listingsRes.listings) {
        setListings(listingsRes.listings);
      }
    } catch (err) {
      console.warn('Backend not yet reachable, using cached/fallback data', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  // When currentUser changes, authenticate with backend & fetch personalized data
  const loadUserData = useCallback(async () => {
    if (!currentUser) {
      setRequests([]);
      setNotifications([]);
      setMatches([]);
      setAuthToken(null);
      return;
    }

    try {
      // Auto-authenticate with seeded password
      const authRes = await api.login({
        email: currentUser.email,
        password: 'password123',
      }).catch(() => null);

      if (authRes?.token) {
        setAuthToken(authRes.token);
      }

      // Fetch user-specific requests, notifications, and matches
      const [reqRes, notifRes, matchRes] = await Promise.all([
        api.getRequests().catch(() => null),
        api.getNotifications().catch(() => null),
        api.getMatches().catch(() => null),
      ]);

      if (reqRes?.requests) {
        setRequests(reqRes.requests);
      }

      if (notifRes?.notifications) {
        setNotifications(notifRes.notifications);
      }

      if (matchRes?.matches) {
        setMatches(matchRes.matches);
      } else {
        // Fallback local match computation
        computeLocalMatches(currentUser, listings);
      }
    } catch (err) {
      console.warn('Failed to load user-specific data from backend:', err);
      computeLocalMatches(currentUser, listings);
    }
  }, [currentUser, listings]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const computeLocalMatches = (user: User, currentListings: Listing[]) => {
    const newMatches: Match[] = currentListings
      .filter(l => l.ownerId !== user.id && l.college === user.college)
      .map(listing => {
        const overlappingSkills = listing.requiredSkills.filter(skill => user.skills.includes(skill));
        const score = listing.requiredSkills.length > 0 ? overlappingSkills.length / listing.requiredSkills.length : 0;
        return { listingId: listing.id, score, overlappingSkills };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score);

    setMatches(newMatches);
  };

  const addListing = async (listingData: Omit<Listing, 'id' | 'ownerId' | 'currentTeamIds'>) => {
    if (!currentUser) return;
    try {
      const res = await api.createListing(listingData);
      if (res?.listing) {
        setListings(prev => [res.listing, ...prev]);
        return;
      }
    } catch (err) {
      console.error('API createListing error, falling back locally:', err);
    }

    // Local fallback
    const newListing: Listing = {
      ...listingData,
      id: `l${Date.now()}`,
      ownerId: currentUser.id,
      currentTeamIds: [currentUser.id],
    };
    setListings(prev => [newListing, ...prev]);
  };

  const sendRequest = async (listingId: string) => {
    if (!currentUser) return;
    if (requests.some(r => r.listingId === listingId && r.studentId === currentUser.id)) return;

    try {
      const res = await api.createRequest(listingId);
      if (res?.request) {
        setRequests(prev => [res.request, ...prev]);
        return;
      }
    } catch (err) {
      console.error('API createRequest error, falling back locally:', err);
    }

    // Local fallback
    const newRequest: JoinRequest = {
      id: `r${Date.now()}`,
      listingId,
      studentId: currentUser.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => [...prev, newRequest]);
  };

  const respondToRequest = async (requestId: string, status: 'approved' | 'denied') => {
    try {
      await api.respondToRequest(requestId, status);
      // Refresh listings and requests from server
      const [listingsRes, requestsRes] = await Promise.all([
        api.getListings().catch(() => null),
        api.getRequests().catch(() => null),
      ]);
      if (listingsRes?.listings) setListings(listingsRes.listings);
      if (requestsRes?.requests) setRequests(requestsRes.requests);
      return;
    } catch (err) {
      console.error('API respondToRequest error, falling back locally:', err);
    }

    // Local fallback
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
    const request = requests.find(r => r.id === requestId);
    if (request && status === 'approved') {
      setListings(prev => prev.map(l => {
        if (l.id === request.listingId) {
          return { ...l, currentTeamIds: [...l.currentTeamIds, request.studentId] };
        }
        return l;
      }));
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id).catch(() => null);
    } catch {
      // Ignored
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const refreshData = async () => {
    await Promise.all([loadPublicData(), loadUserData()]);
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, users, listings, addListing,
      requests, sendRequest, respondToRequest,
      notifications, markNotificationRead, matches, refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
