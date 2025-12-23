import React from 'react';
import { Users } from 'lucide-react';

interface StudentEmptyStateProps {
  onEnrollClick: () => void;
}

export const StudentEmptyState: React.FC<StudentEmptyStateProps> = ({ onEnrollClick }) => {
  return (
    <div className="bg-white rounded-2xl p-12 text-center shadow-md border border-teal-200">
      <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Users className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">No Classes Enrolled</h3>
      <p className="text-slate-600 mb-6">
        Get started by enrolling in your first class using a Class ID from your teacher
      </p>
      <button
        onClick={onEnrollClick}
        className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium rounded-xl hover:shadow-lg transition-all cursor-pointer"
      >
        Enroll in Class
      </button>
    </div>
  );
};