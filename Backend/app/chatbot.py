import os, re, smtplib, requests, logging
from email.mime.text import MIMEText
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from difflib import SequenceMatcher

load_dotenv()
log = logging.getLogger("app.chatbot")
log.setLevel(logging.INFO)

# === Build marker so you can verify the right file is loaded ===
CHATBOT_BUILD = "nozama-chatbot-2025-08-12d-fixed"
CHATBOT_FILE = __file__

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
AGENT_ID       = os.getenv("AGENT_ID", "")
ENABLE_OPENAI  = os.getenv("ENABLE_OPENAI", "0") == "1"   # default OFF
EMAIL_HOST     = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT     = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER     = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = (os.getenv("EMAIL_PASSWORD") or "").replace(" ", "")
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL", "hamzaakahloon903@gmail.com")

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

# ---------------- FAQ (compact) ----------------
class FAQService:
    def __init__(self):
        self.faqs = self._load_faqs()
        self.similarity_threshold = 0.55
    
    def _load_faqs(self) -> Dict[str, Dict[str, Any]]:
        return {
            "products_overview": {
                "keywords": ["products","product","services","what do you sell","chatbots","solutions","marketplace","catalog","shop"],
                "question": "What products and services does Nozama.ai offer?",
                "answer": (
                    "Featured:\n"
                    "• SmartChat Pro ($299/mo)\n"
                    "• WhatsApp Bot Builder ($199/mo)\n"
                    "• E-commerce Assistant ($399/mo)\n"
                    "• Multi-language Bot ($249/mo)\n"
                    "• Voice Assistant ($449/mo)\n"
                    "Custom development available (from $2,000)."
                ),
                "suggestions": ["Pricing","Custom chatbot","How to buy","Free chatbots"],
            },
            "pricing_overview": {
                "keywords": ["price","pricing","cost","how much","plans","fees"],
                "question": "What are your pricing plans?",
                "answer": (
                    "Prebuilt plans: $199–$449/mo depending on bot.\n"
                    "Custom development: $2k–$15k+ (scope-based).\n"
                    "Trials available on select products."
                ),
                "suggestions": ["Custom quote","Show products","Free trial"],
            },
            "how_to_sell": {
                "keywords": ["sell","seller","become seller","upload chatbot","list product","sale my products","sell my products","start selling","seller info"],
                "question": "How can I sell my products on Nozama.ai?",
                "answer": (
                    "Create a seller account → add product details (title, price, description, images, ZIP) → submit for review (24–48h).\n"
                    "Revenue share 70% to seller. Include docs/screenshots for faster approval."
                ),
                "suggestions": ["Open seller dashboard","Seller guidelines","Contact seller support"],
            },
            "custom_chatbot_request": {
                "keywords": ["custom chatbot","custom bot","build me a chatbot","bespoke","tailored","i want custom chatbot","need custom"],
                "question": "I need a custom chatbot—what's the process?",
                "answer": "We'll collect your name, email, and requirements, then send a proposal with timeline & pricing. Typical delivery 1–4+ weeks.",
                "suggestions": ["Start request","Book consultation","Pricing"],
            },
        }
    
    def _exact(self, m: str, ks: List[str]) -> float:
        m = m.lower()
        return 1.0 if any(k.lower() in m for k in ks) else 0.0
    
    def _kw(self, m: str, ks: List[str]) -> float:
        words = m.lower().split()
        matches = 0
        total = 0
        for k in ks:
            kw = k.lower().split()
            total += len(kw)
            for w in kw:
                if w in words:
                    matches += 1
        return matches/total if total else 0.0
    
    def _sim(self, a: str, b: str) -> float:
        return SequenceMatcher(None, a.lower(), b.lower()).ratio()
    
    def find_faq_match(self, message: str):
        best = None
        best_score = 0.0
        for key, data in self.faqs.items():
            score = (self._exact(message, data["keywords"]) * 0.6 + 
                    self._kw(message, data["keywords"]) * 0.3 + 
                    self._sim(message, data["question"]) * 0.1)
            if score > best_score and score >= self.similarity_threshold:
                best_score = score
                best = (key, data)
        return best
    
    def get_faq_response(self, message: str):
        match = self.find_faq_match(message)
        if not match:
            return None
        key, data = match
        return {
            "response": data["answer"], 
            "suggestions": data.get("suggestions", []), 
            "faq_key": key, 
            "source": "faq_database"
        }

