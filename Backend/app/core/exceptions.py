from typing import Any, Dict, Optional

class CustomException(Exception):
    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class NotFoundException(CustomException):
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details=details
        )

class UnauthorizedException(CustomException):
    def __init__(self, message: str = "Unauthorized access", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="UNAUTHORIZED",
            status_code=401,
            details=details
        )

class BadRequestException(CustomException):
    def __init__(self, message: str = "Bad request", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="BAD_REQUEST",
            status_code=400,
            details=details
        )
