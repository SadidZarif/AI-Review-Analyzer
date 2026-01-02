# AI Review Analyzer - Backend

FastAPI-based backend for analyzing product reviews using AI/ML sentiment analysis.

## Features

- ✅ Sentiment Analysis (Positive/Negative)
- ✅ Topic Extraction from reviews
- ✅ Topic extraction from positive and negative reviews
- ✅ Shopify Integration
- ✅ Judge.me API Integration
- ✅ RESTful API with automatic documentation

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Setup Environment Variables

Create a `.env` file:

```bash
JUDGE_ME_API_TOKEN=yXkkzQ7GwlRbGrLTfnMl-x23TDY
```

### 3. Run Server

```bash
python main.py
```

Server will start at: http://localhost:8000

## API Endpoints

- `GET /health` - Health check
- `POST /analyze-reviews` - Analyze manual reviews
- `POST /analyze/shopify` - Analyze Shopify store reviews
- `GET /shopify/supported-apps` - List supported review apps
- `GET /docs` - Swagger UI documentation

## Project Structure

```
backend/
├── main.py              # FastAPI app and endpoints
├── models.py            # ML models (SentimentAnalyzer, TopicExtractor)
├── schemas.py           # Pydantic schemas for request/response
├── utils.py             # Helper functions
├── integrations/
│   └── shopify.py       # Shopify & Judge.me integration
├── requirements.txt     # Python dependencies
└── .env                 # Environment variables (not in git)
```

## Judge.me API Token

The Judge.me API token is stored in `.env` file as `JUDGE_ME_API_TOKEN`.

**Current Token:** `yXkkzQ7GwlRbGrLTfnMl-x23TDY`

This token is automatically loaded when using Judge.me integration.

## Development

See [SETUP.md](./SETUP.md) for detailed setup instructions.

