import os
from typing import Optional, Dict, Any, List
from datetime import datetime
from supabase import create_client, Client
import random
import string

# ===== Supabase Client Setup =====
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class DatabaseManager:
    """Manages database operations using Supabase"""
    
    def __init__(self):
        self.supabase = supabase
    
    # ==================== USER OPERATIONS (Supabase) ====================
    
    def create_user(self, user_id: str, email: str, name: str, password_hash: str, role: str = "teacher") -> Dict[str, Any]:
        """Create a new user (teacher) in Supabase"""
        try:
            data = {
                "id": user_id,
                "email": email,
                "name": name,
                "password_hash": password_hash,
                "role": role,
                "created_at": datetime.utcnow().isoformat()
            }
            result = self.supabase.table("users").insert(data).execute()
            row = result.data[0]
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "password": row["password_hash"],
                "role": row.get("role", role),
            }
        except Exception as e:
            print(f"Error creating user: {e}")
            raise
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data by ID"""
        try:
            result = self.supabase.table("users").select("*").eq("id", user_id).execute()
            if not result.data:
                return None
            row = result.data[0]
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "password": row["password_hash"],
                "role": row.get("role", "teacher"),
            }
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user data by email"""
        try:
            result = self.supabase.table("users").select("*").eq("email", email).execute()
            if not result.data:
                return None
            row = result.data[0]
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "password": row["password_hash"],
                "role": row.get("role", "teacher"),
            }
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None
    
    def delete_user(self, user_id: str) -> bool:
        """Delete user and cascade delete related data"""
        try:
            # Delete user (cascade will handle classes and enrollments)
            self.supabase.table("users").delete().eq("id", user_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False
    
    # ==================== STUDENT OPERATIONS (Supabase) ====================
    
    def create_student(self, student_id: str, email: str, name: str, password_hash: str) -> Dict[str, Any]:
        """Create a new student in Supabase"""
        try:
            data = {
                "id": student_id,
                "email": email,
                "name": name,
                "password_hash": password_hash,
                "created_at": datetime.utcnow().isoformat()
            }
            result = self.supabase.table("students").insert(data).execute()
            row = result.data[0]
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "password": row["password_hash"],
                "role": "student",
                "verified": True,
                "enrolled_classes": []
            }
        except Exception as e:
            print(f"Error creating student: {e}")
            raise
    
    def get_student(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Get student data by ID"""
        try:
            result = self.supabase.table("students").select("*").eq("id", student_id).execute()
            if not result.data:
                return None
            row = result.data[0]
            
            # Get enrolled classes
            enrolled_classes = self.get_student_enrollments(student_id)
            
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "password": row["password_hash"],
                "role": "student",
                "verified": True,
                "enrolled_classes": enrolled_classes
            }
        except Exception as e:
            print(f"Error getting student: {e}")
            return None
    
    def get_student_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get student by email"""
        try:
            result = self.supabase.table("students").select("*").eq("email", email).execute()
            if not result.data:
                return None
            row = result.data[0]
            
            # Get enrolled classes
            enrolled_classes = self.get_student_enrollments(row["id"])
            
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "password": row["password_hash"],
                "role": "student",
                "verified": True,
                "enrolled_classes": enrolled_classes
            }
        except Exception as e:
            print(f"Error getting student by email: {e}")
            return None
    
    def update_student(self, student_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update student data"""
        try:
            self.supabase.table("students").update(updates).eq("id", student_id).execute()
            return self.get_student(student_id)
        except Exception as e:
            print(f"Error updating student: {e}")
            raise
    
    def delete_student(self, student_id: str) -> bool:
        """Delete student and clean up enrollments"""
        print(f"\n[DELETE_STUDENT] Starting deletion for student {student_id}")
        try:
            # Get enrollments before deletion
            enrollments = self.supabase.table("enrollments").select("*").eq("student_id", student_id).execute()
            enrolled_classes = enrollments.data or []
            
            print(f"[DELETE_STUDENT] Student is enrolled in {len(enrolled_classes)} classes")
            
            # Update teacher overviews for affected classes
            for enrollment in enrolled_classes:
                class_id = enrollment.get("class_id")
                class_data = self.get_class_by_id(class_id)
                if class_data:
                    teacher_id = class_data.get("teacher_id")
                    if teacher_id:
                        self.update_user_overview(teacher_id)
            
            # Delete student (cascade will handle enrollments)
            self.supabase.table("students").delete().eq("id", student_id).execute()
            
            print(f"[DELETE_STUDENT] ✅ Successfully deleted student {student_id}\n")
            return True
        except Exception as e:
            print(f"[DELETE_STUDENT] ❌ ERROR: {e}")
            return False
    
    # ==================== CLASS OPERATIONS (Supabase) ====================
    
    def create_class(self, user_id: str, class_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new class"""
        try:
            class_id = str(class_data["id"])
            payload = {
                "id": class_id,
                "teacher_id": user_id,
                "name": class_data["name"],
                "students": class_data.get("students", []),
                "thresholds": class_data.get("thresholds", {
                    "excellent": 95.0,
                    "good": 90.0,
                    "moderate": 85.0,
                    "atRisk": 85.0
                }),
                "custom_columns": class_data.get("customColumns", []),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("classes").insert(payload).execute()
            row = result.data[0]
            
            # Calculate initial statistics
            statistics = self.calculate_class_statistics(row, class_id)
            
            self.update_user_overview(user_id)
            
            return {
                "id": row["id"],
                "name": row["name"],
                "teacher_id": row["teacher_id"],
                "students": row.get("students", []),
                "thresholds": row.get("thresholds"),
                "customColumns": row.get("custom_columns", []),
                "statistics": statistics,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            }
        except Exception as e:
            print(f"Error creating class: {e}")
            raise
    
    def get_class(self, user_id: str, class_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific class - FILTERS to show only ACTIVE students"""
        try:
            result = self.supabase.table("classes").select("*").eq("id", class_id).eq("teacher_id", user_id).execute()
            if not result.data:
                return None
            
            row = result.data[0]
            
            # Get ACTIVE enrollments only
            active_enrollments = self.get_class_enrollments(class_id)
            active_record_ids = {e.get('student_record_id') for e in active_enrollments}
            
            # Filter students to only active ones
            all_students = row.get('students', [])
            active_students = [s for s in all_students if s.get('id') in active_record_ids]
            
            print(f"[GET_CLASS] Class {class_id}: {len(all_students)} total, {len(active_students)} active shown to teacher")
            
            return {
                "id": row["id"],
                "name": row["name"],
                "teacher_id": row["teacher_id"],
                "students": active_students,
                "thresholds": row.get("thresholds"),
                "customColumns": row.get("custom_columns", []),
                "statistics": self.calculate_class_statistics(row, class_id),
                "created_at": row.get("created_at"),
                "updated_at": row.get("updated_at")
            }
        except Exception as e:
            print(f"Error getting class: {e}")
            return None
    
    def get_class_by_id(self, class_id: str) -> Optional[Dict[str, Any]]:
        """Get a class by ID - returns RAW data with ALL students (for internal use)"""
        try:
            result = self.supabase.table("classes").select("*").eq("id", class_id).execute()
            if not result.data:
                return None
            
            row = result.data[0]
            return {
                "id": row["id"],
                "name": row["name"],
                "teacher_id": row["teacher_id"],
                "students": row.get("students", []),
                "thresholds": row.get("thresholds"),
                "customColumns": row.get("custom_columns", []),
                "created_at": row.get("created_at"),
                "updated_at": row.get("updated_at")
            }
        except Exception as e:
            print(f"Error getting class by ID: {e}")
            return None
    
    def get_all_classes(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all classes for a user - FILTERS to show only ACTIVE students"""
        try:
            result = self.supabase.table("classes").select("*").eq("teacher_id", user_id).execute()
            classes = []
            
            for row in result.data or []:
                class_id = str(row["id"])
                
                # Get active enrollments
                active_enrollments = self.get_class_enrollments(class_id)
                active_record_ids = {e.get('student_record_id') for e in active_enrollments}
                
                # Filter to only active students
                all_students = row.get('students', [])
                active_students = [s for s in all_students if s.get('id') in active_record_ids]
                
                classes.append({
                    "id": row["id"],
                    "name": row["name"],
                    "teacher_id": row["teacher_id"],
                    "students": active_students,
                    "thresholds": row.get("thresholds"),
                    "customColumns": row.get("custom_columns", []),
                    "statistics": self.calculate_class_statistics(row, class_id),
                    "created_at": row.get("created_at"),
                    "updated_at": row.get("updated_at")
                })
            
            return classes
        except Exception as e:
            print(f"Error getting all classes: {e}")
            return []
    
    def get_classes_for_teacher(self, teacher_id: str) -> List[Dict[str, Any]]:
        """Alias for get_all_classes"""
        return self.get_all_classes(teacher_id)
    
    def update_class(self, user_id: str, class_id: str, class_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update class data - preserves inactive students"""
        try:
            # Get current class (with ALL students including inactive)
            current_class = self.get_class_by_id(class_id)
            if not current_class or current_class.get("teacher_id") != user_id:
                raise ValueError(f"Class {class_id} not found or unauthorized")
            
            all_students_in_db = current_class.get('students', [])
            incoming_students = class_data.get('students', [])
            
            # Check for deleted students
            current_ids = {s.get('id') for s in all_students_in_db}
            new_ids = {s.get('id') for s in incoming_students}
            deleted_ids = current_ids - new_ids
            
            # Mark deleted students as inactive in enrollments
            if deleted_ids:
                enrollments = self.supabase.table("enrollments").select("*").eq("class_id", class_id).execute()
                
                for enrollment in enrollments.data or []:
                    if enrollment.get('student_record_id') in deleted_ids and enrollment.get('status') == 'active':
                        self.supabase.table("enrollments").update({
                            "status": "inactive",
                            "removed_by_teacher_at": datetime.utcnow().isoformat()
                        }).eq("id", enrollment["id"]).execute()
                        
                        # Update student's enrolled_classes
                        student_id = enrollment.get('student_id')
                        if student_id:
                            student_data = self.get_student(student_id)
                            if student_data:
                                enrolled_classes = [ec for ec in student_data.get('enrolled_classes', []) 
                                                  if ec.get('class_id') != class_id]
                                self.update_student(student_id, {"enrolled_classes": enrolled_classes})
            
            # Build final student list (active + inactive preserved)
            updated_students_map = {s.get('id'): s for s in incoming_students}
            final_students = []
            
            for student in all_students_in_db:
                student_id = student.get('id')
                if student_id in updated_students_map:
                    final_students.append(updated_students_map[student_id])
                else:
                    final_students.append(student)
            
            # Update class
            update_data = {
                "students": final_students,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Update optional fields if provided
            if "name" in class_data:
                update_data["name"] = class_data["name"]
            if "thresholds" in class_data:
                update_data["thresholds"] = class_data["thresholds"]
            if "customColumns" in class_data:
                update_data["custom_columns"] = class_data["customColumns"]
            
            self.supabase.table("classes").update(update_data).eq("id", class_id).execute()
            self.update_user_overview(user_id)
            
            # Return updated class
            return self.get_class(user_id, class_id)
        except Exception as e:
            print(f"Error updating class: {e}")
            raise
    
    def delete_class(self, user_id: str, class_id: str) -> bool:
        """Delete a class and clean up enrollments"""
        try:
            # Verify ownership
            class_data = self.get_class_by_id(class_id)
            if not class_data or class_data.get("teacher_id") != user_id:
                return False
            
            # Get enrollments to update students
            enrollments = self.supabase.table("enrollments").select("*").eq("class_id", class_id).execute()
            
            for enrollment in enrollments.data or []:
                student_id = enrollment.get("student_id")
                if student_id:
                    student_data = self.get_student(student_id)
                    if student_data:
                        enrolled_classes = [ec for ec in student_data.get("enrolled_classes", []) 
                                          if ec.get("class_id") != class_id]
                        self.update_student(student_id, {"enrolled_classes": enrolled_classes})
            
            # Delete class (cascade will handle enrollments and QR sessions)
            self.supabase.table("classes").delete().eq("id", class_id).execute()
            self.update_user_overview(user_id)
            
            return True
        except Exception as e:
            print(f"Error deleting class: {e}")
            return False
    
    def calculate_class_statistics(self, class_data: Dict[str, Any], class_id: str = None) -> Dict[str, Any]:
        """Calculate statistics for a class - counts only ACTIVE students"""
        students = class_data.get("students", [])
        active_student_count = 0
        
        if class_id:
            enrollments = self.get_class_enrollments(str(class_id))
            active_record_ids = {e.get("student_record_id") for e in enrollments}
            active_students = [s for s in students if s.get("id") in active_record_ids]
        else:
            active_students = students
        
        if not active_students:
            return {
                "total_students": 0,
                "avg_attendance": 0.0,
                "at_risk_count": 0,
                "excellent_count": 0
            }
        
        thresholds = class_data.get("thresholds") or {
            "excellent": 95.0,
            "good": 90.0,
            "moderate": 85.0,
            "atRisk": 85.0
        }
        
        at_risk = 0
        excellent = 0
        total_attendance = 0.0
        
        for student in active_students:
            attendance = student.get("attendance", {})
            if attendance:
                present = sum(1 for v in attendance.values() if v in ["P", "L"])
                total = len(attendance)
                percentage = (present / total * 100.0) if total > 0 else 0.0
                total_attendance += percentage
                
                if percentage >= thresholds.get("excellent", 95.0):
                    excellent += 1
                elif percentage < thresholds.get("moderate", 85.0):
                    at_risk += 1
        
        avg_attendance = (total_attendance / len(active_students)) if active_students else 0.0
        
        return {
            "total_students": len(active_students),
            "avg_attendance": round(avg_attendance, 3),
            "at_risk_count": at_risk,
            "excellent_count": excellent,
            "last_calculated": datetime.utcnow().isoformat()
        }
    
    # ==================== ENROLLMENT OPERATIONS (Supabase) ====================
    
    def _generate_student_record_id(self) -> int:
        """Generate unique student record ID"""
        return int(datetime.utcnow().timestamp() * 1000)
    
    def get_teacher_name(self, teacher_id: str) -> str:
        """Get teacher name by ID"""
        teacher = self.get_user(teacher_id)
        return teacher.get('name', 'Unknown') if teacher else 'Unknown'
    
    def enroll_student(self, student_id: str, class_id: str, student_info: dict) -> dict:
        """Enroll a student in a class"""
        print(f"\n{'='*60}")
        print(f"[ENROLL] Student enrolling")
        print(f"  Student ID: {student_id}")
        print(f"  Class ID: {class_id}")
        print(f"{'='*60}")
        
        try:
            # Verify class exists
            class_data = self.get_class_by_id(class_id)
            if not class_data:
                raise ValueError("Class not found")
            
            teacher_id = class_data.get('teacher_id')
            
            # Check if actively enrolled
            active_check = self.supabase.table("enrollments").select("*").eq("class_id", class_id).eq("student_id", student_id).eq("status", "active").execute()
            
            if active_check.data:
                raise ValueError("You are already enrolled in this class")
            
            # Check if was enrolled before
            previous_check = self.supabase.table("enrollments").select("*").eq("class_id", class_id).eq("student_id", student_id).execute()
            
            previous_enrollment = previous_check.data[0] if previous_check.data else None
            
            students = class_data.get('students', [])
            
            if previous_enrollment:
                # RE-ENROLLMENT
                print(f"[RE-ENROLLMENT] Reactivating enrollment")
                student_record_id = previous_enrollment['student_record_id']
                
                # Reactivate enrollment
                self.supabase.table("enrollments").update({
                    "status": "active",
                    "re_enrolled_at": datetime.utcnow().isoformat(),
                    "roll_no": student_info['rollNo']
                }).eq("id", previous_enrollment['id']).execute()
                
                # Find and update student record
                student_record = None
                for s in students:
                    if s.get('id') == student_record_id:
                        student_record = s
                        break
                
                if student_record:
                    attendance_count = len(student_record.get('attendance', {}))
                    print(f"[RE-ENROLLMENT] Found record with {attendance_count} attendance entries")
                    student_record['rollNo'] = student_info['rollNo']
                    student_record['name'] = student_info['name']
                else:
                    print(f"[RE-ENROLLMENT] WARNING: Record not found, creating new")
                    student_record = {
                        "id": student_record_id,
                        "rollNo": student_info['rollNo'],
                        "name": student_info['name'],
                        "email": student_info['email'],
                        "attendance": {}
                    }
                    students.append(student_record)
                
                # Update class
                self.supabase.table("classes").update({"students": students}).eq("id", class_id).execute()
                
                # Update student's enrolled_classes
                student_data = self.get_student(student_id)
                if student_data:
                    enrolled_classes = student_data.get('enrolled_classes', [])
                    class_info = {
                        "class_id": class_id,
                        "class_name": class_data.get('name'),
                        "teacher_name": self.get_teacher_name(teacher_id),
                        "enrolled_at": previous_enrollment.get('enrolled_at'),
                        "re_enrolled_at": previous_enrollment.get('re_enrolled_at')
                    }
                    if not any(ec.get('class_id') == class_id for ec in enrolled_classes):
                        enrolled_classes.append(class_info)
                        self.update_student(student_id, {"enrolled_classes": enrolled_classes})
                
                self.update_user_overview(teacher_id)
                
                attendance_count = len(student_record.get('attendance', {}))
                print(f"[RE-ENROLLMENT] ✅ SUCCESS: {attendance_count} records restored")
                print(f"{'='*60}\n")
                
                return {
                    "class_id": class_id,
                    "student_id": student_id,
                    "student_record_id": student_record_id,
                    "status": "re-enrolled",
                    "message": f"Welcome back! Your {attendance_count} attendance records have been restored."
                }
            else:
                # NEW ENROLLMENT
                print(f"[NEW ENROLLMENT] Creating new enrollment")
                student_record_id = self._generate_student_record_id()
                
                # Create enrollment
                enrollment_data = {
                    "student_id": student_id,
                    "student_record_id": student_record_id,
                    "class_id": class_id,
                    "name": student_info['name'],
                    "roll_no": student_info['rollNo'],
                    "email": student_info['email'],
                    "enrolled_at": datetime.utcnow().isoformat(),
                    "status": "active"
                }
                
                self.supabase.table("enrollments").insert(enrollment_data).execute()
                
                # Add student to class
                new_student = {
                    "id": student_record_id,
                    "rollNo": student_info['rollNo'],
                    "name": student_info['name'],
                    "email": student_info['email'],
                    "attendance": {}
                }
                students.append(new_student)
                self.supabase.table("classes").update({"students": students}).eq("id", class_id).execute()
                
                # Update student's enrolled_classes
                student_data = self.get_student(student_id)
                if student_data:
                    enrolled_classes = student_data.get('enrolled_classes', [])
                    class_info = {
                        "class_id": class_id,
                        "class_name": class_data.get('name'),
                        "teacher_name": self.get_teacher_name(teacher_id),
                        "enrolled_at": enrollment_data['enrolled_at']
                    }
                    enrolled_classes.append(class_info)
                    self.update_student(student_id, {"enrolled_classes": enrolled_classes})
                
                self.update_user_overview(teacher_id)
                
                print(f"[NEW ENROLLMENT] ✅ SUCCESS")
                print(f"{'='*60}\n")
                
                return {
                    "class_id": class_id,
                    "student_id": student_id,
                    "student_record_id": student_record_id,
                    "status": "enrolled",
                    "message": "Successfully enrolled in class!"
                }
        except Exception as e:
            print(f"[ENROLL] Error: {e}")
            raise
    
    def unenroll_student(self, student_id: str, class_id: str) -> bool:
        """Unenroll a student from a class"""
        print(f"\n{'='*60}")
        print(f"[UNENROLL] Student leaving class")
        print(f"  Student ID: {student_id}")
        print(f"  Class ID: {class_id}")
        print(f"{'='*60}")
        
        try:
            # Find active enrollment
            result = self.supabase.table("enrollments").select("*").eq("class_id", class_id).eq("student_id", student_id).eq("status", "active").execute()
            
            if not result.data:
                print(f"[UNENROLL] ❌ Student not actively enrolled")
                return False
            
            enrollment = result.data[0]
            student_record_id = enrollment.get('student_record_id')
            
            # Check attendance data
            class_data = self.get_class_by_id(class_id)
            if class_data:
                for s in class_data.get('students', []):
                    if s.get('id') == student_record_id:
                        attendance_count = len(s.get('attendance', {}))
                        print(f"[UNENROLL] Student has {attendance_count} attendance records (WILL BE PRESERVED)")
                        break
            
            # Mark as INACTIVE
            self.supabase.table("enrollments").update({
                "status": "inactive",
                "unenrolled_at": datetime.utcnow().isoformat()
            }).eq("id", enrollment['id']).execute()
            
            print(f"[UNENROLL] ✅ Marked as INACTIVE")
            
            # Remove from student's enrolled_classes
            student_data = self.get_student(student_id)
            if student_data:
                enrolled_classes = [ec for ec in student_data.get("enrolled_classes", []) if ec.get("class_id") != class_id]
                self.update_student(student_id, {"enrolled_classes": enrolled_classes})
                print(f"[UNENROLL] Updated student's enrolled_classes")
            
            # Update teacher overview
            if class_data:
                teacher_id = class_data.get("teacher_id")
                if teacher_id:
                    self.update_user_overview(teacher_id)
            
            print(f"[UNENROLL] ✅ SUCCESS: Data preserved, student hidden from teacher")
            print(f"{'='*60}\n")
            return True
        except Exception as e:
            print(f"[UNENROLL] ❌ ERROR: {e}")
            return False
    
    def get_class_enrollments(self, class_id: str) -> List[Dict[str, Any]]:
        """Get all ACTIVE enrollments for a class"""
        try:
            result = self.supabase.table("enrollments").select("*").eq("class_id", class_id).eq("status", "active").execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting class enrollments: {e}")
            return []
    
    def get_student_enrollments(self, student_id: str) -> List[Dict[str, Any]]:
        """Get all classes a student is enrolled in"""
        try:
            result = self.supabase.table("enrollments").select("*, classes(*)").eq("student_id", student_id).eq("status", "active").execute()
            
            enrolled_classes = []
            for enrollment in result.data or []:
                class_data = enrollment.get("classes")
                if class_data:
                    enrolled_classes.append({
                        "class_id": class_data["id"],
                        "class_name": class_data["name"],
                        "teacher_name": self.get_teacher_name(class_data["teacher_id"]),
                        "enrolled_at": enrollment.get("enrolled_at")
                    })
            
            return enrolled_classes
        except Exception as e:
            print(f"Error getting student enrollments: {e}")
            return []
    
    def get_student_class_details(self, student_id: str, class_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a student's enrollment in a class"""
        print(f"[GET_DETAILS] Getting details for student {student_id} in class {class_id}")
        
        try:
            class_data = self.get_class_by_id(class_id)
            if not class_data:
                print(f"[GET_DETAILS] Class not found")
                return None
            
            # Check enrollment
            result = self.supabase.table("enrollments").select("*").eq("student_id", student_id).eq("class_id", class_id).eq("status", "active").execute()
            
            if not result.data:
                print(f"[GET_DETAILS] Student not enrolled (no active enrollment)")
                return None
            
            enrollment = result.data[0]
            student_record_id = enrollment.get("student_record_id")
            
            # Find student record
            student_record = None
            for student in class_data.get("students", []):
                if student.get("id") == student_record_id:
                    student_record = student
                    break
            
            if not student_record:
                print(f"[GET_DETAILS] Student record not found in class")
                return None
            
            print(f"[GET_DETAILS] Returning class details with {len(student_record.get('attendance', {}))} attendance records")
            
            return {
                "class_id": class_id,
                "class_name": class_data.get("name", ""),
                "teacher_id": class_data.get("teacher_id", ""),
                "student_record": student_record,
                "thresholds": class_data.get("thresholds"),
                "statistics": self.calculate_student_statistics(student_record, class_data.get("thresholds"))
            }
        except Exception as e:
            print(f"Error getting student class details: {e}")
            return None
    
    def calculate_student_statistics(self, student_record: Dict[str, Any], thresholds: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate attendance statistics for a student"""
        if not thresholds:
            thresholds = {
                "excellent": 95.0,
                "good": 90.0,
                "moderate": 85.0,
                "atRisk": 85.0
            }
        
        attendance = student_record.get("attendance", {})
        if not attendance:
            return {
                "total_classes": 0,
                "present": 0,
                "absent": 0,
                "late": 0,
                "percentage": 0.0,
                "status": "no data"
            }
        
        present = sum(1 for v in attendance.values() if v == "P")
        absent = sum(1 for v in attendance.values() if v == "A")
        late = sum(1 for v in attendance.values() if v == "L")
        total = len(attendance)
        percentage = ((present + late) / total * 100) if total > 0 else 0.0
        
        if percentage >= thresholds.get("excellent", 95.0):
            status = "excellent"
        elif percentage >= thresholds.get("good", 90.0):
            status = "good"
        elif percentage >= thresholds.get("moderate", 85.0):
            status = "moderate"
        else:
            status = "at risk"
        
        return {
            "total_classes": total,
            "present": present,
            "absent": absent,
            "late": late,
            "percentage": round(percentage, 3),
            "status": status
        }
    
    def update_user_overview(self, user_id: str):
        """Update user overview statistics - counts only ACTIVE enrollments"""
        try:
            classes = self.get_all_classes(user_id)
            total_active_students = 0
            
            for cls in classes:
                class_id = cls.get("id")
                enrollments = self.get_class_enrollments(str(class_id))
                total_active_students += len(enrollments)
            
            # Store overview in user metadata (you could add an overview column to users table)
            # For now, we'll just log it
            print(f"[OVERVIEW] User {user_id}: {len(classes)} classes, {total_active_students} active students")
        except Exception as e:
            print(f"Error updating user overview: {e}")
    
    # ==================== QR CODE OPERATIONS (Supabase) ====================
    
    def _generate_qr_code(self) -> str:
        """Generate random QR code"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    
    def start_qr_session(self, class_id: str, teacher_id: str, rotation_interval: int = 5) -> dict:
        """Start a QR attendance session"""
        print(f"\n{'='*60}")
        print(f"[QR_SESSION] Starting QR session for class {class_id}")
        
        try:
            class_data = self.get_class_by_id(class_id)
            if not class_data or class_data.get("teacher_id") != teacher_id:
                raise ValueError("Class not found or unauthorized")
            
            today = datetime.now().strftime("%Y-%m-%d")
            current_code = self._generate_qr_code()
            
            # Check if active session exists
            existing = self.supabase.table("qr_sessions").select("*").eq("class_id", class_id).eq("status", "active").execute()
            
            if existing.data:
                # Update existing session
                session_data = {
                    "current_code": current_code,
                    "code_generated_at": datetime.now().isoformat(),
                    "rotation_interval": rotation_interval,
                    "attendance_date": today
                }
                self.supabase.table("qr_sessions").update(session_data).eq("id", existing.data[0]["id"]).execute()
                result = self.supabase.table("qr_sessions").select("*").eq("id", existing.data[0]["id"]).execute()
                session = result.data[0]
            else:
                # Create new session
                session_data = {
                    "class_id": class_id,
                    "teacher_id": teacher_id,
                    "started_at": datetime.now().isoformat(),
                    "rotation_interval": rotation_interval,
                    "current_code": current_code,
                    "code_generated_at": datetime.now().isoformat(),
                    "scanned_students": [],
                    "attendance_date": today,
                    "status": "active"
                }
                result = self.supabase.table("qr_sessions").insert(session_data).execute()
                session = result.data[0]
            
            print(f"[QR_SESSION] ✅ Session started: {session['current_code']}")
            print(f"{'='*60}\n")
            return session
        except Exception as e:
            print(f"Error starting QR session: {e}")
            raise
    
    def get_qr_session(self, class_id: str) -> Optional[dict]:
        """Get active QR session and auto-rotate code if needed"""
        try:
            result = self.supabase.table("qr_sessions").select("*").eq("class_id", class_id).eq("status", "active").execute()
            
            if not result.data:
                return None
            
            session = result.data[0]
            
            # Auto-rotate code
            code_time = datetime.fromisoformat(session["code_generated_at"])
            elapsed = (datetime.now() - code_time).total_seconds()
            
            if elapsed >= session["rotation_interval"]:
                new_code = self._generate_qr_code()
                self.supabase.table("qr_sessions").update({
                    "current_code": new_code,
                    "code_generated_at": datetime.now().isoformat()
                }).eq("id", session["id"]).execute()
                session["current_code"] = new_code
                print(f"[QR] Auto-rotated code for {class_id}")
            
            return session
        except Exception as e:
            print(f"Error getting QR session: {e}")
            return None
    
    def scan_qr_code(self, student_id: str, class_id: str, qr_code: str) -> Dict[str, Any]:
        """Handle a student scanning a QR code"""
        try:
            # Get active session
            result = self.supabase.table("qr_sessions").select("*").eq("class_id", class_id).eq("status", "active").execute()
            
            if not result.data:
                raise ValueError("No active session")
            
            session = result.data[0]
            
            if session.get("current_code") != qr_code:
                raise ValueError("Invalid or expired QR code")
            
            attendance_date = session["attendance_date"]
            
            # Find enrollment
            enrollment_result = self.supabase.table("enrollments").select("*").eq("class_id", class_id).eq("student_id", student_id).eq("status", "active").execute()
            
            if not enrollment_result.data:
                raise ValueError("Student not actively enrolled in this class")
            
            enrollment = enrollment_result.data[0]
            student_record_id = enrollment.get("student_record_id")
            
            # Load class and mark attendance
            class_data = self.get_class_by_id(class_id)
            if not class_data:
                raise ValueError("Class not found")
            
            students = class_data.get("students", [])
            found = False
            
            for s in students:
                if s.get("id") == student_record_id:
                    s.setdefault("attendance", {})
                    s["attendance"][attendance_date] = "P"
                    found = True
                    break
            
            if not found:
                # Create record if missing
                new_student = {
                    "id": student_record_id,
                    "name": enrollment.get("name"),
                    "rollNo": enrollment.get("roll_no"),
                    "email": enrollment.get("email"),
                    "attendance": {attendance_date: "P"},
                }
                students.append(new_student)
            
            # Save class
            self.supabase.table("classes").update({"students": students}).eq("id", class_id).execute()
            
            # Record scan in session
            scanned = session.get("scanned_students", [])
            if student_record_id not in scanned:
                scanned.append(student_record_id)
            
            self.supabase.table("qr_sessions").update({
                "scanned_students": scanned,
                "last_scan_at": datetime.utcnow().isoformat()
            }).eq("id", session["id"]).execute()
            
            return {
                "success": True,
                "message": "Attendance marked as Present",
                "date": attendance_date,
            }
        except Exception as e:
            print(f"Error scanning QR code: {e}")
            raise
    
    def stop_qr_session(self, class_id: str, teacher_id: str) -> Dict[str, Any]:
        """Stop an active QR session and mark absents"""
        try:
            # Get session
            result = self.supabase.table("qr_sessions").select("*").eq("class_id", class_id).eq("status", "active").execute()
            
            if not result.data:
                raise ValueError("No active session")
            
            session = result.data[0]
            
            if session.get("teacher_id") != teacher_id:
                raise ValueError("Unauthorized")
            
            attendance_date = session["attendance_date"]
            scanned_ids = set(session.get("scanned_students", []))
            
            # Load class and enrollments
            class_data = self.get_class_by_id(class_id)
            if not class_data:
                raise ValueError("Class not found")
            
            students = class_data.get("students", [])
            
            enrollments = self.get_class_enrollments(class_id)
            active_student_ids = {e.get("student_record_id") for e in enrollments}
            
            # Mark absents
            marked_absent = 0
            for student in students:
                sid = student.get("id")
                if sid in active_student_ids and sid not in scanned_ids:
                    student.setdefault("attendance", {})
                    if student["attendance"].get(attendance_date) is None:
                        student["attendance"][attendance_date] = "A"
                        marked_absent += 1
            
            # Save class
            self.supabase.table("classes").update({"students": students}).eq("id", class_id).execute()
            
            # Close session
            self.supabase.table("qr_sessions").update({
                "status": "stopped",
                "stopped_at": datetime.utcnow().isoformat()
            }).eq("id", session["id"]).execute()
            
            return {
                "success": True,
                "scanned_count": len(scanned_ids),
                "absent_count": marked_absent,
                "date": attendance_date,
            }
        except Exception as e:
            print(f"Error stopping QR session: {e}")
            raise
    
    # ==================== CONTACT OPERATIONS (Supabase) ====================
    
    def save_contact_message(self, email: str, message_data: Dict[str, Any]) -> bool:
        """Save a contact form message"""
        try:
            data = {
                "email": email,
                "timestamp": datetime.utcnow().isoformat(),
                **message_data
            }
            self.supabase.table("contact_messages").insert(data).execute()
            return True
        except Exception as e:
            print(f"Error saving contact message: {e}")
            return False
    
    def get_contact_messages(self, email: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get contact messages, optionally filtered by email"""
        try:
            if email:
                result = self.supabase.table("contact_messages").select("*").eq("email", email).execute()
            else:
                result = self.supabase.table("contact_messages").select("*").execute()
            
            return result.data or []
        except Exception as e:
            print(f"Error getting contact messages: {e}")
            return []
    
    # ==================== DATABASE STATS ====================
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get overall database statistics"""
        try:
            users_result = self.supabase.table("users").select("id", count="exact").execute()
            students_result = self.supabase.table("students").select("id", count="exact").execute()
            classes_result = self.supabase.table("classes").select("id", count="exact").execute()
            enrollments_result = self.supabase.table("enrollments").select("id", count="exact").eq("status", "active").execute()
            
            return {
                "total_users": users_result.count or 0,
                "total_students": students_result.count or 0,
                "total_classes": classes_result.count or 0,
                "total_active_enrollments": enrollments_result.count or 0,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"Error getting database stats: {e}")
            return {
                "total_users": 0,
                "total_students": 0,
                "total_classes": 0,
                "total_active_enrollments": 0,
                "timestamp": datetime.utcnow().isoformat()
            }
