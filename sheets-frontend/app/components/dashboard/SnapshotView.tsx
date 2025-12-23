'use client';

import React from 'react';
import { Calendar, Users, TrendingUp, AlertCircle, Award, BarChart3, Settings, GraduationCap } from 'lucide-react';

interface Class {
  id: number;
  name: string;
  students: Student[];
  customColumns: CustomColumn[];
  thresholds?: AttendanceThresholds;
}

interface Student {
  id: number;
  rollNo: string;
  name: string;
  attendance: Record<string, 'P' | 'A' | 'L' | undefined>;
  [key: string]: any;
}

interface CustomColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

interface AttendanceThresholds {
  excellent: number;
  good: number;
  moderate: number;
  atRisk: number;
}

interface SnapshotViewProps {
  classes: Class[];
  currentMonth: number;
  currentYear: number;
  onClassSelect: (id: number) => void;
  defaultThresholds: AttendanceThresholds;
  onOpenClassSettings: (classId: number) => void;
}

export const SnapshotView: React.FC<SnapshotViewProps> = ({
  classes,
  currentMonth,
  currentYear,
  onClassSelect,
  defaultThresholds,
  onOpenClassSettings,
}) => {
  const getDaysInMonth = (month: number, year: number) => 
    new Date(year, month + 1, 0).getDate();
  
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Calculate overall statistics
  const calculateOverallStats = () => {
    let totalStudents = 0;
    let totalPresent = 0;
    let totalPossible = 0;
    let atRiskCount = 0;
    let excellentCount = 0;

    classes.forEach(cls => {
      const thresholds = cls.thresholds || defaultThresholds;
      totalStudents += cls.students.length;
      
      cls.students.forEach(student => {
        let studentPresent = 0;
        let studentTotal = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
          const status = student.attendance[dateKey];
          if (status) {
            studentTotal++;
            if (status === 'P' || status === 'L') studentPresent++;
          }
        }

        totalPresent += studentPresent;
        totalPossible += studentTotal;

        const percentage = studentTotal > 0 ? (studentPresent / studentTotal) * 100 : 0;
        if (percentage < thresholds.atRisk) atRiskCount++;
        if (percentage >= thresholds.excellent) excellentCount++;
      });
    });

    const overallAttendance = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

    return {
      totalClasses: classes.length,
      totalStudents,
      overallAttendance: overallAttendance.toFixed(1),
      atRiskCount,
      excellentCount,
    };
  };

  // Calculate per-class statistics
  const calculateClassStats = (cls: Class) => {
    const thresholds = cls.thresholds || defaultThresholds;
    let totalPresent = 0;
    let totalPossible = 0;
    let atRiskCount = 0;
    let excellentCount = 0;
    const studentStats: Array<{
      student: Student;
      attendance: number;
      status: 'excellent' | 'good' | 'moderate' | 'risk';
    }> = [];

    cls.students.forEach(student => {
      let studentPresent = 0;
      let studentTotal = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${currentMonth + 1}-${day}`;
        const status = student.attendance[dateKey];
        if (status) {
          studentTotal++;
          if (status === 'P' || status === 'L') studentPresent++;
        }
      }

      totalPresent += studentPresent;
      totalPossible += studentTotal;

      const percentage = studentTotal > 0 ? (studentPresent / studentTotal) * 100 : 0;
      
      let status: 'excellent' | 'good' | 'moderate' | 'risk';
      if (percentage >= thresholds.excellent) {
        excellentCount++;
        status = 'excellent';
      } else if (percentage >= thresholds.good) {
        status = 'good';
      } else if (percentage >= thresholds.moderate) {
        status = 'moderate';
      } else {
        atRiskCount++;
        status = 'risk';
      }

      studentStats.push({ student, attendance: percentage, status });
    });

    const avgAttendance = totalPossible > 0 ? (totalPresent / totalPossible) * 100 : 0;

    return {
      avgAttendance: avgAttendance.toFixed(1),
      studentCount: cls.students.length,
      atRiskCount,
      excellentCount,
      studentStats: studentStats.sort((a, b) => b.attendance - a.attendance),
    };
  };

  const overallStats = calculateOverallStats();
  const classesWithStats = classes.map(cls => ({
    class: cls,
    stats: calculateClassStats(cls),
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
      case 'good':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
      case 'moderate':
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
      case 'risk':
        return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-emerald-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard Snapshot</h1>
            <p className="text-slate-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {monthName}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="text-right">
              <p className="text-sm text-slate-600 mb-1">Quick Overview</p>
              <p className="text-2xl font-bold text-emerald-600">{overallStats.overallAttendance}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-md border border-emerald-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-1">Total Classes</p>
          <p className="text-2xl font-bold text-slate-900">{overallStats.totalClasses}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md border border-teal-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-teal-200 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-1">Total Students</p>
          <p className="text-2xl font-bold text-slate-900">{overallStats.totalStudents}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md border border-cyan-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cyan-600" />
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-1">Avg Attendance</p>
          <p className="text-2xl font-bold text-slate-900">{overallStats.overallAttendance}%</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md border border-emerald-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-1">Excellent (≥90%)</p>
          <p className="text-2xl font-bold text-slate-900">{overallStats.excellentCount}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-slate-600 mb-1">At Risk (≤85%)</p>
          <p className="text-2xl font-bold text-slate-900">{overallStats.atRiskCount}</p>
        </div>
      </div>

      {/* Classes Breakdown */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Classes Breakdown</h2>
        <div className="space-y-6">
          {classesWithStats.map(({ class: cls, stats }) => (
            <div key={cls.id} className="bg-white rounded-2xl shadow-md border border-emerald-200 overflow-hidden">
              {/* Class Header */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{cls.name}</h3>
                      <p className="text-sm text-slate-600">{stats.studentCount} students</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onClassSelect(cls.id)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-lg hover:shadow-md transition-all cursor-pointer"
                  >
                    View Details
                  </button>
                </div>

                {/* Class Stats Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-emerald-100">
                    <p className="text-xs text-slate-600 mb-1">Avg Attendance</p>
                    <p className="text-lg font-bold text-emerald-600">{stats.avgAttendance}%</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-100">
                    <p className="text-xs text-slate-600 mb-1">Excellent</p>
                    <p className="text-lg font-bold text-emerald-600">{stats.excellentCount}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="text-xs text-slate-600 mb-1">At Risk</p>
                    <p className="text-lg font-bold text-amber-600">{stats.atRiskCount}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-slate-600 mb-1">Total</p>
                    <p className="text-lg font-bold text-slate-900">{stats.studentCount}</p>
                  </div>
                </div>
              </div>

              {/* Student List */}
              <div className="p-6">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
                  Student Performance
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stats.studentStats.map(({ student, attendance, status }) => {
                    const colors = getStatusColor(status);
                    return (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between p-4 rounded-xl ${colors.bg} border ${colors.border} hover:shadow-sm transition-all`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {student.name || 'Unnamed Student'}
                            </p>
                            <p className="text-xs text-slate-600">
                              Roll No: {student.rollNo || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-lg font-bold ${colors.text}`}>
                              {attendance.toFixed(1)}%
                            </p>
                            <p className="text-xs text-slate-600 capitalize">{status}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200">
        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
          Performance Legend (Default Thresholds)
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          Each class can have custom thresholds. Click the settings icon on any class to configure.
        </p>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Excellent</p>
              <p className="text-xs text-slate-600">≥ {defaultThresholds.excellent}% attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Good</p>
              <p className="text-xs text-slate-600">{defaultThresholds.good}-{defaultThresholds.excellent - 1}% attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Moderate</p>
              <p className="text-xs text-slate-600">{defaultThresholds.moderate}-{defaultThresholds.good - 1}% attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <div>
              <p className="text-sm font-semibold text-slate-900">At Risk</p>
              <p className="text-xs text-slate-600">{'<'} {defaultThresholds.moderate}% attendance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};