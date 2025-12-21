from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
    birth_date: Optional[str] = None
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

class LeaveUpdate(BaseModel):
    status: str
    admin_comment: Optional[str] = None

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    category: Optional[str] = None
    salary: Optional[float] = None
    hire_date: Optional[str] = None

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
    type: str  # 'positive' or 'negative'
    note: str
    date: str

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

# ==================== AUTH ROUTES ====================
@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà enregistré")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    # Get default leave rules
    leave_rules = await db.leave_rules.find_one({"type": "default"}, {"_id": 0})
    if not leave_rules:
        leave_rules = LeaveRuleConfig().model_dump()
    
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
        "birth_date": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "avatar_url": None,
        # Leave balances based on rules
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
    
    query = {}
    if department:
        query["department"] = department
    if category:
        query["category"] = category
    
    employees = await db.users.find(query, {"_id": 0, "password": 0}).to_list(500)
    return {"employees": employees, "total": len(employees)}

@employees_router.get("/{employee_id}")
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    # Employees can only view themselves
    if current_user["role"] == "employee" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0, "password": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
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
async def deactivate_employee(
    employee_id: str,
    current_user: dict = Depends(require_roles(["admin"]))
):
    await db.users.update_one({"id": employee_id}, {"$set": {"is_active": False}})
    return {"message": "Employé désactivé"}

# ==================== LEAVE MANAGEMENT ROUTES ====================
@leaves_router.get("")
async def list_leaves(
    status: Optional[str] = None,
    leave_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # Employees see only their own leaves
    if current_user["role"] == "employee":
        query["employee_id"] = current_user["id"]
    
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
    """Get approved leaves for calendar display"""
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year
    
    # Build query based on role
    query = {"status": "approved"}
    if current_user["role"] == "employee":
        # Employee sees only their leaves + public holidays
        query = {"$or": [
            {"employee_id": current_user["id"], "status": "approved"},
            {"leave_type": "public"}
        ]}
    
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
    # Validate dates
    try:
        start = datetime.strptime(leave.start_date, "%Y-%m-%d")
        end = datetime.strptime(leave.end_date, "%Y-%m-%d")
        if end < start:
            raise HTTPException(status_code=400, detail="La date de fin doit être après la date de début")
    except ValueError:
        raise HTTPException(status_code=400, detail="Format de date invalide")
    
    # Calculate working days
    working_days = calculate_working_days(leave.start_date, leave.end_date)
    
    # Check leave balance
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    leave_balance = user.get("leave_balance", {})
    leave_taken = user.get("leave_taken", {})
    
    available = leave_balance.get(leave.leave_type, 0) - leave_taken.get(leave.leave_type, 0)
    
    if working_days > available and leave.leave_type != "public":
        raise HTTPException(
            status_code=400, 
            detail=f"Solde insuffisant. Disponible: {available} jours, Demandé: {working_days} jours"
        )
    
    # Check for overlapping leaves
    existing = await db.leaves.find_one({
        "employee_id": current_user["id"],
        "status": {"$ne": "rejected"},
        "$or": [
            {"start_date": {"$lte": leave.end_date}, "end_date": {"$gte": leave.start_date}}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Chevauchement avec une demande existante")
    
    leave_id = str(uuid.uuid4())
    leave_doc = {
        "id": leave_id,
        "employee_id": current_user["id"],
        "employee_name": f"{current_user['first_name']} {current_user['last_name']}",
        "department": current_user.get("department", ""),
        "leave_type": leave.leave_type,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "working_days": working_days,
        "reason": leave.reason,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "admin_comment": None,
        "approved_by": None,
        "approved_at": None
    }
    
    await db.leaves.insert_one(leave_doc)
    leave_doc.pop("_id", None)
    return leave_doc

@leaves_router.get("/balance")
async def get_leave_balance(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    leave_balance = user.get("leave_balance", {})
    leave_taken = user.get("leave_taken", {})
    
    balance = {}
    for leave_type in ["annual", "sick", "exceptional", "maternity", "paternity"]:
        total = leave_balance.get(leave_type, 0)
        taken = leave_taken.get(leave_type, 0)
        balance[leave_type] = {
            "total": total,
            "taken": taken,
            "remaining": total - taken
        }
    
    return balance

@leaves_router.put("/{leave_id}")
async def update_leave_status(
    leave_id: str,
    update: LeaveUpdate,
    current_user: dict = Depends(require_roles(["admin", "secretary"]))
):
    # Secretary can only update to pending, admin can approve/reject
    if current_user["role"] == "secretary" and update.status in ["approved", "rejected"]:
        raise HTTPException(status_code=403, detail="Seul l'administrateur peut approuver ou rejeter")
    
    leave = await db.leaves.find_one({"id": leave_id}, {"_id": 0})
    if not leave:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    update_data = {
        "status": update.status,
        "admin_comment": update.admin_comment,
        "approved_by": current_user["id"],
        "approved_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.leaves.update_one({"id": leave_id}, {"$set": update_data})
    
    # Update leave balance if approved
    if update.status == "approved" and leave["status"] != "approved":
        await db.users.update_one(
            {"id": leave["employee_id"]},
            {"$inc": {f"leave_taken.{leave['leave_type']}": leave["working_days"]}}
        )
    # Restore balance if rejected after approval
    elif update.status == "rejected" and leave["status"] == "approved":
        await db.users.update_one(
            {"id": leave["employee_id"]},
            {"$inc": {f"leave_taken.{leave['leave_type']}": -leave["working_days"]}}
        )
    
    # Add to calendar if approved
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
    employee_id: str,
    date: str,
    check_in: Optional[str] = None,
    check_out: Optional[str] = None,
    notes: Optional[str] = "",
    current_user: dict = Depends(require_roles(["admin", "secretary"]))
):
    """Manually create attendance record (admin/secretary only)"""
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    
    attendance_doc = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_id,
        "employee_name": f"{employee['first_name']} {employee['last_name']}",
        "date": date,
        "check_in": check_in,
        "check_out": check_out,
        "notes": notes,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.attendance.insert_one(attendance_doc)
    attendance_doc.pop("_id", None)
    return attendance_doc

# ==================== CONFIG ROUTES (Admin Only) ====================
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

app.include_router(api_router)

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
