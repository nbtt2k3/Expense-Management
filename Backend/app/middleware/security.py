from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send
from fastapi import Request

class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Secure Headers (Helmet-like)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https://fastapi.tiangolo.com; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "connect-src 'self' https://cdn.jsdelivr.net;"
        )
        
        # HSTS (Strict-Transport-Security) - Enforced for 1 year
        # Only set if request is HTTPS or expected to be behind SSL proxy
        # For local dev (http), this might be annoying, so we can check env or just set it
        # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response
