from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta, date
from jose import JWTError, jwt
from passlib.context import CryptContext
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'premidis-secret-key-2025')
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="PREMIDIS SARL - HR Platform", version="2.0.0")

# ==================== ENUMS ====================
class UserRole(str, Enum):
    ADMIN = "admin"
    SECRETARY = "secretary"
    EMPLOYEE = "employee"

class LeaveStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class LeaveType(str, Enum):
    ANNUAL = "annual"           # Congé annuel
    SICK = "sick"               # Congé maladie
    EXCEPTIONAL = "exceptional" # Autorisation exceptionnelle
    MATERNITY = "maternity"     # Congé maternité
    PUBLIC = "public"           # Jours fériés

class EmployeeCategory(str, Enum):
    CADRE = "cadre"
    AGENT = "agent"
    STAGIAIRE = "stagiaire"

class Department(str, Enum):
    MARKETING = "marketing"
    COMPTABILITE = "comptabilite"
    ADMINISTRATION = "administration"
    RH = "ressources_humaines"
    JURIDIQUE = "juridique"
    SECURITE = "securite"
    TECHNIQUE = "technique"
    CHAUFFEUR = "chauffeur"

# ==================== MODELS ====================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    department: str = "administration"
    role: str = "employee"
    category: str = "agent"
    position: str = ""
    phone: Optional[str] = None
    hire_date: Optional[str] = None
    salary: Optional[float] = None
    salary_currency: Optional[str] = "USD"  # USD or FC
    site_id: Optional[str] = None
    hierarchy_level: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    department: str
    category: Optional[str] = "agent"
    position: Optional[str] = None
    phone: Optional[str] = None
    hire_date: Optional[str] = None
    salary: Optional[float] = None
    salary_currency: Optional[str] = "USD"
    birth_date: Optional[str] = None
    hierarchy_level: Optional[str] = None
    site_id: Optional[str] = None
    site_name: Optional[str] = None
    hierarchical_group_id: Optional[str] = None
    hierarchical_group_name: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    avatar_url: Optional[str] = None
    leave_balance: Optional[Dict[str, int]] = None
    leave_taken: Optional[Dict[str, int]] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class LeaveRuleConfig(BaseModel):
    annual_days: int = 26          # Congé annuel par défaut (individuel: 4 jours minimum)
    sick_days: int = 2             # Congé maladie (ex: 2 jours)
    exceptional_days: int = 15     # Autorisation exceptionnelle (ex: 15 jours)
    maternity_days: int = 90       # Congé maternité (3 mois)
    paternity_days: int = 10       # Congé paternité
    public_holidays: int = 12      # Jours fériés par an (configurable)

class LeaveRequest(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    employee_id: Optional[str] = None  # For admin/secretary to request for others
    for_all_employees: bool = False    # For public holidays - apply to all

class LeaveUpdate(BaseModel):
    status: Optional[str] = None  # approved, rejected, pending
    admin_comment: Optional[str] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    category: Optional[str] = None
    salary: Optional[float] = None
    salary_currency: Optional[str] = None
    hire_date: Optional[str] = None
    site_id: Optional[str] = None
    hierarchical_group_id: Optional[str] = None
    birth_date: Optional[str] = None
    hierarchy_level: Optional[str] = None

class SalaryAdvance(BaseModel):
    employee_id: str
    amount: float
    reason: str
    repayment_date: str

class Bonus(BaseModel):
    employee_id: str
    amount: float
    reason: str
    date: str

class ExitAuthorization(BaseModel):
    employee_id: str
    date: str
    departure_time: str
    return_time: Optional[str] = None
    reason: str

class BehaviorNote(BaseModel):
    employee_id: str
    type: str  # 'sanction', 'warning', 'dismissal', 'praise', etc.
    note: str
    date: str
    file_name: Optional[str] = None  # Nom du fichier (ex: "Lettre_renvoi_123.pdf")
    file_url: Optional[str] = None   # URL ou chemin du fichier
    document_urls: Optional[List[str]] = []  # Support pour plusieurs documents (legacy)

class AttendanceCreate(BaseModel):
    employee_id: str
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    notes: Optional[str] = ""

class DocumentUpload(BaseModel):
    name: str
    type: str  # 'certificate', 'pdf', 'image'
    url: str

# ==================== AUTH HELPERS ====================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalide")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user

def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        return current_user
    return role_checker

def calculate_working_days(start_date: str, end_date: str) -> int:
    """Calculate working days between two dates (excluding weekends)"""
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    working_days = 0
    current = start
    while current <= end:
        if current.weekday() < 5:  # Monday = 0, Friday = 4
            working_days += 1
        current += timedelta(days=1)
    
    return working_days

def calculate_age(birth_date: str) -> int:
    """Calculate age from birth date"""
    if not birth_date:
        return 0
    birth = datetime.strptime(birth_date, "%Y-%m-%d").date()
    today = date.today()
    return today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))

# ==================== ROUTERS ====================
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
employees_router = APIRouter(prefix="/employees", tags=["Personnel"])
leaves_router = APIRouter(prefix="/leaves", tags=["Congés"])
calendar_router = APIRouter(prefix="/calendar", tags=["Calendrier"])
hr_router = APIRouter(prefix="/hr", tags=["RH Actions"])
config_router = APIRouter(prefix="/config", tags=["Configuration"])
behavior_router = APIRouter(prefix="/behavior", tags=["Comportement"])
communication_router = APIRouter(prefix="/communication", tags=["Communication"])
upload_router = APIRouter(prefix="/upload", tags=["Upload"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])
sites_router = APIRouter(prefix="/sites", tags=["Sites de travail"])

# ==================== AUTH ROUTES ====================

@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user - ALL ROLES ARE ACTIVATED IMMEDIATELY"""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà enregistré")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    # Get default leave rules
    leave_rules = await db.leave_rules.find_one({"type": "default"}, {"_id": 0})
    if not leave_rules:
        leave_rules = LeaveRuleConfig().model_dump()
    
    # ALL ACCOUNTS ARE ACTIVE IMMEDIATELY - NO APPROVAL REQUIRED
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "role": user_data.role,
        "department": user_data.department,
        "category": user_data.category,
        "position": user_data.position,
        "phone": user_data.phone,
        "hire_date": user_data.hire_date,
        "salary": user_data.salary,
        "salary_currency": user_data.salary_currency,
        "birth_date": None,
        "is_active": True,  # ALWAYS ACTIVE
        "created_at": datetime.now(timezone.utc).isoformat(),
        "avatar_url": None,
        "leave_balance": {
            "annual": leave_rules.get("annual_days", 26),
            "sick": leave_rules.get("sick_days", 2),
            "exceptional": leave_rules.get("exceptional_days", 15),
            "maternity": leave_rules.get("maternity_days", 90),
            "paternity": leave_rules.get("paternity_days", 10)
        },
        "leave_taken": {
            "annual": 0,
            "sick": 0,
            "exceptional": 0,
            "maternity": 0,
            "paternity": 0
        }
    }
    
    await db.users.insert_one(user_doc)
    
    # Return token immediately for ALL roles
    access_token = create_access_token(data={"sub": user_id, "role": user_data.role})
    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=user_data.role,
        department=user_data.department,
        category=user_data.category,
        position=user_data.position,
        is_active=True,
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login - simple check for active account"""
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Compte désactivé")
    
    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    
    user_response = UserResponse(**{k: v for k, v in user.items() if k != "password"})
    
    return TokenResponse(access_token=access_token, user=user_response)

