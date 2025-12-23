'use client';

import React, { useState } from 'react';
import { X, Lock, Key, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-context-email';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { requestChangePassword, changePassword } = useAuth();
  
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const handleRequestCode = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await requestChangePassword();
    setLoading(false);

    if (result.success) {
      setSuccess('Verification code sent to your email!');
      setTimeout(() => {
        setStep('verify');
        setSuccess('');
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
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
    const result = await changePassword(code, newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess('Password changed successfully!');
      setTimeout(() => {
        handleClose();
      }, 1500);
    } else {
      setError(result.message);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setStep('request');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Change Password</h2>
                <p className="text-emerald-50 text-sm mt-1">
                  {step === 'request' ? 'Request verification code' : 'Enter new password'}
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

        {/* Content */}
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

          {step === 'request' ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">Verification Required</p>
                    <p className="text-sm text-blue-700">
                      For security, we'll send a verification code to your email before you can change your password.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRequestCode}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                <Key className="w-5 h-5" />
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-5">
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base text-center tracking-widest text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors cursor-text"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  Check your email for the verification code
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
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors cursor-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors cursor-text"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Must be at least 8 characters long
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>

              <button
                type="button"
                onClick={() => setStep('request')}
                className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
              >
                ← Resend verification code
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};