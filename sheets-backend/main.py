from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import os
from datetime import datetime, timedelta
import jwt
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import string
from dotenv import load_dotenv
import ssl

from db_manager import DatabaseManager  # <-- Supabase manager

load_dotenv()

app = FastAPI(title="Lernova Attendsheets API")

# ============= CORS =============
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= DB + CONFIG =============
db = DatabaseManager()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)

verification_codes: Dict[str, str] = {}
password_reset_codes: Dict[str, str] = {}

# ============= MODELS =============

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "teacher"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class StudentCreate(BaseModel):
    student_id: str
    email: EmailStr
    name: str
    password_hash: str
    roll_no: str = ""

class StudentEnrollmentRequest(BaseModel):
    class_id: str
    name: str
    rollNo: str
    email: EmailStr

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    name: str

class ChangePasswordRequest(BaseModel):
    code: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str

class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse

class ClassRequest(BaseModel):
    id: int
    name: str
    students: List[Dict[str, Any]]
    customColumns: List[Dict[str, Any]]
    thresholds: Optional[Dict[str, Any]] = None

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

# NEW MODELS FOR SUPABASE CLASSES/QR
class ClassCreate(BaseModel):
    class_id: str
    name: str
    thresholds: Dict[str, float] = {}
    custom_columns: List[Dict[str, Any]] = []

class EnrollmentCreate(BaseModel):
    class_id: str
    student_id: str
    student_record_id: int
    extra: Dict[str, Any] = {}

class QRStart(BaseModel):
    class_id: str
    attendance_date: str

class QRScan(BaseModel):
    class_id: str
    qr_code: str

# ==================== HELPER FUNCTIONS ====================

