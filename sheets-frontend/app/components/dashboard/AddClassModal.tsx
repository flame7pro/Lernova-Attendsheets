'use client';

import React, { useState, useEffect } from 'react';
import { GraduationCap } from 'lucide-react';

interface AddClassModalProps {
  isOpen: boolean;
  className: string;
  onClassNameChange: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

export const AddClassModal: React.FC<AddClassModalProps> = ({
  isOpen,
  className,
  onClassNameChange,
  onClose,
  onCreate,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsCreating(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleCreate = () => {
    if (!className.trim()) return;
    
    setIsCreating(true);
    setTimeout(() => {
      onCreate();
    }, 300);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && className.trim()) {
      handleCreate();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isClosing || isCreating ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 ${
          isClosing || isCreating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Create New Class</h2>
              <p className="text-emerald-50 text-sm mt-1">Add a new class to your attendance system</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Class Name
          </label>
          <input
            type="text"
            value={className}
            onChange={(e) => onClassNameChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="e.g., Computer Science 101"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors"
            autoFocus
            disabled={isCreating}
          />
          <p className="text-xs text-slate-500 mt-2">
            Press Enter to create or Escape to cancel
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!className.trim() || isCreating}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-xl hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                'Create Class'
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};