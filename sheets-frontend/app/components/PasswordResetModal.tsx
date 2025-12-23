'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, Key } from 'lucide-react';
import { useAuth } from '@/lib/auth-context-email';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ isOpen, onClose }) => {
  const { requestPasswordReset, resetPassword } = useAuth();
  
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);

    if (result.success) {
      setSuccess('Reset code sent to your email');
      setTimeout(() => {
        setStep('code');
        setSuccess('');
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email, code, newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess('Password reset successfully!');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                <p className="text-emerald-50 text-sm mt-1">
                  {step === 'email' ? 'Enter your email' : 'Enter verification code'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    disabled={loading}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors disabled:opacity-50"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  We'll send a verification code to this email
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER 6-DIGIT CODE"
                  maxLength={6}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base text-center tracking-widest text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  Check your email for the code
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Must be at least 8 characters
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                ← Back to email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};