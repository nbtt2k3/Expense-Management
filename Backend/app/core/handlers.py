from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.exceptions import CustomException
from app.core.logging import logger

async def custom_exception_handler(request: Request, exc: CustomException):
    """
    Handle custom application exceptions
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": exc.message,
            "error_code": exc.error_code,
            "details": exc.details
        }
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handle FastAPI HTTP exceptions
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": exc.detail,
            "error_code": "HTTP_ERROR",
            "details": {}
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle Pydantic validation errors
    """
    details = exc.errors()
    # Simplified error message from the first error
    message = "Validation Error"
    if details:
        error = details[0]
        field = error.get("loc", ["unknown"])[-1]
        msg = error.get("msg", "Invalid value")
        message = f"{field}: {msg}"

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "message": message,
            "error_code": "VALIDATION_ERROR",
            "details": {"errors": details}
        }
    )

async def global_exception_handler(request: Request, exc: Exception):
    """
    Handle unexpected exceptions
    """
    # Log the error with stack trace
    logger.error(f"Global Exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "An unexpected error occurred. Please try again later.",
            "error_code": "INTERNAL_SERVER_ERROR",
            "details": {}
        }
    )
