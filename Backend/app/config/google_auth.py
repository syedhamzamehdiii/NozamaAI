# =============== app/config/google_auth.py ===============
from google.oauth2 import id_token
from google.auth.transport import requests
from app.config.settings import settings
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class GoogleAuthConfig:
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = settings.GOOGLE_REDIRECT_URI
        
    async def verify_google_token(self, token: str) -> Optional[Dict]:
        """Verify Google ID token and return user info"""
        try:
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                self.client_id,
                clock_skew_in_seconds=300
            )

            # Verify the issuer
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')

            return {
                'google_id': idinfo['sub'],
                'email': idinfo['email'],
                'first_name': idinfo.get('given_name', ''),
                'last_name': idinfo.get('family_name', ''),
                'picture': idinfo.get('picture', ''),
                'email_verified': idinfo.get('email_verified', False)
            }
            
        except ValueError as e:
            logger.error(f"Google token verification failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in Google auth: {str(e)}")
            return None

google_auth = GoogleAuthConfig()