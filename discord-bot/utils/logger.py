import structlog
from pathlib import Path
import json
import logging
import sys

# Configuration du logger structuré
def setup_logger():
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Rediriger le stdout vers un fichier de log
    # sys.stdout = open(log_dir / "bot_output.log", "a")
    # sys.stderr = open(log_dir / "bot_error.log", "a")

    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    return structlog.get_logger()

# Décorateur pour tracer les performances OCR
def trace_ocr_performance(func):
    """Un décorateur pour logger la performance d'une fonction OCR."""
    def wrapper(*args, **kwargs):
        logger = setup_logger()
        import time
        start_time = time.time()
        
        logger.info("ocr_pipeline.start", function_name=func.__name__)
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            # Gestion du type de retour pour le logging
            if isinstance(result, tuple) and len(result) > 0:
                text_blocks = len(result[0]) if isinstance(result[0], list) else 1
            elif isinstance(result, list):
                text_blocks = len(result)
            else:
                text_blocks = 1
                
            logger.info(
                "ocr_pipeline.success", 
                function_name=func.__name__,
                duration_ms=int(duration * 1000),
                detected_blocks=text_blocks
            )
            
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                "ocr_pipeline.error",
                function_name=func.__name__,
                duration_ms=int(duration * 1000),
                error=str(e),
                exc_info=True
            )
            raise
    
    return wrapper

logger = setup_logger() 