import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.core.logging import logger

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log Request
        logger.info(f"REQUEST: {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            
            # Calculate execution time
            process_time = time.time() - start_time
            formatted_process_time = f"{process_time:.4f}s"
            
            # Log Response
            logger.info(
                f"RESPONSE: {request.method} {request.url.path} "
                f"Status: {response.status_code} Duration: {formatted_process_time}"
            )
            
            return response
            
        except Exception as e:
            # Log Error
            process_time = time.time() - start_time
            logger.error(
                f"ERROR: {request.method} {request.url.path} "
                f"Duration: {process_time:.4f}s Error: {str(e)}",
                exc_info=True
            )
            raise e
