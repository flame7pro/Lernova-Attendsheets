'use client';

import React, { useState } from 'react';
import { X, User, Mail, Lock, Save, Trash2, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context-email';
import { useRouter } from 'next/navigation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChangeClick: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  onPasswordChangeClick 
}) => {
  const router = useRouter();
   const { user, updateProfile, deleteAccount } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (name === user?.name) {
      setError('No changes to save');
      return;
    }

    setLoading(true);
    const result = await updateProfile(name);
    setLoading(false);

    if (result.success) {
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } else {
      setError('Failed to update profile');
    }
  };

  const handleDeleteAccount = async () => {
  setDeleting(true);  // ← ADD THIS
  setError('');       // ← ADD THIS
  
  const result = await deleteAccount();
  
  if (result.success) {
    // Success - redirect to auth page
    onClose();  // Close modal first
    router.push('/auth');
  } else {
    // Show error
    setError(result.message);
    setDeleting(false);  // ← ADD THIS - Re-enable button on error
  }
};



  const handleClose = () => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      setError('');
      return;
    }
    
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setError('');
      setSuccess('');
      setName(user?.name || '');
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
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transition-all duration-300 max-h-[90vh] flex flex-col ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Account Settings</h2>
                <p className="text-emerald-50 text-sm mt-1">Manage your profile and security</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={deleting}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {/* Profile Section */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Profile Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={loading || deleting}
                  className="w-full px-4 py-3 border-2 border-emerald-200 bg-white rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors disabled:opacity-50 cursor-text"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-12 pr-4 py-3 border-2 border-emerald-200 rounded-xl text-base text-slate-500 bg-slate-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Email cannot be changed for security reasons
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading || name === user?.name || deleting}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Security Section */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Security & Privacy
            </h3>

            <button
              onClick={() => {
                handleClose();
                onPasswordChangeClick();
              }}
              disabled={deleting}
              className="w-full px-6 py-3 bg-white border-2 border-blue-200 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-6 border-2 border-rose-300">
            <h3 className="text-lg font-semibold text-rose-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Danger Zone
            </h3>
            <p className="text-sm text-rose-700 mb-4">
              Once you delete your account, there is no going back. All your classes, students, and attendance data will be permanently deleted.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="w-full px-6 py-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-rose-100 border border-rose-300 rounded-lg">
                  <p className="text-sm font-semibold text-rose-900 mb-2">
                    ⚠️ This action cannot be undone
                  </p>
                  <p className="text-xs text-rose-800">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm account deletion
                  </p>
                </div>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-4 py-3 border-2 border-rose-300 bg-white rounded-xl text-base text-black focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-colors cursor-text font-mono"
                  disabled={deleting}
                  autoFocus
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                      setError('');
                    }}
                    disabled={deleting}
                    className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || deleting}
                    className="flex-1 px-4 py-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Permanently Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-600 mb-1">User ID</p>
                <p className="font-mono font-semibold text-slate-900">{user?.id}</p>
              </div>
              <div>
                <p className="text-slate-600 mb-1">Account Type</p>
                <p className="font-semibold text-slate-900">Free Account</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};