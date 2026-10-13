import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  Bell,
  PlusCircle,
  Search,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { setAuthToken } from '../../services/api';

export const AppLayout = () => {
  const { currentUser, setCurrentUser, notifications } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Sidebar navigation - Dashboard hidden for now
  const navItems = [
    { name: 'Feed', path: '/', icon: List },
    { name: 'Matches', path: '/matches', icon: LayoutDashboard },
    { name: 'Requests', path: '/requests', icon: Bell, badge: unreadCount },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsProfileOpen(false);
    setCurrentUser(null);
    setAuthToken(null);
    navigate('/login');
  };

  if (!currentUser) return <Outlet />;

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'SK';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop / Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 w-full md:w-64 md:relative md:h-screen bg-white border-t md:border-t-0 md:border-r border-slate-200 z-20 flex flex-col shrink-0">
        <div className="hidden md:flex p-6 items-center border-b border-slate-200">
          <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-xs">
            <span className="text-white font-bold text-lg leading-none">S</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
            SkillLink
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-2 md:py-6 px-4 md:px-4 flex md:flex-col justify-between md:justify-start">
          <ul className="flex md:flex-col w-full md:space-y-2 justify-around md:justify-start">
            {navItems.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <li key={item.name} className="md:w-full flex-1 md:flex-none">
                  <Link
                    to={item.path}
                    className={`flex flex-col md:flex-row items-center justify-center md:justify-start p-2 md:px-4 md:py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-purple-50 text-purple-700 font-semibold'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="relative">
                      <Icon className="w-6 h-6 md:w-5 md:h-5 md:mr-3 mb-1 md:mb-0" />
                      {item.badge && item.badge > 0 ? (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] md:text-sm">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block mt-8 px-2">
            <Link
              to="/listings/create"
              className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl shadow-sm transition-colors font-semibold text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Listing</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pb-16 md:pb-0 min-w-0">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <div className="flex items-center md:hidden">
              <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center mr-2 shadow-xs">
                <span className="text-white font-bold text-lg leading-none">S</span>
              </div>
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                SkillLink
              </span>
            </div>
            <h1 className="hidden md:block text-lg font-bold text-slate-800">
              {navItems.find((n) =>
                n.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(n.path)
              )?.name || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Search Bar */}
            <div className="relative w-40 sm:w-60 md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-full border border-transparent focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all text-slate-700 placeholder-slate-400"
              />
            </div>

            {/* Notification Bell */}
            <Link
              to="/requests"
              className="relative p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
            </Link>

            {/* Profile Avatar with Dropdown Menu for Profile & Signout */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-1.5 p-1 rounded-full hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                title={currentUser.name}
              >
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-100 border border-indigo-200 hover:ring-2 hover:ring-purple-400 flex items-center justify-center text-xs md:text-sm font-bold text-indigo-700 shadow-xs transition-all">
                  {initials}
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform duration-200 ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800 leading-none">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{currentUser.email}</p>
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                      {currentUser.college} • Year {currentUser.yearOfStudy}
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full flex items-center px-4 py-2.5 text-xs md:text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer font-medium"
                    >
                      <User className="w-4 h-4 mr-2.5 text-purple-600" />
                      <span>Profile</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-xs md:text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer font-medium"
                    >
                      <LogOut className="w-4 h-4 mr-2.5 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link to="/listings/create" className="text-purple-600 md:hidden">
              <PlusCircle className="w-6 h-6" />
            </Link>
          </div>
        </header>

        {/* Scrollable Dashboard / Page Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#f8f9fe]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