faq_service = FAQService()

# ---------------- Validation (Clean - no EmailStr anywhere) ----------------
def is_valid_email(email: str) -> bool:
    """Simple email validation using regex - no Pydantic EmailStr"""
    if not email or not isinstance(email, str):
        return False
    
    email = email.strip()
    if len(email) < 5 or len(email) > 254:
        return False
    
    # Basic email regex
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

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

# ---------------- Email Service ----------------
def send_notification_email(name: str, email: str, details: str, request_id: int) -> Dict[str, Any]:
    """Send email notification for custom chatbot request"""
    if not all([EMAIL_USER, EMAIL_PASSWORD]):
        log.warning("Email credentials not configured")
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
        
        log.info(f"Notification email sent for request #{request_id}")
        return {"sent": True, "to": ADMIN_EMAIL}
        
    except Exception as e:
        log.error(f"Failed to send notification email: {str(e)}")
        return {"sent": False, "error": str(e)}

# ---------------- OpenAI Integration ----------------
def get_openai_response(user_message: str) -> Optional[str]:
    """Get response from OpenAI API if enabled"""
    if not ENABLE_OPENAI or not OPENAI_API_KEY:
        return None
    
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": "You are a helpful Nozama.ai assistant."},
                    {"role": "user", "content": user_message}
                ],
                "max_tokens": 300,
                "temperature": 0.7
            },
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        else:
            log.warning(f"OpenAI API returned status {response.status_code}")
            return None
            
    except Exception as e:
        log.warning(f"OpenAI API call failed: {str(e)}")
        return None

# ---------------- Session Management ----------------
user_sessions: Dict[str, Dict[str, Any]] = {}
custom_requests: List[Dict[str, Any]] = []

MENU_KEYWORDS = {"menu", "main menu", "home", "start over", "restart", "back", "go back", "start"}

def detect_user_intent(message: str, user_id: str, context: Dict[str, Any]) -> str:
    """Detect user intent from message"""
    message_lower = message.lower().strip()
    log.debug(f"Detecting intent for: '{message_lower}' with context: {context}")
    
    # Menu reset commands
    if message_lower in MENU_KEYWORDS:
        context.clear()
        context["flow"] = "menu"
        context["last_intent"] = "menu"
        user_sessions.pop(user_id, None)
        return "menu"
    
    # Context-aware responses
    if message_lower in {"more info", "more details", "tell me more"}:
        last_intent = context.get("last_intent")
        if last_intent == "pricing":
            return "pricing_details"
        elif last_intent == "products":
            return "products_more"
        elif last_intent == "seller_info":
            return "seller_details"
    
    # Flow-based intents
    current_flow = context.get("flow")
    
    if current_flow == "custom":
        return "custom_chatbot_request"
    
    if current_flow == "pricing":
        if any(word in message_lower for word in ["yes", "recommend", "which plan", "suggest", "best plan"]):
            return "pricing_recommendation"
        elif any(word in message_lower for word in ["product", "products", "catalog", "shop"]):
            context["flow"] = None
            return "products"
        elif any(word in message_lower for word in ["custom", "chatbot", "bot"]):
            context["flow"] = "custom"
            return "custom_chatbot_request"
        return "pricing"
    
    # Intent detection
    custom_keywords = [
        "custom chatbot", "custom bot", "build me a chatbot", "bespoke", 
        "tailored", "i want custom chatbot", "need custom", "custom service", 
        "chatbot service", "build chatbot", "create chatbot"
    ]
    
    if any(keyword in message_lower for keyword in custom_keywords):
        context["flow"] = "custom"
        return "custom_chatbot_request"
    
    seller_keywords = [
        "seller", "sell", "start selling", "become seller", "seller info", 
        "list my product", "sale my", "how to sell"
    ]
    
    if any(keyword in message_lower for keyword in seller_keywords):
        return "seller_info"
    
    product_keywords = ["product", "products", "catalog", "shop", "tools", "marketplace"]
    if any(keyword in message_lower for keyword in product_keywords):
        context["flow"] = None
        return "products"
    
    pricing_keywords = ["pricing", "price", "plans", "cost", "how much", "fees"]
    if any(keyword in message_lower for keyword in pricing_keywords):
        context["flow"] = "pricing"
        context["step"] = "menu"
        return "pricing"
    
    # Check FAQ
    if faq_service.find_faq_match(message):
        return "faq_match"
    
    # Latest/current info
    if any(keyword in message_lower for keyword in ["latest", "new", "recent", "current"]):
        return "api_fallback"
    
    return "general_fallback"

