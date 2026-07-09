# backend/app/api/v1/chatbot_api.py
import os, re, uuid, smtplib, requests
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, ValidationError
from dotenv import load_dotenv
from difflib import SequenceMatcher
import json

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AGENT_ID       = os.getenv("AGENT_ID")
EMAIL_HOST     = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT     = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER     = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = (os.getenv("EMAIL_PASSWORD") or "").replace(" ", "")
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "info@nozamaai.com")

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# ---------- FAQ (Enhanced with seller info) ----------
class FAQService:
    def __init__(self):
        self.faqs = self._load_faqs()
        self.similarity_threshold = 0.45  # Lowered threshold for better matching
    
    def _load_faqs(self) -> Dict[str, Dict[str, Any]]:
        return {
            "products_overview": {
                "keywords": ["products","product","services","what do you sell","chatbots","solutions","marketplace","catalog","shop"],
                "question": "What products and services does Nozama.ai offer?",
                "answer": (
                    "Featured Products:\n"
                    "• SmartChat Pro ($299/mo)\n"
                    "• WhatsApp Bot Builder ($199/mo)\n"
                    "• E-commerce Assistant ($399/mo)\n"
                    "• Multi-language Bot ($249/mo)\n"
                    "• Voice Assistant ($449/mo)\n"
                    "Custom development available (from $2,000)."
                ),
                "suggestions": ["Pricing","Custom chatbot","How to buy","Become seller"],
            },
            "pricing_overview": {
                "keywords": ["price","pricing","cost","how much","plans","fees","payment"],
                "question": "What are your pricing plans?",
                "answer": (
                    "Our Pricing:\n"
                    "• Prebuilt Bots: $199–$449/month\n"
                    "• Custom Development: $2,000–$15,000+\n"
                    "• Seller Account: Free to join (30% platform fee)\n"
                    "• Trials available on select products"
                ),
                "suggestions": ["Custom quote","Show products","Become seller"],
            },
            "how_to_sell": {
                "keywords": ["sell","seller","become seller","want to sell","upload chatbot","list product","sale my products","sell my products","selling","marketplace","vendor"],
                "question": "How can I sell my products on Nozama.ai?",
                "answer": (
                    "🚀 **Become a Seller on Nozama.ai:**\n\n"
                    "1. **Sign Up:** Create your seller account (free)\n"
                    "2. **Add Products:** Upload chatbot details, pricing, demos\n"
                    "3. **Review Process:** 24-48 hour approval\n"
                    "4. **Go Live:** Start earning 70% revenue share\n\n"
                    "**Requirements:** Working chatbot, documentation, screenshots\n"
                    "**Support:** Dedicated seller dashboard & analytics"
                ),
                "suggestions": ["Open seller dashboard","Seller guidelines","Contact seller support","Pricing"],
            },
            "custom_chatbot_request": {
                "keywords": ["custom chatbot","custom bot","build me a chatbot","bespoke","tailored","develop","create chatbot"],
                "question": "I need a custom chatbot—what's the process?",
                "answer": (
                    "🤖 **Custom Chatbot Development:**\n\n"
                    "We'll collect your requirements and create a tailored solution.\n"
                    "**Process:** Requirements → Proposal → Development → Delivery\n"
                    "**Timeline:** 1-4+ weeks depending on complexity\n"
                    "**Pricing:** Starting from $2,000"
                ),
                "suggestions": ["Start request","Book consultation","Pricing","View examples"],
            },
        }
    
    def _exact(self, m: str, ks: List[str]) -> float:
        m = m.lower()
        return 1.0 if any(k.lower() in m for k in ks) else 0.0
    
    def _kw(self, m: str, ks: List[str]) -> float:
        words = m.lower().split(); matches=0; total=0
        for k in ks:
            kw=k.lower().split(); total+=len(kw)
            for w in kw:
                if w in words: matches+=1
        return matches/total if total else 0.0
    
    def _sim(self, a: str, b: str) -> float:
        return SequenceMatcher(None, a.lower(), b.lower()).ratio()
    
    def find_faq_match(self, message: str):
        best=None; best_score=0.0
        print(f"DEBUG: Finding FAQ match for: '{message}'")
        
        for key,data in self.faqs.items():
            exact_score = self._exact(message, data["keywords"])
            keyword_score = self._kw(message, data["keywords"])
            similarity_score = self._sim(message, data["question"])
            
            score = exact_score*0.6 + keyword_score*0.3 + similarity_score*0.1
            
            print(f"DEBUG: FAQ '{key}' - exact: {exact_score:.2f}, kw: {keyword_score:.2f}, sim: {similarity_score:.2f}, total: {score:.2f}")
            
            if score > best_score and score >= self.similarity_threshold:
                best_score = score
                best = (key, data)
        
        print(f"DEBUG: Best FAQ match: {best[0] if best else 'None'} with score: {best_score:.2f}")
        return best
    
    def get_faq_response(self, message: str):
        m = self.find_faq_match(message)
        if not m: 
            print("DEBUG: No FAQ match found")
            return None
        key, data = m
        print(f"DEBUG: Returning FAQ response for: {key}")
        return {"response": data["answer"], "suggestions": data.get("suggestions", []), "faq_key": key, "source":"faq_database"}

