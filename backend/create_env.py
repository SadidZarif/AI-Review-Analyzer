#!/usr/bin/env python3
"""
Create .env file with Judge.me API token
Run this script to automatically create .env file
"""

import os

# Judge.me API Token
JUDGE_ME_TOKEN = "yXkkzQ7GwlRbGrLTfnMl-x23TDY"

# .env file content
env_content = f"""# ============ ENVIRONMENT VARIABLES ============
# This file contains sensitive API tokens
# NEVER commit this file to git!

# Judge.me API Token
JUDGE_ME_API_TOKEN={JUDGE_ME_TOKEN}
"""

# Create .env file
env_file_path = os.path.join(os.path.dirname(__file__), ".env")

try:
    with open(env_file_path, "w") as f:
        f.write(env_content)
    print("✅ .env file created successfully!")
    print(f"📝 Judge.me API token: {JUDGE_ME_TOKEN}")
    print(f"📁 File location: {env_file_path}")
except Exception as e:
    print(f"❌ Error creating .env file: {e}")

