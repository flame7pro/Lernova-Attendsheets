'use client';

import React from 'react';
import { Users } from 'lucide-react';

interface EmptyStateProps {
  onCreateClass: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClass }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-emerald-200">
          <img src="/logo.png" alt="Lernova Attendsheets Logo" className="w-24 h-24" />
        </div>
        <h2 className="text-4xl font-bold text-slate-900 mb-3">Welcome to Lernova Attendsheets</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">Create your first class to start tracking attendance and managing student records efficiently.</p>
        <button
          onClick={onCreateClass}
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-xl hover:shadow-lg transition-all cursor-pointer"
        >
          Create Your First Class
        </button>
      </div>
    </div>
  );
};