def handle_custom_chatbot_flow(user_id: str, message: str) -> Dict[str, Any]:
    """Handle the custom chatbot request flow"""
    try:
        # Initialize session if not exists
        if user_id not in user_sessions:
            user_sessions[user_id] = {
                "step": "ask_name",
                "data": {},
                "timestamp": datetime.utcnow()
            }
        
        session = user_sessions[user_id]
        current_step = session["step"]
        
        log.debug(f"Custom flow - Step: {current_step}, Data: {session.get('data', {})}")
        
        if current_step == "ask_name":
            session["step"] = "collect_name"
            return {
                "response": "Perfect! I'll help you create a custom chatbot. 🤖\n\nFirst, what's your *full name*?",
                "requires_input": True,
                "flow_active": True
            }
        
        elif current_step == "collect_name":
            is_valid, error_msg = validate_name_input(message)
            if not is_valid:
                return {
                    "response": f"❌ {error_msg}\n\nPlease enter your full name:",
                    "requires_input": True,
                    "flow_active": True
                }
            
            session["data"]["name"] = message.strip()
            session["step"] = "collect_email"
            return {
                "response": f"Great to meet you, {session['data']['name']}! 👋\n\nWhat's your *email address*?",
                "requires_input": True,
                "flow_active": True
            }
        
        elif current_step == "collect_email":
            email = message.strip()
            if not is_valid_email(email):
                return {
                    "response": "❌ That doesn't look like a valid email address.\n\nPlease enter a valid email (e.g., john@example.com):",
                    "requires_input": True,
                    "flow_active": True
                }
            
            session["data"]["email"] = email
            session["step"] = "collect_details"
            return {
                "response": "Excellent! 📧\n\nNow, please share some **project details**:\n• What industry are you in?\n• What features do you need?\n• Which platform (website, WhatsApp, etc.)?\n• Who is your target audience?",
                "requires_input": True,
                "flow_active": True
            }
        
        elif current_step == "collect_details":
            is_valid, error_msg = validate_description_input(message)
            if not is_valid:
                return {
                    "response": f"❌ {error_msg}\n\nPlease provide more detailed information about your project:",
                    "requires_input": True,
                    "flow_active": True
                }
            
            session["data"]["details"] = message.strip()
            
            # Create request
            request_id = len(custom_requests) + 1
            request_data = {
                "id": request_id,
                "name": session["data"]["name"],
                "email": session["data"]["email"],
                "details": session["data"]["details"],
                "timestamp": datetime.utcnow().isoformat(),
                "status": "pending"
            }
            
            custom_requests.append(request_data)
            
            # Send notification email
            email_result = send_notification_email(
                session["data"]["name"],
                session["data"]["email"], 
                session["data"]["details"],
                request_id
            )
            
            # Clean up session
            del user_sessions[user_id]
            
            # Response
            email_status = "✅ We've notified our team via email." if email_result.get("sent") else \
                          "✅ Your request has been recorded (email notification pending)."
            
            return {
                "response": f"🎉 **Thank you!** Your custom chatbot request has been submitted.\n\n"
                           f"**Request ID:** #{request_id}\n"
                           f"{email_status}\n\n"
                           f"Our team will review your requirements and get back to you within 24-48 hours.\n\n"
                           f"Would you like to explore our existing products while you wait?",
                "requires_input": False,
                "flow_active": False,
                "request_id": request_id,
                "email_status": email_result
            }
        
        else:
            # Unknown step - reset
            del user_sessions[user_id]
            return {
                "response": "Something went wrong with the flow. Let's start over - what would you like to explore?",
                "requires_input": False,
                "flow_active": False
            }
    
    except Exception as e:
        log.error(f"Error in custom chatbot flow: {str(e)}")
        user_sessions.pop(user_id, None)
        return {
            "response": "❌ Sorry, something went wrong. Let's start over - what would you like to explore?",
            "requires_input": False,
            "flow_active": False
        }

