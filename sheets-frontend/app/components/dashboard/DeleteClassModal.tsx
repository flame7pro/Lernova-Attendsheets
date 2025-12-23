'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Class } from '@/types';

interface DeleteClassModalProps {
  isOpen: boolean;
  classToDelete: Class | null;
  onClose: () => void;
  onDelete: () => void;
}

export const DeleteClassModal: React.FC<DeleteClassModalProps> = ({
  isOpen,
  classToDelete,
  onClose,
  onDelete,
}) => {
  if (!isOpen || !classToDelete) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-rose-600 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Delete Class?</h2>
              <p className="text-rose-50 text-sm mt-1">This action cannot be undone</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <p className="text-slate-700 mb-2">
            Are you sure you want to delete <span className="font-semibold">{classToDelete.name}</span>?
          </p>
          <p className="text-sm text-slate-600 mb-6">
            All student data and attendance records for this class will be permanently deleted.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              className="flex-1 px-4 py-3 bg-rose-600 text-white font-medium rounded-xl hover:shadow-lg transition-all cursor-pointer"
            >
              Delete Class
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};