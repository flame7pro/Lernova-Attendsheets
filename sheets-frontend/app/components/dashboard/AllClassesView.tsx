'use client';

import React from 'react';
import { ArrowLeft, GraduationCap, Users, Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface CustomColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

interface Student {
  id: number;
  rollNo: string;
  name: string;
  attendance: Record<string, 'P' | 'A' | 'L' | undefined>;
  [key: string]: any;
}

interface Class {
  id: number;
  name: string;
  students: Student[];
  customColumns: CustomColumn[];
  thresholds?: AttendanceThresholds;
}

interface AttendanceThresholds {
  excellent: number;
  good: number;
  moderate: number;
  atRisk: number;
}

interface AllClassesViewProps {
  classes: Class[];
  onBack: () => void;
  onClassSelect: (id: number) => void;
  currentMonth: number;
  currentYear: number;
  defaultThresholds: AttendanceThresholds;
}

export const AllClassesView: React.FC<AllClassesViewProps> = ({
  classes,
  onBack,
  onClassSelect,
  currentMonth,
  currentYear,
  defaultThresholds,
}) => {
  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);

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
        if (percentage < thresholds.moderate) atRiskCount++;
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

  const getAttendanceColor = (attendance: number, thresholds: AttendanceThresholds) => {
    if (attendance >= thresholds.excellent) return 'emerald';
    if (attendance >= thresholds.good) return 'blue';
    if (attendance >= thresholds.moderate) return 'amber';
    return 'rose';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">All Classes Overview</h1>
        <p className="text-slate-600">
          {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Overall Analytics */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Total Classes</p>
          <p className="text-3xl font-bold text-slate-900">{overallStats.totalClasses}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md border border-teal-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Total Students</p>
          <p className="text-3xl font-bold text-slate-900">{overallStats.totalStudents}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md border border-cyan-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-cyan-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">Overall Attendance</p>
          <p className="text-3xl font-bold text-slate-900">{overallStats.overallAttendance}%</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">At Risk Students</p>
          <p className="text-3xl font-bold text-slate-900">{overallStats.atRiskCount}</p>
        </div>
      </div>

      {/* All Classes Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">All Classes ({classes.length})</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classesWithStats.map(({ class: cls, stats }) => {
            const classThresholds = cls.thresholds || defaultThresholds;
            const attendanceColor = getAttendanceColor(parseFloat(stats.avgAttendance), classThresholds);

            return (
              <div
                key={cls.id}
                onClick={() => {
                  onClassSelect(cls.id);
                  onBack();
                }}
                className="bg-white rounded-2xl p-6 shadow-md border border-emerald-200 hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                        {cls.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-600">Students</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{stats.studentCount}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-600">Avg Attendance</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      attendanceColor === 'emerald' ? 'text-emerald-600' :
                      attendanceColor === 'blue' ? 'text-blue-600' :
                      attendanceColor === 'amber' ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {stats.avgAttendance}%
                    </span>
                  </div>

                  {stats.atRiskCount > 0 && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-amber-700 font-medium">At Risk</span>
                      </div>
                      <span className="text-sm font-bold text-amber-700">{stats.atRiskCount} students</span>
                    </div>
                  )}
                </div>

                {/* View Button */}
                <button className="w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-lg hover:shadow-md transition-all group-hover:shadow-lg">
                  View Class Details
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};