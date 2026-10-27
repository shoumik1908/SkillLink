import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  HelpCircle,
} from 'lucide-react';
import { apiUrl, getAuthHeaders } from '../services/api';

export const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect already logged-in users
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const searchParams = new URLSearchParams(location.search);
  const isVerifiedParam = searchParams.get('verified') === '1';
  const errorParam = searchParams.get('error');
  const emailParam = searchParams.get('email') || '';
  const stateEmail = (location.state as any)?.email || '';
  const stateMessage = (location.state as any)?.message || '';

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState(emailParam || stateEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Unverified account handling
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendStatus(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please provide both your campus email and password.');
      return;
    }

    setIsLoading(true);
    const result = await login({ email: trimmedEmail, password });
    setIsLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message || 'Invalid credentials');
      if (result.needsVerification) {
        setNeedsVerification(true);
        setUnverifiedEmail(result.email || trimmedEmail);
      }
    }
  };

  const handleResend = async (targetEmail?: string) => {
    const toSend = targetEmail || unverifiedEmail || email.trim();
    if (!toSend || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendStatus(null);

    try {
      const res = await fetch(apiUrl('/auth/resend-verification'), {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: toSend }),
      });
      const data = await res.json();
      setResendStatus(data.message || 'Verification link resent. Please check your inbox.');
      setResendCooldown(60);
    } catch {
      setResendStatus('Failed to send verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handlePrefill = (prefillEmail: string, prefillPass: string) => {
    setEmail(prefillEmail);
    setPassword(prefillPass);
    setError(null);
    setNeedsVerification(false);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#faf7fc] via-[#f5edf9] to-[#fbf1f5] text-slate-800 flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative overflow-hidden font-sans">
      {/* Subtle ambient lighting decorations */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-between">
        {/* Top Header / Brand Logo */}
        <div className="flex items-center space-x-2.5 z-10 mb-8 lg:mb-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#661858] via-[#85236b] to-[#9c2f6d] flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-purple-900/10">
            <span>S</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">SkillLink</span>
        </div>

        {/* Center Grid: Left Hero Pitch & Right Login Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center my-auto py-6 z-10">
          {/* Left Column: Headline and pitch */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center space-y-4 max-w-lg">
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Teamwork,{' '}
              <span className="bg-gradient-to-r from-[#9d3587] via-[#be3977] to-[#e45a55] bg-clip-text text-transparent">
                tracked.
              </span>
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed max-w-md pt-1">
              A clear, collaborative workspace for your campus team's projects, progress, and growth.
            </p>
          </div>

          {/* Right Column: Sleek Login Form */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px]">
              {/* Form Title & Subtitle */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Sign in to continue to your workspace.
                </p>
              </div>

              {/* Tabs: Sign in (active) vs Sign up */}
              <div className="flex items-center space-x-6 border-b border-slate-200/80 mb-6">
                <button
                  type="button"
                  className="pb-2.5 font-semibold text-sm text-slate-900 border-b-2 border-[#9d3587] transition-colors cursor-pointer"
                >
                  Sign in
                </button>
                <Link
                  to="/register"
                  className="pb-2.5 font-medium text-sm text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Sign up
                </Link>
              </div>

              {/* Account Created Success Banner */}
              {stateMessage && (
                <div className="mb-4 p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-start space-x-2 text-xs text-emerald-800 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Account created successfully!</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">{stateMessage}</p>
                  </div>
                </div>
              )}

              {/* Verified Success Banner */}
              {isVerifiedParam && (
                <div className="mb-4 p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-start space-x-2 text-xs text-emerald-800 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Email verified successfully!</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Your MUJ student account is now active. Please sign in below.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Banner from verification redirect */}
              {errorParam && (
                <div className="mb-4 p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col space-y-2 text-xs text-amber-800 animate-in fade-in duration-150">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Verification link invalid or expired</span>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Verification links expire in 24 hours. You can request a fresh one below.
                      </p>
                    </div>
                  </div>
                  {emailParam && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResend(emailParam)}
                      disabled={resendCooldown > 0 || isResending}
                      className="border-amber-300 text-amber-800 hover:bg-amber-100/60 rounded-lg text-[11px] py-1 h-auto cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1.5 ${isResending ? 'animate-spin' : ''}`} />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
                    </Button>
                  )}
                </div>
              )}

              {/* General Login Error Alert */}
              {error && (
                <div className="mb-4 p-3 bg-red-50/90 border border-red-200 rounded-xl flex flex-col space-y-2 text-xs text-red-700 animate-in fade-in duration-150">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>

                  {needsVerification && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleResend(unverifiedEmail)}
                        disabled={resendCooldown > 0 || isResending}
                        className="w-full border-red-200 text-red-800 hover:bg-red-100/60 rounded-lg text-xs py-1.5 h-auto cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isResending ? 'animate-spin' : ''}`} />
                        {resendCooldown > 0
                          ? `Resend available in ${resendCooldown}s`
                          : 'Resend Verification Email'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Resend Status Notification */}
              {resendStatus && (
                <div className="mb-4 p-3 bg-purple-50/90 border border-purple-200 rounded-xl flex items-start space-x-2 text-xs text-purple-800 animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>{resendStatus}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    placeholder="shoumik1908@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoComplete="email"
                    required
                    className="w-full bg-[#edf2fc]/90 hover:bg-[#e8effc] focus:bg-white text-slate-800 placeholder:text-slate-400 text-sm px-4 py-3 rounded-xl border border-transparent focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200/60 transition-all"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete="current-password"
                      required
                      className="w-full bg-[#edf2fc]/90 hover:bg-[#e8effc] focus:bg-white text-slate-800 placeholder:text-slate-400 text-sm px-4 py-3 rounded-xl border border-transparent focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200/60 transition-all pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end pt-0.5">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#9d3587] hover:text-[#83266f] hover:underline transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Submit Button (Gradient from purple to coral/rose) */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 h-12 bg-gradient-to-r from-[#86299b] via-[#ad2e77] to-[#ce3b58] hover:from-[#7b238f] hover:via-[#9f276b] hover:to-[#bf344f] active:scale-[0.99] text-white font-medium text-sm rounded-xl shadow-md shadow-purple-900/10 flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Or Divider */}
                <div className="pt-2 text-center">
                  <span className="text-xs text-slate-400">or</span>
                </div>

                {/* Sign up prompt */}
                <div className="text-center text-xs text-slate-500 pt-0.5">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="font-semibold text-[#9d3587] hover:text-[#83266f] hover:underline"
                  >
                    Sign up
                  </Link>
                </div>

                {/* Quick Demo Logins Helper */}
                <div className="pt-4 border-t border-slate-200/60 mt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                    <span>Quick Demo Logins:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrefill('admin@uni.edu', 'AdminPassword123!')}
                      className="text-[11px] bg-white/80 hover:bg-white border border-purple-200/70 text-purple-800 hover:border-purple-300 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-2xs cursor-pointer"
                    >
                      Admin Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrefill('student@uni.edu', 'Student123!')}
                      className="text-[11px] bg-white/80 hover:bg-white border border-purple-200/70 text-purple-800 hover:border-purple-300 px-2.5 py-1 rounded-lg transition-colors font-medium shadow-2xs cursor-pointer"
                    >
                      Student Demo
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-200/60 pt-4 z-10 gap-2">
          <span>© 2026 SkillLink MUJ</span>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="hover:text-slate-600 transition-colors cursor-pointer"
          >
            Need help?
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center space-x-2 text-purple-700 mb-2">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-semibold text-slate-900 text-sm">Need help signing in?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Registration requires an official Manipal University Jaipur email ending in{' '}
              <span className="font-semibold text-slate-700">@muj.manipal.edu</span>.
              <br /><br />
              If your account is not verified, request a new link via the "Resend Verification" prompt or contact support at support@skilllink.edu.
            </p>
            <Button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-[#9d3587] hover:bg-[#83266f] text-white rounded-xl py-2 text-xs font-semibold cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
