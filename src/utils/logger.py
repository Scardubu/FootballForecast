"""
Structured logging utility for Python services to integrate with Node.js Pino logging
"""
import json
import logging
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import traceback


class StructuredLogger:
    """Structured logger that outputs JSON logs compatible with Pino format"""
    
    def __init__(self, service_name: str, level: str = "INFO"):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        self.logger.setLevel(getattr(logging, level.upper()))
        
        # Remove existing handlers to avoid duplication
        self.logger.handlers.clear()
        
        # Create custom handler for structured JSON output
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter(service_name))
        self.logger.addHandler(handler)
        
        # Prevent propagation to avoid duplicate logs
        self.logger.propagate = False
    
    def info(self, message: str, **kwargs):
        """Log info level message with structured data"""
        self.logger.info(message, extra={"structured_data": kwargs})
    
    def warn(self, message: str, **kwargs):
        """Log warning level message with structured data"""
        self.logger.warning(message, extra={"structured_data": kwargs})
    
    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log error level message with structured data and optional exception"""
        extra_data = kwargs.copy()
        if error:
            extra_data.update({
                "error_type": type(error).__name__,
                "error_message": str(error),
                "traceback": traceback.format_exc() if sys.exc_info()[0] else None
            })
        self.logger.error(message, extra={"structured_data": extra_data})
    
    def debug(self, message: str, **kwargs):
        """Log debug level message with structured data"""
        self.logger.debug(message, extra={"structured_data": kwargs})


class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs logs in Pino-compatible JSON format"""
    
    def __init__(self, service_name: str):
        super().__init__()
        self.service_name = service_name
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON compatible with Pino"""
        
        # Base log structure
        log_data = {
            "level": self._get_pino_level(record.levelno),
            "time": int(datetime.now().timestamp() * 1000),  # Pino uses milliseconds
            "msg": record.getMessage(),
            "service": self.service_name,
            "pid": record.process,
            "hostname": record.name
        }
        
        # Add structured data if present
        if hasattr(record, 'structured_data') and getattr(record, 'structured_data', None):
            log_data.update(getattr(record, 'structured_data', {}))
        
        # Add exception info if present
        if record.exc_info:
            log_data["error"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else "Unknown",
                "message": str(record.exc_info[1]) if record.exc_info[1] else "Unknown error",
                "stack": self.formatException(record.exc_info)
            }
        
        return json.dumps(log_data, separators=(',', ':'))
    
    def _get_pino_level(self, python_level: int) -> int:
        """Convert Python logging levels to Pino levels"""
        level_mapping = {
            logging.DEBUG: 20,    # debug
            logging.INFO: 30,     # info  
            logging.WARNING: 40,  # warn
            logging.ERROR: 50,    # error
            logging.CRITICAL: 60  # fatal
        }
        return level_mapping.get(python_level, 30)


# Convenience function to create service loggers
def get_logger(service_name: str, level: str = "INFO") -> StructuredLogger:
    """Get or create a structured logger for a service"""
    return StructuredLogger(service_name, level)


# Performance tracking decorator
def log_performance(logger: StructuredLogger, operation: str):
    """Decorator to log performance metrics for operations"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = datetime.now()
            try:
                result = func(*args, **kwargs)
                end_time = datetime.now()
                duration_ms = (end_time - start_time).total_seconds() * 1000
                
                logger.info(f"Operation completed: {operation}", 
                          operation=operation,
                          duration_ms=round(duration_ms, 2),
                          status="success")
                return result
                
            except Exception as e:
                end_time = datetime.now()
                duration_ms = (end_time - start_time).total_seconds() * 1000
                
                logger.error(f"Operation failed: {operation}",
                           error=e,
                           operation=operation, 
                           duration_ms=round(duration_ms, 2),
                           status="error")
                raise
        
        return wrapper
    return decorator