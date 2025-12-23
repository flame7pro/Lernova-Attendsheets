'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn, GraduationCap, Users, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context-email';
import { useRouter } from 'next/navigation';
import { PasswordResetModal } from './PasswordResetModal';

interface AuthFormProps {
  onModeChange?: (isSignUp: boolean) => void;
  setShowVerification: (show: boolean) => void;
  setVerificationEmail: (email: string) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  onModeChange,
  setShowVerification,
  setVerificationEmail
}) => {
  const router = useRouter();
  const { signup, login } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student'>('teacher');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('signup_role', selectedRole);
      const result = await signup(formData.email, formData.password, formData.name, selectedRole);

      if (result.success) {
        setSuccess(result.message);
        
        // Smooth transition to verification
        setTimeout(() => {
          setVerificationEmail(formData.email);
          setShowVerification(true);
          setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        }, 800);
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        setSuccess('Login successful!');
        setIsRedirecting(true);
        
        const userRole = result.role || result.user?.role || 'teacher';
        const redirectPath = userRole === 'student' ? '/student/dashboard' : '/dashboard';
        
        // Smooth fade out before redirect
        setTimeout(() => {
          router.push(redirectPath);
        }, 1200);
      } else {
        setError(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (signUpMode: boolean) => {
    setIsSignUp(signUpMode);
    setError('');
    setSuccess('');
    onModeChange?.(signUpMode);
  };

  return (
    <>
      {/* Redirect Overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 z-50 flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-4 animate-scale-in">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Welcome Back!</h2>
            <p className="text-emerald-50">Taking you to your dashboard...</p>
            <Loader2 className="w-6 h-6 text-white animate-spin mx-auto" />
          </div>
        </div>
      )}

      <div className={`space-y-6 transition-opacity duration-500 ${isRedirecting ? 'opacity-0' : 'opacity-100'}`}>
        {/* Tab Switcher with Animation */}
        <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
          <button
            onClick={() => handleModeChange(true)}
            className={`flex-1 py-3 px-4 cursor-pointer rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              isSignUp
                ? 'bg-emerald-600 text-white shadow-lg scale-105'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Sign Up
          </button>
          <button
            onClick={() => handleModeChange(false)}
            className={`flex-1 py-3 px-4 cursor-pointer rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              !isSignUp
                ? 'bg-emerald-600 text-white shadow-lg scale-105'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        </div>

        {/* Role Selection with Staggered Animation */}
        {isSignUp && (
          <div className="space-y-3 animate-slide-down">
            <label className="text-sm font-semibold text-slate-700">I am signing up as:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedRole('teacher')}
                className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                  selectedRole === 'teacher'
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                    : 'border-slate-200 hover:border-emerald-300 hover:shadow'
                }`}
              >
                <GraduationCap className={`w-6 h-6 mx-auto mb-2 transition-colors ${
                  selectedRole === 'teacher' ? 'text-emerald-600' : 'text-slate-400'
                }`} />
                <p className={`font-semibold text-sm transition-colors ${
                  selectedRole === 'teacher' ? 'text-emerald-700' : 'text-slate-600'
                }`}>Teacher</p>
                <p className="text-xs text-slate-500 mt-1">Manage classes & attendance</p>
              </button>

              <button
                onClick={() => setSelectedRole('student')}
                className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                  selectedRole === 'student'
                    ? 'border-teal-500 bg-teal-50 shadow-lg'
                    : 'border-slate-200 hover:border-teal-300 hover:shadow'
                }`}
              >
                <Users className={`w-6 h-6 mx-auto mb-2 transition-colors ${
                  selectedRole === 'student' ? 'text-teal-600' : 'text-slate-400'
                }`} />
                <p className={`font-semibold text-sm transition-colors ${
                  selectedRole === 'student' ? 'text-teal-700' : 'text-slate-600'
                }`}>Student</p>
                <p className="text-xs text-slate-500 mt-1">View your attendance</p>
              </button>
            </div>
          </div>
        )}

        {/* Messages with Slide Animation */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-slide-down">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2 animate-slide-down">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignup : handleLogin} className="space-y-4">
          {isSignUp && (
            <FormField
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              disabled={loading}
            />
          )}

          <FormField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
            icon={Mail}
            disabled={loading}
          />

          <PasswordField
            label="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            showPassword={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            disabled={loading}
            hint={isSignUp ? 'Must be at least 8 characters' : undefined}
          />

          {isSignUp && (
            <PasswordField
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              showPassword={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              disabled={loading}
            />
          )}

          {!isSignUp && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transform hover:scale-105"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                {isSignUp ? 'Create Account' : 'Sign In'}
              </>
            )}
          </button>

          {isSignUp && (
            <p className="text-xs text-center text-slate-600">
              By signing up, you agree to our{' '}
              <a href="#" className="text-emerald-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>
            </p>
          )}
        </form>
      </div>

      <PasswordResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </>
  );
};

// FormField and PasswordField components remain the same
interface FormFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon?: React.ComponentType<{ className: string }>;
  disabled?: boolean;
  hint?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  icon: Icon,
  disabled,
  hint,
}) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-3 w-5 h-5 text-slate-400" />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3 border-2 border-slate-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all disabled:opacity-50 cursor-text`}
      />
    </div>
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
);

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword: boolean;
  onToggle: () => void;
  disabled?: boolean;
  hint?: string;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  value,
  onChange,
  showPassword,
  onToggle,
  disabled,
  hint,
}) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
    <div className="relative">
      <Lock className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder='•••••••'
        className="w-full pl-12 pr-12 py-3 border-2 border-slate-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all disabled:opacity-50 cursor-text"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
);