def generate_chatbot_response(intent: str, message: str, user_id: str, context: Dict[str, Any]) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """Generate response based on detected intent"""
    log.debug(f"Generating response for intent: {intent}")
    
    if intent == "custom_chatbot_request":
        response_data = handle_custom_chatbot_flow(user_id, message)
        response_data.update({
            "source": "custom_flow",
            "response_type": "interactive" if response_data.get("requires_input") else "completion"
        })
        context["flow"] = "custom"
        context["last_intent"] = "custom_chatbot_request"
        return response_data, context
    
    elif intent == "seller_info":
        context["last_intent"] = "seller_info"
        return {
            "response": "💼 **Ready to start selling on Nozama?**\n\n"
                       "Here's how:\n"
                       "1️⃣ Create/verify your seller account\n"
                       "2️⃣ Add product details (title, price, description, images)\n"
                       "3️⃣ Submit for review (24-48 hours)\n"
                       "4️⃣ Go live and start earning! (70% revenue share)\n\n"
                       "💡 **Pro tip:** Include screenshots and documentation for faster approval.",
            "suggestions": ["Open seller dashboard", "Seller guidelines", "Main menu", "Custom chatbot"],
            "source": "static",
            "response_type": "text"
        }, context
    
    elif intent == "products":
        context["last_intent"] = "products"
        return {
            "response": "🛍️ **Loading marketplace products...**\n\nHere are some highlights from our latest collection:",
            "suggestions": ["Pricing", "Custom chatbot", "Main menu"],
            "source": "products_action",
            "response_type": "action",
            "action": "show_products",
            "params": {"limit": 6, "sort_by": "created_at", "sort_order": "desc"}
        }, context
    
    elif intent == "products_more":
        context["last_intent"] = "products"
        return {
            "response": "📦 **Showing more products...**",
            "suggestions": ["Pricing", "Custom chatbot", "Main menu"],
            "source": "products_action",
            "response_type": "action",
            "action": "show_products",
            "params": {"limit": 12, "sort_by": "created_at", "sort_order": "desc"}
        }, context
    
    elif intent == "pricing":
        context["flow"] = "pricing"
        context["step"] = "menu"
        context["last_intent"] = "pricing"
        return {
            "response": "💰 **Nozama Pricing Plans**\n\n"
                       "🆓 **Starter** — $0/mo\n"
                       "   • Browse and buy products\n"
                       "   • Basic search and filters\n\n"
                       "⭐ **Pro** — $29/mo\n"
                       "   • Advanced filters and search\n"
                       "   • Saved lists and favorites\n"
                       "   • Priority support\n\n"
                       "🏪 **Seller** — $49/mo\n"
                       "   • List and manage products\n"
                       "   • Sales analytics\n"
                       "   • Seller tools and support\n\n"
                       "Need a recommendation based on your needs?",
            "suggestions": ["Recommend a plan", "Products", "Custom chatbot", "Main menu"],
            "source": "static",
            "response_type": "text"
        }, context
    
    elif intent == "pricing_details":
        context["last_intent"] = "pricing"
        return {
            "response": "📋 **Additional Pricing Details:**\n\n"
                       "• 💳 Month-to-month billing, cancel anytime\n"
                       "• 🆓 Free trials available on select plans\n"
                       "• 🏗️ Custom development: $2k-$15k+ (fixed quotes)\n"
                       "• 🌍 VAT/GST added where applicable\n"
                       "• 💬 All plans include basic customer support\n"
                       "• 🔄 Easy upgrades and downgrades",
            "suggestions": ["Recommend a plan", "Products", "Main menu"],
            "source": "static",
            "response_type": "text"
        }, context
    
    elif intent == "pricing_recommendation":
        context["flow"] = "pricing"
        context["step"] = "recommendation"
        context["last_intent"] = "pricing"
        
        message_lower = message.lower()
        if any(word in message_lower for word in ["sell", "seller", "list"]):
            recommendation = "🏪 **Seller Plan** — $49/mo\nPerfect for listing and managing your products!"
        elif any(word in message_lower for word in ["advanced", "save", "filter", "pro"]):
            recommendation = "⭐ **Pro Plan** — $29/mo\nGreat for advanced features and saved lists!"
        else:
            recommendation = "🆓 **Starter Plan** — $0/mo\nIdeal for browsing and buying. You can upgrade anytime!"
        
        return {
            "response": f"🎯 **My Recommendation:**\n\n{recommendation}\n\nWould you like to see our products next?",
            "suggestions": ["Products", "Custom chatbot", "Main menu"],
            "source": "static",
            "response_type": "text"
        }, context
    
    elif intent == "menu":
        context.clear()
        context["flow"] = None
        context["last_intent"] = "menu"
        return {
            "response": "🏠 **Main Menu**\n\nWhat would you like to explore?",
            "suggestions": ["Products", "Pricing", "Custom chatbot", "Seller info"],
            "source": "static",
            "response_type": "text"
        }, context
    
    elif intent == "faq_match":
        faq_response = faq_service.get_faq_response(message)
        if faq_response:
            context["last_intent"] = "faq"
            return {
                "response": faq_response["response"],
                "suggestions": faq_response.get("suggestions", []),
                "source": "faq_database",
                "response_type": "faq",
                "faq_matched": True,
                "faq_key": faq_response.get("faq_key")
            }, context
    
    elif intent == "api_fallback":
        openai_response = get_openai_response(message)
        if openai_response:
            context["last_intent"] = "api_fallback"
            return {
                "response": openai_response,
                "suggestions": ["Products", "Custom chatbot", "Main menu"],
                "source": "openai_api",
                "response_type": "api_response",
                "api_success": True
            }, context
    
    # General fallback
    context["last_intent"] = "fallback"
    return {
        "response": "👋 I'm here to help! I can assist you with:\n\n"
                   "🛍️ **Products** - Browse our marketplace\n"
                   "💰 **Pricing** - View plans and costs\n"
                   "🏪 **Seller Info** - Start selling your products\n"
                   "🤖 **Custom Chatbot** - Get a personalized solution\n\n"
                   "What interests you most?",
        "suggestions": ["Products", "Pricing", "Seller info", "Custom chatbot"],
        "source": "static_fallback",
        "response_type": "fallback",
        "api_success": False
    }, context

