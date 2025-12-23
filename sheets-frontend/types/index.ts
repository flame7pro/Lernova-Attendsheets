export interface AttendanceCounts {
  P: number;
  A: number;
  L: number;
}

export interface CustomColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

// ✅ FIXED - Simplified attendance type to match classService
export interface Student {
  id: number;
  rollNo: string;
  name: string;
  attendance: Record<string, 'P' | 'A' | 'L' | undefined>;
  [key: string]: any;
}

export interface AttendanceThresholds {
  excellent: number;
  good: number;
  moderate: number;
  atRisk: number;
}

export interface Class {
  id: number;
  name: string;
  students: Student[];
  customColumns: CustomColumn[];
  thresholds?: AttendanceThresholds;
}

// ✅ ADDED for QR system
export interface ClassInfo {
  classid?: string;
  classname?: string;
  teachername?: string;
  class_id?: string;
  class_name?: string;
  teacher_name?: string;
}