def get_password_hash(password: str) -> str:
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return get_password_hash(plain_password) == hashed_password


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def generate_verification_code() -> str:
    """Generate a 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))


def send_verification_email(to_email: str, code: str, name: str):
    """Send verification email"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Verify Your Lernova Attendsheets Account"
        msg['From'] = f"Lernova Attendsheets <{FROM_EMAIL}>"
        msg['To'] = to_email

        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #a8edea;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #a8edea 0%, #c2f5e9 100%); min-height: 100vh;">
                <tr>
                    <td style="padding: 40px 20px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); overflow: hidden;">
                            
                            <!-- Header Section -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #16a085 0%, #2ecc71 100%); padding: 50px 40px; text-align: center;">
                                    <!-- Icon -->
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="70" style="margin: 0 auto 20px; background: white; border-radius: 14px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
                                        <tr>
                                            <td style="padding: 15px; text-align: center;">
                                                <img src="/logo.png" alt="Lernova Attendsheets Logo" width="40" height="40" />
                                            </td>
                                        </tr>
                                    </table>
                                    <!-- Title -->
                                    <h1 style="margin: 0 0 8px 0; color: white; font-size: 28px; font-weight: 600;">Lernova Attendsheets</h1>
                                    <p style="margin: 0; color: white; font-size: 15px; opacity: 0.95;">Modern Attendance Management</p>
                                </td>
                            </tr>

                            <!-- Content Section -->
                            <tr>
                                <td style="padding: 40px;">
                                    <!-- Welcome Message -->
                                    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 26px; font-weight: 600;">Welcome, {name}! 👋</h2>
                                    <p style="margin: 0 0 30px 0; color: #7f8c8d; font-size: 15px; line-height: 1.6;">
                                        Thank you for signing up for Lernova Attendsheets. To complete your registration and start managing attendance, please verify your email address.
                                    </p>

                                    <!-- Code Section -->
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px; background: linear-gradient(135deg, #d4f1f4 0%, #c3f0d8 100%); border-radius: 16px;">
                                        <tr>
                                            <td style="padding: 30px; text-align: center;">
                                                <p style="margin: 0 0 15px 0; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #16a085; text-transform: uppercase;">Your Verification Code</p>
                                                
                                                <!-- Code Box -->
                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: white; border-radius: 12px; margin-bottom: 15px;">
                                                    <tr>
                                                        <td style="padding: 20px; text-align: center;">
                                                            <span style="font-size: 42px; font-weight: 700; letter-spacing: 14px; color: #16a085; font-family: 'Courier New', monospace;">{code}</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <p style="margin: 0; font-size: 13px; color: #16a085;">This code will expire in 15 minutes</p>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- Security Tip -->
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8f9fa; border-left: 4px solid #16a085; border-radius: 8px;">
                                        <tr>
                                            <td style="padding: 15px 20px;">
                                                <p style="margin: 0 0 5px 0; color: #2c3e50; font-size: 14px; font-weight: 600;">Security Tip:</p>
                                                <p style="margin: 0; color: #7f8c8d; font-size: 13px; line-height: 1.5;">If you didn't create an account with Lernova Attendsheets, you can safely ignore this email.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer Section -->
                            <tr>
                                <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #ecf0f1;">
                                    <p style="margin: 0 0 10px 0; color: #95a5a6; font-size: 14px;">
                                        Need help? Contact us at <a href="mailto:support@attendsheets.com" style="color: #16a085; text-decoration: none; font-weight: 500;">support@attendsheets.com</a>
                                    </p>
                                    <p style="margin: 0; color: #95a5a6; font-size: 12px;">
                                        © 2025 Lernova Attendsheets. All rights reserved.<br>
                                        Built by students at Atharva University, Mumbai
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        part = MIMEText(html, 'html')
        msg.attach(part)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        print(f"Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

def send_password_reset_email(to_email: str, code: str, name: str):
    """Send password reset email"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Reset Your Lernova Attendsheets Password"
        msg['From'] = f"Lernova Attendsheets <{FROM_EMAIL}>"
        msg['To'] = to_email

        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #a8edea;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #a8edea 0%, #c2f5e9 100%); min-height: 100vh;">
                <tr>
                    <td style="padding: 40px 20px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); overflow: hidden;">
                            
                            <!-- Header Section -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #16a085 0%, #2ecc71 100%); padding: 50px 40px; text-align: center;">
                                    <!-- Icon -->
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="70" style="margin: 0 auto 20px; background: white; border-radius: 14px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
                                        <tr>
                                            <td style="padding: 15px; text-align: center;">
                                                <img src="/logo.png" alt="Lernova Attendsheets Logo" width="40" height="40" />
                                            </td>
                                        </tr>
                                    </table>
                                    <!-- Title -->
                                    <h1 style="margin: 0 0 8px 0; color: white; font-size: 28px; font-weight: 600;">Password Reset</h1>
                                    <p style="margin: 0; color: white; font-size: 15px; opacity: 0.95;">Lernova Attendsheets</p>
                                </td>
                            </tr>

                            <!-- Content Section -->
                            <tr>
                                <td style="padding: 40px;">
                                    <!-- Welcome Message -->
                                    <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 26px; font-weight: 600;">Hi {name}, 🔒</h2>
                                    <p style="margin: 0 0 30px 0; color: #7f8c8d; font-size: 15px; line-height: 1.6;">
                                        We received a request to reset your password for your Lernova Attendsheets account. Use the verification code below to set a new password.
                                    </p>

                                    <!-- Code Section -->
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 25px; background: linear-gradient(135deg, #d4f1f4 0%, #c3f0d8 100%); border-radius: 16px;">
                                        <tr>
                                            <td style="padding: 30px; text-align: center;">
                                                <p style="margin: 0 0 15px 0; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #16a085; text-transform: uppercase;">Your Password Reset Code</p>
                                                
                                                <!-- Code Box -->
                                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: white; border-radius: 12px; margin-bottom: 15px;">
                                                    <tr>
                                                        <td style="padding: 20px; text-align: center;">
                                                            <span style="font-size: 42px; font-weight: 700; letter-spacing: 14px; color: #16a085; font-family: 'Courier New', monospace;">{code}</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                                
                                                <p style="margin: 0; font-size: 13px; color: #16a085;">This code will expire in 15 minutes</p>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Security Tip -->
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8f9fa; border-left: 4px solid #e74c3c; border-radius: 8px;">
                                        <tr>
                                            <td style="padding: 15px 20px;">
                                                <p style="margin: 0 0 5px 0; color: #2c3e50; font-size: 14px; font-weight: 600;">Security Alert:</p>
                                                <p style="margin: 0; color: #7f8c8d; font-size: 13px; line-height: 1.5;">If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer Section -->
                            <tr>
                                <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #ecf0f1;">
                                    <p style="margin: 0 0 10px 0; color: #95a5a6; font-size: 14px;">
                                        Need help? Contact us at <a href="mailto:support@attendsheets.com" style="color: #16a085; text-decoration: none; font-weight: 500;">support@attendsheets.com</a>
                                    </p>
                                    <p style="margin: 0; color: #95a5a6; font-size: 12px;">
                                        © 2025 Lernova Attendsheets. All rights reserved.<br>
                                        Built by students at Atharva University, Mumbai
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        part = MIMEText(html, 'html')
        msg.attach(part)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Error sending reset email: {e}")
        return False

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user email"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = str(payload.get("sub"))
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


# ==================== API ENDPOINTS ====================

@app.get("/")
def read_root():
    return {
        "message": "Lernova Attendsheets API",
        "version": "1.0.0",
        "status": "online",
        "database": "supabase-postgres"
    }


@app.get("/stats")
def get_stats():
    """Get database statistics"""
    return db.get_database_stats()


# ==================== AUTH ENDPOINTS ====================

@app.post("/auth/signup")
async def signup(request: SignupRequest):
    """Sign up a new user"""
    try:
        # Check if user already exists
        existing_user = db.get_user_by_email(request.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        if len(request.password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        code = generate_verification_code()
        print(f"Verification code for {request.email}: {code}")
        
        # Store verification code temporarily
        verification_codes[request.email] = {
            "code": code,
            "name": request.name,
            "password": get_password_hash(request.password),
            "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        }
        
        email_sent = send_verification_email(request.email, code, request.name)
        
        return {
            "success": True,
            "message": "Verification code sent to your email" if email_sent else f"Code: {code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )


@app.post("/auth/verify-email", response_model=TokenResponse)
async def verify_email(request: VerifyEmailRequest):
    """Verify email with code"""
    try:
        if request.email not in verification_codes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No verification code found"
            )
        
        stored_data = verification_codes[request.email]
        expires_at = datetime.fromisoformat(stored_data["expires_at"])
        
        if datetime.utcnow() > expires_at:
            del verification_codes[request.email]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code expired"
            )
        
        if stored_data["code"] != request.code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )
        
        # Create user in database
        user_id = f"user_{int(datetime.utcnow().timestamp())}"
        user_data = db.create_user(
            user_id=user_id,
            email=request.email,
            name=stored_data["name"],
            password_hash=stored_data["password"]
        )
        
        # Clean up verification code
        del verification_codes[request.email]
        
        # Create access token
        access_token = create_access_token(
            data={"sub": request.email},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return TokenResponse(
            access_token=access_token,
            user=UserResponse(id=user_id, email=request.email, name=stored_data["name"])
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )


@app.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login user"""
    user = db.get_user_by_email(request.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not verify_password(request.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(
        data={"sub": request.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"])
    )

@app.post("/auth/resend-verification")
async def resend_verification(request: ResendVerificationRequest):
    """Resend verification code"""
    try:
        # Check if there's already a pending verification for this email
        if request.email not in verification_codes:
            # Check if user already exists
            existing_user = db.get_user_by_email(request.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already verified"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No pending verification found for this email"
                )
        
        # Get the stored data
        stored_data = verification_codes[request.email]
        
        # Generate new code
        code = generate_verification_code()
        print(f"New verification code for {request.email}: {code}")
        
        # Update the stored verification code with new code and expiry
        verification_codes[request.email] = {
            "code": code,
            "name": stored_data["name"],
            "password": stored_data["password"],
            "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        }
        
        # Send new verification email
        email_sent = send_verification_email(request.email, code, stored_data["name"])
        
        return {
            "success": True,
            "message": "New verification code sent to your email" if email_sent else f"Code: {code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Resend verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend verification code: {str(e)}"
        )

@app.post("/auth/request-password-reset")
async def request_password_reset(request: PasswordResetRequest):
    """Request password reset code"""
    user = db.get_user_by_email(request.email)
    
    if not user:
        # Don't reveal if email exists
        return {"success": True, "message": "If account exists, reset code sent"}
    
    code = generate_verification_code()
    print(f"Password reset code for {request.email}: {code}")
    
    password_reset_codes[request.email] = {
        "code": code,
        "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
    }
    
    send_password_reset_email(request.email, code, user["name"])
    
    return {"success": True, "message": "Reset code sent to your email"}


@app.post("/auth/reset-password")
async def reset_password(request: VerifyResetCodeRequest):
    """Reset password with code"""
    if request.email not in password_reset_codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No reset code found"
        )
    
    stored_data = password_reset_codes[request.email]
    expires_at = datetime.fromisoformat(stored_data["expires_at"])
    
    if datetime.utcnow() > expires_at:
        del password_reset_codes[request.email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code expired"
        )
    
    if stored_data["code"] != request.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset code"
        )
    
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    # Update password in database
    user = db.get_user_by_email(request.email)
    if user:
        db.update_user(user["id"], password=get_password_hash(request.new_password))
    
    del password_reset_codes[request.email]
    
    return {"success": True, "message": "Password reset successfully"}


@app.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, email: str = Depends(verify_token)):
    """Change password for logged-in user - supports both teachers and students"""
    if email not in password_reset_codes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No verification code found")
    
    stored_data = password_reset_codes[email]
    expires_at = datetime.fromisoformat(stored_data["expires_at"])
    
    if datetime.utcnow() > expires_at:
        del password_reset_codes[email]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired")
    
    if stored_data["code"] != request.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")
    
    if len(request.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    
    # Try to find as teacher first
    user = db.get_user_by_email(email)
    if user:
        db.update_user(user["id"], password=get_password_hash(request.new_password))
        del password_reset_codes[email]
        return {"success": True, "message": "Password changed successfully"}
    
    # Try to find as student
    student = db.get_student_by_email(email)
    if student:
        db.update_student(student["id"], {"password": get_password_hash(request.new_password)})
        del password_reset_codes[email]
        return {"success": True, "message": "Password changed successfully"}
    
    # Not found in either
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@app.post("/auth/request-change-password")
async def request_change_password(email: str = Depends(verify_token)):
    """Request verification code for password change - supports both teachers and students"""
    # Try to find as teacher first
    user = db.get_user_by_email(email)
    if user:
        code = generate_verification_code()
        print(f"Password change code for {email}: {code}")
        
        password_reset_codes[email] = {
            "code": code,
            "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        }
        
        send_password_reset_email(email, code, user["name"])
        return {"success": True, "message": "Verification code sent"}
    
    # Try to find as student
    student = db.get_student_by_email(email)
    if student:
        code = generate_verification_code()
        print(f"Password change code for {email}: {code}")
        
        password_reset_codes[email] = {
            "code": code,
            "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        }
        
        send_password_reset_email(email, code, student["name"])
        return {"success": True, "message": "Verification code sent"}
    
    # Not found in either
    raise HTTPException(status_code=404, detail="User not found")


@app.put("/auth/update-profile")
async def update_profile(request: UpdateProfileRequest, email: str = Depends(verify_token)):
    """Update user profile - supports both teachers and students"""
    # Try to find as teacher first
    user = db.get_user_by_email(email)
    if user:
        # It's a teacher
        updated_user = db.update_user(user["id"], name=request.name)
        return UserResponse(id=updated_user["id"], email=updated_user["email"], name=updated_user["name"])
    
    # Try to find as student
    student = db.get_student_by_email(email)
    if student:
        # It's a student
        updated_student = db.update_student(student["id"], {"name": request.name})
        return UserResponse(id=updated_student["id"], email=updated_student["email"], name=updated_student["name"])
    
    # Not found in either
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@app.post("/auth/logout")
async def logout(email: str = Depends(verify_token)):
    """Logout user"""
    return {"success": True, "message": "Logged out successfully"}


@app.get("/auth/me", response_model=UserResponse)
async def get_current_user(email: str = Depends(verify_token)):
    """Get current user info"""
    user = db.get_user_by_email(email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(id=user["id"], email=user["email"], name=user["name"])


@app.delete("/auth/delete-account")
async def delete_account(email: str = Depends(verify_token)):
    """Delete user account and all associated data"""
    try:
        user = db.get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_id = user["id"]
        
        # Use the database manager's delete method
        success = db.delete_user(user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete account"
            )
        
        return {
            "success": True,
            "message": "Account deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete account error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )

# ==================== STUDENT AUTH ENDPOINTS ====================

@app.post("/students")
async def create_student_endpoint(student_data: StudentCreate, user: dict = Depends(get_current_user)):
    created_student = db.create_student(student_data.student_id, student_data.email, student_data.name, student_data.password_hash, student_data.roll_no)
    return {"success": True, "student": created_student}


@app.post("/auth/student/signup")
async def student_signup(request: SignupRequest):
    """Sign up a new student"""
    try:
        # Check if student already exists
        existing_student = db.get_student_by_email(request.email)
        if existing_student:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student with this email already exists"
            )
        
        # Also check teachers to prevent email conflicts
        existing_teacher = db.get_user_by_email(request.email)
        if existing_teacher:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered as a teacher"
            )
        
        if len(request.password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        code = generate_verification_code()
        print(f"Verification code for {request.email}: {code}")
        
        # Store verification code temporarily
        verification_codes[request.email] = {
            "code": code,
            "name": request.name,
            "password": get_password_hash(request.password),
            "role": "student",
            "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        }
        
        email_sent = send_verification_email(request.email, code, request.name)
        
        return {
            "success": True,
            "message": "Verification code sent to your email" if email_sent else f"Code: {code}"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Student signup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )


@app.post("/auth/student/verify-email", response_model=TokenResponse)
async def verify_student_email(request: VerifyEmailRequest):
    """Verify student email with code"""
    try:
        if request.email not in verification_codes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No verification code found"
            )
        
        stored_data = verification_codes[request.email]
        
        # Ensure this is a student verification
        if stored_data.get("role") != "student":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification attempt"
            )
        
        expires_at = datetime.fromisoformat(stored_data["expires_at"])
        
        if datetime.utcnow() > expires_at:
            del verification_codes[request.email]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code expired"
            )
        
        if stored_data["code"] != request.code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )
        
        # Create student in database
        student_id = f"student_{int(datetime.utcnow().timestamp())}"
        user_data = db.create_student(
            student_id=student_id,
            email=request.email,
            name=stored_data["name"],
            password_hash=stored_data["password"]
        )
        
        # Clean up verification code
        del verification_codes[request.email]
        
        # Create access token
        access_token = create_access_token(
            data={"sub": request.email, "role": "student"},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return TokenResponse(
            access_token=access_token,
            user=UserResponse(id=student_id, email=request.email, name=stored_data["name"])
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Student verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification failed: {str(e)}"
        )


@app.post("/auth/student/login", response_model=TokenResponse)
async def student_login(request: LoginRequest):
    """Login student"""
    user = db.get_student_by_email(request.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not verify_password(request.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(
        data={"sub": request.email, "role": "student"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"])
    )

@app.delete("/auth/student/delete-account")
async def delete_student_account(email: str = Depends(verify_token)):
    """Delete student account and all associated data"""
    try:
        print(f"API: Delete student account request for {email}")
        
        # Get student data
        student = db.get_student_by_email(email)
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        student_id = student["id"]
        
        # Use the database manager's delete method
        success = db.delete_student(student_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete student account"
            )
        
        print(f"API: Student account deleted successfully")
        return {"success": True, "message": "Student account deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"API: Delete student account error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete student account"
        )

# ==================== STUDENT ENROLLMENT ENDPOINTS ====================

@app.post("/enroll")
async def enroll_student_endpoint(
    enrollment_data: EnrollmentCreate,
    email: str = Depends(verify_token),
):
    """Teacher enrolls a student in a class by IDs"""
    # Optional: ensure teacher exists (for security/logging)
    teacher = db.get_user_by_email(email)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    enrollment = db.enroll_student(
        class_id=enrollment_data.class_id,
        student_id=enrollment_data.student_id,
        student_record_id=enrollment_data.student_record_id,
        extra=enrollment_data.extra,
    )
    return {"success": True, "enrollment": enrollment}

@app.post("/student/enroll")
async def enroll_in_class(
    request: StudentEnrollmentRequest,
    email: str = Depends(verify_token),
):
    """Enroll logged-in student in a class (Supabase-backed)"""
    try:
        # Get student row
        student = db.get_student_by_email(email)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        student_id = student["id"]

        # Security: request.email must match token email
        if request.email != email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must use your registered email",
            )

        # Check class exists
        class_data = db.get_class_by_id(request.class_id)
        if not class_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

        # Check if already actively enrolled
        existing = db.get_enrollment(request.class_id, student_id)
        if existing and existing.get("status") == "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already enrolled in this class",
            )

        # Prepare extra info (name/roll/email)
        extra = {
            "name": request.name,
            "rollNo": request.rollNo,
            "email": request.email,
        }

        # Generate a student_record_id (simple timestamp-based)
        student_record_id = int(datetime.utcnow().timestamp() * 1000)

        enrollment = db.enroll_student(
            class_id=request.class_id,
            student_id=student_id,
            student_record_id=student_record_id,
            extra=extra,
        )

        return {
            "success": True,
            "message": "Successfully enrolled in class",
            "enrollment": enrollment,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ENROLL_ENDPOINT] ERROR: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enroll in class",
        )

@app.delete("/student/unenroll/{class_id}")
async def unenroll_from_class(
    class_id: str,
    email: str = Depends(verify_token),
):
    """Unenroll student from a class (set enrollment status='inactive')"""
    try:
        student = db.get_student_by_email(email)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        student_id = student["id"]

        # Check class exists
        class_data = db.get_class_by_id(class_id)
        if not class_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

        # Check active enrollment
        enrollment = db.get_enrollment(class_id, student_id)
        if not enrollment or enrollment.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are not actively enrolled in this class",
            )

        ok = db.update_enrollment_status(class_id, student_id, status="inactive")
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to unenroll from class",
            )

        return {
            "success": True,
            "message": "Successfully unenrolled from class",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unenrollment error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unenroll from class: {str(e)}",
        )

@app.get("/student/classes")
async def get_student_classes(email: str = Depends(verify_token)):
    """Get all classes a student is actively enrolled in"""
    try:
        student = db.get_student_by_email(email)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        student_id = student["id"]

        class_ids = db.get_student_enrollments(student_id)  # List[str]
        classes = []
        for cid in class_ids:
            cls = db.get_class_by_id(cid)
            if cls:
                classes.append(cls)

        return {"classes": classes}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching student classes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch classes",
        )

@app.get("/student/class/{class_id}")
async def get_student_class_detail(
    class_id: str,
    email: str = Depends(verify_token),
):
    """Get class details for a student, only if enrolled"""
    try:
        student = db.get_student_by_email(email)
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        student_id = student["id"]

        # Ensure student has active enrollment
        enrollment = db.get_enrollment(class_id, student_id)
        if not enrollment or enrollment.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Class not found or student not enrolled",
            )

        cls = db.get_class_by_id(class_id)
        if not cls:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

        return {"class": cls}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching class details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch class details",
        )

