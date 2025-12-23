import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from supabase import create_client, Client
import random
import string

# ===== Supabase Client Setup =====
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def read_json(self, file_path: str) -> Optional[Dict[Any, Any]]:
    """Read JSON file safely"""
    try:
        if not os.path.exists(file_path):
            return None
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None

def write_json(self, file_path: str, data: Dict[Any, Any]):
    """Write JSON file safely"""
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error writing {file_path}: {e}")
        raise

class DatabaseManager:
    """
    Fully integrated Supabase database manager for attendance system.
    All operations use Supabase tables - no file-based storage.
    """
    
    def __init__(self):
        self.supabase = supabase
    
    # ==================== USER OPERATIONS ==================== #
    
    def create_user(self, user_id: str, email: str, name: str, password_hash: str, role: str = "teacher") -> Dict[str, Any]:
        """Create a new user/teacher in Supabase"""
        try:
            data = {
                "id": user_id,
                "email": email,
                "name": name,
                "password_hash": password_hash,
                "role": role,
                "verified": True,
                "overview": {
                    "total_classes": 0,
                    "total_students": 0,
                    "last_updated": datetime.utcnow().isoformat()
                },
                "created_at": datetime.utcnow().isoformat()
            }
            result = self.supabase.table("users").insert(data).execute()
            row = result.data[0]
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "password": row["password_hash"],
                "role": row.get("role", "teacher"),
                "verified": row.get("verified", True),
                "overview": row.get("overview", {})
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
                "verified": row.get("verified", True),
                "overview": row.get("overview", {})
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
                "verified": row.get("verified", True),
                "overview": row.get("overview", {})
            }
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None

    def update_user(self, user_id: str, **updates) -> Dict[str, Any]:
        """Update user data - FIXED FOR SUPABASE"""
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()
            self.supabase.table("users").update(updates).eq("id", user_id).execute()
            return self.get_user(user_id)
        except Exception as e:
            print(f"Error updating user: {e}")
            raise

    def delete_user(self, user_id: str) -> bool:
        """Delete user and cascade delete related data"""
        try:
            # Delete classes first
            self.supabase.table("classes").delete().eq("teacher_id", user_id).execute()
            # Delete user
            self.supabase.table("users").delete().eq("id", user_id).execute()
            print(f"[DELETE_USER] Deleted user {user_id} + all classes")
            return True
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False

    # ==================== STUDENT OPERATIONS ====================
    
    def create_student(self, student_id: str, email: str, name: str, password_hash: str) -> Dict[str, Any]:
        """Create a new student in Supabase"""
        try:
            data = {
                "id": student_id,
                "email": email,
                "name": name,
                "password_hash": password_hash,
                "role": "student",
                "verified": True,
                "enrolled_classes": [],
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
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "password": row["password_hash"],
                "role": "student",
                "verified": row.get("verified", True),
                "enrolled_classes": row.get("enrolled_classes", [])
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
            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "password": row["password_hash"],
                "role": "student",
                "verified": row.get("verified", True),
                "enrolled_classes": row.get("enrolled_classes", [])
            }
        except Exception as e:
            print(f"Error getting student by email: {e}")
            return None

    def update_student(self, student_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update student data - FIXED FOR SUPABASE"""
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()
            self.supabase.table("students").update(updates).eq("id", student_id).execute()
            return self.get_student(student_id)
        except Exception as e:
            print(f"Error updating student: {e}")
            raise

    def delete_student(self, student_id: str) -> bool:
        """Delete student and clean up enrollments"""
        try:
            # Delete enrollments first
            self.supabase.table("enrollments").delete().eq("student_id", student_id).execute()
            # Delete student
            self.supabase.table("students").delete().eq("id", student_id).execute()
            print(f"[DELETE_STUDENT] Deleted student {student_id}")
            return True
        except Exception as e:
            print(f"Error deleting student: {e}")
            return False
    
    # ==================== CLASS OPERATIONS ====================
    
    def create_class(self, class_id: str, teacher_id: str, name: str, thresholds: Dict[str, int] = None, custom_columns: List[Dict] = None) -> Dict[str, Any]:
        """Create a new class"""
        try:
            if thresholds is None:
                thresholds = {"low": 75, "mid": 85}
            if custom_columns is None:
                custom_columns = []
            
            data = {
                "id": class_id,
                "teacher_id": teacher_id,
                "name": name,
                "thresholds": thresholds,
                "custom_columns": custom_columns,
                "students": [],
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("classes").insert(data).execute()
            return result.data[0]
        except Exception as e:
            print(f"Error creating class: {e}")
            raise
    
    def get_class_by_id(self, class_id: str) -> Optional[Dict[str, Any]]:
        """Get class data by ID"""
        try:
            result = self.supabase.table("classes").select("*").eq("id", class_id).execute()
            if not result.data:
                return None
            return result.data[0]
        except Exception as e:
            print(f"Error getting class: {e}")
            return None
    
    def get_classes_by_teacher(self, teacher_id: str) -> List[Dict[str, Any]]:
        """Get all classes for a teacher"""
        try:
            result = self.supabase.table("classes").select("*").eq("teacher_id", teacher_id).execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting classes by teacher: {e}")
            return []
    
    def update_class(self, class_id: str, updates: Dict[str, Any]) -> bool:
        """Update class data"""
        try:
            self.supabase.table("classes").update(updates).eq("id", class_id).execute()
            return True
        except Exception as e:
            print(f"Error updating class: {e}")
            return False
    
    def delete_class(self, class_id: str) -> bool:
        """Delete class and cascade delete enrollments"""
        try:
            self.supabase.table("classes").delete().eq("id", class_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting class: {e}")
            return False
    
    def get_all_classes(self, teacher_id: str) -> List[Dict[str, Any]]:
        """Get all classes for a teacher - FIXED SIGNATURE"""
        try:
            result = self.supabase.table("classes").eq("teacher_id", teacher_id).execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting classes by teacher: {e}")
            return []
    
    # ==================== ENROLLMENT OPERATIONS ====================
    
    def enroll_student(self, class_id: str, student_id: str, student_record_id: int, extra: Dict[str, Any] = None) -> Dict[str, Any]:
        """Enroll a student in a class"""
        try:
            if extra is None:
                extra = {}
            
            data = {
                "class_id": class_id,
                "student_id": student_id,
                "student_record_id": student_record_id,
                "status": "active",
                "extra": extra,
                "enrolled_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("enrollments").insert(data).execute()
            return result.data[0]
        except Exception as e:
            print(f"Error enrolling student: {e}")
            raise
    
    def get_enrollment(self, class_id: str, student_id: str) -> Optional[Dict[str, Any]]:
        """Get specific enrollment"""
        try:
            result = self.supabase.table("enrollments").select("*").eq("class_id", class_id).eq("student_id", student_id).execute()
            if not result.data:
                return None
            return result.data[0]
        except Exception as e:
            print(f"Error getting enrollment: {e}")
            return None
    
    def get_student_enrollments(self, student_id: str) -> List[str]:
        """Get list of class IDs the student is enrolled in"""
        try:
            result = self.supabase.table("enrollments").select("class_id").eq("student_id", student_id).eq("status", "active").execute()
            return [row["class_id"] for row in result.data or []]
        except Exception as e:
            print(f"Error getting student enrollments: {e}")
            return []
    
    def get_class_enrollments(self, class_id: str) -> List[Dict[str, Any]]:
        """Get all active enrollments for a class"""
        try:
            result = self.supabase.table("enrollments").select("*").eq("class_id", class_id).eq("status", "active").execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting class enrollments: {e}")
            return []
    
    def update_enrollment_status(self, class_id: str, student_id: str, status: str) -> bool:
        """Update enrollment status (active, dropped, etc.)"""
        try:
            self.supabase.table("enrollments").update({
                "status": status,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("class_id", class_id).eq("student_id", student_id).execute()
            return True
        except Exception as e:
            print(f"Error updating enrollment status: {e}")
            return False
    
    def delete_enrollment(self, class_id: str, student_id: str) -> bool:
        """Delete an enrollment"""
        try:
            self.supabase.table("enrollments").delete().eq("class_id", class_id).eq("student_id", student_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting enrollment: {e}")
            return False
    
    # ==================== QR SESSION OPERATIONS ====================
    
    def _generate_qr_code(self, length: int = 8) -> str:
        """Generate a random QR code"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
    
    def create_qr_session(self, class_id: str, teacher_id: str, attendance_date: str, rotation_interval: int = 30) -> Dict[str, Any]:
        """Create a new QR code attendance session"""
        try:
            # Check for existing active session
            existing = self.supabase.table("qr_sessions").select("*").eq("class_id", class_id).eq("status", "active").execute()
            
            if existing.data:
                raise ValueError("An active QR session already exists for this class")
            
            qr_code = self._generate_qr_code()
            
            data = {
                "class_id": class_id,
                "teacher_id": teacher_id,
                "current_code": qr_code,
                "attendance_date": attendance_date,
                "rotation_interval": rotation_interval,
                "code_generated_at": datetime.utcnow().isoformat(),
                "scanned_students": [],
                "status": "active",
                "started_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("qr_sessions").insert(data).execute()
            return result.data[0]
        except Exception as e:
            print(f"Error creating QR session: {e}")
            raise
    
    def get_qr_session(self, class_id: str) -> Optional[Dict[str, Any]]:
        """Get active QR session for a class with auto-rotation"""
        try:
            result = self.supabase.table("qr_sessions").select("*").eq("class_id", class_id).eq("status", "active").execute()
            
            if not result.data:
                return None
            
            session = result.data[0]
            
            # Check if code needs rotation
            code_generated_at = datetime.fromisoformat(session["code_generated_at"].replace('Z', '+00:00'))
            elapsed = (datetime.utcnow() - code_generated_at.replace(tzinfo=None)).total_seconds()
            
            if elapsed >= session["rotation_interval"]:
                new_code = self._generate_qr_code()
                self.supabase.table("qr_sessions").update({
                    "current_code": new_code,
                    "code_generated_at": datetime.utcnow().isoformat()
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
                raise ValueError("No active QR session")
            
            session = result.data[0]
            
            # Verify QR code
            if session.get("current_code") != qr_code:
                raise ValueError("Invalid or expired QR code")
            
            attendance_date = session["attendance_date"]
            
            # Get enrollment
            enrollment_result = self.supabase.table("enrollments").select("*").eq("class_id", class_id).eq("student_id", student_id).eq("status", "active").execute()
            
            if not enrollment_result.data:
                raise ValueError("Student not enrolled in this class")
            
            enrollment = enrollment_result.data[0]
            student_record_id = enrollment.get("student_record_id")
            
            # Get student details
            student = self.get_student(student_id)
            if not student:
                raise ValueError("Student not found")
            
            # Update class attendance
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
                # Create new student record
                new_student = {
                    "id": student_record_id,
                    "name": student.get("name"),
                    "rollNo": student.get("roll_no", ""),
                    "email": student.get("email"),
                    "attendance": {attendance_date: "P"}
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
        """Stop an active QR session and mark absent students"""
        try:
            # Get active session
            result = self.supabase.table("qr_sessions").select("*").eq("class_id", class_id).eq("status", "active").execute()
            
            if not result.data:
                raise ValueError("No active QR session")
            
            session = result.data[0]
            
            # Verify teacher
            if session.get("teacher_id") != teacher_id:
                raise ValueError("Unauthorized")
            
            attendance_date = session["attendance_date"]
            scanned_ids = set(session.get("scanned_students", []))
            
            # Get class and enrollments
            class_data = self.get_class_by_id(class_id)
            if not class_data:
                raise ValueError("Class not found")
            
            students = class_data.get("students", [])
            enrollments = self.get_class_enrollments(class_id)
            active_student_ids = {e.get("student_record_id") for e in enrollments}
            
            # Mark absent students
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
            
            # Stop session
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
    
    def get_all_qr_sessions(self, class_id: str = None, teacher_id: str = None, status: str = None) -> List[Dict[str, Any]]:
        """Get QR sessions with optional filters"""
        try:
            query = self.supabase.table("qr_sessions").select("*")
            
            if class_id:
                query = query.eq("class_id", class_id)
            if teacher_id:
                query = query.eq("teacher_id", teacher_id)
            if status:
                query = query.eq("status", status)
            
            result = query.execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting QR sessions: {e}")
            return []

    def get_qr_sessions_dir(self) -> str:
        return os.path.join(self.base_dir, "qr_sessions")

    def ensure_qr_sessions_dir(self):
        os.makedirs(self.get_qr_sessions_dir(), exist_ok=True)
    
    def get_qr_session_file(self, class_id: str) -> str:
        self.ensure_qr_sessions_dir()
        return os.path.join(self.base_dir, "qr_sessions", f"class_{class_id}.json")
    
    # ==================== CONTACT MESSAGE OPERATIONS ====================
    
    def save_contact_message(self, name: str, email: str, message: str) -> bool:
        """Save a contact form message"""
        try:
            data = {
                "name": name,
                "email": email,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            }
            self.supabase.table("contact_messages").insert(data).execute()
            return True
        except Exception as e:
            print(f"Error saving contact message: {e}")
            return False
    
    def get_contact_messages(self, email: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get contact messages, optionally filtered by email"""
        try:
            query = self.supabase.table("contact_messages").select("*").order("created_at", desc=True).limit(limit)
            
            if email:
                query = query.eq("email", email)
            
            result = query.execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting contact messages: {e}")
            return []
    
    def delete_contact_message(self, message_id: int) -> bool:
        """Delete a contact message"""
        try:
            self.supabase.table("contact_messages").delete().eq("id", message_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting contact message: {e}")
            return False
    
    # ==================== TEACHER OVERVIEW OPERATIONS ====================
    
    def get_user_overview(self, teacher_id: str) -> Dict[str, Any]:
        """Get overview statistics for a teacher"""
        try:
            # Get all classes
            classes = self.get_classes_by_teacher(teacher_id)
            total_classes = len(classes)
            
            # Count total students across all classes
            total_students = 0
            for cls in classes:
                enrollments = self.get_class_enrollments(cls["id"])
                total_students += len(enrollments)
            
            return {
                "total_classes": total_classes,
                "total_students": total_students,
                "classes": classes
            }
        except Exception as e:
            print(f"Error getting user overview: {e}")
            return {
                "total_classes": 0,
                "total_students": 0,
                "classes": []
            }
    
    def update_user_overview(self, teacher_id: str) -> bool:
        """Update teacher overview (for compatibility - no-op as data is computed on-demand)"""
        # Overview is now computed on-demand, so this is a no-op
        return True
    
    # ==================== DATABASE STATISTICS ====================
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get overall database statistics"""
        try:
            users_result = self.supabase.table("users").select("id", count="exact").execute()
            students_result = self.supabase.table("students").select("id", count="exact").execute()
            classes_result = self.supabase.table("classes").select("id", count="exact").execute()
            enrollments_result = self.supabase.table("enrollments").select("id", count="exact").eq("status", "active").execute()
            qr_sessions_result = self.supabase.table("qr_sessions").select("id", count="exact").execute()
            contact_messages_result = self.supabase.table("contact_messages").select("id", count="exact").execute()
            
            return {
                "total_users": users_result.count or 0,
                "total_students": students_result.count or 0,
                "total_classes": classes_result.count or 0,
                "total_active_enrollments": enrollments_result.count or 0,
                "total_qr_sessions": qr_sessions_result.count or 0,
                "total_contact_messages": contact_messages_result.count or 0,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"Error getting database stats: {e}")
            return {
                "total_users": 0,
                "total_students": 0,
                "total_classes": 0,
                "total_active_enrollments": 0,
                "total_qr_sessions": 0,
                "total_contact_messages": 0,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    # ==================== UTILITY METHODS ====================
    
    def health_check(self) -> Dict[str, Any]:
        """Check database connection health"""
        try:
            # Try a simple query
            result = self.supabase.table("users").select("id").limit(1).execute()
            return {
                "status": "healthy",
                "connected": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def cleanup_old_qr_sessions(self, days: int = 7) -> int:
        """Clean up old QR sessions older than specified days"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            result = self.supabase.table("qr_sessions").delete().lt("created_at", cutoff_date.isoformat()).execute()
            return len(result.data) if result.data else 0
        except Exception as e:
            print(f"Error cleaning up old QR sessions: {e}")
            return 0


# ==================== GLOBAL INSTANCE ====================
db = DatabaseManager()
