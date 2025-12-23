import json
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
import shutil
# ===== Supabase Postgres + SQLAlchemy setup =====
from sqlalchemy import create_engine, Column, String, DateTime, JSON
from sqlalchemy.orm import sessionmaker, declarative_base, Session

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL env var is not set")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "teacher" or "student"
    created_at = Column(DateTime, default=datetime.utcnow)


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    roll_no = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Class(Base):
    __tablename__ = "classes"

    id = Column(String, primary_key=True, index=True)
    teacher_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    students = Column(JSON, default=list)
    custom_columns = Column(JSON, default=list)
    thresholds = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
# =================================================


class DatabaseManager:
    """Manages file-based database operations with student support"""
    
    def __init__(self, base_dir: str = "data"):
        self.base_dir = base_dir
        self.users_dir = os.path.join(base_dir, "users")
        self.students_dir = os.path.join(base_dir, "students")
        self.contact_dir = os.path.join(base_dir, "contact")
        self.enrollments_dir = os.path.join(base_dir, "enrollments")
        self._ensure_directories()
        
        # SQLAlchemy session factory for Supabase
        self._SessionLocal = SessionLocal
    
    def _ensure_directories(self):
        """Ensure all base directories exist"""
        os.makedirs(self.users_dir, exist_ok=True)
        os.makedirs(self.students_dir, exist_ok=True)
        os.makedirs(self.contact_dir, exist_ok=True)
        os.makedirs(self.enrollments_dir, exist_ok=True)
    
    def get_user_dir(self, user_id: str) -> str:
        """Get user directory path"""
        return os.path.join(self.users_dir, user_id)
    
    def get_student_dir(self, student_id: str) -> str:
        """Get student directory path"""
        return os.path.join(self.students_dir, student_id)
    
    def get_user_classes_dir(self, user_id: str) -> str:
        """Get user classes directory path"""
        return os.path.join(self.get_user_dir(user_id), "classes")
    
    def get_user_file(self, user_id: str) -> str:
        """Get user.json file path"""
        return os.path.join(self.get_user_dir(user_id), "user.json")
    
    def get_student_file(self, student_id: str) -> str:
        """Get student.json file path"""
        return os.path.join(self.get_student_dir(student_id), "student.json")
    
    def get_class_file(self, user_id: str, class_id: str) -> str:
        """Get class json file path"""
        return os.path.join(self.get_user_classes_dir(user_id), f"class_{class_id}.json")
    
    def get_enrollment_file(self, class_id: str) -> str:
        """Get enrollment file for a class"""
        return os.path.join(self.enrollments_dir, f"class_{class_id}_enrollments.json")
    
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

    def scan_qr_code(self, student_id: str, class_id: str, qr_code: str) -> Dict[str, Any]:
        """
        Handle a student scanning a QR code.

        - Validates there is an active session for the class
        - Validates the current code matches qr_code
        - Marks the student's attendance as Present (P) for that date
        - Records the student_record_id in scanned_students so stop_qr_session knows who scanned
        """
        # 1) Load session
        session_file = self.get_qr_session_file(class_id)
        session_data = self.read_json(session_file)

        if not session_data or session_data.get("status") != "active":
            raise ValueError("No active session")

        current_code = session_data.get("current_code")
        if current_code != qr_code:
            raise ValueError("Invalid or expired QR code")

        attendance_date = session_data["attendance_date"]

        # 2) Find enrollment for this student
        enrollment_file = self.get_enrollment_file(class_id)
        all_enrollments: List[Dict[str, Any]] = self.read_json(enrollment_file) or []

        enrollment: Optional[Dict[str, Any]] = None
        for e in all_enrollments:
            if e.get("student_id") == student_id and e.get("status") == "active":
                enrollment = e
                break

        if not enrollment:
            raise ValueError("Student not actively enrolled in this class")

        student_record_id = enrollment.get("student_record_id")

        # 3) Load class and mark attendance = 'P'
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
            # create record if somehow missing
            new_student = {
                "id": student_record_id,
                "name": enrollment.get("name"),
                "rollNo": enrollment.get("roll_no"),
                "email": enrollment.get("email"),
                "attendance": {attendance_date: "P"},
            }
            students.append(new_student)
            class_data["students"] = students

        # save class
        teacher_id = class_data.get("teacher_id")
        class_file = self.get_class_file(teacher_id, class_id)
        self.write_json(class_file, class_data)

        # 4) Record scan in session
        scanned: List[str] = session_data.get("scanned_students", [])
        if student_record_id not in scanned:
            scanned.append(student_record_id)
        session_data["scanned_students"] = scanned
        session_data["last_scan_at"] = datetime.utcnow().isoformat()
        self.write_json(session_file, session_data)

        return {
            "success": True,
            "message": "Attendance marked as Present",
            "date": attendance_date,
        }


    def stop_qr_session(self, class_id: str, teacher_id: str) -> Dict[str, Any]:
        """
        Stop an active QR session:
        - Marks enrolled students who did NOT scan as Absent (A) for that date
        - Leaves scanned students as already marked Present (P)
        - Closes the QR session
        """
        # 1) Load session
        session_file = self.get_qr_session_file(class_id)
        session_data = self.read_json(session_file)

        if not session_data or session_data.get("status") != "active":
            raise ValueError("No active session")

        if session_data.get("teacher_id") != teacher_id:
            raise ValueError("Unauthorized")

        attendance_date = session_data["attendance_date"]
        scanned_ids = set(session_data.get("scanned_students", []))

        # 2) Load class and enrollments
        class_data = self.get_class_by_id(class_id)
        if not class_data:
            raise ValueError("Class not found")

        students = class_data.get("students", [])

        enrollment_file = self.get_enrollment_file(class_id)
        all_enrollments = self.read_json(enrollment_file) or []
        active_student_ids = {
            e.get("student_record_id")
            for e in all_enrollments
            if e.get("status") == "active"
        }

        # 3) Mark absents for enrolled but not scanned
        marked_absent = 0
        for student in students:
            sid = student.get("id")
            if sid in active_student_ids and sid not in scanned_ids:
                student.setdefault("attendance", {})
                # Only mark if not already marked P by scan_qr_code
                if student["attendance"].get(attendance_date) is None:
                    student["attendance"][attendance_date] = "A"
                    marked_absent += 1

        # 4) Save updated class
        teacher_in_class = class_data.get("teacher_id")
        class_file = self.get_class_file(teacher_in_class, class_id)
        self.write_json(class_file, class_data)

        # 5) Close session
        session_data["status"] = "stopped"
        session_data["stopped_at"] = datetime.utcnow().isoformat()
        self.write_json(session_file, session_data)

        return {
            "success": True,
            "scanned_count": len(scanned_ids),
            "absent_count": marked_absent,
            "date": attendance_date,
        }

    # ==================== USER OPERATIONS ====================
    
    def create_user(self, user_id: str, email: str, name: str, password_hash: str, role: str = "teacher") -> Dict[str, Any]:
        """
        Create teacher user in Supabase and return same dict structure as before.
        """
        db: Session = self._SessionLocal()
        try:
            user = User(
                id=user_id,
                email=email,
                name=name,
                password_hash=password_hash,
                role=role,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "password": user.password_hash,
                "role": user.role,
            }
        finally:
            db.close()
    
    def create_student(self, student_id: str, email: str, name: str, password_hash: str) -> Dict[str, Any]:
        """Create a new student user"""
        student_dir = self.get_student_dir(student_id)
        os.makedirs(student_dir, exist_ok=True)
        
        student_data = {
            "id": student_id,
            "email": email,
            "name": name,
            "password": password_hash,
            "created_at": datetime.utcnow().isoformat(),
            "verified": True,
            "role": "student",
            "enrolled_classes": []
        }
        
        self.write_json(self.get_student_file(student_id), student_data)
        return student_data
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data"""
        db: Session = self._SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            return {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "password": user.password_hash,
                "role": user.role,
            }
        finally:
            db.close()
    
    def get_student(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Get student data"""
        return self.read_json(self.get_student_file(student_id))
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Return teacher user dict or None.
        Must match what main.py expects:
        { "id": str, "email": str, "name": str, "password": str, "role": str }
        """
        db: Session = self._SessionLocal()
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                return None
            return {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "password": user.password_hash,
                "role": user.role,
            }
        finally:
            db.close()
    
    def get_student_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get student by email"""
        if not os.path.exists(self.students_dir):
            return None
        
        for student_id in os.listdir(self.students_dir):
            student_file = self.get_student_file(student_id)
            student_data = self.read_json(student_file)
            if student_data and student_data.get("email") == email:
                return student_data
        return None
    
    def update_user(self, user_id: str, **updates) -> Dict[str, Any]:
        """Update user data"""
        user_data = self.get_user(user_id)
        if not user_data:
            raise ValueError(f"User {user_id} not found")
        
        user_data.update(updates)
        user_data["updated_at"] = datetime.utcnow().isoformat()
        self.write_json(self.get_user_file(user_id), user_data)
        return user_data
    
    def update_student(self, student_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update student data"""
        student_data = self.get_student(student_id)
        if not student_data:
            raise ValueError(f"Student {student_id} not found")
        
        student_data.update(updates)
        student_data["updated_at"] = datetime.utcnow().isoformat()
        self.write_json(self.get_student_file(student_id), student_data)
        return student_data
    
    def delete_user(self, user_id: str) -> bool:
        """Delete user and all associated data"""
        db: Session = self._SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            db.delete(user)
            db.commit()
            return True
        finally:
            db.close()
    
    def delete_student(self, student_id: str) -> bool:
        """Delete student account and all their data, clean up enrollments"""
        print(f"\n[DELETE_STUDENT] Starting deletion for student {student_id}")
        try:
            student_data = self.get_student(student_id)
            if not student_data:
                print(f"[DELETE_STUDENT] Student {student_id} not found")
                return False
            
            enrolled_classes = student_data.get("enrolled_classes", [])
            print(f"[DELETE_STUDENT] Student is enrolled in {len(enrolled_classes)} classes")
            
            for enrollment_info in enrolled_classes:
                class_id = enrollment_info.get("class_id")
                if not class_id:
                    continue
                
                print(f"[DELETE_STUDENT] Processing class {class_id}")
                enrollment_file = self.get_enrollment_file(class_id)
                if os.path.exists(enrollment_file):
                    enrollments = self.read_json(enrollment_file) or []
                    original_count = len(enrollments)
                    updated_enrollments = [e for e in enrollments if e.get("student_id") != student_id]
                    self.write_json(enrollment_file, updated_enrollments)
                    print(f"[DELETE_STUDENT] Updated enrollments for class {class_id}: {original_count} -> {len(updated_enrollments)}")
                
                class_data = self.get_class_by_id(class_id)
                if class_data:
                    teacher_id = class_data.get("teacher_id")
                    if teacher_id:
                        self.update_user_overview(teacher_id)
                        print(f"[DELETE_STUDENT] Updated teacher {teacher_id} overview")
            
            student_dir = self.get_student_dir(student_id)
            if os.path.exists(student_dir):
                shutil.rmtree(student_dir)
                print(f"[DELETE_STUDENT] Deleted student directory")
            
            print(f"[DELETE_STUDENT] ✅ Successfully deleted student {student_id}\n")
            return True
        except Exception as e:
            print(f"[DELETE_STUDENT] ❌ ERROR: {e}")
            return False
    
    def update_user_overview(self, user_id: str):
        """Update user overview statistics - counts only ACTIVE enrollments"""
        user_data = self.get_user(user_id)
        if not user_data:
            return
        
        classes = self.get_all_classes(user_id)
        total_active_students = 0
        
        for cls in classes:
            class_id = cls.get("id")
            enrollments = self.get_class_enrollments(str(class_id))
            total_active_students += len(enrollments)
        
        user_data["overview"] = {
            "total_classes": len(classes),
            "total_students": total_active_students,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        self.write_json(self.get_user_file(user_id), user_data)

    # ==================== CLASS OPERATIONS ====================
    
    def create_class(self, user_id: str, class_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new class"""
        class_id = str(class_data["id"])
        full_class_data = {
            **class_data,
            "teacher_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "statistics": self.calculate_class_statistics(class_data, class_id)
        }
        
        class_file = self.get_class_file(user_id, class_id)
        self.write_json(class_file, full_class_data)
        self.update_user_overview(user_id)
        
        return full_class_data
    
    def get_class(self, user_id: str, class_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific class - FILTERS to show only ACTIVE students"""
        class_file = self.get_class_file(user_id, class_id)
        class_data = self.read_json(class_file)
        
        if not class_data:
            return None
        
        # Get ACTIVE enrollments only
        active_enrollments = self.get_class_enrollments(class_id)
        active_record_ids = {e.get('student_record_id') for e in active_enrollments}
        
        # Filter students to only active ones
        all_students = class_data.get('students', [])
        active_students = [s for s in all_students if s.get('id') in active_record_ids]
        
        # Return class with only active students
        class_data_copy = class_data.copy()
        class_data_copy['students'] = active_students
        
        print(f"[GET_CLASS] Class {class_id}: {len(all_students)} total, {len(active_students)} active shown to teacher")
        
        return class_data_copy
    
    def get_class_by_id(self, class_id: str) -> Optional[Dict[str, Any]]:
        """Get a class by ID - returns RAW data with ALL students (for internal use)"""
        if not os.path.exists(self.users_dir):
            return None
        
        for teacher_id in os.listdir(self.users_dir):
            classes_dir = self.get_user_classes_dir(teacher_id)
            if os.path.exists(classes_dir):
                class_file = os.path.join(classes_dir, f"class_{class_id}.json")
                if os.path.exists(class_file):
                    return self.read_json(class_file)
        return None
    
    def get_all_classes(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all classes for a user - FILTERS to show only ACTIVE students"""
        classes_dir = self.get_user_classes_dir(user_id)
        if not os.path.exists(classes_dir):
            return []
        
        classes = []
        for filename in os.listdir(classes_dir):
            if filename.startswith("class_") and filename.endswith(".json"):
                class_file = os.path.join(classes_dir, filename)
                class_data = self.read_json(class_file)
                if class_data:
                    class_id = str(class_data.get('id'))
                    
                    # Get active enrollments
                    active_enrollments = self.get_class_enrollments(class_id)
                    active_record_ids = {e.get('student_record_id') for e in active_enrollments}
                    
                    # Filter to only active students
                    all_students = class_data.get('students', [])
                    active_students = [s for s in all_students if s.get('id') in active_record_ids]
                    
                    class_data_copy = class_data.copy()
                    class_data_copy['students'] = active_students
                    classes.append(class_data_copy)
        
        return classes
    
    def update_class(self, user_id: str, class_id: str, class_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update class data - preserves inactive students"""
        # Get FULL current class (with ALL students including inactive)
        class_file = self.get_class_file(user_id, class_id)
        current_class = self.read_json(class_file)
        
        if not current_class:
            raise ValueError(f"Class {class_id} not found")
        
        all_students_in_file = current_class.get('students', [])
        incoming_students = class_data.get('students', [])
        
        # Check for deleted students
        current_ids = {s.get('id') for s in all_students_in_file}
        new_ids = {s.get('id') for s in incoming_students}
        deleted_ids = current_ids - new_ids
        
        # Mark deleted students as inactive in enrollments
        if deleted_ids:
            enrollment_file = self.get_enrollment_file(class_id)
            enrollments = self.read_json(enrollment_file) or []
            
            for enrollment in enrollments:
                if enrollment.get('student_record_id') in deleted_ids and enrollment.get('status') == 'active':
                    enrollment['status'] = 'inactive'
                    enrollment['removed_by_teacher_at'] = datetime.utcnow().isoformat()
                    
                    # Update student's enrolled_classes
                    student_id = enrollment.get('student_id')
                    if student_id:
                        try:
                            student_data = self.get_student(student_id)
                            if student_data:
                                enrolled_classes = student_data.get('enrolled_classes', [])
                                enrolled_classes = [ec for ec in enrolled_classes if ec.get('class_id') != class_id]
                                self.update_student(student_id, {"enrolled_classes": enrolled_classes})
                        except Exception as e:
                            print(f"Error updating student {student_id}: {e}")
            
            self.write_json(enrollment_file, enrollments)
        
        # Build final student list (active + inactive preserved)
        updated_students_map = {s.get('id'): s for s in incoming_students}
        final_students = []
        
        for student in all_students_in_file:
            student_id = student.get('id')
            if student_id in updated_students_map:
                # Active student - use updated data
                final_students.append(updated_students_map[student_id])
            else:
                # Inactive student - preserve from file
                final_students.append(student)
        
        # Update and save
        class_data['students'] = final_students
        class_data["updated_at"] = datetime.utcnow().isoformat()
        class_data["statistics"] = self.calculate_class_statistics(class_data, class_id)
        
        self.write_json(class_file, class_data)
        self.update_user_overview(user_id)
        
        return class_data
    
    def delete_class(self, user_id: str, class_id: str) -> bool:
        """Delete a class and clean up enrollments"""
        class_file = self.get_class_file(user_id, class_id)
        if not os.path.exists(class_file):
            return False
        
        os.remove(class_file)
        
        enrollment_file = self.get_enrollment_file(class_id)
        if os.path.exists(enrollment_file):
            enrollments = self.read_json(enrollment_file) or []
            for enrollment in enrollments:
                student_id = enrollment.get("student_id")
                if student_id:
                    try:
                        student_data = self.get_student(student_id)
                        if student_data:
                            enrolled_classes = student_data.get("enrolled_classes", [])
                            enrolled_classes = [ec for ec in enrolled_classes if ec.get("class_id") != class_id]
                            self.update_student(student_id, {"enrolled_classes": enrolled_classes})
                    except Exception as e:
                        print(f"Error updating student {student_id} after class deletion: {e}")
            os.remove(enrollment_file)
        
        self.update_user_overview(user_id)
        return True
    
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
                "avg_attendance": 0.000,
                "at_risk_count": 0,
                "excellent_count": 0
            }
        
        thresholds = class_data.get("thresholds")
        if thresholds is None:
            thresholds = {
                "excellent": 95.000,
                "good": 90.000,
                "moderate": 85.000,
                "atRisk": 85.000
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
                
                if percentage >= thresholds.get("excellent", 95.000):
                    excellent += 1
                elif percentage < thresholds.get("moderate", 85.000):
                    at_risk += 1
        
        avg_attendance = (total_attendance / len(active_students)) if active_students else 0.0
        
        return {
            "total_students": len(active_students),
            "avg_attendance": round(avg_attendance, 3),
            "at_risk_count": at_risk,
            "excellent_count": excellent,
            "last_calculated": datetime.utcnow().isoformat()
        }

    # ==================== ENROLLMENT OPERATIONS ====================
    
    def _generate_student_record_id(self) -> int:
        """Generate unique student record ID for a class"""
        return int(datetime.utcnow().timestamp() * 1000)
    
    def get_teacher_name(self, teacher_id: str) -> str:
        """Get teacher name by ID"""
        teacher = self.get_user(teacher_id)
        return teacher.get('name', 'Unknown') if teacher else 'Unknown'
    
    def enroll_student(self, student_id: str, class_id: str, student_info: dict) -> dict:
        """
        Enroll a student in a class.
        - Uses student_id to check if they were enrolled before
        - If re-enrolling, restores their exact same record with all attendance
        - If new, creates new record
        """
        print(f"\n{'='*60}")
        print(f"[ENROLL] Student enrolling")
        print(f"  Student ID: {student_id}")
        print(f"  Class ID: {class_id}")
        print(f"{'='*60}")
        
        # Verify class exists
        class_data = self.get_class_by_id(class_id)
        if not class_data:
            raise ValueError("Class not found")
        
        teacher_id = class_data.get('teacher_id')
        if not teacher_id:
            raise ValueError("Invalid class data")
        
        # Get enrollment file
        enrollment_file = self.get_enrollment_file(class_id)
        enrollments = self.read_json(enrollment_file) or []
        
        print(f"[ENROLL] Found {len(enrollments)} total enrollments")
        
        # Check if ACTIVELY enrolled
        for enrollment in enrollments:
            if enrollment.get('student_id') == student_id and enrollment.get('status') == 'active':
                raise ValueError("You are already enrolled in this class")
        
        # Check if was EVER enrolled before
        previous_enrollment = None
        for enrollment in enrollments:
            if enrollment.get('student_id') == student_id:
                previous_enrollment = enrollment
                print(f"[ENROLL] Found previous enrollment (status: {enrollment.get('status')})")
                break
        
        class_file = self.get_class_file(teacher_id, class_id)
        students = class_data.get('students', [])
        
        if previous_enrollment:
            # RE-ENROLLMENT
            print(f"[RE-ENROLLMENT] Reactivating enrollment")
            student_record_id = previous_enrollment['student_record_id']
            
            # Reactivate enrollment
            previous_enrollment['status'] = 'active'
            previous_enrollment['re_enrolled_at'] = datetime.utcnow().isoformat()
            previous_enrollment['roll_no'] = student_info['rollNo']
            self.write_json(enrollment_file, enrollments)
            
            # Find student record
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
            
            class_data['students'] = students
            self.write_json(class_file, class_data)
            
            # Update student's enrolled_classes
            student_data = self.get_student(student_id)
            if student_data:
                enrolled_classes = student_data.get('enrolled_classes', [])
                class_info = {
                    "class_id": class_id,
                    "class_name": class_data.get('name'),
                    "teacher_name": self.get_teacher_name(teacher_id),
                    "enrolled_at": previous_enrollment.get('enrolled_at'),
                    "re_enrolled_at": previous_enrollment['re_enrolled_at']
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
            
            new_enrollment = {
                "student_id": student_id,
                "student_record_id": student_record_id,
                "class_id": class_id,
                "name": student_info['name'],
                "roll_no": student_info['rollNo'],
                "email": student_info['email'],
                "enrolled_at": datetime.utcnow().isoformat(),
                "status": "active"
            }
            
            enrollments.append(new_enrollment)
            self.write_json(enrollment_file, enrollments)
            
            new_student = {
                "id": student_record_id,
                "rollNo": student_info['rollNo'],
                "name": student_info['name'],
                "email": student_info['email'],
                "attendance": {}
            }
            students.append(new_student)
            class_data['students'] = students
            self.write_json(class_file, class_data)
            
            # Update student's enrolled_classes
            student_data = self.get_student(student_id)
            if student_data:
                enrolled_classes = student_data.get('enrolled_classes', [])
                class_info = {
                    "class_id": class_id,
                    "class_name": class_data.get('name'),
                    "teacher_name": self.get_teacher_name(teacher_id),
                    "enrolled_at": new_enrollment['enrolled_at']
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
    
    def unenroll_student(self, student_id: str, class_id: str) -> bool:
        """
        Unenroll a student from a class
        - Marks enrollment as 'inactive' (NOT deleted!)
        - Student record stays in class with ALL attendance
        - Teacher won't see them (filtered by get_class)
        """
        print(f"\n{'='*60}")
        print(f"[UNENROLL] Student leaving class")
        print(f"  Student ID: {student_id}")
        print(f"  Class ID: {class_id}")
        print(f"{'='*60}")
        
        try:
            # Get ALL enrollments (not just active)
            enrollment_file = self.get_enrollment_file(class_id)
            all_enrollments = self.read_json(enrollment_file) or []
            
            print(f"[UNENROLL] Found {len(all_enrollments)} total enrollments")
            
            # Find active enrollment
            found = False
            for enrollment in all_enrollments:
                if enrollment.get("student_id") == student_id and enrollment.get("status") == "active":
                    found = True
                    student_record_id = enrollment.get('student_record_id')
                    print(f"[UNENROLL] Found active enrollment (record ID: {student_record_id})")
                    
                    # Check attendance data
                    class_data = self.get_class_by_id(class_id)
                    if class_data:
                        for s in class_data.get('students', []):
                            if s.get('id') == student_record_id:
                                attendance_count = len(s.get('attendance', {}))
                                print(f"[UNENROLL] Student has {attendance_count} attendance records (WILL BE PRESERVED)")
                                break
                    
                    # Mark as INACTIVE (don't delete!)
                    enrollment['status'] = 'inactive'
                    enrollment['unenrolled_at'] = datetime.utcnow().isoformat()
                    print(f"[UNENROLL] ✅ Marked as INACTIVE")
                    break
            
            if not found:
                print(f"[UNENROLL] ❌ Student not actively enrolled")
                return False
            
            # Write back ALL enrollments (including inactive)
            self.write_json(enrollment_file, all_enrollments)
            print(f"[UNENROLL] Saved {len(all_enrollments)} enrollments (including inactive)")
            
            # Remove from student's enrolled_classes list
            student_data = self.get_student(student_id)
            if student_data:
                enrolled_classes = student_data.get("enrolled_classes", [])
                enrolled_classes = [ec for ec in enrolled_classes if ec.get("class_id") != class_id]
                self.update_student(student_id, {"enrolled_classes": enrolled_classes})
                print(f"[UNENROLL] Updated student's enrolled_classes")
            
            # Update teacher overview
            class_data = self.get_class_by_id(class_id)
            if class_data:
                teacher_id = class_data.get("teacher_id")
                if teacher_id:
                    self.update_user_overview(teacher_id)
            
            print(f"[UNENROLL] ✅ SUCCESS: Data preserved, student hidden from teacher")
            print(f"{'='*60}\n")
            return True
            
        except Exception as e:
            print(f"[UNENROLL] ❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_class_enrollments(self, class_id: str) -> List[Dict[str, Any]]:
        """Get all ACTIVE enrollments for a class"""
        enrollment_file = self.get_enrollment_file(class_id)
        all_enrollments = self.read_json(enrollment_file) or []
        
        # Filter to only active
        active_enrollments = [e for e in all_enrollments if e.get('status') == 'active']
        
        return active_enrollments
    
    def get_student_enrollments(self, student_id: str) -> List[Dict[str, Any]]:
        """Get all classes a student is enrolled in"""
        student_data = self.get_student(student_id)
        if not student_data:
            return []
        return student_data.get("enrolled_classes", [])
    
    def get_student_class_details(self, student_id: str, class_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a student's enrollment in a class"""
        print(f"[GET_DETAILS] Getting details for student {student_id} in class {class_id}")
        
        class_data = self.get_class_by_id(class_id)
        if not class_data:
            print(f"[GET_DETAILS] Class not found")
            return None
        
        enrollments = self.get_class_enrollments(class_id)
        student_enrollment = None
        for e in enrollments:
            if e.get("student_id") == student_id:
                student_enrollment = e
                break
        
        if not student_enrollment:
            print(f"[GET_DETAILS] Student not enrolled (no active enrollment)")
            return None
        
        print(f"[GET_DETAILS] Student has active enrollment")
        
        student_record_id = student_enrollment.get("student_record_id")
        student_record = None
        for student in class_data.get("students", []):
            if student.get("id") == student_record_id:
                student_record = student
                print(f"[GET_DETAILS] Found student record by record_id: {student_record_id}")
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
    
    def calculate_student_statistics(self, student_record: Dict[str, Any], thresholds: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate attendance statistics for a student"""
        if not thresholds:
            thresholds = {
                "excellent": 95.000,
                "good": 90.000,
                "moderate": 85.000,
                "atRisk": 85.000
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

    # ==================== CONTACT OPERATIONS ====================
    
    def save_contact_message(self, email: str, message_data: Dict[str, Any]) -> bool:
        """Save a contact form message"""
        try:
            contact_file = os.path.join(self.contact_dir, "contact.json")
            messages = []
            
            if os.path.exists(contact_file):
                messages = self.read_json(contact_file) or []
            
            message_entry = {
                "email": email,
                "timestamp": datetime.utcnow().isoformat(),
                **message_data
            }
            
            messages.append(message_entry)
            self.write_json(contact_file, messages)
            
            return True
        except Exception as e:
            print(f"Error saving contact message: {e}")
            return False
    
    def get_contact_messages(self, email: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get contact messages, optionally filtered by email"""
        contact_file = os.path.join(self.contact_dir, "contact.json")
        if not os.path.exists(contact_file):
            return []
        
        messages = self.read_json(contact_file) or []
        
        if email:
            messages = [m for m in messages if m.get("email") == email]
        
        return messages

    # ==================== QR CODE SYSTEM ====================

    def get_qr_sessions_dir(self) -> str:
        return os.path.join(self.base_dir, "qr_sessions")

    def ensure_qr_sessions_dir(self):
        os.makedirs(self.get_qr_sessions_dir(), exist_ok=True)

    def get_qr_session_file(self, class_id: str) -> str:
        self.ensure_qr_sessions_dir()
        return os.path.join(self.base_dir, "qr_sessions", f"class_{class_id}.json")

    def _generate_qr_code(self) -> str:
        import random, string
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

    def start_qr_session(self, class_id: str, teacher_id: str, rotation_interval: int = 5) -> dict:
        print(f"\n{'='*60}")
        print(f"[QR_SESSION] Starting QR session for class {class_id}")
        
        class_data = self.get_class_by_id(class_id)
        if not class_data or class_data.get("teacher_id") != teacher_id:
            raise ValueError("Class not found or unauthorized")
        
        session_file = self.get_qr_session_file(class_id)
        today = datetime.now().strftime("%Y-%m-%d")
        
        session_data = {
            "class_id": class_id,
            "teacher_id": teacher_id,
            "started_at": datetime.now().isoformat(),
            "rotation_interval": rotation_interval,
            "current_code": self._generate_qr_code(),
            "code_generated_at": datetime.now().isoformat(),
            "scanned_students": [],
            "attendance_date": today,
            "status": "active"
        }
        
        self.write_json(session_file, session_data)
        print(f"[QR_SESSION] ✅ Session started: {session_data['current_code']}")
        print(f"{'='*60}\n")
        return session_data

    def get_qr_session(self, class_id: str) -> dict:
        session_file = self.get_qr_session_file(class_id)
        session_data = self.read_json(session_file)
        
        if not session_data or session_data.get("status") != "active":
            return None
        
        # Auto-rotate code
        from datetime import datetime
        code_time = datetime.fromisoformat(session_data["code_generated_at"])
        elapsed = (datetime.now() - code_time).total_seconds()
        
        if elapsed >= session_data["rotation_interval"]:
            session_data["current_code"] = self._generate_qr_code()
            session_data["code_generated_at"] = datetime.now().isoformat()
            self.write_json(session_file, session_data)
            print(f"[QR] Auto-rotated code for {class_id}")
        
        return session_data

    # ==================== BACKUP & MAINTENANCE ====================
    
    def backup_user_data(self, user_id: str, backup_dir: str = "backups"):
        """Create a backup of user data"""
        user_dir = self.get_user_dir(user_id)
        if not os.path.exists(user_dir):
            raise ValueError(f"User {user_id} not found")
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(backup_dir, f"user_{user_id}_{timestamp}")
        shutil.copytree(user_dir, backup_path)
        
        return backup_path
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get overall database statistics"""
        total_users = len(os.listdir(self.users_dir)) if os.path.exists(self.users_dir) else 0
        total_students = len(os.listdir(self.students_dir)) if os.path.exists(self.students_dir) else 0
        
        total_classes = 0
        total_class_students = 0
        
        if os.path.exists(self.users_dir):
            for user_id in os.listdir(self.users_dir):
                classes = self.get_all_classes(user_id)
                total_classes += len(classes)
                for cls in classes:
                    total_class_students += len(cls.get("students", []))
        
        return {
            "total_users": total_users,
            "total_students": total_students,
            "total_classes": total_classes,
            "total_class_students": total_class_students,
            "timestamp": datetime.utcnow().isoformat()
        }
