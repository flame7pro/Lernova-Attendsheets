'use client';

import React, { useState } from 'react';
import { Users, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context-email';
import { useRouter } from 'next/navigation';

interface AuthVerificationProps {
  email: string;
  onBack: () => void;
}

export const AuthVerification: React.FC<AuthVerificationProps> = ({
  email,
  onBack,
}) => {
  const router = useRouter();
  const { verifyEmail, resendVerificationCode } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmail(email, verificationCode);

      if (result.success) {
        setSuccess('Email verified successfully!');
        setIsRedirecting(true);

        const signupRole = localStorage.getItem('signup_role');
        const userStr = localStorage.getItem('user');
        let userRole = 'teacher';

        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userRole = user.role || signupRole || 'teacher';
          } catch (e) {
            userRole = signupRole || 'teacher';
          }
        } else {
          userRole = signupRole || 'teacher';
        }

        localStorage.removeItem('signup_role');
        const redirectPath = userRole === 'student' ? '/student/dashboard' : '/dashboard';

        setTimeout(() => router.push(redirectPath), 2000);
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setResending(true);

    try {
      const result = await resendVerificationCode(email);
      if (result.success) {
        setSuccess('New verification code sent to your email!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to resend code');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      {/* Success Redirect Overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 z-50 flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-4 animate-scale-in">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Welcome to Lernova!</h2>
            <p className="text-emerald-50">Your account is ready. Taking you to your dashboard...</p>
            <Loader2 className="w-6 h-6 text-white animate-spin mx-auto" />
          </div>
        </div>
      )}

      <div className={`min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-6 transition-opacity duration-500 ${isRedirecting ? 'opacity-0' : 'opacity-100'}`}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-slide-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Verify Your Email</h1>
            <p className="text-slate-600 text-sm">
              We've sent a verification code to <span className="font-semibold text-emerald-600">{email}</span>
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-shake">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2 animate-slide-down">
              <CheckCircle className="w-5 h-5" />
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleVerifyEmail} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                placeholder="ENTER 6-DIGIT CODE"
                maxLength={6}
                disabled={loading}
                className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-center text-2xl font-bold tracking-widest text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all disabled:opacity-50 cursor-text"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-2 text-center">Check your email for the code</p>
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transform hover:scale-105"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Verify Email
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={onBack}
                disabled={loading}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending || loading}
                className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
