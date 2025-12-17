from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
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
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import bcrypt
import base64
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'premierdis-secret-key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 480))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="PREMIERDIs HR API", version="1.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
employees_router = APIRouter(prefix="/employees", tags=["Employees"])
leaves_router = APIRouter(prefix="/leaves", tags=["Leaves"])
payroll_router = APIRouter(prefix="/payroll", tags=["Payroll"])
performance_router = APIRouter(prefix="/performance", tags=["Performance"])
communication_router = APIRouter(prefix="/communication", tags=["Communication"])
rules_router = APIRouter(prefix="/rules", tags=["Rules"])
voice_router = APIRouter(prefix="/voice", tags=["Voice AI"])

# ==================== ENUMS ====================
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    SECRETARY = "secretary"
    EMPLOYEE = "employee"

class LeaveStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class LeaveType(str, Enum):
    ANNUAL = "annual"
    SICK = "sick"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    UNPAID = "unpaid"

class Department(str, Enum):
    MARKETING = "marketing"
    ACCOUNTING = "comptabilite"
    ADMINISTRATION = "administration"
    HR = "ressources_humaines"
    LEGAL = "juridique"
    CLEANING = "nettoyage"
    SECURITY = "securite"

# ==================== MODELS ====================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    department: str = "administration"
    role: str = "employee"

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
    is_active: bool
    created_at: str
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    department: str
    position: str
    hire_date: str
    salary: float
    contract_type: str = "CDI"
    country: str = "RDC"

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    salary: Optional[float] = None
    contract_type: Optional[str] = None

class LeaveRequest(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str

class LeaveUpdate(BaseModel):
    status: str
    admin_comment: Optional[str] = None

class PayslipCreate(BaseModel):
    employee_id: str
    month: int
    year: int
    base_salary: float
    bonuses: float = 0
    deductions: float = 0
    net_salary: Optional[float] = None

class PerformanceCreate(BaseModel):
    employee_id: str
    period: str
    objectives: List[Dict[str, Any]]
    rating: float
    comments: Optional[str] = None

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"
    target_departments: List[str] = []

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class RuleCreate(BaseModel):
    title: str
    content: str
    category: str
    effective_date: str

class VoiceRequest(BaseModel):
    audio_base64: Optional[str] = None
    text: Optional[str] = None
    language: str = "fr"

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
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# ==================== AUTH ROUTES ====================
@auth_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "role": user_data.role,
        "department": user_data.department,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "avatar_url": None,
        "phone": None,
        "position": None
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
        is_active=True,
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        role=user["role"],
        department=user["department"],
        is_active=user["is_active"],
        created_at=user["created_at"],
        avatar_url=user.get("avatar_url"),
        phone=user.get("phone"),
        position=user.get("position")
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

@auth_router.put("/me")
async def update_me(updates: dict, current_user: dict = Depends(get_current_user)):
    allowed_fields = ["first_name", "last_name", "phone", "avatar_url"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return updated_user

# ==================== EMPLOYEES ROUTES ====================
@employees_router.get("")
async def list_employees(
    department: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "secretary"]))
):
    query = {}
    if department:
        query["department"] = department
    
    employees = await db.employees.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.employees.count_documents(query)
    
    return {"employees": employees, "total": total}

@employees_router.post("")
async def create_employee(
    employee: EmployeeCreate,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "secretary"]))
):
    employee_id = str(uuid.uuid4())
    employee_doc = {
        "id": employee_id,
        **employee.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    await db.employees.insert_one(employee_doc)
    employee_doc.pop("_id", None)
    return employee_doc

@employees_router.get("/{employee_id}")
async def get_employee(employee_id: str, current_user: dict = Depends(get_current_user)):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@employees_router.put("/{employee_id}")
async def update_employee(
    employee_id: str,
    updates: EmployeeUpdate,
    current_user: dict = Depends(require_roles(["super_admin", "admin"]))
):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if update_data:
        await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@employees_router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    current_user: dict = Depends(require_roles(["super_admin"]))
):
    result = await db.employees.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted"}

# ==================== LEAVES ROUTES ====================
@leaves_router.get("")
async def list_leaves(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if current_user["role"] == "employee":
        query["employee_id"] = current_user["id"]
    if status:
        query["status"] = status
    
    leaves = await db.leaves.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"leaves": leaves}

@leaves_router.post("")
async def create_leave_request(
    leave: LeaveRequest,
    current_user: dict = Depends(get_current_user)
):
    leave_id = str(uuid.uuid4())
    leave_doc = {
        "id": leave_id,
        "employee_id": current_user["id"],
        "employee_name": f"{current_user['first_name']} {current_user['last_name']}",
        **leave.model_dump(),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "admin_comment": None
    }
    
    await db.leaves.insert_one(leave_doc)
    leave_doc.pop("_id", None)
    return leave_doc