# ---------------- Pydantic Models (Clean - No EmailStr) ----------------
class ChatContext(BaseModel):
    flow: Optional[str] = None
    step: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None  # Regular string, not EmailStr
    last_intent: Optional[str] = None

class ChatRequest(BaseModel):
    session_id: str
    message: str
    context: Optional[ChatContext] = None

class ChatMessage(BaseModel):
    type: str = "text"
    text: Optional[str] = None
    quick_replies: Optional[List[str]] = None

class ChatResponse(BaseModel):
    messages: List[ChatMessage]
    action: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    context: Optional[ChatContext] = None
    lead_captured: Optional[bool] = False

# ---------------- API Endpoints ----------------
@router.get("/health")
def get_chatbot_health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "build": CHATBOT_BUILD,
        "file": CHATBOT_FILE,
        "faq_count": len(faq_service.faqs),
        "openai_enabled": ENABLE_OPENAI,
        "active_sessions": len(user_sessions),
        "total_requests": len(custom_requests),
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/message", response_model=ChatResponse)
def process_chat_message(request: ChatRequest):
    """Process incoming chat message"""
    try:
        # Extract context
        context = request.context.dict() if request.context else {}
        message = (request.message or "").strip()
        
        log.debug(f"Processing message: '{message}' | Context: {context}")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Detect intent and generate response
        intent = detect_user_intent(message, request.session_id, context)
        log.debug(f"Detected intent: {intent}")
        
        response_data, updated_context = generate_chatbot_response(
            intent, message, request.session_id, context
        )
        
        # Build response messages
        messages = []
        if response_data.get("response"):
            messages.append(ChatMessage(
                type="text",
                text=response_data["response"],
                quick_replies=response_data.get("suggestions")
            ))
        
        # Create final response
        chat_response = ChatResponse(
            messages=messages if messages else [ChatMessage(type="text", text="I understand!")],
            action=response_data.get("action"),
            params=response_data.get("params"),
            context=ChatContext(**updated_context),
            lead_captured=response_data.get("lead_captured", False)
        )
        
        log.debug(f"Returning {len(chat_response.messages)} message(s)")
        return chat_response
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Error processing message: {str(e)}", exc_info=True)
        
        # Return graceful error response
        return ChatResponse(
            messages=[ChatMessage(
                type="text",
                text="😅 Oops! Something went wrong. Please try again or type 'menu' to start over."
            )],
            context=request.context or ChatContext()
        )

