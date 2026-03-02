import os
from datetime import datetime


def ensure_folder(path: str):
    """Create folder if it doesn't exist"""
    os.makedirs(path, exist_ok=True)


def generate_filename(prefix="drawing", ext="png"):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{timestamp}.{ext}"
