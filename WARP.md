# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands

### Backend (FastAPI)

Backend code lives in `backend/` and exposes a FastAPI app in `main.py`.

- **Install dependencies** (from repo root or `backend/`):
  - `pip install -r backend/requirements.txt`
- **Run the API server in development** (auto-reload, port 8000):
  - From repo root: `uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000`
  - Or from `backend/`: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- **Alternative dev run** (uses the `if __name__ == "__main__"` block in `backend/main.py`):
  - From repo root: `python -m backend.main`
  - Or from `backend/`: `python main.py`
- **Quick health check** (after server is running):
  - `curl http://localhost:8000/health`

There is currently no explicit backend test suite or test runner configured in this repo.

### Frontend (React + TypeScript + Vite)

Frontend code lives in `frontend/react-app/` and is a Vite-based React + TypeScript app.

Run the following from `frontend/react-app/`:

- **Install dependencies**:
  - `npm install`
- **Start dev server** (default Vite port, typically 5173):
  - `npm run dev`
- **Build for production**:
  - `npm run build`
- **Run linting** (ESLint, using `eslint.config.js`):
  - `npm run lint`
- **Preview production build**:
  - `npm run preview`

The frontend `package.json` does not currently define a test script; there are no automated frontend tests configured yet.

### Connecting frontend to backend

- The frontend expects the backend to be available at `http://localhost:8000` (see `frontend/react-app/src/api.ts`, `API_BASE_URL`).
- When both dev servers are running:
  - Backend: `http://localhost:8000`
  - Frontend: `http://localhost:5173` (or the port Vite reports)

## Architecture overview

### High-level structure

- **Backend**: `backend/`
  - `main.py` – FastAPI application, HTTP endpoints, and orchestration of ML analysis + Shopify integration.
  - `models.py` – In-process ML model (`SentimentAnalyzer`) and topic extraction (`TopicExtractor`).
  - `schemas.py` – Pydantic request/response models used by FastAPI and mirrored in the TypeScript types.
  - `utils.py` – Shared text utilities (cleaning, stop words, truncation, review validation).
  - `integrations/shopify.py` – Async Shopify Admin API and Judge.me client + review fetching helper.
  - `TODO.txt` – Detailed roadmap of backend features that correspond to visible but currently mock-only UI elements.
- **Frontend**: `frontend/react-app/`
  - `src/App.tsx` – Router and layout shell (sidebar + routed pages).
  - `src/pages/*` – Top-level pages (Dashboard, Inventory, ReviewDetails, Settings, etc.).
  - `src/components/*` – Reusable UI elements (Metric cards, charts, review form/cards, sidebar, etc.).
  - `src/api.ts` – Typed API client mirroring backend schemas.
  - `src/utils/*` – Frontend helpers and mock data generators.

### Backend: analysis & integrations

**Core analysis pipeline**

The main review analysis flow is implemented across:

- `backend/models.py`:
  - `SentimentAnalyzer`:
    - Trains a TF–IDF + Logistic Regression model at import time using small in-file positive/negative review corpora (`POSITIVE_REVIEWS`, `NEGATIVE_REVIEWS`).
    - `predict(reviews: List[str])` returns a list of `{text, sentiment, confidence}` dictionaries with binary sentiment ("positive"/"negative").
    - `get_prediction_summary(predictions)` aggregates totals and positive/negative percentages.
  - `TopicExtractor`:
    - Static `extract_topics(reviews, sentiments, top_k)` uses `utils.extract_words` and `collections.Counter` to compute top positive and negative keywords.

- `backend/utils.py`:
  - `clean_text`, `extract_words`, and `STOP_WORDS` define the preprocessing pipeline used for topic extraction.
  - `batch_clean_reviews` / `is_valid_review` can be used to sanitize input before running analysis.

- `backend/schemas.py`:
  - `ReviewRequest` – Request body for manual analysis endpoint (`reviews: List[str]`, optional `product_link`).
  - `ReviewResult`, `TopicInfo`, `AnalysisResponse` – Shape of the analysis output; this is the contract mirrored in the frontend `AnalysisResponse`/`ReviewResult`/`TopicInfo` types in `src/api.ts`.

