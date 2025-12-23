'use client';

import React from 'react';

interface AddColumnModalProps {
  isOpen: boolean;
  columnLabel: string;
  columnType: 'text' | 'number' | 'select';
  onLabelChange: (value: string) => void;
  onTypeChange: (value: 'text' | 'number' | 'select') => void;
  onClose: () => void;
  onCreate: () => void;
}

export const AddColumnModal: React.FC<AddColumnModalProps> = ({
  isOpen,
  columnLabel,
  columnType,
  onLabelChange,
  onTypeChange,
  onClose,
  onCreate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">Add Custom Column</h2>
          <p className="text-emerald-50 text-sm mt-1">Add a new field before the date columns</p>
        </div>
        <div className="p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Column Label</label>
            <input
              type="text"
              value={columnLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="e.g., Email, Phone, Section"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Column Type</label>
            <select
              value={columnType}
              onChange={(e) => onTypeChange(e.target.value as 'text' | 'number' | 'select')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors bg-white cursor-pointer"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onCreate}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-xl hover:shadow-lg transition-all cursor-pointer"
            >
              Add Column
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};