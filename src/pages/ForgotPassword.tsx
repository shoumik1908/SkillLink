import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { apiUrl, getAuthHeaders } from '../services/api';

export const ForgotPassword = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect already logged-in users away
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please provide your campus email.');
      return;
    }

    // Check campus domain restriction
    const mujDomainRegex = /^[a-z0-9._%+-]+@muj\.manipal\.edu$/i;
    if (!mujDomainRegex.test(trimmedEmail)) {
      setError('Password recovery is only valid for official student emails ending in @muj.manipal.edu');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/auth/forgot-password'), {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();
      setIsSubmitted(true);
      setSuccessMessage(
        data.message || 'If an active account exists with that email, a password reset link has been sent.'
      );
    } catch {
      setError('Failed to submit password reset request. Please try again.');
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
                  Account recovery
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Enter your student email to receive a password reset link.
                </p>
              </div>

              {isSubmitted ? (
                <div className="bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md space-y-4 text-center">
                  <div className="w-12 h-12 bg-purple-100 text-[#9d3587] rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Reset Link Dispatched</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{successMessage}</p>
                  <p className="text-[11px] text-slate-400">
                    Reset links expire in 30 minutes. Check your student inbox and spam folders.
                  </p>
                  <Link
                    to="/login"
                    className="w-full h-11 bg-gradient-to-r from-[#86299b] via-[#ad2e77] to-[#ce3b58] text-white font-medium text-xs rounded-xl flex items-center justify-center space-x-1 hover:opacity-95 transition-opacity mt-4"
                  >
                    <span>Back to Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50/90 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Campus Email
                    </label>
                    <input
                      type="email"
                      placeholder="yourname@muj.manipal.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      autoComplete="email"
                      required
                      className="w-full bg-[#edf2fc]/90 hover:bg-[#e8effc] focus:bg-white text-slate-800 placeholder:text-slate-400 text-sm px-4 py-3 rounded-xl border border-transparent focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200/60 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 h-12 bg-gradient-to-r from-[#86299b] via-[#ad2e77] to-[#ce3b58] hover:from-[#7b238f] hover:via-[#9f276b] hover:to-[#bf344f] active:scale-[0.99] text-white font-medium text-sm rounded-xl shadow-md shadow-purple-900/10 flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        <span>Sending reset link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center text-xs text-slate-500 pt-2">
                    Remember your password?{' '}
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