faq_service = FAQService()

# ---------- Validation ----------
_email_re = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def validate_email_basic(email: str) -> bool:
    return bool(_email_re.match(email or ""))

def validate_name_input(name: str) -> tuple[bool, str]:
    """Validate user name input"""
    if not name or not isinstance(name, str):
        return False, "Name is required"
    
    name = name.strip()
    if len(name) < 2:
        return False, "Name must be at least 2 characters"
    if len(name) > 50:
        return False, "Name must be less than 50 characters"
    
    # Allow letters, spaces, and common name characters
    if not re.match(r'^[a-zA-Z\s\-\'\.]+$', name):
        return False, "Name can only contain letters, spaces, hyphens, apostrophes, and periods"
    
    return True, ""

def validate_description_input(desc: str) -> tuple[bool, str]:
    """Validate project description input"""
    if not desc or not isinstance(desc, str):
        return False, "Description is required"
    
    desc = desc.strip()
    if len(desc) < 20:
        return False, "Description must be at least 20 characters"
    if len(desc) > 1000:
        return False, "Description must be less than 1000 characters"
    
    # Check for meaningful content
    unique_chars = len(set(desc.lower().replace(' ', '')))
    if unique_chars < 8:
        return False, "Please provide a more detailed description"
    
    # Check for relevant keywords
    relevant_keywords = [
        'industry', 'business', 'purpose', 'features', 'platform', 
        'website', 'whatsapp', 'customer', 'service', 'help', 
        'bot', 'chat', 'automation', 'ai', 'support'
    ]
    
    desc_lower = desc.lower()
    if not any(keyword in desc_lower for keyword in relevant_keywords):
        return False, "Please include details about your industry, business purpose, or required features"
    
    return True, ""

# ---------- Email (non-blocking) ----------
def send_notification_email(name: str, email: str, details: str, request_id: int) -> Dict[str, Any]:
    """Send email notification for custom chatbot request"""
    if not all([EMAIL_USER, EMAIL_PASSWORD]):
        print("DEBUG: Email credentials not configured")
        return {"sent": False, "message": "Email configuration missing"}
    
    subject = f"New Custom Chatbot Request #{request_id} - {name}"
    body = f"""
New Custom Chatbot Request Received

Request ID: {request_id}
Name: {name}
Email: {email}
Submitted: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC

Project Details:
{details}

---
This is an automated notification from Nozama.ai chatbot system.
"""
    
    try:
        msg = MIMEText(body.strip())
        msg["Subject"] = subject
        msg["From"] = EMAIL_USER
        msg["To"] = ADMIN_EMAIL
        
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)
        
        print(f"DEBUG: Notification email sent for request #{request_id}")
        return {"sent": True, "to": ADMIN_EMAIL}
        
    except Exception as e:
        print(f"DEBUG: Failed to send notification email: {str(e)}")
        return {"sent": False, "error": str(e)}

