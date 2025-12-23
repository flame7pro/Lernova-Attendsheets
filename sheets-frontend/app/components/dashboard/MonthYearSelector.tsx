import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthYearSelectorProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  currentMonth,
  currentYear,
  onMonthChange,
  onYearChange,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [yearInput, setYearInput] = useState(currentYear.toString());
  const pickerRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPicker]);

  const handleYearInput = (value: string) => {
    // Allow only digits
    const numericValue = value.replace(/\D/g, '');
    setYearInput(numericValue);
  };

  const handleYearSubmit = () => {
    const year = parseInt(yearInput);
    if (!isNaN(year) && year >= 1900 && year <= 9999) {
      onYearChange(year);
    } else {
      // Reset to current year if invalid
      setYearInput(currentYear.toString());
    }
  };

  const handleYearKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleYearSubmit();
    } else if (e.key === 'Escape') {
      setYearInput(currentYear.toString());
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (currentMonth === 11) {
        onMonthChange(0);
        onYearChange(currentYear + 1);
      } else {
        onMonthChange(currentMonth + 1);
      }
    } else {
      if (currentMonth === 0) {
        onMonthChange(11);
        onYearChange(currentYear - 1);
      } else {
        onMonthChange(currentMonth - 1);
      }
    }
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    const newYear = direction === 'next' ? currentYear + 1 : currentYear - 1;
    if (newYear >= 1900 && newYear <= 9999) {
      onYearChange(newYear);
      setYearInput(newYear.toString());
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl px-4 py-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
      >
        <Calendar className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-medium text-slate-900">
          {months[currentMonth]} {currentYear}
        </span>
      </button>

      {showPicker && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-50 w-80">
          {/* Month Selector */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Month</h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {months.map((month, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onMonthChange(idx);
                    setShowPicker(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    currentMonth === idx
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                      : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  {month.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Year Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Year</h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigateYear('prev')}
                  className="p-1 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="Previous year"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => navigateYear('next')}
                  className="p-1 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="Next year"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={yearInput}
                onChange={(e) => handleYearInput(e.target.value)}
                onBlur={handleYearSubmit}
                onKeyDown={handleYearKeyPress}
                placeholder="YYYY"
                maxLength={4}
                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-center text-lg font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors cursor-text"
              />
            </div>
            
            <p className="text-xs text-slate-500 mt-2 text-center">
              Enter any year (1900-9999) or use arrows
            </p>

            {/* Quick Year Selection */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2">Quick Select:</p>
              <div className="grid grid-cols-3 gap-2">
                {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      onYearChange(year);
                      setYearInput(year.toString());
                      setShowPicker(false);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      currentYear === year
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                        : 'bg-slate-50 text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex gap-2">
            <button
              onClick={() => {
                const today = new Date();
                onMonthChange(today.getMonth());
                onYearChange(today.getFullYear());
                setYearInput(today.getFullYear().toString());
                setShowPicker(false);
              }}
              className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setShowPicker(false)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium rounded-lg hover:shadow-md transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};