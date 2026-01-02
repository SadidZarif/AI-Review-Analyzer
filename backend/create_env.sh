#!/bin/bash

# Create .env file with Judge.me API token

cat > .env << 'EOF'
# ============ ENVIRONMENT VARIABLES ============
# This file contains sensitive API tokens
# NEVER commit this file to git!

# Judge.me API Token
JUDGE_ME_API_TOKEN=yXkkzQ7GwlRbGrLTfnMl-x23TDY
EOF

echo "✅ .env file created successfully!"
echo "📝 Judge.me API token: yXkkzQ7GwlRbGrLTfnMl-x23TDY"