@leaves_router.put("/{leave_id}")
async def update_leave_status(
    leave_id: str,
    update: LeaveUpdate,
    current_user: dict = Depends(require_roles(["super_admin", "admin"]))
):
    update_data = {
        "status": update.status,
        "admin_comment": update.admin_comment,
        "updated_by": current_user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.leaves.update_one({"id": leave_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    leave = await db.leaves.find_one({"id": leave_id}, {"_id": 0})
    return leave

@leaves_router.get("/stats")
async def get_leave_stats(current_user: dict = Depends(get_current_user)):
    employee_id = current_user["id"]
    
    pipeline = [
        {"$match": {"employee_id": employee_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    
    stats = await db.leaves.aggregate(pipeline).to_list(10)
    result = {"pending": 0, "approved": 0, "rejected": 0}
    for stat in stats:
        result[stat["_id"]] = stat["count"]
    
    return result

# ==================== PAYROLL ROUTES ====================
@payroll_router.get("")
async def list_payslips(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if current_user["role"] == "employee":
        query["employee_id"] = current_user["id"]
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    
    payslips = await db.payslips.find(query, {"_id": 0}).sort([("year", -1), ("month", -1)]).to_list(100)
    return {"payslips": payslips}

@payroll_router.post("")
async def create_payslip(
    payslip: PayslipCreate,
    current_user: dict = Depends(require_roles(["super_admin", "admin", "secretary"]))
):
    payslip_id = str(uuid.uuid4())
    net_salary = payslip.net_salary or (payslip.base_salary + payslip.bonuses - payslip.deductions)
    
    payslip_doc = {
        "id": payslip_id,
        **payslip.model_dump(),
        "net_salary": net_salary,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    await db.payslips.insert_one(payslip_doc)
    payslip_doc.pop("_id", None)
    return payslip_doc

@payroll_router.get("/{payslip_id}")
async def get_payslip(payslip_id: str, current_user: dict = Depends(get_current_user)):
    query = {"id": payslip_id}
    if current_user["role"] == "employee":
        query["employee_id"] = current_user["id"]
    
    payslip = await db.payslips.find_one(query, {"_id": 0})
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
    return payslip

# ==================== PERFORMANCE ROUTES ====================
@performance_router.get("")
async def list_evaluations(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == "employee":
        query["employee_id"] = current_user["id"]
    
    evaluations = await db.evaluations.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"evaluations": evaluations}

@performance_router.post("")
async def create_evaluation(
    evaluation: PerformanceCreate,
    current_user: dict = Depends(require_roles(["super_admin", "admin"]))
):
    eval_id = str(uuid.uuid4())
    eval_doc = {
        "id": eval_id,
        **evaluation.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    await db.evaluations.insert_one(eval_doc)
    eval_doc.pop("_id", None)
    return eval_doc

# ==================== COMMUNICATION ROUTES ====================
@communication_router.get("/announcements")
async def list_announcements(current_user: dict = Depends(get_current_user)):
    query = {
        "$or": [
            {"target_departments": {"$size": 0}},
            {"target_departments": current_user["department"]}
        ]
    }
    announcements = await db.announcements.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"announcements": announcements}

@communication_router.post("/announcements")
async def create_announcement(
    announcement: AnnouncementCreate,
    current_user: dict = Depends(require_roles(["super_admin", "admin"]))
):
    ann_id = str(uuid.uuid4())
    ann_doc = {
        "id": ann_id,
        **announcement.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "author_name": f"{current_user['first_name']} {current_user['last_name']}"
    }
    
    await db.announcements.insert_one(ann_doc)
    ann_doc.pop("_id", None)
    return ann_doc

@communication_router.get("/messages")
async def list_messages(current_user: dict = Depends(get_current_user)):
    query = {
        "$or": [
            {"sender_id": current_user["id"]},
            {"receiver_id": current_user["id"]}
        ]
    }
    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"messages": messages}

@communication_router.post("/messages")
async def send_message(
    message: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    msg_id = str(uuid.uuid4())
    msg_doc = {
        "id": msg_id,
        "sender_id": current_user["id"],
        "sender_name": f"{current_user['first_name']} {current_user['last_name']}",
        **message.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    
    await db.messages.insert_one(msg_doc)
    msg_doc.pop("_id", None)
    return msg_doc

@communication_router.get("/contacts")
async def list_contacts(current_user: dict = Depends(get_current_user)):
    users = await db.users.find(
        {"id": {"$ne": current_user["id"]}, "is_active": True},
        {"_id": 0, "password": 0}
    ).to_list(500)
    return {"contacts": users}

# ==================== RULES ROUTES ====================
@rules_router.get("")
async def list_rules(current_user: dict = Depends(get_current_user)):
    rules = await db.rules.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"rules": rules}

@rules_router.post("")
async def create_rule(
    rule: RuleCreate,
    current_user: dict = Depends(require_roles(["super_admin", "admin"]))
):
    rule_id = str(uuid.uuid4())
    rule_doc = {
        "id": rule_id,
        **rule.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    
    await db.rules.insert_one(rule_doc)
    rule_doc.pop("_id", None)
    return rule_doc

@rules_router.get("/{rule_id}")
async def get_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    rule = await db.rules.find_one({"id": rule_id}, {"_id": 0})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

# ==================== VOICE AI ROUTES ====================
@voice_router.post("/transcribe")
async def transcribe_audio(request: VoiceRequest, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
        import tempfile
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Voice AI not configured")
        
        if not request.audio_base64:
            raise HTTPException(status_code=400, detail="Audio data required")
        
        audio_bytes = base64.b64decode(request.audio_base64)
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        stt = OpenAISpeechToText(api_key=api_key)
        
        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                language=request.language[:2] if request.language else "fr"
            )
        
        os.unlink(tmp_path)
        
        return {"text": response.text, "language": request.language}
    except Exception as e:
        logging.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@voice_router.post("/speak")
async def text_to_speech(request: VoiceRequest, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Voice AI not configured")
        
        if not request.text:
            raise HTTPException(status_code=400, detail="Text required")
        
        tts = OpenAITextToSpeech(api_key=api_key)
        audio_bytes = await tts.generate_speech(
            text=request.text,
            model="tts-1",
            voice="nova"
        )
        
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        return {"audio_base64": audio_base64}
    except Exception as e:
        logging.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@voice_router.post("/chat")
async def voice_chat(request: VoiceRequest, current_user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="Voice AI not configured")
        
        text = request.text
        if not text:
            raise HTTPException(status_code=400, detail="Text required")
        
        lang_prompts = {
            "fr": "Tu es un assistant RH pour PREMIERDIs sarl. Réponds en français de manière concise et professionnelle.",
            "en": "You are an HR assistant for PREMIERDIs sarl. Respond in English concisely and professionally.",
            "sw": "Wewe ni msaidizi wa HR wa PREMIERDIs sarl. Jibu kwa Kiswahili kwa ufupi na kitaalamu.",
            "hi": "आप PREMIERDIs sarl के HR सहायक हैं। हिंदी में संक्षिप्त और पेशेवर तरीके से जवाब दें।"
        }
        
        system_msg = lang_prompts.get(request.language, lang_prompts["fr"])
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"hr-voice-{current_user['id']}",
            system_message=system_msg
        ).with_model("openai", "gpt-5.1")
        
        user_message = UserMessage(text=text)
        response = await chat.send_message(user_message)
        
        return {"response": response, "language": request.language}
    except Exception as e:
        logging.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DASHBOARD STATS ====================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    stats = {}
    
    if current_user["role"] in ["super_admin", "admin"]:
        stats["total_employees"] = await db.employees.count_documents({})
        stats["pending_leaves"] = await db.leaves.count_documents({"status": "pending"})
        stats["total_announcements"] = await db.announcements.count_documents({})
        stats["unread_messages"] = await db.messages.count_documents({
            "receiver_id": current_user["id"],
            "read": False
        })
        
        dept_pipeline = [
            {"$group": {"_id": "$department", "count": {"$sum": 1}}}
        ]
        dept_stats = await db.employees.aggregate(dept_pipeline).to_list(20)
        stats["employees_by_department"] = {d["_id"]: d["count"] for d in dept_stats}
    else:
        stats["my_leaves_pending"] = await db.leaves.count_documents({
            "employee_id": current_user["id"],
            "status": "pending"
        })
        stats["my_payslips"] = await db.payslips.count_documents({
            "employee_id": current_user["id"]
        })
        stats["unread_messages"] = await db.messages.count_documents({
            "receiver_id": current_user["id"],
            "read": False
        })
    
    return stats

@api_router.get("/")
async def root():
    return {"message": "PREMIERDIs HR API", "version": "1.0.0"}

# ==================== INCLUDE ROUTERS ====================
api_router.include_router(auth_router)
api_router.include_router(employees_router)
api_router.include_router(leaves_router)
api_router.include_router(payroll_router)
api_router.include_router(performance_router)
api_router.include_router(communication_router)
api_router.include_router(rules_router)
api_router.include_router(voice_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.employees.create_index("id", unique=True)
    await db.employees.create_index("department")
    await db.leaves.create_index("employee_id")
    await db.payslips.create_index([("employee_id", 1), ("year", -1), ("month", -1)])
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
