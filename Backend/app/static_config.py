# app/static_config.py
from fastapi.staticfiles import StaticFiles
import os

def setup_static_files(app):
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
        os.makedirs(f"{uploads_dir}/images", exist_ok=True)
        os.makedirs(f"{uploads_dir}/videos", exist_ok=True)
        os.makedirs(f"{uploads_dir}/files", exist_ok=True)
    
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")