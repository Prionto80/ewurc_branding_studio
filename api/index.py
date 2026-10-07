import os
import sys
from pathlib import Path

# Add project root to sys.path so modules like branding and main can be imported
current_dir = Path(__file__).resolve().parent
root_dir = current_dir.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from main import app