# ---------- OpenAI API (Fixed) ----------
def call_openai_api(user_message: str):
    if not OPENAI_API_KEY:
        print("DEBUG: OpenAI API key not configured")
        return None
    
    try:
        print(f"DEBUG: Calling OpenAI API with message: '{user_message}'")
        
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {
                        "role": "system", 
                        "content": "You are a helpful assistant for Nozama.ai, a chatbot marketplace. We sell chatbots ($199-$449/month), offer custom development ($2k+), and have a seller program. Keep responses concise and helpful. Always end with suggesting they explore Products, Custom chatbot, or Pricing."
                    },
                    {
                        "role": "user", 
                        "content": user_message
                    }
                ],
                "max_tokens": 300,
                "temperature": 0.7
            },
            timeout=15
        )
        
        print(f"DEBUG: OpenAI API response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result["choices"][0]["message"]["content"].strip()
            print(f"DEBUG: OpenAI API success: '{ai_response[:100]}...'")
            return ai_response
        else:
            print(f"DEBUG: OpenAI API error: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print("DEBUG: OpenAI API timeout")
        return None
    except requests.exceptions.RequestException as e:
        print(f"DEBUG: OpenAI API request error: {str(e)}")
        return None
    except Exception as e:
        print(f"DEBUG: OpenAI API unexpected error: {str(e)}")
        return None

# ---------- Sessions & Flow ----------
user_sessions: Dict[str, Dict[str, Any]] = {}
custom_requests: List[Dict[str, Any]] = []

def detect_intent(message: str, user_id: str, ctx: Dict[str, Any]):
    m = message.lower().strip()
    
    print(f"DEBUG: Detecting intent for message: '{m}' with context: {ctx}")

    # reset to main menu
    if m in {"menu","main menu","home","start over","restart","back"}:
        print("DEBUG: Menu intent detected")
        ctx.clear()
        # Clear any active sessions
        if user_id in user_sessions:
            del user_sessions[user_id]
        return "menu"

    # Check if we're in a custom flow completion state
    if ctx.get("flow") == "custom" and ctx.get("step") == "completed":
        # Handle post-completion responses
        if m in {"no", "nope", "not now", "maybe later"}:
            ctx.clear()  # Reset to main menu
            # Clear the session
            if user_id in user_sessions:
                del user_sessions[user_id]
            return "menu"
        elif m in {"yes", "sure", "ok", "okay", "let's see"}:
            ctx.clear()
            # Clear the session
            if user_id in user_sessions:
                del user_sessions[user_id]
            return "products"
        else:
            # Any other response, go back to main menu
            ctx.clear()
            # Clear the session
            if user_id in user_sessions:
                del user_sessions[user_id]
            return "menu"

    # Enhanced custom chatbot detection - check this FIRST
    custom_keywords = [
        "custom chatbot", "custom bot", "build me a chatbot", "bespoke", "tailored",
        "i want custom chatbot", "need custom chatbot", "want a custom bot",
        "build chatbot", "create chatbot", "make chatbot", "develop chatbot",
        "chatbot development", "bot development"
    ]
    
    for keyword in custom_keywords:
        if keyword in m:
            print(f"DEBUG: Custom chatbot intent detected with keyword: '{keyword}'")
            ctx["flow"] = "custom"
            return "custom_chatbot_request"
    
    # Word combination check for custom chatbot
    if (("custom" in m or "build" in m or "create" in m or "develop" in m or "want" in m or "need" in m) and 
        ("chatbot" in m or "bot" in m)):
        print(f"DEBUG: Custom chatbot intent detected with word combination")
        ctx["flow"] = "custom"
        return "custom_chatbot_request"

    # Seller intent detection - ENHANCED
    seller_keywords = [
        "sell", "seller", "become seller", "want to sell", "selling", 
        "marketplace", "vendor", "list product", "upload", "sale my", 
        "sell my", "become a seller", "join as seller"
    ]
    
    for keyword in seller_keywords:
        if keyword in m:
            print(f"DEBUG: Seller intent detected with keyword: '{keyword}'")
            return "seller_info"

    # if in a flow, honor it
    flow = ctx.get("flow")
    if flow == "pricing":
        if any(x in m for x in ["yes","recommend","which plan","suggest","best plan"]):
            return "pricing_reco"
        if any(x in m for x in ["product","products","catalog","shop"]):
            return "products"
        return "pricing"

    if flow == "custom":
        return "custom_chatbot_request"

    # Other intents
    if any(p in m for p in ["product","products","catalog","shop","tools","marketplace"]):
        print("DEBUG: Products intent detected")
        return "products"
    
    if any(p in m for p in ["pricing","price","plans","cost","how much","fees","payment"]):
        print("DEBUG: Pricing intent detected")
        ctx["flow"] = "pricing"
        ctx["step"] = "menu"
        return "pricing"
    
    # Check FAQ match
    faq_match = faq_service.find_faq_match(message)
    if faq_match:
        print(f"DEBUG: FAQ intent detected: {faq_match[0]}")
        return "faq_match"
    
    if any(p in m for p in ["latest","new","recent","current"]):
        print("DEBUG: API fallback intent (latest/new)")
        return "api_fallback"
    
    print(f"DEBUG: No specific intent found, using general fallback")
    return "general_fallback"

def handle_custom_flow(user_id: str, message: str):
    if user_id not in user_sessions:
        user_sessions[user_id] = {"step":"ask_name","data":{},"ts": datetime.utcnow()}
    s = user_sessions[user_id]

    if s["step"] == "ask_name":
        s["step"] = "collect_name"
        return {"response":"Perfect! I'll help you create a custom chatbot. 🤖\n\nFirst, what's your **full name**?","requires_input":True,"flow_active":True}

    if s["step"] == "collect_name":
        ok, err = validate_name_input(message)
        if not ok:
            return {"response":f"❌ {err}\nPlease try again.","requires_input":True,"flow_active":True}
        s["data"]["name"] = message.strip()
        s["step"] = "collect_email"
        return {"response":f"Great to meet you, {s['data']['name']}! 👋\n\nWhat's your **email address**?","requires_input":True,"flow_active":True}

    if s["step"] == "collect_email":
        if not validate_email_basic(message.strip()):
            return {"response":"❌ That email doesn't look right.\n\nPlease try again (e.g., john@example.com)","requires_input":True,"flow_active":True}
        s["data"]["email"] = message.strip()
        s["step"] = "collect_details"
        return {"response":"Perfect! ✅\n\nNow, tell me about your **chatbot project**:\n• What industry?\n• What features do you need?\n• Which platform? (website, WhatsApp, etc.)","requires_input":True,"flow_active":True}

    if s["step"] == "collect_details":
        ok, err = validate_description_input(message)
        if not ok:
            return {"response":f"❌ {err}\n\nPlease provide more details and try again.","requires_input":True,"flow_active":True}
        s["data"]["details"] = message.strip()
        req_id = len(custom_requests) + 1
        custom_requests.append({"id": req_id, **s["data"], "timestamp": datetime.utcnow().isoformat(), "status":"pending"})
        email_status = send_notification_email(s["data"]["name"], s["data"]["email"], s["data"]["details"], req_id)
        # Don't delete session immediately - let the context handle the completion state
        s["step"] = "completed"
        
        followup = "✅ We've notified our team!" if email_status.get("sent") else \
                   "✅ Request saved! (We'll reach out soon)"
        
        return {
            "response": f"🎉 **Request Submitted!** (#{req_id})\n\n{followup}\n\n**What's Next:**\n• We'll review your requirements\n• Send you a custom proposal\n• Typical delivery: 1-4 weeks\n\nWant to explore our existing products while you wait?",
            "requires_input": False, 
            "flow_active": False, 
            "request_id": req_id, 
            "email_status": email_status,
            "step": "completed"
        }

    return {"response":"⚠️ Something went wrong. Let's start over.", "requires_input": False, "flow_active": False}

def generate_response(intent: str, message: str, user_id: str, ctx: Dict[str, Any]):
    print(f"DEBUG: Generating response for intent: '{intent}'")
    
    if intent == "custom_chatbot_request":
        res = handle_custom_flow(user_id, message)
        res.update({"source":"custom_flow","response_type":"interactive" if res.get("requires_input") else "completion"})
        ctx["flow"] = "custom"
        if res.get("step") == "completed":
            ctx["step"] = "completed"
        return res, ctx

    if intent == "seller_info":
        ctx.pop("flow", None)  # Clear any flow
        # Use FAQ response for seller info
        faq_response = faq_service.get_faq_response("become seller")
        if faq_response:
            return ({
                "response": faq_response["response"],
                "suggestions": faq_response["suggestions"],
                "source": "faq_database",
                "response_type": "faq"
            }, ctx)

    if intent == "products":
        ctx.pop("flow", None)
        return ({
            "response": "🛍️ Loading our latest chatbot products...",
            "suggestions": ["Pricing","Custom chatbot","Become seller"],
            "source":"products_action",
            "response_type":"action",
            "action":"show_products",
            "params":{"limit":6,"sort_by":"created_at","sort_order":"desc"}
        }, ctx)

    if intent == "pricing":
        ctx["flow"] = "pricing"
        ctx["step"] = "menu"
        return ({
            "response": "💰 **Nozama.ai Pricing:**\n\n" +
                        "• **Ready-made Bots:** $199-$449/month\n" +
                        "• **Custom Development:** $2,000+ (depends on scope)\n" +
                        "• **Seller Program:** Free to join, 70% revenue share\n\n" +
                        "Need help choosing the right option?",
            "suggestions": ["Recommend a plan","Products","Custom chatbot","Become seller"],
            "source":"static",
            "response_type":"text"
        }, ctx)

    if intent == "pricing_reco":
        ctx["flow"] = "pricing"
        ctx["step"] = "reco"
        m = message.lower()
        
        if any(x in m for x in ["sell","seller","list","marketplace"]):
            pick = "**Seller Program** (Free to join, 70% revenue share)"
        elif any(x in m for x in ["custom","build","develop","bespoke"]):
            pick = "**Custom Development** ($2,000+)"
        elif any(x in m for x in ["ready","prebuilt","existing"]):
            pick = "**Ready-made Bot** ($199-$449/month)"
        else:
            pick = "**Ready-made Bot** to start ($199-$449/month)"
            
        return ({
            "response": f"🎯 **My Recommendation:** {pick}\n\nWant to see our products or start a custom project?",
            "suggestions": ["Products","Custom chatbot","Become seller"],
            "source":"static",
            "response_type":"text"
        }, ctx)

    if intent == "menu":
        ctx.clear()
        return ({
            "response": "🏠 **Main Menu** - What would you like to explore?",
            "suggestions": ["Products","Pricing","Custom chatbot","Become seller"],
            "source":"static",
            "response_type":"text"
        }, ctx)

    if intent == "faq_match":
        r = faq_service.get_faq_response(message)
        if r:
            return ({
                "response": r["response"], 
                "suggestions": r.get("suggestions", []),
                "source":"faq_database",
                "response_type":"faq",
                "faq_matched":True,
                "faq_key": r.get("faq_key")
            }, ctx)

    if intent == "api_fallback" or intent == "general_fallback":
        # Try OpenAI first
        ai_response = call_openai_api(message)
        if ai_response:
            return ({
                "response": ai_response,
                "suggestions": ["Products","Custom chatbot","Pricing","Become seller"],
                "source":"openai_api",
                "response_type":"api_response",
                "api_success":True
            }, ctx)

    # Ultimate fallback
    return ({
        "response": "I can help you with:\n• 🛍️ **Products** - Browse our chatbot marketplace\n• 💰 **Pricing** - View plans and costs\n• 🤖 **Custom Chatbot** - Build something unique\n• 🏪 **Become a Seller** - List your chatbots\n\nWhat interests you most?",
        "suggestions": ["Products","Pricing","Custom chatbot","Become seller"],
        "source":"static_fallback",
        "response_type":"fallback",
        "api_success":False
    }, ctx)

# ---------- Models & Endpoints ----------
class ChatContext(BaseModel):
    flow: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    step: Optional[str] = None

class ChatRequest(BaseModel):
    session_id: str
    message: str
    context: Optional[ChatContext] = None

class ChatMessage(BaseModel):
    type: str = "text"
    text: Optional[str] = None
    quick_replies: Optional[List[str]] = None

class ChatPayload(BaseModel):
    messages: List[ChatMessage]
    action: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    context: Optional[ChatContext] = None
    lead_captured: Optional[bool] = False

@router.get("/health")
def chatbot_health():
    return {
        "status":"ok",
        "faq_count": len(faq_service.faqs),
        "openai_configured": bool(OPENAI_API_KEY),
        "active_sessions": len(user_sessions),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/message", response_model=ChatPayload)
def handle_message(req: ChatRequest):
    try:
        # Process context
        ctx = (req.context.dict() if req.context else {})
        msg = (req.message or "").strip()
        
        if not msg:
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        print(f"DEBUG: Processing message: '{msg}' with context: {ctx}")
        
        # Detect intent and generate response
        intent = detect_intent(msg, req.session_id, ctx)
        payload, new_ctx = generate_response(intent, msg, req.session_id, ctx)

        # Build message sequence
        seq: List[ChatMessage] = []
        if payload.get("response"):
            seq.append(ChatMessage(
                type="text", 
                text=payload["response"], 
                quick_replies=payload.get("suggestions")
            ))

        result = ChatPayload(
            messages=seq if seq else [ChatMessage(type="text", text="I'm here to help! 👋")],
            action=payload.get("action"),
            params=payload.get("params"),
            context=ChatContext(**new_ctx)
        )
        
        print(f"DEBUG: Returning response with {len(seq)} messages")
        return result
        
    except Exception as e:
        print(f"ERROR: Exception in handle_message: {str(e)}")
        # Return error response
        return ChatPayload(
            messages=[ChatMessage(type="text", text="Sorry, something went wrong. Please try again.")],
            context=ChatContext()
        )