@app.get("/class/verify/{class_id}")
async def verify_class_exists(class_id: str):
    """Verify if a class exists (public endpoint for enrollment)"""
    try:
        class_data = db.get_class_by_id(class_id)
        if not class_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

        teacher_id = class_data.get("teacher_id")
        teacher_name = "Unknown"
        if teacher_id:
            teacher = db.get_user(teacher_id)
            if teacher:
                teacher_name = teacher.get("name", "Unknown")

        return {
            "exists": True,
            "class_name": class_data.get("name", ""),
            "teacher_name": teacher_name,
            "class_id": class_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error verifying class: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify class",
        )

# ==================== CLASS ENDPOINTS ====================
@app.get("/classes")
async def get_classes(email: str = Depends(verify_token)):
    """Get all classes for the logged-in teacher"""
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    classes = db.get_classes_by_teacher(user["id"])
    return {"classes": classes}

@app.get("/classes/{class_id}")
async def get_class(class_id: str, email: str = Depends(verify_token)):
    """Get a specific class by ID"""
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    cls = db.get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    return {"class": cls}

@app.post("/classes")
async def create_class_endpoint(
    class_data: ClassCreate,
    email: str = Depends(verify_token),
):
    """Create a new class"""
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    created_class = db.create_class(
        class_id=class_data.class_id,
        teacher_id=user["id"],
        name=class_data.name,
        thresholds=class_data.thresholds,
        custom_columns=class_data.custom_columns,
    )
    return {"success": True, "class": created_class}

