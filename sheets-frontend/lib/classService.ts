const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ✅ UNIFIED TYPES - Single source of truth
export interface AttendanceCounts {
  P: number;
  A: number;
  L: number;
}

export interface Student {
  id: number;
  rollNo: string;
  name: string;
  attendance: Record<string, 'P' | 'A' | 'L' | undefined>;
  [key: string]: any;
}

export interface CustomColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
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

class ClassService {
  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accesstoken') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async apiCall<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || `API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // ✅ NEW: Transform backend response to frontend format
  private transformClassFromBackend(backendClass: any): Class {
    return {
      id: Number(backendClass.class_id || backendClass.id),
      name: backendClass.name,
      students: backendClass.students || [],
      customColumns: backendClass.custom_columns || [],
      thresholds: backendClass.thresholds || {
        excellent: 90,
        good: 75,
        moderate: 60,
        atRisk: 50
      }
    };
  }

  async getAllClasses(): Promise<Class[]> {
    try {
      const result = await this.apiCall<{ classes: any[] }>('/classes');
      return result.classes.map(c => this.transformClassFromBackend(c));
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }
  }

  async getClass(classId: string): Promise<Class> {
    try {
      const result = await this.apiCall<{ class: any }>(`/classes/${classId}`);
      return this.transformClassFromBackend(result.class);
    } catch (error) {
      console.error('Error fetching class:', error);
      throw error;
    }
  }

  async createClass(classData: Class): Promise<Class> {
    try {
      const backendPayload = {
        class_id: String(classData.id),
        name: classData.name,
        thresholds: classData.thresholds || {
          excellent: 90,
          good: 75,
          moderate: 60,
          atRisk: 50
        },
        custom_columns: classData.customColumns || [],
      };

      const result = await this.apiCall<{ success: boolean; class: any }>('/classes', {
        method: 'POST',
        body: JSON.stringify(backendPayload),
      });

      return this.transformClassFromBackend(result.class);
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  }

  async updateClass(classId: string, classData: Class): Promise<Class> {
    try {
      const backendPayload = {
        class_id: classId,
        name: classData.name,
        thresholds: classData.thresholds || {
          excellent: 90,
          good: 75,
          moderate: 60,
          atRisk: 50
        },
        custom_columns: classData.customColumns || [],
      };

      const result = await this.apiCall<{ success: boolean; class: any }>(`/classes/${classId}`, {
        method: 'PUT',
        body: JSON.stringify(backendPayload),
      });

      return this.transformClassFromBackend(result.class);
    } catch (error) {
      console.error('Error updating class:', error);
      throw error;
    }
  }

  async deleteClass(classId: string): Promise<boolean> {
    try {
      const result = await this.apiCall<{ success: boolean; message: string }>(`/classes/${classId}`, {
        method: 'DELETE',
      });
      return result.success;
    } catch (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  }

  async syncClasses(localClasses: Class[]): Promise<Class[]> {
    try {
      const backendClasses = await this.getAllClasses();
      const backendClassIds = new Set(backendClasses.map(c => String(c.id)));

      for (const localClass of localClasses) {
        const classIdStr = String(localClass.id);
        
        if (!backendClassIds.has(classIdStr)) {
          await this.createClass(localClass);
        } else {
          await this.updateClass(classIdStr, localClass);
        }
      }

      return await this.getAllClasses();
    } catch (error) {
      console.error('Error syncing classes:', error);
      throw error;
    }
  }

  async loadClasses(): Promise<Class[]> {
    try {
      return await this.getAllClasses();
    } catch (error) {
      console.error('Error loading classes:', error);
      return [];
    }
  }
}

export const classService = new ClassService();
