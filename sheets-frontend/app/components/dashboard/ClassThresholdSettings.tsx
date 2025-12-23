'use client';

import React, { useState } from 'react';
import { Settings, X, Save, RotateCcw, Copy } from 'lucide-react';

interface AttendanceThresholds {
  excellent: number;
  good: number;
  moderate: number;
  atRisk: number;
}

interface Class {
  id: number;
  name: string;
}

interface ClassThresholdSettingsProps {
  isOpen: boolean;
  currentClass: Class;
  allClasses: Class[];
  thresholds: AttendanceThresholds;
  onClose: () => void;
  onSave: (thresholds: AttendanceThresholds, applyToClassIds: number[]) => void;
}

export const ClassThresholdSettings: React.FC<ClassThresholdSettingsProps> = ({
  isOpen,
  currentClass,
  allClasses,
  thresholds,
  onClose,
  onSave,
}) => {
  const [localThresholds, setLocalThresholds] = useState<AttendanceThresholds>(thresholds);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([currentClass.id]);
  const [error, setError] = useState('');

  const defaultThresholds: AttendanceThresholds = {
    excellent: 95.000,
    good: 90.000,
    moderate: 85.000,
    atRisk: 85.000,
  };

  React.useEffect(() => {
    if (isOpen) {
      setLocalThresholds(thresholds);
      setSelectedClasses([currentClass.id]);
      setError('');
    }
  }, [isOpen, thresholds, currentClass.id]);

  const handleChange = (key: keyof AttendanceThresholds, value: string) => {
    // Allow empty string during typing
    if (value === '') {
      setLocalThresholds({
        ...localThresholds,
        [key]: 0,
      });
      return;
    }

    // Parse as float
    const numValue = parseFloat(value);
    
    // Validate range
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      setError('Values must be between 0.000 and 100.000');
      return;
    }
    
    // Limit to 3 decimal places
    const roundedValue = Math.round(numValue * 1000) / 1000;
    
    setError('');
    setLocalThresholds({
      ...localThresholds,
      [key]: roundedValue,
    });
  };

  const validateThresholds = (): boolean => {
    if (localThresholds.excellent <= localThresholds.good) {
      setError('Excellent threshold must be greater than Good threshold');
      return false;
    }
    if (localThresholds.good <= localThresholds.moderate) {
      setError('Good threshold must be greater than Moderate threshold');
      return false;
    }
    if (localThresholds.moderate < localThresholds.atRisk) {
      setError('Moderate threshold must be greater than or equal to At Risk threshold');
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (validateThresholds()) {
      onSave(localThresholds, selectedClasses);
      onClose();
    }
  };

  const handleReset = () => {
    setLocalThresholds(defaultThresholds);
    setError('');
  };

  const toggleClassSelection = (classId: number) => {
    if (classId === currentClass.id) return;
    
    setSelectedClasses(prev => 
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const selectAllClasses = () => {
    setSelectedClasses(allClasses.map(c => c.id));
  };

  const deselectAllOthers = () => {
    setSelectedClasses([currentClass.id]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Attendance Thresholds</h2>
                <p className="text-emerald-50 text-sm mt-1">Configure thresholds for {currentClass.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-rose-700 text-sm">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> All thresholds support up to 3 decimal places (e.g., 95.500%)
            </p>
          </div>

          {/* Threshold Inputs */}
          <div className="space-y-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Performance Thresholds</h3>
            
            {/* Excellent */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Excellent Performance
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.001"
                      value={localThresholds.excellent.toFixed(3)}
                      onChange={(e) => handleChange('excellent', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Students with attendance ≥ {localThresholds.excellent.toFixed(3)}%</p>
              </div>
            </div>

            {/* Good */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Good Performance
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.001"
                      value={localThresholds.good.toFixed(3)}
                      onChange={(e) => handleChange('good', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Students with attendance {localThresholds.good.toFixed(3)}% - {(localThresholds.excellent - 0.001).toFixed(3)}%</p>
              </div>
            </div>

            {/* Moderate */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Moderate Performance
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0"></div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.001"
                      value={localThresholds.moderate.toFixed(3)}
                      onChange={(e) => handleChange('moderate', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-colors pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Students with attendance {localThresholds.moderate.toFixed(3)}% - {(localThresholds.good - 0.001).toFixed(3)}%</p>
              </div>
            </div>

            {/* At Risk */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  At Risk Threshold
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0"></div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.001"
                      value={localThresholds.atRisk.toFixed(3)}
                      onChange={(e) => handleChange('atRisk', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base text-black focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-colors pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-medium">%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Students with attendance {'<'} {localThresholds.moderate.toFixed(3)}% are at risk</p>
              </div>
            </div>
          </div>

          {/* Visual Preview */}
          <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Preview Scale</h4>
            <div className="relative h-12 bg-white rounded-lg overflow-hidden border border-slate-300">
              <div 
                className="absolute top-0 left-0 h-full bg-rose-500 opacity-30"
                style={{ width: `${localThresholds.moderate}%` }}
              ></div>
              <div 
                className="absolute top-0 h-full bg-amber-500 opacity-30"
                style={{ 
                  left: `${localThresholds.moderate}%`,
                  width: `${localThresholds.good - localThresholds.moderate}%` 
                }}
              ></div>
              <div 
                className="absolute top-0 h-full bg-blue-500 opacity-30"
                style={{ 
                  left: `${localThresholds.good}%`,
                  width: `${localThresholds.excellent - localThresholds.good}%` 
                }}
              ></div>
              <div 
                className="absolute top-0 right-0 h-full bg-emerald-500 opacity-30"
                style={{ width: `${100 - localThresholds.excellent}%` }}
              ></div>
              
              <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold text-slate-700">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="flex justify-between mt-3 text-xs">
              <span className="text-rose-600 font-medium">At Risk</span>
              <span className="text-amber-600 font-medium">Moderate</span>
              <span className="text-blue-600 font-medium">Good</span>
              <span className="text-emerald-600 font-medium">Excellent</span>
            </div>
          </div>

          {/* Apply to Other Classes */}
          {allClasses.length > 1 && (
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Copy className="w-5 h-5 text-teal-600" />
                    Apply to Other Classes
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Select which classes should use these same thresholds
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllClasses}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllOthers}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Current Only
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {allClasses.map((cls) => {
                  const isCurrentClass = cls.id === currentClass.id;
                  const isSelected = selectedClasses.includes(cls.id);
                  
                  return (
                    <label
                      key={cls.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isCurrentClass
                          ? 'bg-emerald-50 border-emerald-300'
                          : isSelected
                          ? 'bg-teal-50 border-teal-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleClassSelection(cls.id)}
                        disabled={isCurrentClass}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <p className={`font-medium ${isCurrentClass ? 'text-emerald-900' : 'text-slate-900'}`}>
                          {cls.name}
                          {isCurrentClass && (
                            <span className="ml-2 text-xs text-emerald-600 font-semibold">(Current)</span>
                          )}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 border-t border-slate-200 p-6 bg-slate-50">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-xl transition-colors flex items-center gap-2 cursor-pointer border border-slate-200"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
            <div className="flex-1"></div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-xl transition-colors cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-xl hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Apply to {selectedClasses.length} {selectedClasses.length === 1 ? 'Class' : 'Classes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};