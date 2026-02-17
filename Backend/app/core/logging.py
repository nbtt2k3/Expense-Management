import logging
import os
from logging.handlers import RotatingFileHandler
from app.core.config import settings

# Ensure logs directory exists
LOGS_DIR = os.path.join(os.getcwd(), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

# Log file path
LOG_FILE = os.path.join(LOGS_DIR, "app.log")

def setup_logging():
    """
    Configure logging for the application.
    """
    logger = logging.getLogger("expense_app")
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(log_level)

    # Prevent adding handlers multiple times
    if logger.hasHandlers():
        return logger

    # Formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # File Handler (Rotating)
    # Max size 5MB, keep 3 backups
    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=5*1024*1024, backupCount=3
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(log_level)

    # Console Handler
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    stream_handler.setLevel(log_level)

    # Add handlers
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

    return logger

# Create a global logger instance
logger = setup_logging()
