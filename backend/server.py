from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import List, Optional
import jwt
import os
import uuid
import base64
import httpx
import ssl
from mangum import Mangum

# Initialize FastAPI app
app = FastAPI(title="Apple Store Account Zero Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://applezero.app", "https://www.applezero.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["applezero"]

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Business Bank Account Details
BUSINESS_BANK_INFO = {
    "beneficiary": "Noureldin Ahmed Elsawah",
    "iban": "FR76 2823 3000 0102 4411 0869 721",
    "bic_swift": "REVOFRP2",
    "bank_name": "Revolut Bank UAB",
    "bank_address": "10 avenue Kléber, 75116, Paris, France",
    "currency": "EUR"
}

# Pydantic Models
class User(BaseModel):
    id: Optional[str] = None
    email: EmailStr
    name: str
    password: Optional[str] = None
    created_at: Optional[datetime] = None

class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ServiceRequest(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    current_region: str
    target_region: str
    balance_amount: float
    currency: str = "EUR"
    description: Optional[str] = None
    status: str = "pending"
    payment_method: Optional[str] = None
    payment_status: str = "pending"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ServiceRequestCreate(BaseModel):
    current_region: str
    target_region: str
    balance_amount: float
    currency: str = "EUR"
    description: Optional[str] = None

class PaymentConfirmation(BaseModel):
    payment_method: str  # "bank_transfer" or "apple_pay"
    payment_reference: Optional[str] = None
    payment_proof: Optional[str] = None  # Base64 encoded image for bank transfer

class ApplePayValidationRequest(BaseModel):
    validation_url: str

class ApplePayPayment(BaseModel):
    apple_pay_token: dict
    amount: float
    currency: str = "EUR"

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Routes
@app.get("/")
async def root():
    return {"message": "AppleZero API - Production", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.post("/api/register")
async def register_user(user: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_id = str(uuid.uuid4())
    
    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user.email,
            "name": user.name
        }
    }

@app.post("/api/login")
async def login_user(user_credentials: UserLogin):
    user = await db.users.find_one({"email": user_credentials.email})
    if not user or not verify_password(user_credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"]
        }
    }

@app.get("/api/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "name": current_user["name"],
        "created_at": current_user["created_at"]
    }

@app.post("/api/requests")
async def create_service_request(
    request: ServiceRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    request_id = str(uuid.uuid4())
    
    request_doc = {
        "id": request_id,
        "user_id": current_user["id"],
        "current_region": request.current_region,
        "target_region": request.target_region,
        "balance_amount": request.balance_amount,
        "currency": request.currency,
        "description": request.description,
        "status": "pending_payment",
        "payment_method": None,
        "payment_status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.service_requests.insert_one(request_doc)
    
    return {
        "id": request_id,
        "message": "Service request created successfully",
        "status": "pending_payment"
    }

@app.get("/api/requests")
async def get_user_requests(current_user: dict = Depends(get_current_user)):
    cursor = db.service_requests.find({"user_id": current_user["id"]})
    requests = await cursor.to_list(length=100)
    
    # Convert ObjectId to string and remove MongoDB _id
    for req in requests:
        req.pop("_id", None)
    
    return {"requests": requests}

@app.get("/api/requests/{request_id}")
async def get_service_request(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    request = await db.service_requests.find_one({
        "id": request_id,
        "user_id": current_user["id"]
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    request.pop("_id", None)
    return request

@app.get("/api/bank-info")
async def get_bank_info():
    """Get business bank account information for transfers"""
    return BUSINESS_BANK_INFO

@app.post("/api/requests/{request_id}/payment")
async def confirm_payment(
    request_id: str,
    payment: PaymentConfirmation,
    current_user: dict = Depends(get_current_user)
):
    # Find the service request
    request = await db.service_requests.find_one({
        "id": request_id,
        "user_id": current_user["id"]
    })
    
    if not request:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    # Update request with payment information
    update_data = {
        "payment_method": payment.payment_method,
        "payment_status": "submitted",
        "status": "payment_verification",
        "updated_at": datetime.utcnow()
    }
    
    if payment.payment_reference:
        update_data["payment_reference"] = payment.payment_reference
    
    if payment.payment_proof:
        update_data["payment_proof"] = payment.payment_proof
    
    await db.service_requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    return {
        "message": "Payment confirmation submitted successfully",
        "status": "payment_verification"
    }

# Apple Pay Integration (Mock/Demo)
@app.post("/api/apple-pay/validate-merchant")
async def validate_merchant(request: ApplePayValidationRequest):
    """
    Mock Apple Pay merchant validation for demo purposes.
    In production, this would validate with Apple servers using certificates.
    """
    # Mock successful validation response
    mock_session = {
        "epochTimestamp": 1640995200000,
        "expiresAt": 1640995800000,
        "merchantSessionIdentifier": "mock_session_" + str(uuid.uuid4()),
        "nonce": str(uuid.uuid4()),
        "merchantIdentifier": "merchant.com.applezero.app",
        "domainName": "applezero.app",
        "displayName": "AppleZero Store",
        "signature": "mock_signature"
    }
    
    return mock_session

@app.post("/api/apple-pay/process-payment")
async def process_apple_pay_payment(payment: ApplePayPayment):
    """
    Mock Apple Pay payment processing for demo purposes.
    In production, this would process the encrypted Apple Pay token.
    """
    # Mock successful payment processing
    transaction_id = "applepay_" + str(uuid.uuid4())
    
    return {
        "success": True,
        "transaction_id": transaction_id,
        "status": "approved",
        "message": "Apple Pay payment processed successfully",
        "amount": payment.amount,
        "currency": payment.currency
    }

@app.get("/api/stats")
async def get_service_stats():
    total_requests = await db.service_requests.count_documents({})
    completed_requests = await db.service_requests.count_documents({"status": "completed"})
    pending_requests = await db.service_requests.count_documents({"status": {"$in": ["pending", "pending_payment"]}})
    processing_requests = await db.service_requests.count_documents({"status": {"$in": ["payment_verification", "processing"]}})
    
    return {
        "total_requests": total_requests,
        "completed_requests": completed_requests,
        "pending_requests": pending_requests,
        "processing_requests": processing_requests,
        "success_rate": round((completed_requests / max(total_requests, 1)) * 100, 1)
    }

# Vercel serverless handler
handler = Mangum(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