- `backend/main.py`:
  - Wires FastAPI endpoints to the ML layer and schemas:
    - `GET /health` – Simple liveness probe.
    - `GET /` – Root with basic docs and endpoint pointers.
    - `POST /analyze-reviews` – Synchronous manual review analysis:
      - Validates non-empty `reviews` list.
      - Calls `analyzer.predict` and `analyzer.get_prediction_summary`.
      - Calls `TopicExtractor.extract_topics` to compute `top_positive_topics` and `top_negative_topics`.
      - Builds `AnalysisResponse`, including at most 10 `ReviewResult` entries as `sample_reviews`.
    - `POST /analyze/shopify` – Async analysis pipeline that:
      - Validates `store_domain` and `access_token`.
      - Uses `fetch_shopify_reviews` to fetch or synthesize review texts.
      - Reuses the same sentiment + topic extraction flow as `/analyze-reviews`.
    - `GET /shopify/supported-apps` – Returns metadata from `SUPPORTED_REVIEW_APPS` for supported third‑party review apps.
  - Declares the FastAPI app (`app = FastAPI(...)`) and configures permissive CORS for development (`allow_origins=["*"]`).

**Shopify & Judge.me integration**

The Shopify integration is encapsulated in `backend/integrations/shopify.py` and is designed to support multiple data sources:

- `ShopifyClient`:
  - Normalizes store domains and exposes async helpers for core Admin API operations (`/shop.json`, `/products.json`, `/products/{id}/metafields.json`).
  - `get_products` fetches a limited product list with key fields used for generating demo reviews.
  - `extract_reviews_from_metafields` attempts to pull reviews from common metafield namespaces and keys (e.g., `reviews`, `spr`, `judgeme`, `loox`, `yotpo`).

- `JudgeMeClient`:
  - Async client for Judge.me's REST API, used when a `review_app == "judge_me"` and `review_app_token` are provided.
  - `extract_review_texts(limit)` paginates until it has collected up to `limit` plain-text reviews.

- `fetch_shopify_reviews(...)`:
  - Entry point used by the FastAPI `/analyze/shopify` endpoint.
  - Validates parameters, then attempts, in order:
    1. Third-party app reviews via `JudgeMeClient` (if configured).
    2. Metafield-based reviews via `ShopifyClient`.
    3. Fallback demo reviews synthesized from product metadata (`_generate_sample_reviews_from_products`).
  - Normalizes HTML, strips tags, and enforces a minimum length before returning up to `limit` cleaned review texts.

This module is intentionally written to support upgrading from demo/sample data to real production integrations by replacing or augmenting the fallback logic.

**Backend roadmap and UI alignment**

`backend/TODO.txt` documents many future capabilities that the current UI already hints at but which have no backend implementation yet. Highlights include:

- Extending the core analysis model:
  - Star ratings (1–5 scale) derived from sentiment/confidence.
  - A third "neutral" sentiment class and associated topic handling.
  - Additional metadata on `ReviewResult` (reviewer details, timestamps, product linkage, review source).
- Higher-level analytics and scoring:
  - Trust index, urgency level detection, highlighted phrases, rating distributions, keyword frequency with weights.
  - Historical trend analytics, date-range filtering, period comparisons, pending actions detection.
- Inventory & product layer:
  - Product CRUD and per-product analytics endpoints to back the Inventory page features.
  - Amazon/Shopify product import, global inventory stats and critical-issues detection.
- Settings / account / billing:
  - User profile and API key management, integration management, notification preferences.
  - Per-user AI configuration (sensitivity, tone, blocked keywords) and usage/billing tracking.

These planned features are reflected in the front-end pages (Dashboard, Inventory, ReviewDetails, Settings) via mock data and placeholders. When implementing them, keep the backend namespaces consistent (e.g., new modules in `backend/` like `analytics.py`, `trust_calculator.py`, etc., as suggested in `TODO.txt`).

### Frontend: UI shell, data flow, and mocks

**Routing and layout**