@auth_router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return user

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@auth_router.put("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Verify current password
    if not verify_password(password_data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    # Hash and update new password
    hashed_password = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": hashed_password}}
    )
    
    return {"message": "Mot de passe modifié avec succès"}

# ==================== FORGOT PASSWORD ====================
import secrets
import asyncio

# Try to import resend, but don't fail if not available
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@auth_router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    # Re-read env vars to ensure they're loaded after restart
    resend_api_key = os.environ.get('RESEND_API_KEY', '')
    sender_email = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
    frontend_url = os.environ.get('FRONTEND_URL', 'https://simplihr-app.preview.emergentagent.com')
    
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "Si cette adresse email existe, un lien de réinitialisation a été envoyé."}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.delete_many({"email": request.email})  # Remove old tokens
    await db.password_resets.insert_one({
        "id": str(uuid.uuid4()),
        "email": request.email,
        "token": reset_token,
        "expires_at": token_expiry.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send email if Resend is configured
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    if RESEND_AVAILABLE and resend_api_key:
        resend.api_key = resend_api_key
        try:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
                <p>Bonjour {user['first_name']},</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte PREMIDIS.</p>
                <p style="margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                        Réinitialiser mon mot de passe
                    </a>
                </p>
                <p>Ce lien expire dans 1 heure.</p>
                <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">PREMIDIS SARL - Plateforme RH</p>
            </div>
            """
            
            params = {
                "from": sender_email,
                "to": [request.email],
                "subject": "Réinitialisation de votre mot de passe - PREMIDIS",
                "html": html_content
            }
            
            await asyncio.to_thread(resend.Emails.send, params)
            logging.info(f"Password reset email sent to {request.email}")
        except Exception as e:
            logging.error(f"Failed to send password reset email: {str(e)}")
            # Don't fail the request, just log the error
    else:
        logging.warning(f"Email not sent - Resend not configured. Reset link: {reset_link}")
    
    return {"message": "Si cette adresse email existe, un lien de réinitialisation a été envoyé."}

@auth_router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using token"""
    # Find valid token
    reset_record = await db.password_resets.find_one({"token": request.token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Lien de réinitialisation invalide ou expiré")
    
    # Check expiry
    expiry = datetime.fromisoformat(reset_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expiry:
        await db.password_resets.delete_one({"token": request.token})
        raise HTTPException(status_code=400, detail="Lien de réinitialisation expiré")
    
    # Update password
    hashed_password = get_password_hash(request.new_password)
    result = await db.users.update_one(
        {"email": reset_record["email"]},
        {"$set": {"password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Delete used token
    await db.password_resets.delete_one({"token": request.token})
    
    return {"message": "Mot de passe réinitialisé avec succès"}

@auth_router.get("/verify-reset-token")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    reset_record = await db.password_resets.find_one({"token": token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Token invalide")
    
    expiry = datetime.fromisoformat(reset_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="Token expiré")
    
    return {"valid": True, "email": reset_record["email"]}

# ==================== EMPLOYEES ROUTES ====================
@employees_router.get("")
async def list_employees(
    department: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Employees can only see themselves
    if current_user["role"] == "employee":
        user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
        return {"employees": [user], "total": 1}
    
    # Secretary can see employees in their department only
    query = {}
    if current_user["role"] == "secretary":
        query["department"] = current_user.get("department")
    
    if department:
        query["department"] = department
    if category:
        query["category"] = category
    
    employees = await db.users.find(query, {"_id": 0, "password": 0}).to_list(500)
    return {"employees": employees, "total": len(employees)}

@employees_router.post("", status_code=status.HTTP_201_CREATED)
async def create_employee(
    employee: UserCreate,
    current_user: dict = Depends(require_roles(["admin", "secretary"]))
):
    """Create a new employee (admin and secretary)"""
    existing = await db.users.find_one({"email": employee.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà enregistré")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(employee.password)
    
    # Get default leave rules
    leave_rules = await db.leave_rules.find_one({"type": "default"}, {"_id": 0})
    if not leave_rules:
        leave_rules = LeaveRuleConfig().model_dump()
    
    user_doc = {
        "id": user_id,
        "email": employee.email,
        "password": hashed_password,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "role": employee.role,
        "department": employee.department,
        "category": employee.category,
        "position": employee.position,
        "phone": employee.phone,
        "hire_date": employee.hire_date,
        "salary": employee.salary,
        "salary_currency": employee.salary_currency or "USD",
        "birth_date": None,
        "site_id": employee.site_id,
        "hierarchy_level": employee.hierarchy_level,
        "is_active": True,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "avatar_url": None,
        "leave_balance": {
            "annual": leave_rules.get("annual_days", 26),
            "sick": leave_rules.get("sick_days", 2),
            "exceptional": leave_rules.get("exceptional_days", 15),
            "maternity": leave_rules.get("maternity_days", 90)
        },
        "leave_taken": {
            "annual": 0,
            "sick": 0,
            "exceptional": 0,
            "maternity": 0
        }
    }
    
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)
    user_doc.pop("password", None)
    return user_doc

@employees_router.get("/{employee_id}")
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    # Employees can only view themselves
    if current_user["role"] == "employee" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0, "password": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    # Enrich with site info
    if employee.get("site_id"):
        site = await db.sites.find_one({"id": employee["site_id"]}, {"_id": 0})
        if site:
            employee["site_name"] = site.get("name")
    
    # Enrich with hierarchical group info
    if employee.get("hierarchical_group_id"):
        group = await db.hierarchical_groups.find_one({"id": employee["hierarchical_group_id"]}, {"_id": 0})
        if group:
            employee["hierarchical_group_name"] = group.get("name")
    
    return employee

@employees_router.put("/{employee_id}")
async def update_employee(
    employee_id: str,
    updates: EmployeeUpdate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if update_data:
        await db.users.update_one({"id": employee_id}, {"$set": update_data})
    
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0, "password": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    return employee

@employees_router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    permanent: bool = False,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Delete or deactivate an employee"""
    employee = await db.users.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    if permanent:
        # Permanent deletion - also delete related data
        await db.users.delete_one({"id": employee_id})
        await db.leaves.delete_many({"employee_id": employee_id})
        await db.behaviors.delete_many({"employee_id": employee_id})
        await db.documents.delete_many({"employee_id": employee_id})
        await db.attendance.delete_many({"employee_id": employee_id})
        return {"message": "Employé supprimé définitivement"}
    else:
        # Soft delete - just deactivate
        await db.users.update_one({"id": employee_id}, {"$set": {"is_active": False, "status": "inactive"}})
        return {"message": "Employé désactivé"}

# ==================== LEAVE MANAGEMENT ROUTES ====================
@leaves_router.get("")
async def list_leaves(
    status: Optional[str] = None,
    leave_type: Optional[str] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # Employees see only their own leaves
    if current_user["role"] == "employee":
        query["employee_id"] = current_user["id"]
    elif employee_id:
        # Admin/Secretary can filter by employee_id
        query["employee_id"] = employee_id
    
    if status:
        query["status"] = status
    if leave_type:
        query["leave_type"] = leave_type
    
    leaves = await db.leaves.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"leaves": leaves}

@leaves_router.get("/stats")
async def get_leave_stats(current_user: dict = Depends(get_current_user)):
    """Get leave statistics"""
    query = {}
    if current_user["role"] == "employee":
        query["employee_id"] = current_user["id"]
    
    pending = await db.leaves.count_documents({**query, "status": "pending"})
    approved = await db.leaves.count_documents({**query, "status": "approved"})
    rejected = await db.leaves.count_documents({**query, "status": "rejected"})
    
    return {"pending": pending, "approved": approved, "rejected": rejected}

@leaves_router.get("/calendar")
async def get_leaves_for_calendar(
    month: int = None,
    year: int = None,
    current_user: dict = Depends(get_current_user)
):
    """Get approved leaves for calendar display - ALL approved leaves visible to everyone"""
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year
    
    # ALL users see ALL approved leaves (for global calendar visibility)
    # This allows employees and admins to see when colleagues are on leave
    query = {"status": "approved"}
    
    leaves = await db.leaves.find(query, {"_id": 0}).to_list(500)
    
    # Filter by month
    filtered = []
    for leave in leaves:
        try:
            start = datetime.strptime(leave["start_date"], "%Y-%m-%d")
            end = datetime.strptime(leave["end_date"], "%Y-%m-%d")
            # Check if leave overlaps with target month
            month_start = datetime(target_year, target_month, 1)
            if target_month == 12:
                month_end = datetime(target_year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = datetime(target_year, target_month + 1, 1) - timedelta(days=1)
            
            if start <= month_end and end >= month_start:
                filtered.append(leave)
        except:
            pass
    
    return {"leaves": filtered, "month": target_month, "year": target_year}

@leaves_router.post("", status_code=status.HTTP_201_CREATED)
async def create_leave_request(
    leave: LeaveRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create leave request - NO VALIDATION, pure registration system"""
    # Validate dates format only
    try:
        start = datetime.strptime(leave.start_date, "%Y-%m-%d")
        end = datetime.strptime(leave.end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide (YYYY-MM-DD)")
    
    # Calculate working days (no validation on duration)
    working_days = calculate_working_days(leave.start_date, leave.end_date)
    
    # Admin/Secretary can create for others or for all employees
    can_create_for_others = current_user["role"] in ["admin", "secretary"]
    
    # For collective leaves - create for all employees
    if leave.for_all_employees and can_create_for_others:
        all_employees = await db.users.find({"is_active": True}, {"_id": 0}).to_list(500)
        created_leaves = []
        
        for emp in all_employees:
            leave_id = str(uuid.uuid4())
            leave_doc = {
                "id": leave_id,
                "employee_id": emp["id"],
                "employee_name": f"{emp['first_name']} {emp['last_name']}",
                "department": emp.get("department", ""),
                "position": emp.get("position", ""),
                "leave_type": leave.leave_type or "collective",
                "start_date": leave.start_date,
                "end_date": leave.end_date,
                "working_days": working_days,
                "reason": leave.reason,
                "status": "approved",  # Auto-approved for collective
                "is_collective": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user["id"],
                "admin_comment": "Congé collectif - appliqué à tous les employés",
                "approved_by": current_user["id"],
                "approved_at": datetime.now(timezone.utc).isoformat()
            }
            await db.leaves.insert_one(leave_doc)
            leave_doc.pop("_id", None)
            created_leaves.append(leave_doc)
        
        return {"message": f"Congé collectif créé pour {len(created_leaves)} employés", "count": len(created_leaves)}
    
    # Determine target employee
    if leave.employee_id and can_create_for_others:
        target_employee = await db.users.find_one({"id": leave.employee_id}, {"_id": 0})
        if not target_employee:
            raise HTTPException(status_code=404, detail="Employé non trouvé")
        target_id = leave.employee_id
        target_name = f"{target_employee['first_name']} {target_employee['last_name']}"
        target_dept = target_employee.get("department", "")
        target_position = target_employee.get("position", "")
    else:
        target_id = current_user["id"]
        target_name = f"{current_user['first_name']} {current_user['last_name']}"
        target_dept = current_user.get("department", "")
        target_position = current_user.get("position", "")
    
    # Create leave request - NO VALIDATIONS, pure data registration
    leave_id = str(uuid.uuid4())
    leave_doc = {
        "id": leave_id,
        "employee_id": target_id,
        "employee_name": target_name,
        "department": target_dept,
        "position": target_position,
        "leave_type": leave.leave_type,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "working_days": working_days,
        "reason": leave.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"] if leave.employee_id else None,
        "admin_comment": None,
        "approved_by": None,
        "approved_at": None
    }
    
    await db.leaves.insert_one(leave_doc)
    leave_doc.pop("_id", None)
    return leave_doc

async def create_overlap_notification(employee_name: str, department: str, start_date: str, end_date: str, overlaps: list):
    """Create notification and send email for leave overlaps"""
    # Create in-app notification for all admins
    admins = await db.users.find({"role": {"$in": ["admin", "super_admin"]}, "is_active": True}, {"_id": 0}).to_list(50)
    
    overlap_details = "\n".join([f"- {o['employee_name']} ({o.get('department', o.get('role', ''))}): {o['dates']}" for o in overlaps])
    
    for admin in admins:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": admin["id"],
            "type": "leave_overlap",
            "title": "⚠️ Chevauchement de congés détecté",
            "message": f"{employee_name} ({department}) demande un congé du {start_date} au {end_date}.\n\nChevauchements:\n{overlap_details}",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    # Send email notification
    settings = await db.system_settings.find_one({"type": "notifications"}, {"_id": 0})
    admin_email = settings.get("admin_notification_email", "bahizifranck0@gmail.com") if settings else "bahizifranck0@gmail.com"
    
    resend_api_key = os.environ.get('RESEND_API_KEY', '')
    sender_email = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
    
    if resend_api_key:
        try:
            import resend
            resend.api_key = resend_api_key
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #F59E0B;">⚠️ Chevauchement de congés détecté</h2>
                <p><strong>{employee_name}</strong> du département <strong>{department}</strong> a demandé un congé:</p>
                <p><strong>Période:</strong> {start_date} au {end_date}</p>
                <h3 style="color: #EF4444;">Chevauchements détectés:</h3>
                <ul>
                    {''.join([f'<li><strong>{o["employee_name"]}</strong> - {o.get("department", o.get("role", ""))}: {o["dates"]}</li>' for o in overlaps])}
                </ul>
                <p>Veuillez vérifier et gérer cette demande dans la plateforme.</p>
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">PREMIDIS SARL - Plateforme RH</p>
            </div>
            """
            
            params = {
                "from": sender_email,
                "to": [admin_email],
                "subject": f"⚠️ Chevauchement de congés: {employee_name}",
                "html": html_content
            }
            
            await asyncio.to_thread(resend.Emails.send, params)
            logging.info(f"Leave overlap notification sent to {admin_email}")
        except Exception as e:
            logging.error(f"Failed to send overlap notification: {str(e)}")

@leaves_router.get("/balance")
async def get_leave_balance(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    leave_balance = user.get("leave_balance", {})
    leave_taken = user.get("leave_taken", {})
    
    balance = {}
    for leave_type in ["annual", "sick", "exceptional", "maternity"]:
        total = leave_balance.get(leave_type, 0)
        taken = leave_taken.get(leave_type, 0)
        balance[leave_type] = {
            "total": total,
            "taken": taken,
            "remaining": total - taken
        }
    
    return balance

@leaves_router.get("/rules")
async def get_leave_rules(current_user: dict = Depends(get_current_user)):
    """Get leave rules - visible to all employees"""
    rules = await db.leave_rules.find_one({"type": "default"}, {"_id": 0})
    if not rules:
        rules = {
            "annual_days": 26,
            "sick_days": 2,
            "exceptional_days": 15,
            "maternity_days": 90
        }
    
    leave_types = [
        {
            "type": "annual",
            "name": "Congé annuel",
            "max_days": rules.get("annual_days", 26),
            "description": "Congé annuel de repos",
            "can_request": True
        },
        {
            "type": "sick",
            "name": "Congé maladie",
            "max_days": rules.get("sick_days", 2),
            "description": "Congé pour raison médicale",
            "can_request": True
        },
        {
            "type": "exceptional",
            "name": "Autorisation exceptionnelle",
            "max_days": rules.get("exceptional_days", 15),
            "description": "Congé pour circonstances exceptionnelles (mariage, décès, etc.)",
            "can_request": True
        },
        {
            "type": "maternity",
            "name": "Congé maternité",
            "max_days": rules.get("maternity_days", 90),
            "description": "Congé maternité (3 mois)",
            "can_request": True
        },
        {
            "type": "public",
            "name": "Jour férié",
            "max_days": 0,
            "description": "Jours fériés officiels (configurés par l'administration)",
            "can_request": False
        }
    ]
    
    return {"rules": rules, "leave_types": leave_types}

@leaves_router.put("/{leave_id}")
async def update_leave_status(
    leave_id: str,
    update: LeaveUpdate,
    current_user: dict = Depends(require_roles(["admin", "secretary"]))
):
    """Update leave status - NO VALIDATION, pure status update"""
    leave = await db.leaves.find_one({"id": leave_id}, {"_id": 0})
    if not leave:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    # Prepare update data
    update_data = {}
    if update.status:
        update_data["status"] = update.status
        update_data["approved_by"] = current_user["id"]
        update_data["approved_at"] = datetime.now(timezone.utc).isoformat()
    
    if update.admin_comment is not None:
        update_data["admin_comment"] = update.admin_comment
    
    # Update leave - NO BALANCE CHECKS, NO VALIDATIONS
    await db.leaves.update_one({"id": leave_id}, {"$set": update_data})
    
    # Update leave balance if approved (optional tracking, not blocking)
    if update.status == "approved" and leave["status"] != "approved":
        await db.users.update_one(
            {"id": leave["employee_id"]},
            {"$inc": {f"leave_taken.{leave['leave_type']}": leave["working_days"]}}
        )
    # Restore balance if rejected after approval (optional tracking)
    elif update.status == "rejected" and leave["status"] == "approved":
        await db.users.update_one(
            {"id": leave["employee_id"]},
            {"$inc": {f"leave_taken.{leave['leave_type']}": -leave["working_days"]}}
        )
    
    # Add to calendar if approved (for visualization only)
    if update.status == "approved":
        calendar_entry = {
            "id": str(uuid.uuid4()),
            "employee_id": leave["employee_id"],
            "employee_name": leave["employee_name"],
            "type": "leave",
            "leave_type": leave["leave_type"],
            "leave_id": leave_id,
            "start_date": leave["start_date"],
            "end_date": leave["end_date"],
            "title": f"Congé {leave['leave_type']} - {leave['employee_name']}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.calendar.insert_one(calendar_entry)
    
    updated = await db.leaves.find_one({"id": leave_id}, {"_id": 0})
    return updated

@leaves_router.get("/{leave_id}")
async def get_leave_details(leave_id: str, current_user: dict = Depends(get_current_user)):
    leave = await db.leaves.find_one({"id": leave_id}, {"_id": 0})
    if not leave:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    # Employees can only see their own
    if current_user["role"] == "employee" and leave["employee_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    return leave

@leaves_router.delete("/{leave_id}")
async def delete_leave(
    leave_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a leave request - Admin can delete any, employees can delete their own pending"""
    leave = await db.leaves.find_one({"id": leave_id}, {"_id": 0})
    if not leave:
        raise HTTPException(status_code=404, detail="Congé non trouvé")
    
    # Check permissions
    is_admin = current_user["role"] in ["admin", "secretary"]
    is_own = leave["employee_id"] == current_user["id"]
    
    if not is_admin and not is_own:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Employees can only delete pending leaves
    if not is_admin and leave["status"] != "pending":
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que les demandes en attente")
    
    # If was approved, restore the leave balance
    if leave["status"] == "approved":
        await db.users.update_one(
            {"id": leave["employee_id"]},
            {"$inc": {f"leave_taken.{leave['leave_type']}": -leave.get("working_days", 0)}}
        )
    
    # Delete from leaves collection
    await db.leaves.delete_one({"id": leave_id})
    
    # Also delete from calendar if exists
    await db.calendar.delete_many({"leave_id": leave_id})
    
    return {"message": "Congé supprimé", "id": leave_id}

# ==================== CALENDAR ROUTES ====================
@calendar_router.get("")
async def get_calendar(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year
    
    query = {}
    
    # Employees see only their calendar
    if current_user["role"] == "employee":
        query["$or"] = [
            {"employee_id": current_user["id"]},
            {"type": "public_holiday"}
        ]
    
    entries = await db.calendar.find(query, {"_id": 0}).to_list(500)
    
    # Filter by month
    filtered = []
    for entry in entries:
        try:
            start = datetime.strptime(entry["start_date"], "%Y-%m-%d")
            if start.month == target_month and start.year == target_year:
                filtered.append(entry)
        except:
            pass
    
    return {"entries": filtered, "month": target_month, "year": target_year}

@calendar_router.post("/holiday")
async def add_public_holiday(
    date: str,
    name: str,
    current_user: dict = Depends(require_roles(["admin"]))
):
    holiday = {
        "id": str(uuid.uuid4()),
        "type": "public_holiday",
        "start_date": date,
        "end_date": date,
        "title": name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.calendar.insert_one(holiday)
    holiday.pop("_id", None)
    return holiday

# ==================== HR ACTIONS ROUTES ====================
@hr_router.post("/salary-advance")
async def create_salary_advance(
    advance: SalaryAdvance,
    current_user: dict = Depends(require_roles(["admin"]))
):
    advance_id = str(uuid.uuid4())
    advance_doc = {
        "id": advance_id,
        "type": "salary_advance",
        **advance.model_dump(),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.hr_actions.insert_one(advance_doc)
    advance_doc.pop("_id", None)
    return advance_doc

@hr_router.post("/bonus")
async def create_bonus(
    bonus: Bonus,
    current_user: dict = Depends(require_roles(["admin"]))
):
    bonus_id = str(uuid.uuid4())
    bonus_doc = {
        "id": bonus_id,
        "type": "bonus",
        **bonus.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.hr_actions.insert_one(bonus_doc)
    bonus_doc.pop("_id", None)
    return bonus_doc

@hr_router.post("/exit-authorization")
async def create_exit_authorization(
    auth: ExitAuthorization,
    current_user: dict = Depends(require_roles(["admin", "secretary"]))
):
    auth_id = str(uuid.uuid4())
    auth_doc = {
        "id": auth_id,
        "type": "exit_authorization",
        **auth.model_dump(),
        "status": "approved",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.hr_actions.insert_one(auth_doc)
    auth_doc.pop("_id", None)
    return auth_doc

@hr_router.get("/actions/{employee_id}")
async def get_employee_hr_actions(
    employee_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Employees can only see their own
    if current_user["role"] == "employee" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    actions = await db.hr_actions.find({"employee_id": employee_id}, {"_id": 0}).to_list(100)
    return {"actions": actions}

# ==================== ATTENDANCE ROUTES ====================
attendance_router = APIRouter(prefix="/attendance", tags=["Pointage"])

@attendance_router.get("")
async def list_attendance(current_user: dict = Depends(get_current_user)):
    """List attendance records"""
    query = {}
    if current_user["role"] == "employee":
        query["employee_id"] = current_user["id"]
    
    attendance = await db.attendance.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    return {"attendance": attendance}

@attendance_router.get("/today")
async def get_today_attendance(current_user: dict = Depends(get_current_user)):
    """Get today's attendance for current user"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    attendance = await db.attendance.find_one(
        {"employee_id": current_user["id"], "date": today},
        {"_id": 0}
    )
    return {"attendance": attendance}

@attendance_router.post("/check-in")
async def check_in(current_user: dict = Depends(get_current_user)):
    """Record check-in time"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    existing = await db.attendance.find_one({"employee_id": current_user["id"], "date": today})
    if existing and existing.get("check_in"):
        raise HTTPException(status_code=400, detail="Pointage d'entrée déjà enregistré")
    
    attendance_doc = {
        "id": str(uuid.uuid4()),
        "employee_id": current_user["id"],
        "employee_name": f"{current_user['first_name']} {current_user['last_name']}",
        "date": today,
        "check_in": now_time,
        "check_out": None,
        "notes": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.attendance.insert_one(attendance_doc)
    attendance_doc.pop("_id", None)
    return attendance_doc

@attendance_router.post("/check-out")
async def check_out(current_user: dict = Depends(get_current_user)):
    """Record check-out time"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    existing = await db.attendance.find_one({"employee_id": current_user["id"], "date": today})
    if not existing:
        raise HTTPException(status_code=400, detail="Aucun pointage d'entrée trouvé")
    if existing.get("check_out"):
        raise HTTPException(status_code=400, detail="Pointage de sortie déjà enregistré")
    
    await db.attendance.update_one(
        {"employee_id": current_user["id"], "date": today},
        {"$set": {"check_out": now_time}}
    )
    
    updated = await db.attendance.find_one({"employee_id": current_user["id"], "date": today}, {"_id": 0})
    return updated

@attendance_router.post("")
async def create_attendance_manual(
    attendance: AttendanceCreate,
    current_user: dict = Depends(require_roles(["admin", "secretary"]))
):
    """Manually create attendance record (admin/secretary only)"""
    employee = await db.users.find_one({"id": attendance.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    attendance_doc = {
        "id": str(uuid.uuid4()),
        "employee_id": attendance.employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "date": attendance.date,
        "check_in": attendance.check_in,
        "check_out": attendance.check_out,
        "notes": attendance.notes or "",
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.attendance.insert_one(attendance_doc)
    attendance_doc.pop("_id", None)
    return attendance_doc

# ==================== CONFIG ROUTES (Admin Only) ====================

# System settings endpoints
class SystemSettings(BaseModel):
    admin_notification_email: str = "bahizifranck0@gmail.com"

@config_router.get("/system-settings")
async def get_system_settings(current_user: dict = Depends(require_roles(["admin", "super_admin"]))):
    """Get system settings"""
    settings = await db.system_settings.find_one({"type": "notifications"}, {"_id": 0})
    if not settings:
        settings = {
            "type": "notifications",
            "admin_notification_email": "bahizifranck0@gmail.com"
        }
        await db.system_settings.insert_one(settings)
    return settings

@config_router.put("/system-settings")
async def update_system_settings(
    settings: SystemSettings,
    current_user: dict = Depends(require_roles(["admin", "super_admin"]))
):
    """Update system settings"""
    settings_doc = {
        "type": "notifications",
        "admin_notification_email": settings.admin_notification_email,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"]
    }
    
    await db.system_settings.update_one(
        {"type": "notifications"},
        {"$set": settings_doc},
        upsert=True
    )
    return settings_doc

# Leave types configuration
class LeaveTypeConfig(BaseModel):
    id: Optional[str] = None
    name: str
    code: str
    duration_value: int = 1  # Durée officielle
    duration_unit: str = "days"  # days, weeks, months
    min_days: int = 1
    max_days: int = 365
    default_balance: int = 365
    requires_approval: bool = True
    is_active: bool = True
    color: str = "#4F46E5"

@config_router.get("/leave-types")
async def get_leave_types(current_user: dict = Depends(get_current_user)):
    """Get all configured leave types"""
    leave_types = await db.leave_types.find({"is_active": True}, {"_id": 0}).to_list(50)
    
    # If no custom types exist, return defaults with duration configuration
    if not leave_types:
        default_types = [
            {"id": "annual", "name": "Congé annuel", "code": "annual", "duration_value": 30, "duration_unit": "days", "min_days": 1, "max_days": 30, "default_balance": 30, "requires_approval": True, "is_active": True, "color": "#4F46E5"},
            {"id": "sick", "name": "Congé maladie", "code": "sick", "duration_value": 2, "duration_unit": "days", "min_days": 2, "max_days": 30, "default_balance": 2, "requires_approval": True, "is_active": True, "color": "#EF4444"},
            {"id": "maternity", "name": "Congé maternité", "code": "maternity", "duration_value": 3, "duration_unit": "months", "min_days": 90, "max_days": 120, "default_balance": 90, "requires_approval": True, "is_active": True, "color": "#EC4899"},
            {"id": "paternity", "name": "Congé paternité", "code": "paternity", "duration_value": 10, "duration_unit": "days", "min_days": 10, "max_days": 15, "default_balance": 10, "requires_approval": True, "is_active": True, "color": "#3B82F6"},
            {"id": "exceptional", "name": "Congé exceptionnel", "code": "exceptional", "duration_value": 15, "duration_unit": "days", "min_days": 1, "max_days": 15, "default_balance": 15, "requires_approval": True, "is_active": True, "color": "#F59E0B"},
            {"id": "collective", "name": "Congé collectif (tous)", "code": "collective", "duration_value": 1, "duration_unit": "days", "min_days": 1, "max_days": 30, "default_balance": 0, "requires_approval": False, "is_active": True, "color": "#10B981"}
        ]
        # Insert default types
        for lt in default_types:
            await db.leave_types.insert_one(lt)
        leave_types = default_types
    
    return {"leave_types": leave_types}

# Endpoint to calculate end date based on leave type and start date
@config_router.post("/calculate-leave-end-date")
async def calculate_leave_end_date(
    leave_type_code: str,
    start_date: str,
    current_user: dict = Depends(get_current_user)
):
    """Calculate end date based on leave type configuration"""
    leave_type = await db.leave_types.find_one({"code": leave_type_code, "is_active": True}, {"_id": 0})
    
    if not leave_type:
        raise HTTPException(status_code=404, detail="Type de congé non trouvé")
    
    duration_value = leave_type.get("duration_value", 1)
    duration_unit = leave_type.get("duration_unit", "days")
    
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide")
    
    # Calculate end date based on unit
    if duration_unit == "days":
        end = start + timedelta(days=duration_value - 1)  # -1 because start day counts
        total_days = duration_value
    elif duration_unit == "weeks":
        end = start + timedelta(weeks=duration_value) - timedelta(days=1)
        total_days = duration_value * 7
    elif duration_unit == "months":
        # Add months
        month = start.month + duration_value
        year = start.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        # Handle day overflow
        import calendar
        max_day = calendar.monthrange(year, month)[1]
        day = min(start.day, max_day)
        end = start.replace(year=year, month=month, day=day) - timedelta(days=1)
        total_days = (end - start).days + 1
    else:
        end = start + timedelta(days=duration_value - 1)
        total_days = duration_value
    
    return {
        "start_date": start_date,
        "end_date": end.strftime("%Y-%m-%d"),
        "duration_value": duration_value,
        "duration_unit": duration_unit,
        "total_days": total_days,
        "leave_type": leave_type
    }

@config_router.post("/leave-types")
async def create_leave_type(
    leave_type: LeaveTypeConfig,
    current_user: dict = Depends(require_roles(["admin", "super_admin"]))
):
    """Create a new leave type"""
    leave_type_doc = leave_type.model_dump()
    leave_type_doc["id"] = str(uuid.uuid4())
    leave_type_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    leave_type_doc["created_by"] = current_user["id"]
    
    await db.leave_types.insert_one(leave_type_doc)
    leave_type_doc.pop("_id", None)
    return leave_type_doc

@config_router.put("/leave-types/{leave_type_id}")
async def update_leave_type(
    leave_type_id: str,
    leave_type: LeaveTypeConfig,
    current_user: dict = Depends(require_roles(["admin", "super_admin"]))
):
    """Update a leave type"""
    update_data = leave_type.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = current_user["id"]
    
    await db.leave_types.update_one(
        {"id": leave_type_id},
        {"$set": update_data}
    )
    return {"message": "Type de congé mis à jour"}

@config_router.delete("/leave-types/{leave_type_id}")
async def delete_leave_type(
    leave_type_id: str,
    current_user: dict = Depends(require_roles(["admin", "super_admin"]))
):
    """Deactivate a leave type"""
    await db.leave_types.update_one(
        {"id": leave_type_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Type de congé désactivé"}

@config_router.get("/leave-rules")
async def get_leave_rules(current_user: dict = Depends(require_roles(["admin"]))):
    rules = await db.leave_rules.find_one({"type": "default"}, {"_id": 0})
    if not rules:
        rules = LeaveRuleConfig().model_dump()
        rules["type"] = "default"
        await db.leave_rules.insert_one(rules)
    return rules

@config_router.put("/leave-rules")
async def update_leave_rules(
    rules: LeaveRuleConfig,
    current_user: dict = Depends(require_roles(["admin"]))
):
    rules_doc = rules.model_dump()
    rules_doc["type"] = "default"
    rules_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    rules_doc["updated_by"] = current_user["id"]
    
    await db.leave_rules.update_one(
        {"type": "default"},
        {"$set": rules_doc},
        upsert=True
    )
    return rules_doc

@config_router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    return {
        "categories": [
            {"id": "cadre", "name": "Cadre", "leave_multiplier": 1.2},
            {"id": "agent", "name": "Agent", "leave_multiplier": 1.0},
            {"id": "stagiaire", "name": "Stagiaire", "leave_multiplier": 0.5}
        ]
    }

# Default permissions
DEFAULT_PERMISSIONS = {
    "admin": {
        "can_manage_employees": True,
        "can_approve_leaves": True,
        "can_post_announcements": True,
        "can_post_behavior": True,
        "can_view_salaries": True,
        "can_edit_salaries": True,
        "can_delete_employees": True,
        "can_manage_permissions": True
    },
    "secretary": {
        "can_manage_employees": True,
        "can_approve_leaves": True,
        "can_post_announcements": True,
        "can_post_behavior": False,
        "can_view_salaries": False,
        "can_edit_salaries": False,
        "can_delete_employees": False,
        "can_manage_permissions": False
    },
    "employee": {
        "can_manage_employees": False,
        "can_approve_leaves": False,
        "can_post_announcements": False,
        "can_post_behavior": False,
        "can_view_salaries": False,
        "can_edit_salaries": False,
        "can_delete_employees": False,
        "can_manage_permissions": False
    }
}

@config_router.get("/permissions")
async def get_permissions(current_user: dict = Depends(get_current_user)):
    """Get role permissions"""
    permissions = await db.permissions.find_one({"type": "roles"}, {"_id": 0})
    if not permissions:
        permissions = {"type": "roles", "permissions": DEFAULT_PERMISSIONS}
    return permissions

@config_router.put("/permissions")
async def update_permissions(
    data: dict,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Update role permissions (admin only)"""
    permissions_doc = {
        "type": "roles",
        "permissions": data.get("permissions", DEFAULT_PERMISSIONS),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"]
    }
    await db.permissions.update_one(
        {"type": "roles"},
        {"$set": permissions_doc},
        upsert=True
    )
    return {"message": "Permissions mises à jour", "permissions": permissions_doc["permissions"]}

# ==================== BEHAVIOR TRACKING ROUTES ====================
@behavior_router.get("")
async def list_behaviors(current_user: dict = Depends(get_current_user)):
    """List behavior notes - employees see only their own"""
    query = {}
    if current_user["role"] == "employee":
        query["employee_id"] = current_user["id"]
    
    behaviors = await db.behaviors.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    return {"behaviors": behaviors}

@behavior_router.post("", status_code=status.HTTP_201_CREATED)
async def create_behavior_note(
    behavior: BehaviorNote,
    current_user: dict = Depends(require_roles(["admin", "secretary"]))
):
    """Create a behavior note with document support"""
    employee = await db.users.find_one({"id": behavior.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    behavior_doc = {
        "id": str(uuid.uuid4()),
        "employee_id": behavior.employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "type": behavior.type,
        "note": behavior.note,
        "date": behavior.date,
        "file_name": behavior.file_name,
        "file_url": behavior.file_url,
        "document_urls": behavior.document_urls or [],
        "created_by": current_user["id"],
        "created_by_name": f"{current_user['first_name']} {current_user['last_name']}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.behaviors.insert_one(behavior_doc)
    behavior_doc.pop("_id", None)
    return behavior_doc

@behavior_router.get("/{employee_id}")
async def get_employee_behaviors(
    employee_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get behavior history for an employee"""
    # Employees can only see their own
    if current_user["role"] == "employee" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    behaviors = await db.behaviors.find(
        {"employee_id": employee_id}, 
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    return {"behaviors": behaviors}

@behavior_router.delete("/{behavior_id}")
async def delete_behavior_note(
    behavior_id: str,
    current_user: dict = Depends(require_roles(["admin", "secretary"]))
):
    """Delete a behavior note (admin/secretary only)"""
    behavior = await db.behaviors.find_one({"id": behavior_id}, {"_id": 0})
    if not behavior:
        raise HTTPException(status_code=404, detail="Note de comportement non trouvée")
    
    await db.behaviors.delete_one({"id": behavior_id})
    return {"message": "Note de comportement supprimée", "id": behavior_id}

# ==================== DOCUMENT UPLOAD ROUTES ====================
@employees_router.post("/{employee_id}/documents")
async def upload_document(
    employee_id: str,
    document: DocumentUpload,
    current_user: dict = Depends(get_current_user)
):
    """Upload a document to employee profile"""
    # Only employee can upload to their own profile, or admin/secretary
    if current_user["role"] == "employee" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    doc = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_id,
        "name": document.name,
        "type": document.type,
        "url": document.url,
        "uploaded_by": current_user["id"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc

@employees_router.get("/{employee_id}/documents")
async def get_employee_documents(
    employee_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get documents for an employee"""
    # Employees can only see their own documents
    if current_user["role"] == "employee" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    documents = await db.documents.find({"employee_id": employee_id}, {"_id": 0}).to_list(100)
    return {"documents": documents}

@employees_router.put("/{employee_id}/documents/{document_id}")
async def update_document(
    employee_id: str,
    document_id: str,
    name: str,
    current_user: dict = Depends(get_current_user)
):
    """Rename a document"""
    # Check permissions
    if current_user["role"] == "employee" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    result = await db.documents.update_one(
        {"id": document_id, "employee_id": employee_id},
        {"$set": {"name": name, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    return {"message": "Document renommé", "name": name}

@employees_router.delete("/{employee_id}/documents/{document_id}")
async def delete_document(
    employee_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document"""
    # Check permissions
    if current_user["role"] == "employee" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Get document to delete file from disk
    doc = await db.documents.find_one({"id": document_id, "employee_id": employee_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Delete from database
    await db.documents.delete_one({"id": document_id})
    
    # Optionally delete file from disk (be careful with shared files)
    # For now, we keep the file but remove the reference
    
    return {"message": "Document supprimé"}

# ==================== SALARY ROUTES (Admin calculate, Employee view own) ====================
@employees_router.get("/{employee_id}/salary")
async def get_employee_salary(
    employee_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get salary - employee can only see their own"""
    if current_user["role"] == "employee" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé - Vous ne pouvez voir que votre propre salaire")
    
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0, "password": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    return {
        "employee_id": employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "salary": employee.get("salary", 0),
        "salary_currency": employee.get("salary_currency", "USD"),
        "category": employee.get("category", "agent")
    }

@employees_router.put("/{employee_id}/salary")
async def update_employee_salary(
    employee_id: str,
    salary: float,
    currency: str = "USD",
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Update salary (admin only)"""
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {
            "salary": salary, 
            "salary_currency": currency,
            "salary_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Salaire mis à jour", "salary": salary, "salary_currency": currency}

# ==================== COMMUNICATION ROUTES ====================
@communication_router.get("/announcements")
async def list_announcements(current_user: dict = Depends(get_current_user)):
    """List all announcements"""
    announcements = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"announcements": announcements}

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"

@communication_router.post("/announcements", status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement_data: AnnouncementCreate,
    current_user: dict = Depends(require_roles(["admin", "secretary"]))
):
    """Create announcement (admin/secretary only)"""
    announcement = {
        "id": str(uuid.uuid4()),
        "title": announcement_data.title,
        "content": announcement_data.content,
        "priority": announcement_data.priority,
        "author_id": current_user["id"],
        "author_name": f"{current_user['first_name']} {current_user['last_name']}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.announcements.insert_one(announcement)
    announcement.pop("_id", None)
    return announcement

@communication_router.delete("/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Delete an announcement (admin only)"""
    result = await db.announcements.delete_one({"id": announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return {"message": "Annonce supprimée"}

# ==================== LIVE CHAT ROUTES ====================
class ChatMessage(BaseModel):
    content: str
    recipient_id: Optional[str] = None  # None means broadcast to all

@communication_router.get("/chat/messages")
async def get_chat_messages(
    recipient_id: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get chat messages - either broadcast or direct messages"""
    query = {}
    
    if recipient_id:
        # Direct messages between two users
        query = {
            "$or": [
                {"sender_id": current_user["id"], "recipient_id": recipient_id},
                {"sender_id": recipient_id, "recipient_id": current_user["id"]}
            ]
        }
    else:
        # Broadcast messages (recipient_id is None or "all")
        query = {"$or": [{"recipient_id": None}, {"recipient_id": "all"}]}
    
    messages = await db.chat_messages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()  # Show oldest first
    return {"messages": messages}

@communication_router.post("/chat/messages", status_code=status.HTTP_201_CREATED)
async def send_chat_message(
    message: ChatMessage,
    current_user: dict = Depends(get_current_user)
):
    """Send a chat message"""
    chat_msg = {
        "id": str(uuid.uuid4()),
        "sender_id": current_user["id"],
        "sender_name": f"{current_user['first_name']} {current_user['last_name']}",
        "sender_avatar": current_user.get("avatar_url"),
        "content": message.content,
        "recipient_id": message.recipient_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(chat_msg)
    chat_msg.pop("_id", None)
    return chat_msg

@communication_router.get("/chat/users")
async def get_chat_users(current_user: dict = Depends(get_current_user)):
    """Get list of users for chat"""
    users = await db.users.find(
        {"is_active": True, "id": {"$ne": current_user["id"]}},
        {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "avatar_url": 1, "role": 1, "department": 1}
    ).to_list(100)
    return {"users": users}

@communication_router.get("/chat/unread")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get unread message counts per user"""
    # Get all users who have sent messages to current user
    pipeline = [
        {
            "$match": {
                "recipient_id": current_user["id"],
                "sender_id": {"$ne": current_user["id"]}
            }
        },
        {
            "$group": {
                "_id": "$sender_id",
                "count": {"$sum": 1},
                "last_message": {"$max": "$created_at"}
            }
        }
    ]
    
    unread_counts = {}
    async for doc in db.chat_messages.aggregate(pipeline):
        unread_counts[doc["_id"]] = {
            "count": doc["count"],
            "last_message": doc["last_message"]
        }
    
    return {"unread": unread_counts}

# ==================== FILE UPLOAD ROUTES ====================
from fastapi import UploadFile, File
import base64
import os

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@upload_router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file (PDF, JPEG, PNG, DOC, DOCX)"""
    allowed_types = [
        "application/pdf", 
        "image/jpeg", 
        "image/jpg", 
        "image/png", 
        "image/webp",
        "application/msword",  # .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"  # .docx
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Type de fichier non supporté: {file.content_type}. Utilisez PDF, JPEG, PNG, DOC ou DOCX."
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    filename = f"{file_id}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save file
    content = await file.read()
    with open(filepath, 'wb') as f:
        f.write(content)
    
    # Return URL
    file_url = f"/api/uploads/{filename}"
    
    return {
        "success": True,
        "file_id": file_id,
        "filename": file.filename,
        "url": file_url,
        "content_type": file.content_type,
        "size": len(content)
    }

@upload_router.post("/avatar/{employee_id}")
async def upload_avatar(
    employee_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload profile picture"""
    # Users can upload their own avatar, admin can upload for anyone
    if current_user["role"] not in ["admin", "secretary"] and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Utilisez JPEG, PNG ou WebP pour la photo de profil")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"avatar_{employee_id}_{file_id}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Save file
    content = await file.read()
    with open(filepath, 'wb') as f:
        f.write(content)
    
    # Update user avatar URL
    avatar_url = f"/api/uploads/{filename}"
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"avatar_url": avatar_url}}
    )
    
    return {
        "success": True,
        "avatar_url": avatar_url,
        "message": "Photo de profil mise à jour"
    }

# ==================== FILE PREVIEW ENDPOINT ====================
@api_router.get("/preview/{filepath:path}")
async def preview_file(filepath: str):
    """
    Serve files with proper headers for browser preview
    Supports: PDF, images (JPEG, PNG, WebP)
    """
    # Clean and validate filepath
    filepath = filepath.strip('/')
    
    # Determine full path
    if filepath.startswith('api/uploads/'):
        filename = filepath.replace('api/uploads/', '')
    elif filepath.startswith('uploads/'):
        filename = filepath.replace('uploads/', '')
    else:
        filename = filepath
    
    full_path = os.path.join(UPLOAD_DIR, filename)
    
    # Check if file exists
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Determine content type based on file extension
    ext = filename.split('.')[-1].lower()
    content_type_map = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    
    content_type = content_type_map.get(ext, 'application/octet-stream')
    
    # Return file with inline disposition for browser preview
    return FileResponse(
        path=full_path,
        media_type=content_type,
        headers={
            "Content-Disposition": f"inline; filename=\"{filename}\"",
            "Cache-Control": "public, max-age=3600"
        }
    )

# Serve uploaded files
from fastapi.staticfiles import StaticFiles

# ==================== DASHBOARD STATS ====================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    stats = {}
    
    if current_user["role"] in ["admin", "secretary"]:
        stats["total_employees"] = await db.users.count_documents({"is_active": True})
        stats["pending_leaves"] = await db.leaves.count_documents({"status": "pending"})
        stats["approved_leaves"] = await db.leaves.count_documents({"status": "approved"})
        stats["rejected_leaves"] = await db.leaves.count_documents({"status": "rejected"})
        
        # Department breakdown
        dept_pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$department", "count": {"$sum": 1}}}
        ]
        dept_stats = await db.users.aggregate(dept_pipeline).to_list(20)
        stats["employees_by_department"] = {d["_id"]: d["count"] for d in dept_stats if d["_id"]}
    else:
        # Employee sees only their stats
        user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
        stats["leave_balance"] = user.get("leave_balance", {})
        stats["leave_taken"] = user.get("leave_taken", {})
        stats["pending_requests"] = await db.leaves.count_documents({
            "employee_id": current_user["id"],
            "status": "pending"
        })
    
    return stats

# ==================== NOTIFICATIONS ROUTES ====================
@notifications_router.get("")
async def get_notifications(
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get notifications for current user"""
    query = {"user_id": current_user["id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread_count = await db.notifications.count_documents({"user_id": current_user["id"], "read": False})
    
    return {"notifications": notifications, "unread_count": unread_count}

@notifications_router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marquée comme lue"}

@notifications_router.put("/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Toutes les notifications marquées comme lues"}

@notifications_router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification"""
    await db.notifications.delete_one({"id": notification_id, "user_id": current_user["id"]})
    return {"message": "Notification supprimée"}

# ==================== SITES & HIERARCHICAL GROUPS ROUTES ====================
class SiteCreate(BaseModel):
    name: str
    city: str
    country: str = "RDC"
    address: Optional[str] = None
    is_active: bool = True

class HierarchicalGroupCreate(BaseModel):
    name: str
    site_id: str
    department: str
    manager_id: Optional[str] = None
    member_ids: List[str] = []

@sites_router.get("")
async def list_sites(current_user: dict = Depends(get_current_user)):
    """List all work sites"""
    sites = await db.sites.find({"is_active": True}, {"_id": 0}).to_list(100)
    return {"sites": sites}

@sites_router.post("", status_code=status.HTTP_201_CREATED)
async def create_site(
    site: SiteCreate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Create a new work site"""
    site_doc = {
        "id": str(uuid.uuid4()),
        **site.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.sites.insert_one(site_doc)
    site_doc.pop("_id", None)
    return site_doc

@sites_router.put("/{site_id}")
async def update_site(
    site_id: str,
    site: SiteCreate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Update a work site"""
    update_data = site.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.sites.update_one({"id": site_id}, {"$set": update_data})
    return {"message": "Site mis à jour"}

@sites_router.delete("/{site_id}")
async def delete_site(
    site_id: str,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Deactivate a work site"""
    await db.sites.update_one({"id": site_id}, {"$set": {"is_active": False}})
    return {"message": "Site désactivé"}

# Hierarchical Groups
@sites_router.get("/groups")
async def list_hierarchical_groups(
    site_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List hierarchical groups"""
    query = {}
    if site_id:
        query["site_id"] = site_id
    
    groups = await db.hierarchical_groups.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with manager and member details
    for group in groups:
        if group.get("manager_id"):
            manager = await db.users.find_one({"id": group["manager_id"]}, {"_id": 0, "password": 0})
            group["manager"] = manager
        
        if group.get("member_ids"):
            members = await db.users.find(
                {"id": {"$in": group["member_ids"]}}, 
                {"_id": 0, "password": 0}
            ).to_list(100)
            group["members"] = members
    
    return {"groups": groups}

@sites_router.post("/groups", status_code=status.HTTP_201_CREATED)
async def create_hierarchical_group(
    group: HierarchicalGroupCreate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Create a hierarchical group"""
    # Verify site exists
    site = await db.sites.find_one({"id": group.site_id, "is_active": True})
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    
    group_doc = {
        "id": str(uuid.uuid4()),
        **group.model_dump(),
        "site_name": site["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.hierarchical_groups.insert_one(group_doc)
    
    # Update employees with their group
    if group.member_ids:
        await db.users.update_many(
            {"id": {"$in": group.member_ids}},
            {"$set": {"hierarchical_group_id": group_doc["id"], "site_id": group.site_id}}
        )
    
    if group.manager_id:
        await db.users.update_one(
            {"id": group.manager_id},
            {"$set": {"hierarchical_group_id": group_doc["id"], "site_id": group.site_id, "is_manager": True}}
        )
    
    group_doc.pop("_id", None)
    return group_doc

@sites_router.put("/groups/{group_id}")
async def update_hierarchical_group(
    group_id: str,
    group: HierarchicalGroupCreate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Update a hierarchical group"""
    existing = await db.hierarchical_groups.find_one({"id": group_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Groupe non trouvé")
    
    # Remove old members from group
    if existing.get("member_ids"):
        await db.users.update_many(
            {"id": {"$in": existing["member_ids"]}},
            {"$unset": {"hierarchical_group_id": "", "site_id": ""}}
        )
    if existing.get("manager_id"):
        await db.users.update_one(
            {"id": existing["manager_id"]},
            {"$unset": {"hierarchical_group_id": "", "is_manager": ""}}
        )
    
    # Update group
    update_data = group.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.hierarchical_groups.update_one({"id": group_id}, {"$set": update_data})
    
    # Add new members to group
    if group.member_ids:
        await db.users.update_many(
            {"id": {"$in": group.member_ids}},
            {"$set": {"hierarchical_group_id": group_id, "site_id": group.site_id}}
        )
    if group.manager_id:
        await db.users.update_one(
            {"id": group.manager_id},
            {"$set": {"hierarchical_group_id": group_id, "site_id": group.site_id, "is_manager": True}}
        )
    
    return {"message": "Groupe mis à jour"}

@sites_router.delete("/groups/{group_id}")
async def delete_hierarchical_group(
    group_id: str,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Delete a hierarchical group"""
    group = await db.hierarchical_groups.find_one({"id": group_id})
    if group:
        # Remove group reference from members
        if group.get("member_ids"):
            await db.users.update_many(
                {"id": {"$in": group["member_ids"]}},
                {"$unset": {"hierarchical_group_id": "", "site_id": ""}}
            )
        if group.get("manager_id"):
            await db.users.update_one(
                {"id": group["manager_id"]},
                {"$unset": {"hierarchical_group_id": "", "is_manager": ""}}
            )
    
    await db.hierarchical_groups.delete_one({"id": group_id})
    return {"message": "Groupe supprimé"}

# ==================== DEPARTMENTS MANAGEMENT ====================
departments_router = APIRouter(prefix="/departments", tags=["Départements"])

class DepartmentCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

@departments_router.get("")
async def list_departments(current_user: dict = Depends(get_current_user)):
    """Get all departments"""
    departments = await db.departments.find({}, {"_id": 0}).to_list(100)
    
    # If no departments in DB, return default list
    if not departments:
        default_departments = [
            {"code": "marketing", "name": "Marketing", "description": "Marketing et communication"},
            {"code": "comptabilite", "name": "Comptabilité", "description": "Comptabilité et finances"},
            {"code": "administration", "name": "Administration", "description": "Administration générale"},
            {"code": "ressources_humaines", "name": "Ressources Humaines", "description": "Gestion RH"},
            {"code": "juridique", "name": "Juridique", "description": "Service juridique"},
            {"code": "nettoyage", "name": "Nettoyage", "description": "Services de nettoyage"},
            {"code": "securite", "name": "Sécurité", "description": "Sécurité et surveillance"},
            {"code": "chauffeur", "name": "Chauffeur", "description": "Chauffeurs et transport"},
            {"code": "technicien", "name": "Technicien", "description": "Services techniques"},
            {"code": "direction", "name": "Direction", "description": "Direction générale"},
            {"code": "logistique", "name": "Logistique", "description": "Logistique et approvisionnement"},
            {"code": "production", "name": "Production", "description": "Production"},
            {"code": "commercial", "name": "Commercial", "description": "Service commercial"},
            {"code": "informatique", "name": "Informatique", "description": "Informatique et IT"}
        ]
        return {"departments": default_departments}
    
    return {"departments": departments}

@departments_router.post("", status_code=status.HTTP_201_CREATED)
async def create_department(
    dept: DepartmentCreate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Create a new department (admin only)"""
    # Check if code already exists
    existing = await db.departments.find_one({"code": dept.code})
    if existing:
        raise HTTPException(status_code=400, detail="Ce code de département existe déjà")
    
    dept_doc = {
        "id": str(uuid.uuid4()),
        "code": dept.code,
        "name": dept.name,
        "description": dept.description,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    await db.departments.insert_one(dept_doc)
    dept_doc.pop("_id", None)
    return dept_doc

@departments_router.put("/{dept_id}")
async def update_department(
    dept_id: str,
    dept: DepartmentCreate,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Update a department (admin only)"""
    existing = await db.departments.find_one({"id": dept_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Département non trouvé")
    
    update_data = dept.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.departments.update_one({"id": dept_id}, {"$set": update_data})
    return {"message": "Département mis à jour"}

@departments_router.delete("/{dept_id}")
async def delete_department(
    dept_id: str,
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Delete a department (admin only)"""
    # Check if department is used by employees
    employees_count = await db.users.count_documents({"department": dept_id})
    if employees_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Impossible de supprimer ce département, {employees_count} employé(s) y sont affectés"
        )
    
    await db.departments.delete_one({"id": dept_id})
    return {"message": "Département supprimé"}

@api_router.get("/")
async def root():
    return {"message": "PREMIDIS SARL - HR Platform", "version": "2.0.0"}

# ==================== INCLUDE ROUTERS ====================
api_router.include_router(auth_router)
api_router.include_router(employees_router)
api_router.include_router(leaves_router)
api_router.include_router(calendar_router)
api_router.include_router(hr_router)
api_router.include_router(config_router)
api_router.include_router(attendance_router)
api_router.include_router(behavior_router)
api_router.include_router(communication_router)
api_router.include_router(upload_router)
api_router.include_router(notifications_router)
api_router.include_router(sites_router)
api_router.include_router(departments_router)

app.include_router(api_router)

# Mount uploads folder - use /api/uploads for Kubernetes ingress routing
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.leaves.create_index("employee_id")
    await db.leaves.create_index("status")
    await db.calendar.create_index("start_date")
    
    # Initialize default leave rules
    existing_rules = await db.leave_rules.find_one({"type": "default"})
    if not existing_rules:
        default_rules = LeaveRuleConfig().model_dump()
        default_rules["type"] = "default"
        await db.leave_rules.insert_one(default_rules)
    
    logger.info("PREMIDIS SARL HR Platform started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
