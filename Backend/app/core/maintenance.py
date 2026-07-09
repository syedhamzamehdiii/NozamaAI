# backend/app/core/maintenance.py
from fastapi import Request, Response
from fastapi.responses import HTMLResponse
import json
from pathlib import Path

SETTINGS_FILE = Path("app/data/settings.json")

def load_maintenance_status():
    """Load maintenance mode status from settings"""
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                settings = json.load(f)
                return settings.get("maintenance_mode", False)
        return False
    except:
        return False

def is_admin_path(path: str) -> bool:
    """Check if the request path is an admin path"""
    admin_paths = [
        "/admin",
        "/api/v1/admin", 
        "/api/v1/auth/login",
        "/api/v1/auth/logout"
    ]
    
    for admin_path in admin_paths:
        if path.startswith(admin_path):
            return True
    return False

async def maintenance_middleware(request: Request, call_next):
    """Middleware to handle maintenance mode"""
    
    # Check if maintenance mode is enabled
    maintenance_enabled = load_maintenance_status()
    
    if maintenance_enabled:
        # Allow admin paths and API calls
        if is_admin_path(request.url.path):
            response = await call_next(request)
            return response
        
        # Allow static files (CSS, JS, images)
        if any(request.url.path.endswith(ext) for ext in ['.css', '.js', '.png', '.jpg', '.ico', '.svg']):
            response = await call_next(request)
            return response
        
        # Show maintenance page for all other requests
        maintenance_html = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Site Under Maintenance - Nozama.ai</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
                    color: #ffffff;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                
                .maintenance-container {
                    text-align: center;
                    max-width: 600px;
                    padding: 40px;
                    background: rgba(31, 41, 55, 0.5);
                    border: 1px solid rgba(75, 85, 99, 0.3);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                }
                
                .logo {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: #DAA425;
                    margin-bottom: 20px;
                    text-decoration: none;
                }
                
                .maintenance-icon {
                    font-size: 4rem;
                    margin-bottom: 30px;
                    opacity: 0.8;
                }
                
                h1 {
                    font-size: 2.5rem;
                    margin-bottom: 20px;
                    background: linear-gradient(135deg, #DAA425 0%, #B8941F 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                p {
                    font-size: 1.2rem;
                    line-height: 1.6;
                    color: #d1d5db;
                    margin-bottom: 30px;
                }
                
                .eta {
                    background: rgba(218, 164, 37, 0.1);
                    border: 1px solid rgba(218, 164, 37, 0.3);
                    padding: 15px 25px;
                    border-radius: 10px;
                    display: inline-block;
                    font-weight: 600;
                    color: #DAA425;
                }
                
                .admin-link {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #DAA425;
                    color: #000;
                    padding: 10px 20px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 0.9rem;
                    transition: all 0.3s ease;
                }
                
                .admin-link:hover {
                    background: #B8941F;
                    transform: translateY(-2px);
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                
                .maintenance-icon {
                    animation: pulse 2s infinite;
                }
                
                @media (max-width: 640px) {
                    .maintenance-container {
                        padding: 30px 20px;
                    }
                    
                    h1 {
                        font-size: 2rem;
                    }
                    
                    p {
                        font-size: 1rem;
                    }
                    
                    .logo {
                        font-size: 2rem;
                    }
                }
            </style>
        </head>
        <body>
            <div class="maintenance-container">
                <div class="logo">Nozama.ai</div>
                <div class="maintenance-icon">🔧</div>
                <h1>Under Maintenance</h1>
                <p>We're currently performing scheduled maintenance to improve your experience. Our AI marketplace will be back online shortly.</p>
                <div class="eta">
                    Expected completion: Soon
                </div>
            </div>
            <a href="/admin" class="admin-link">Admin Access</a>
        </body>
        </html>
        """
        
        return HTMLResponse(content=maintenance_html, status_code=503)
    
    # Normal processing if maintenance is disabled
    response = await call_next(request)
    return response