@app.delete("/classes/{class_id}")
async def delete_class(class_id: str, email: str = Depends(verify_token)):
    """Delete a class"""
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    success = db.delete_class(class_id)
    if not success:
        raise HTTPException(status_code=404, detail="Class not found")

    return {"success": True, "message": "Class deleted successfully"}

@app.put("/classes/{class_id}")
async def update_class_endpoint(
    class_id: str,
    data: ClassCreate,
    email: str = Depends(verify_token),
):
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updated = db.update_class(
        class_id=class_id,
        teacher_id=user["id"],
        name=data.name,
        thresholds=data.thresholds,
        custom_columns=data.custom_columns,
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Class not found")

    return {"success": True, "class": updated}

# ==================== CONTACT ENDPOINT ====================

@app.post("/contact")  # ✅ No Depends(verify_token) here
async def submit_contact(data: ContactRequest):
    try:
        result = db.create_contact_message({
            "name": data.name,
            "email": data.email,
            "subject": data.subject,
            "message": data.message,
        })
        return {"success": True, "message": "Message sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ==================== QR CODE ATTENDANCE ENDPOINTS ====================

@app.post("/qr/start")
async def start_qr_session(
    qr_data: QRStart, 
    email: str = Depends(verify_token)
):
    """Teacher starts QR session"""
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session = db.create_qr_session(
        class_id=qr_data.class_id, 
        teacher_id=user["id"], 
        attendance_date=qr_data.attendance_date
    )
    return {"success": True, "session": session}


@app.get("/qr/{class_id}")
async def get_qr_code(class_id: str):
    """Get current QR code for active session (public for students)"""
    session = db.get_qr_session(class_id)
    if not session:
        raise HTTPException(status_code=404, detail="No active QR session")
    return {"qr_code": session["current_code"]}


@app.post("/qr/scan")
async def scan_qr_endpoint(
    scan_data: QRScan, 
    email: str = Depends(verify_token)
):
    """Student scans QR code to mark attendance"""
    try:
        student = db.get_student_by_email(email)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        result = db.scan_qr_code(
            student_id=student["id"],
            class_id=scan_data.class_id, 
            qr_code=scan_data.qr_code
        )
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"QR scan error: {e}")
        raise HTTPException(status_code=500, detail="Failed to scan QR code")


@app.post("/qr/stop/{class_id}")
async def stop_qr_session_endpoint(
    class_id: str, 
    email: str = Depends(verify_token)
):
    """Teacher stops QR session and marks absents"""
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = db.stop_qr_session(class_id, user["id"])
    return result


@app.get("/qr/session/{class_id}")
async def get_qr_session_status(
    class_id: str, 
    email: str = Depends(verify_token)
):
    """Check if teacher has active QR session for class"""
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    session = db.get_qr_session(class_id)
    if not session or session["teacher_id"] != user["id"]:
        return {"active": False}
    
    return {"active": True, "session": session}

# ==================== HEALTH CHECK ====================

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "supabase-postgres"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
