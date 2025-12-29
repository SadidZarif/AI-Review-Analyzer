# ============ INTEGRATIONS MODULE ============
# External service integrations (Shopify, etc.)

from .shopify import (
    fetch_shopify_reviews,
    ShopifyClient,
    ShopifyAPIError,
    SUPPORTED_REVIEW_APPS
)

__all__ = [
    'fetch_shopify_reviews',
    'ShopifyClient', 
    'ShopifyAPIError',
    'SUPPORTED_REVIEW_APPS'
]

