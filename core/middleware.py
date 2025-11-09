"""
Custom middleware for debugging session and authentication issues
"""
from django.utils.deprecation import MiddlewareMixin
import logging

logger = logging.getLogger(__name__)

class SessionDebugMiddleware(MiddlewareMixin):
    """
    Middleware to help debug session issues
    """
    def process_request(self, request):
        # Log session information for API requests
        if request.path.startswith('/api/'):
            session_key = request.session.session_key
            has_sessionid = 'sessionid' in request.COOKIES
            is_authenticated = hasattr(request, 'user') and request.user.is_authenticated
            
            print(f"\n=== Session Debug for {request.method} {request.path} ===")
            print(f"Session key in request: {session_key}")
            print(f"Session ID in cookies: {has_sessionid}")
            if has_sessionid:
                print(f"Session ID value: {request.COOKIES.get('sessionid', 'NOT FOUND')[:20]}...")
            print(f"User authenticated: {is_authenticated}")
            if is_authenticated:
                print(f"User: {request.user.username}")
            print(f"All cookies: {list(request.COOKIES.keys())}")
            print("=" * 50 + "\n")
        
        return None
