import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { apiUrl, getAuthHeaders } from '../services/api';

export const ResetPassword = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect already logged-in users away
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Live password strength calculation
  const hasMinLength = newPassword.length >= 8 && newPassword.length <= 72;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const strengthScore = [
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: '', color: 'bg-slate-200', text: '' };
    if (strengthScore <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
    if (strengthScore === 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' };
    if (strengthScore === 3) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const strength = getStrengthLabel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing reset token. Please request a new password reset link.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword.length > 72) {
      setError('Password cannot exceed 72 characters.');
      return;
    }
    if (!hasLetter || !hasNumber) {
      setError('Password must contain both letters and numbers.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/auth/reset-password'), {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to reset password. The link may have expired.');
      } else {
        setIsSuccess(true);
      }
    } catch {
      setError('Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#faf7fc] via-[#f5edf9] to-[#fbf1f5] text-slate-800 flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative overflow-hidden font-sans">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-between">
        {/* Top Header / Brand Logo */}
        <div className="flex items-center space-x-2.5 z-10 mb-8 lg:mb-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#661858] via-[#85236b] to-[#9c2f6d] flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-purple-900/10">
            <span>S</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">SkillLink</span>
        </div>

        {/* Center Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center my-auto py-6 z-10">
          {/* Left Column */}
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

          {/* Right Column */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px]">
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Set new password
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Choose a secure password for your SkillLink account.
                </p>
              </div>

              {!token ? (
                <div className="bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md space-y-4 text-center">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Missing Reset Token</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No reset token was found in the URL. Please use the reset link sent to your student email.
                  </p>
                  <Link
                    to="/forgot-password"
                    className="w-full h-11 bg-gradient-to-r from-[#86299b] via-[#ad2e77] to-[#ce3b58] text-white font-medium text-xs rounded-xl flex items-center justify-center space-x-1 hover:opacity-95 transition-opacity mt-4"
                  >
                    <span>Request New Reset Link</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : isSuccess ? (
                <div className="bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md space-y-4 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Password Reset Complete</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    All prior active sessions have been safely logged out. You can now sign in with your new password.
                  </p>
                  <Link
                    to="/login"
                    className="w-full h-11 bg-gradient-to-r from-[#86299b] via-[#ad2e77] to-[#ce3b58] text-white font-medium text-xs rounded-xl flex items-center justify-center space-x-1 hover:opacity-95 transition-opacity mt-4"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {error && (
                    <div className="p-3 bg-red-50/90 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 8 chars, letters & numbers"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                        autoComplete="new-password"
                        required
                        className="w-full bg-[#edf2fc]/90 hover:bg-[#e8effc] focus:bg-white text-slate-800 placeholder:text-slate-400 text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200/60 transition-all pr-11"
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

                    {/* Password Strength Meter */}
                    {newPassword.length > 0 && (
                      <div className="space-y-1 pt-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Strength:</span>
                          <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 h-1 w-full bg-slate-200/70 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${strengthScore >= 1 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full rounded-full transition-all duration-300 ${strengthScore >= 2 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full rounded-full transition-all duration-300 ${strengthScore >= 3 ? strength.color : 'bg-transparent'}`} />
                          <div className={`h-full rounded-full transition-all duration-300 ${strengthScore >= 4 ? strength.color : 'bg-transparent'}`} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        autoComplete="new-password"
                        required
                        className="w-full bg-[#edf2fc]/90 hover:bg-[#e8effc] focus:bg-white text-slate-800 placeholder:text-slate-400 text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200/60 transition-all pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && (
                      <div className="flex items-center text-[11px] pt-1">
                        {isMatch ? (
                          <span className="text-emerald-600 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Passwords match
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" /> Passwords do not match
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 h-12 bg-gradient-to-r from-[#86299b] via-[#ad2e77] to-[#ce3b58] hover:from-[#7b238f] hover:via-[#9f276b] hover:to-[#bf344f] active:scale-[0.99] text-white font-medium text-sm rounded-xl shadow-md shadow-purple-900/10 flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center text-xs text-slate-500 pt-2">
                    <Link
                      to="/login"
                      className="font-semibold text-[#9d3587] hover:text-[#83266f] hover:underline"
                    >
                      Back to Sign in
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-200/60 pt-4 z-10 gap-2">
          <span>© 2026 SkillLink MUJ</span>
          <Link to="/login" className="hover:text-slate-600 transition-colors">
            Return to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
