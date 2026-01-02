# Backend Setup Guide

## Installation

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Variables Setup

Create a `.env` file in the `backend` directory:

```bash
# Judge.me API Token
JUDGE_ME_API_TOKEN=yXkkzQ7GwlRbGrLTfnMl-x23TDY
```

**Important:** Never commit `.env` file to git! It's already in `.gitignore`.

### 3. Run the Server

```bash
# Development mode (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health Check
```
GET http://localhost:8000/health
```

### Analyze Reviews (Manual)
```
POST http://localhost:8000/analyze-reviews
Content-Type: application/json

{
  "reviews": [
    "This product is amazing!",
    "Terrible quality, broke after one week."
  ]
}
```

### Analyze Shopify Reviews
```
POST http://localhost:8000/analyze/shopify
Content-Type: application/json

{
  "store_domain": "your-store.myshopify.com",
  "access_token": "shpat_xxxxx",
  "review_app": "judge_me",
  "limit": 500
}
```

**Note:** If `review_app_token` is not provided but `review_app` is `judge_me`, the system will automatically use `JUDGE_ME_API_TOKEN` from `.env` file.

## Judge.me Integration

The system supports Judge.me API integration:

1. **With Environment Variable (Recommended):**
   - Set `JUDGE_ME_API_TOKEN` in `.env` file
   - Just provide `review_app: "judge_me"` in API request
   - Token will be automatically loaded from `.env`

2. **With API Request:**
   - Provide `review_app_token` directly in the request
   - Overrides environment variable if provided

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

