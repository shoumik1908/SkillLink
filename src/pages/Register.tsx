import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Info,
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export const Register = () => {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  // Redirect already logged-in users away
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Auto redirect to login after account creation
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        navigate('/login', {
          state: {
            email: submittedEmail,
            message: 'Account created successfully! Please sign in below.',
          },
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, submittedEmail, navigate]);

  // Live password strength calculation
  const hasMinLength = password.length >= 8 && password.length <= 72;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;

  const strengthScore = [
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (password.length === 0) return { label: '', color: 'bg-slate-200', text: '' };
    if (strengthScore <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
    if (strengthScore === 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' };
    if (strengthScore === 3) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const strength = getStrengthLabel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Honeypot check
    if (honeypot) {
      setError('Invalid submission detected.');
      return;
    }

    // Name validation
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setError('Full name must be between 2 and 60 characters.');
      return;
    }

    // Strict MUJ email domain validation: /^[a-z0-9._%+-]+@muj\.manipal\.edu$/i
    const trimmedEmail = email.trim().toLowerCase();
    const mujDomainRegex = /^[a-z0-9._%+-]+@muj\.manipal\.edu$/i;
    if (!mujDomainRegex.test(trimmedEmail)) {
      setError('Registration is restricted to official student emails ending in @muj.manipal.edu');
      return;
    }

    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password.length > 72) {
      setError('Password cannot exceed 72 characters.');
      return;
    }
    if (!hasLetter || !hasNumber) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (password.toLowerCase() === trimmedName.toLowerCase()) {
      setError('Password cannot be your name.');
      return;
    }
    if (password.toLowerCase() === trimmedEmail.toLowerCase()) {
      setError('Password cannot be your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const result = await register({
      name: trimmedName,
      email: trimmedEmail,
      password,
      confirmPassword,
      hp: honeypot,
    });
    setIsLoading(false);

    if (result.success) {
      setSubmittedEmail(trimmedEmail);
      setIsSubmitted(true);
    } else {
      setError(result.message || 'Registration failed');
    }
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

        {/* Center Grid: Left Pitch & Right Form */}
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

          {/* Right Column: Form or Confirmation */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px]">
              {isSubmitted ? (
                /* Screen 2: Account Created Successfully */
                <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md text-center animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Account created successfully
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6 leading-relaxed">
                    Your SkillLink student account has been created. You can now sign in to your workspace.
                  </p>

                  <Link
                    to="/login"
                    state={{ email: submittedEmail, message: 'Account created successfully! Please sign in below.' }}
                    className="w-full h-12 bg-gradient-to-r from-[#86299b] via-[#ad2e77] to-[#ce3b58] hover:from-[#7b238f] hover:via-[#9f276b] hover:to-[#bf344f] text-white font-medium text-sm rounded-xl shadow-md shadow-purple-900/10 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                /* Screen 1: Registration Form */
                <div>
                  {/* Form Title & Subtitle */}
                  <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                      Create account
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Join the MUJ skill network and connect with peers.
                    </p>
                  </div>

                  {/* Tabs: Sign in vs Sign up (active) */}
                  <div className="flex items-center space-x-6 border-b border-slate-200/80 mb-6">
                    <Link
                      to="/login"
                      className="pb-2.5 font-medium text-sm text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      Sign in
                    </Link>
                    <button
                      type="button"
                      className="pb-2.5 font-semibold text-sm text-slate-900 border-b-2 border-[#9d3587] transition-colors cursor-pointer"
                    >
                      Sign up
                    </button>
                  </div>

                  {/* Domain Notice Banner */}
                  <div className="mb-4 p-2.5 bg-purple-50/90 border border-purple-100 rounded-xl flex items-start space-x-2 text-[11px] text-purple-900">
                    <Info className="w-4 h-4 text-[#9d3587] shrink-0 mt-0.5" />
                    <span>
                      Exclusive to students with an official{' '}
                      <span className="font-semibold text-purple-950">@muj.manipal.edu</span> email.
                    </span>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50/90 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Hidden Honeypot */}
                    <div style={{ display: 'none' }} aria-hidden="true">
                      <input
                        type="text"
                        name="_hp"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shoumik Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                        autoComplete="name"
                        required
                        className="w-full bg-[#edf2fc]/90 hover:bg-[#e8effc] focus:bg-white text-slate-800 placeholder:text-slate-400 text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200/60 transition-all"
                      />
                    </div>

                    {/* Campus Email */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
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
                        className="w-full bg-[#edf2fc]/90 hover:bg-[#e8effc] focus:bg-white text-slate-800 placeholder:text-slate-400 text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200/60 transition-all"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 8 chars, letters & numbers"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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
                      {password.length > 0 && (
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
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
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

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 h-12 bg-gradient-to-r from-[#86299b] via-[#ad2e77] to-[#ce3b58] hover:from-[#7b238f] hover:via-[#9f276b] hover:to-[#bf344f] active:scale-[0.99] text-white font-medium text-sm rounded-xl shadow-md shadow-purple-900/10 flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                          <span>Creating account...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign up</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Sign in prompt */}
                    <div className="text-center text-xs text-slate-500 pt-2">
                      Already have an account?{' '}
                      <Link
                        to="/login"
                        className="font-semibold text-[#9d3587] hover:text-[#83266f] hover:underline"
                      >
                        Sign in
                      </Link>
                    </div>
                  </form>
                </div>
              )}
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
              <h3 className="font-semibold text-slate-900 text-sm">Registration Assistance</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              All students at Manipal University Jaipur are eligible to create an account using their{' '}
              <span className="font-semibold text-slate-700">@muj.manipal.edu</span> email address.
              <br /><br />
              Questions or issues? Reach out to support@skilllink.edu.
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
