import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  User as UserIcon,
  Loader2,
  Gift,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Store,
  Briefcase,
  ShoppingBag,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useBrandSettings } from '../../lib/branding';
import { useToast } from '../../components/ui/Toast';
import { UserRole } from '../../types';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();
  const { logoUrl } = useBrandSettings();
  const { addToast } = useToast();

  // Mode: signin | signup | forgot
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(() => {
    return searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  // Compute redirect destination
  const redirectTarget = searchParams.get('redirect') || (location.state as any)?.from?.pathname || '/';

  // Translate Firebase error codes into friendly plain English
  const getFriendlyErrorMessage = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || '';

    if (
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials' ||
      msg.includes('wrong-password') ||
      msg.includes('invalid-credential')
    ) {
      return 'Incorrect email or password. Please verify your credentials or reset your password.';
    }
    if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
      return 'No account exists with this email address. Please switch to Sign Up to create one.';
    }
    if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
      return 'This email address is already in use. Please sign in with your password.';
    }
    if (code === 'auth/weak-password' || msg.includes('weak-password')) {
      return 'Password is too weak. Please choose a password with at least 6 characters.';
    }
    if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
      return 'Please enter a valid email address (e.g., name@example.com).';
    }
    if (code === 'auth/too-many-requests' || msg.includes('too-many-requests')) {
      return 'Access temporarily locked due to too many failed attempts. Please reset your password or try again in a few minutes.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was closed before completing authentication.';
    }
    if (code === 'auth/popup-blocked') {
      return 'Popup was blocked by your browser. Please allow popups for this site or use email sign in.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'Google domain authorization is updating with Firebase. Please try again or choose another Google account.';
    }
    return msg || 'Authentication failed. Please check your credentials and try again.';
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const userName = name.trim() || email.split('@')[0] || 'User';
        await signUpWithEmail(email, password, userName, selectedRole);
        addToast(`Welcome to NEWARO, ${userName}! Your account is active.`, 'success');
      } else {
        await signInWithEmail(email, password);
        addToast('Signed in successfully!', 'success');
      }
      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
      const friendly = getFriendlyErrorMessage(err);
      setErrorMessage(friendly);
      addToast(friendly, 'error');

      // Smart UX auto-switch
      if (err?.code === 'auth/email-already-in-use' || err?.message?.includes('email-already-in-use')) {
        setMode('signin');
      } else if (err?.code === 'auth/user-not-found') {
        setMode('signup');
        if (!name) setName(email.split('@')[0] || 'Member');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address to receive a password reset link.');
      return;
    }
    setErrorMessage(null);
    setResetLoading(true);

    try {
      await sendPasswordReset(email);
      setResetSentSuccess(true);
      addToast('Password reset link sent! Check your inbox and spam folder.', 'success');
    } catch (err: any) {
      const friendly = getFriendlyErrorMessage(err);
      setErrorMessage(friendly);
      addToast(friendly, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      addToast('Signed in with Google successfully!', 'success');
      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
      const friendly = getFriendlyErrorMessage(err);
      if (err?.code === 'auth/popup-closed-by-user') {
        addToast('Google sign-in popup was closed.', 'info');
      } else {
        setErrorMessage(friendly);
        addToast(friendly, 'error');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-3 sm:p-6 bg-slate-50/50">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-8 shadow-xl max-w-lg w-full space-y-6">
        
        {/* Redirect notice if user was sent from a protected page */}
        {searchParams.get('redirect') && (
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Please sign in to access your requested page. We'll redirect you right back!</span>
          </div>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2">
          {logoUrl ? (
            <img src={logoUrl} alt="NEWARO" className="h-12 w-auto mx-auto object-contain rounded-xl" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-md">
              N
            </div>
          )}

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'signin' && 'Sign In to NEWARO'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot' && 'Reset Your Password'}
          </h1>

          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {mode === 'signin' && 'Welcome back to Nepal’s verified local marketplace & freelancer hub.'}
            {mode === 'signup' && 'Join thousands of local buyers, store merchants, and freelancers across Nepal.'}
            {mode === 'forgot' && 'Enter your registered email and we’ll send you a password recovery link.'}
          </p>

          {mode === 'signup' && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              <span>Includes +100 Free Welcome Gift Coins</span>
            </div>
          )}
        </div>

        {/* Mode Switcher Tabs for Sign In vs Sign Up */}
        {mode !== 'forgot' && (
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Forgot Password View */}
        {mode === 'forgot' ? (
          <div className="space-y-4">
            {resetSentSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Reset Link Dispatched</span>
                </div>
                <p>
                  We have sent a password reset link to <strong className="font-bold">{email}</strong>. Please check your inbox and click the link to choose a new password.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setResetSentSuccess(false);
                      setErrorMessage(null);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-hidden bg-slate-50 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-sm text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Send Password Reset Link</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Sign In & Sign Up Form */
          <div className="space-y-4">
            {/* 1-Click Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-2.5 sm:py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-3 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center">
              <div hidden className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] text-slate-400 font-bold uppercase shrink-0">
                Or with email
              </span>
            </div>

            <form hidden onSubmit={handleAuthSubmit} className="space-y-3.5">
              {/* Full Name (Sign Up only) */}
              {mode === 'signup' && (
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-hidden bg-slate-50 focus:bg-white"
                  />
                </div>
              )}

              {/* Email Address */}
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-hidden bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Password with Show/Hide toggle */}
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Password (at least 6 characters)' : 'Password'}
                  className="w-full text-xs sm:text-sm pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-hidden bg-slate-50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Forgot Password link in signin mode */}
              {mode === 'signin' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Role Selection on Sign Up */}
              {mode === 'signup' && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Choose Your Role & Goal:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        role: 'user' as UserRole,
                        title: 'Member',
                        desc: 'Shop & connect',
                        icon: ShoppingBag,
                        color: 'text-blue-600',
                      },
                      {
                        role: 'shop_owner' as UserRole,
                        title: 'Store Owner',
                        desc: 'Sell COD items',
                        icon: Store,
                        color: 'text-amber-600',
                      },
                      {
                        role: 'freelancer' as UserRole,
                        title: 'Freelancer',
                        desc: 'Take gigs & hire',
                        icon: Briefcase,
                        color: 'text-purple-600',
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedRole === item.role;
                      return (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => setSelectedRole(item.role)}
                          className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex sm:flex-col items-center sm:items-start gap-2.5 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className={`p-1.5 rounded-xl bg-slate-100 ${item.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">{item.title}</p>
                            <p className="text-[10px] text-slate-500">{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Button with Loading Spinner */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-sm text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'signin' ? 'Signing in...' : 'Creating your account...'}</span>
                  </>
                ) : mode === 'signin' ? (
                  'Sign In to NEWARO'
                ) : (
                  `Create Account as ${
                    selectedRole === 'shop_owner'
                      ? 'Store Owner'
                      : selectedRole === 'freelancer'
                      ? 'Freelancer'
                      : 'Member'
                  }`
                )}
              </button>
            </form>

            {/* Bottom Toggle Text */}
            <div hidden className="text-center pt-2 text-xs">
              {mode === 'signin' ? (
                <p className="text-slate-500">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMessage(null);
                    }}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Sign Up Free
                  </button>
                </p>
              ) : (
                <p className="text-slate-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                    }}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
