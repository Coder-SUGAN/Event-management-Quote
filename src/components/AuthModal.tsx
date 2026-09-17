import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/authContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { signIn, signUp, resetPassword, isConfigured } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!isConfigured) {
      setError(
        'Supabase is not yet configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Project Settings > Environment Variables.'
      );
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (mode !== 'reset' && !password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);

      if (mode === 'login') {
        const { error: signInErr } = await signIn(email.trim(), password);
        if (signInErr) {
          setError(signInErr.message);
        } else {
          onClose();
        }
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        const { error: signUpErr, user } = await signUp(email.trim(), password, fullName.trim());
        if (signUpErr) {
          setError(signUpErr.message);
        } else {
          if (user && !user.confirmed_at) {
            setSuccessMessage(
              'Account created successfully! Please check your email inbox to verify your account.'
            );
          } else {
            setSuccessMessage('Account created successfully! You are now logged in.');
            setTimeout(() => onClose(), 1500);
          }
        }
      } else if (mode === 'reset') {
        const { error: resetErr } = await resetPassword(email.trim());
        if (resetErr) {
          setError(resetErr.message);
        } else {
          setSuccessMessage('Password reset link sent! Check your inbox.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1 text-rose-200 hover:text-white rounded-lg hover:bg-rose-500/30 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-rose-200">
              Kids Jump 4 Joy ERP
            </span>
          </div>
          <h2 className="text-xl font-black text-white">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'signup' && 'Create Staff Account'}
            {mode === 'reset' && 'Reset your password'}
          </h2>
          <p className="text-xs text-rose-100 mt-1">
            {mode === 'login' && 'Manage event quotations, bookings, and inventory.'}
            {mode === 'signup' && 'Authorized personnel access with Supabase Auth.'}
            {mode === 'reset' && 'We will send a secure reset link to your email.'}
          </p>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Supabase Connection Required</span>
                <span>
                  Configure <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> and{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> in Vercel to activate live Supabase Auth.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Suga Suganthan"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@kidsjump4joy.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Toggle between modes */}
          <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
            {mode === 'login' && (
              <span>
                Need a staff account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-rose-600 hover:underline"
                >
                  Sign Up
                </button>
              </span>
            )}
            {mode === 'signup' && (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-rose-600 hover:underline"
                >
                  Sign In
                </button>
              </span>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="font-bold text-rose-600 hover:underline"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