- `src/App.tsx`:
  - Sets up `BrowserRouter` and defines the main layout: a persistent `Sidebar` plus a `main` content area for routes.
  - Routes:
    - `/` → `Dashboard`
    - `/inventory` → `Inventory`
    - `/reviews` → `ReviewDetails` (list/details placeholder)
    - `/analysis` and `/campaigns` → simple "Coming soon" placeholder screens.
    - `/settings` → `Settings`
    - `/review/:id` → `ReviewDetails` for an individual review.

- `src/components/Sidebar.tsx`:
  - Drives the navigation items and highlights the active route using `useLocation`.
  - Provides a collapsible sidebar and a fixed Settings link at the bottom.

**Backend integration surface**

- `src/api.ts` defines the TypeScript equivalents of the Pydantic models in `backend/schemas.py` and provides two main functions:
  - `checkHealth()` → `GET /health`.
  - `analyzeReviews(reviews, productLink?)` → `POST /analyze-reviews`.
- `API_BASE_URL` in this file is the single source of truth for where the frontend expects the backend to be hosted; update this constant when pointing the UI at non-local environments.

- `src/components/ReviewForm.tsx`:
  - UI for entering free-form reviews and optional product link.
  - Splits textarea content on newlines to form the `reviews` array and calls `analyzeReviews`.
  - Emits results and loading state up via `onAnalysisComplete` and `onLoadingChange` props.

Currently, the `Dashboard` uses mock metrics and does **not** yet wire `ReviewForm` into its state (the corresponding handlers are present but commented out). Future work to integrate real analysis results should:

- Lift `AnalysisResponse` state into Dashboard (or a higher-level route component).
- Pass `onAnalysisComplete`/`onLoadingChange` into `ReviewForm` and feed those results into:
  - The metric cards (totals/percentages).
  - The "Recent Reviews" list in the Dashboard.
  - The "Keyword Cloud" data derived from `top_positive_topics` / `top_negative_topics`.

**Pages & mock-driven UX**

Most pages are designed against the future backend as described in `backend/TODO.txt` and currently rely on mock data in `src/utils/mockData.ts`:

- `src/pages/Dashboard.tsx`:
  - Uses `generateMockMetrics`, `generateMockReviewer`, and `generateAIReply` to populate metric cards, recent reviews, and AI reply suggestions.
  - `TrendChart` shows an SVG-based sentiment trend using mock weekly/monthly data (`generateWeeklyTrendData`, `generateMonthlyTrendData`).
  - When real data is available, the intent is to replace these mocks with API-backed analytics and tie the cards/charts to actual time-series endpoints.

- `src/pages/Inventory.tsx`:
  - Renders a product inventory grid using hard-coded `mockProducts` and `mockStats`.
  - Encodes many of the conceptual fields that backend TODOs mention (per-product sentiment breakdown, rating status, linkage state, critical issues, tags).
  - Navigation handlers (`/product/:id`, `/product/:id/insights`) assume future routes that do not yet exist.

- `src/pages/ReviewDetails.tsx`:
  - Currently uses a single `mockReview` plus derived metadata (trust index, urgency level, highlighted phrases, rating distribution).
  - Includes local AI-response generation with multiple tones (formal/empathetic/short) purely on the frontend.
  - All of these metrics are aligned with the backend roadmap (trust index, urgency detection, phrase highlighting) but are not yet wired to any real endpoint.

- `src/pages/Settings.tsx`:
  - Purely mock-driven settings UI mirroring planned backend settings endpoints (profile, integrations, notifications, AI configuration, usage/credits).
  - Actions like "Save Changes", "Connect Store", and sliders/toggles are currently local state only; they should eventually call the user/settings API endpoints planned in `backend/TODO.txt`.

**Shared UI helpers**

- `src/utils/helpers.ts` provides cross-cutting helpers:
  - Avatar initials/colors, relative time formatting, mapping sentiment+confidence to star ratings (used until backend provides explicit ratings), number/percentage formatting, and random date generation.
- `src/utils/mockData.ts` centralizes generation of:
  - Mock reviewers and AI replies.
  - Weekly/monthly trend series for charts.
  - Aggregate dashboard metrics.

When you implement real backend features, consider replacing or augmenting these mocks in a controlled way so the UI remains usable while gradually moving from demo data to live data.
