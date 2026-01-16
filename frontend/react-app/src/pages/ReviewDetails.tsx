// ============ IMPORTS ============

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Context - global state থেকে results নেব
import { useReviews } from '../context/ReviewContext';

import '../styles/ReviewDetails.css';
import { generateGroqReply } from '../api';
import { calculateTrustIndex } from '../utils/reviewAnalytics';

// ============ TYPES ============

interface ReviewDetail {
    id: string;
    text: string;
    sentiment: string;
    confidence: number | null;
    rating: number;
    createdAt: string;
    // Customer info - reviewer এর তথ্য
    customer: {
        name: string;
        avatar?: string | null;
        location?: string | null;
        totalSpend?: number | null;
        reviewCount?: number | null;
        loyaltyTier?: string | null;
    };
    // Product info - যে product এর review
    product: {
        name: string;
        sku: string;
        // For linking to other datasets (Judge.me reviews)
        productId?: string;
        image: string;
        badge?: string;
    };
    // Analysis metrics - বিশ্লেষণ metrics
    sentimentScore: number;
    trustIndex: string;
    urgencyLevel: string;
    // Keywords with sentiment - review থেকে extract করা keywords
    keywords: Array<{
        text: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        context: string;
    }>;
    // Highlighted phrases - review text এ highlight করার জন্য
    highlightedPhrases: Array<{
        text: string;
        sentiment: 'positive' | 'negative' | 'neutral';
        tooltip: string;
    }>;
}

// ============ COMPONENT ============

function ReviewDetails() {
    // URL থেকে reviewId নিচ্ছি
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // ============ CONTEXT - GLOBAL STATE ============
    // results = analysis summary, reviews = raw Judge.me reviews list
    const { results, reviews: shopReviews, products: shopifyProducts } = useReviews();
    
    // State management - component এর states
    const [review, setReview] = useState<ReviewDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiResponse, setAiResponse] = useState('');
    const [selectedTone, setSelectedTone] = useState<'formal' | 'empathetic' | 'short'>('empathetic');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [customInstruction, setCustomInstruction] = useState<string>('');
    
    // ============ DERIVED DATA ============
    // Context এর data থেকে review খুঁজছি (priority: full reviews list)
    const contextReview = useMemo(() => {
        if (!id) return null;
        const reviewId = parseInt(id);
        if (!Number.isFinite(reviewId)) return null;

        // 1) Full reviews list (Judge.me) থেকে id match করে খুঁজবো
        if (shopReviews && shopReviews.length > 0) {
            const r = shopReviews.find(x => x.id === reviewId);
            if (r) {
                const rating = r.rating || 3;
                const sentiment = rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral";

                // ReviewResult-like shape return করছি যাতে নিচের mapping same থাকে
                return {
                    text: r.body,
                    sentiment,
                    confidence: 0.75, // backend confidence নেই, UI placeholder
                    reviewer_name: r.reviewer_name || undefined,
                    review_date: r.created_at || undefined,
                    product_name: r.product_title || undefined,
                    product_id: r.product_id || undefined,
                    rating
                };
            }
        }

        // 2) Fallback: analysis sample reviews (index-based fallback)
        if (results && results.sample_reviews && results.sample_reviews.length > 0) {
            const reviewIndex = reviewId - 1;
            if (reviewIndex >= 0 && reviewIndex < results.sample_reviews.length) {
                return results.sample_reviews[reviewIndex];
            }
        }

        return null;
    }, [shopReviews, results, id]);

    function extractKeywordTags(text: string, max = 4): Array<{ text: string; sentiment: 'positive' | 'negative' | 'neutral'; context: string }> {
        const cleaned = (text || '')
            .toLowerCase()
            .replace(/<[^>]+>/g, ' ')
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .map(w => w.trim())
            .filter(w => w.length >= 4);

        const counts = new Map<string, number>();
        for (const w of cleaned) counts.set(w, (counts.get(w) || 0) + 1);

        const top = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, max)
            .map(([w]) => w);

        return top.map(w => ({
            text: w,
            sentiment: 'neutral',
            context: text.slice(0, 80) + (text.length > 80 ? '…' : '')
        }));
    }

    // Component mount হলে review data fetch করব
    useEffect(() => {
        // যদি context থেকে review পাই
        if (contextReview) {
            const productId = contextReview.product_id ? String(contextReview.product_id) : undefined;
            const product = productId ? shopifyProducts.find(p => String(p.id) === productId) : undefined;
            const rating = contextReview.rating || 0;
            const sentimentScore = rating ? Math.round((rating / 5) * 100) : (typeof contextReview.confidence === 'number' ? Math.round(contextReview.confidence * 100) : 0);

            const reviewFromContext: ReviewDetail = {
                id: id || '1',
                text: contextReview.text,
                sentiment: contextReview.sentiment,
                confidence: typeof contextReview.confidence === 'number' ? contextReview.confidence : null,
                rating: rating || 0,
                createdAt: contextReview.review_date || '—',
                customer: {
                    name: contextReview.reviewer_name || "Customer",
                    avatar: null,
                    location: null,
                    totalSpend: null,
                    reviewCount: null,
                    loyaltyTier: null
                },
                product: {
                    name: contextReview.product_name || "Product",
                    sku: `SKU-${contextReview.product_id || '000'}`,
                    productId: contextReview.product_id ? String(contextReview.product_id) : undefined,
                    image: product?.image_url || ""
                },
                sentimentScore,
                trustIndex: calculateTrustIndex({
                    confidence: typeof contextReview.confidence === 'number' ? contextReview.confidence : null,
                    reviewText: contextReview.text,
                    rating: contextReview.rating,
                    sentiment: contextReview.sentiment as 'positive' | 'negative' | 'neutral',
                    customerReviewCount: 1 // Default, could be enhanced with real customer data
                }),
                urgencyLevel: contextReview.sentiment === "negative" ? "High" : "Low",
                keywords: extractKeywordTags(contextReview.text, 4),
                highlightedPhrases: []
            };
            
            setReview(reviewFromContext);
            setLoading(false);
            // বাংলা: dummy response নয়, real Groq API call
            void generateAIResponse(reviewFromContext, 'empathetic');
            return;
        }
        // No mock fallback: if review isn't found in real data, show "not found"
        setReview(null);
        setLoading(false);
    }, [id]);

    // AI Response generate করার function
    // বাংলা: real-time Groq AI দিয়ে reply generate করি
    const generateAIResponse = async (reviewData: ReviewDetail, tone: 'formal' | 'empathetic' | 'short') => {
        try {
            setAiError(null);
            setAiLoading(true);
            const resp = await generateGroqReply({
                review_text: reviewData.text,
                tone,
                language: "en",
                customer_name: reviewData.customer?.name || undefined,
                product_name: reviewData.product?.name || undefined,
                // বাংলা: user এর preferred instruction pass করছি
                ...(customInstruction.trim() ? { custom_instruction: customInstruction.trim() } : {})
            });
            setAiResponse(resp.reply_text);
        } catch (e: any) {
            setAiError(e?.message || "Failed to generate AI reply");
        } finally {
            setAiLoading(false);
        }
    };

    // Tone change handle করা
    // User যখন tone button click করে
    const handleToneChange = (tone: 'formal' | 'empathetic' | 'short') => {
        setSelectedTone(tone);
        if (review) {
            void generateAIResponse(review, tone);
        }
    };

    // Review text এ highlighted phrases add করা
    // Sentiment অনুযায়ী text highlight করে দেখাবে
    const renderHighlightedReview = (text: string, phrases: ReviewDetail['highlightedPhrases']) => {
        let result = text;
        const elements: React.ReactElement[] = [];
        let lastIndex = 0;

        phrases.forEach((phrase, index) => {
            const phraseIndex = result.indexOf(phrase.text, lastIndex);
            if (phraseIndex !== -1) {
                // Highlight এর আগের text
                if (phraseIndex > lastIndex) {
                    elements.push(
                        <span key={`text-${index}`}>{result.substring(lastIndex, phraseIndex)}</span>
                    );
                }
                // Highlighted phrase - sentiment অনুযায়ী class দিচ্ছি
                elements.push(
                    <span
                        key={`highlight-${index}`}
                        className={`highlight-${phrase.sentiment}`}
                        title={phrase.tooltip}
                    >
                        {phrase.text}
                    </span>
                );
                lastIndex = phraseIndex + phrase.text.length;
            }
        });

        // বাকি text যেটা highlight হয়নি
        if (lastIndex < result.length) {
            elements.push(<span key="text-end">{result.substring(lastIndex)}</span>);
        }

        return elements;
    };

    // Rating breakdown for this product (computed from real Judge.me reviews if available)
    const ratingBreakdown = useMemo(() => {
        const productId = review?.product?.productId;
        if (!productId) {
            return [
                { stars: 5, percentage: 0 },
                { stars: 4, percentage: 0 },
                { stars: 3, percentage: 0 },
                { stars: 2, percentage: 0 },
                { stars: 1, percentage: 0 }
            ];
        }

        const productReviews = (shopReviews || []).filter(r => String(r.product_id) === String(productId));
        const total = productReviews.length;
        const counts = new Map<number, number>([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
        for (const r of productReviews) {
            const rating = Number(r.rating || 0);
            if (rating >= 1 && rating <= 5) counts.set(rating, (counts.get(rating) || 0) + 1);
        }

        const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
        return [
            { stars: 5, percentage: pct(counts.get(5) || 0) },
            { stars: 4, percentage: pct(counts.get(4) || 0) },
            { stars: 3, percentage: pct(counts.get(3) || 0) },
            { stars: 2, percentage: pct(counts.get(2) || 0) },
            { stars: 1, percentage: pct(counts.get(1) || 0) }
        ];
    }, [review?.product?.productId, shopReviews]);

    // ============ LOADING STATE ============
    if (loading) {
        return (
            <div className="review-details-loading">
                <div className="loading-spinner"></div>
                <p>Loading review details...</p>
            </div>
        );
    }

    // ============ ERROR STATE ============
    // যদি review না পাওয়া যায়
    if (!review) {
        return (
            <div className="review-details-error">
                <span className="material-symbols-outlined">error</span>
                <h2>Review not found</h2>
                <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            </div>
        );
    }

    // ============ RENDER ============
    
    return (
        <div className="review-details-page">
            {/* ========== Breadcrumbs & Actions ========== */}
            <div className="page-header">
                <div className="header-left">
                    {/* Breadcrumbs - navigation path দেখাবে */}
                    <div className="breadcrumbs">
                        <a onClick={() => navigate('/dashboard')}>Dashboard</a>
                        <span className="material-symbols-outlined">chevron_right</span>
                        <a onClick={() => navigate('/reviews')}>All Reviews</a>
                        <span className="material-symbols-outlined">chevron_right</span>
                        <span className="current">Review #{review.id}</span>
                    </div>
                    {/* Page title */}
                    <h1 className="page-title">
                        Review Details
                        <span className="verified-badge">Verified Purchase</span>
                    </h1>
                    <p className="page-meta">Analyzed on {review.createdAt} • ID: #{review.id}</p>
                </div>
                {/* Action buttons */}
                <div className="header-actions">
                    <button className="btn-secondary">
                        <span className="material-symbols-outlined">ios_share</span>
                        Export
                    </button>
                    <button className="btn-primary">
                        <span className="material-symbols-outlined">support_agent</span>
                        Escalate to Support
                    </button>
                </div>
            </div>

            {/* ========== Stats Overview ========== */}
            {/* তিনটি metric card - Sentiment, Trust, Urgency */}
            <div className="stats-overview">
                {/* Sentiment Score Card */}
                <div className="stat-card stat-sentiment">
                    <div className="stat-glow"></div>
                    <div className="stat-header">
                        <div className="stat-icon">
                            <span className="material-symbols-outlined">sentiment_satisfied</span>
                        </div>
                        <span className="stat-badge positive">+5% vs avg</span>
                    </div>
                    <p className="stat-label">Sentiment Score</p>
                    <div className="stat-value">
                        {review.sentimentScore}<span className="stat-unit">/100</span>
                    </div>
                    {/* Progress bar */}
                    <div className="stat-progress">
                        <div className="stat-progress-bar" style={{ width: `${review.sentimentScore}%` }}></div>
                    </div>
                </div>

                {/* Trust Index Card */}
                <div className="stat-card stat-trust">
                    <div className="stat-glow"></div>
                    <div className="stat-header">
                        <div className="stat-icon">
                            <span className="material-symbols-outlined">verified_user</span>
                        </div>
                        <span className="stat-badge moderate">Moderate</span>
                    </div>
                    <p className="stat-label">Trust Index</p>
                    <div className="stat-value">{review.trustIndex}</div>
                    <div className="stat-progress">
                        <div className="stat-progress-bar" style={{ width: '75%' }}></div>
                    </div>
                </div>

                {/* Urgency Level Card */}
                <div className="stat-card stat-urgency">
                    <div className="stat-glow"></div>
                    <div className="stat-header">
                        <div className="stat-icon">
                            <span className="material-symbols-outlined">timer</span>
                        </div>
                        <span className="stat-badge neutral">Normal</span>
                    </div>
                    <p className="stat-label">Urgency Level</p>
                    <div className="stat-value">{review.urgencyLevel}</div>
                    <div className="stat-progress">
                        <div className="stat-progress-bar" style={{ width: '20%' }}></div>
                    </div>
                </div>
            </div>

            {/* ========== Main Content Grid ========== */}
            {/* Left: Review & AI Response, Right: Customer & Product Info */}
            <div className="content-grid">
                {/* ===== LEFT COLUMN ===== */}
                <div className="content-main">
                    {/* Review Card - original review text with highlights */}
                    <div className="review-card">
                        {/* Decorative quotation mark */}
                        <span className="quote-decoration material-symbols-outlined">format_quote</span>
                        <div className="review-content">
                            <h3 className="section-title">
                                <span className="material-symbols-outlined">rate_review</span>
                                Original Review
                            </h3>
                            {/* Review text with sentiment highlights */}
                            <div className="review-text-highlighted">
                                "{renderHighlightedReview(review.text, review.highlightedPhrases)}"
                            </div>
                            {/* Keyword Tags - extracted keywords থেকে */}
                            <div className="keyword-tags">
                                {review.keywords.map((keyword, index) => (
                                    <div key={index} className={`keyword-tag keyword-${keyword.sentiment}`}>
                                        <span className="keyword-dot"></span>
                                        <span className="keyword-text">{keyword.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AI Response Generator - smart reply system */}
                    <div className="ai-response-generator">
                        {/* Header with tone buttons */}
                        <div className="ai-header">
                            <div className="ai-title">
                                <div className="ai-icon">
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                </div>
                                <h3>Smart Response Generator</h3>
                            </div>
                            {/* Tone selection buttons */}
                            <div className="tone-buttons">
                                <button
                                    className={selectedTone === 'formal' ? 'active' : ''}
                                    onClick={() => handleToneChange('formal')}
                                >
                                    Formal
                                </button>
                                <button
                                    className={selectedTone === 'empathetic' ? 'active' : ''}
                                    onClick={() => handleToneChange('empathetic')}
                                >
                                    Empathetic
                                </button>
                                <button
                                    className={selectedTone === 'short' ? 'active' : ''}
                                    onClick={() => handleToneChange('short')}
                                >
                                    Short
                                </button>
                            </div>
                        </div>
                        {/* Body with textarea and actions */}
                        <div className="ai-body">
                            {/* Preferred response instruction */}
                            <div className="ai-instruction">
                                <div className="ai-instruction-top">
                                    <label className="ai-instruction-label">
                                        Describe your preferred response
                                    </label>
                                    {/* বাংলা: instruction পাশেই Generate button (user request) */}
                                    <button
                                        className="ai-instruction-generate"
                                        onClick={() => review && void generateAIResponse(review, selectedTone)}
                                        disabled={!review || aiLoading}
                                        title="Generate using your instruction"
                                    >
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                        {aiLoading ? "Generating..." : "Generate"}
                                    </button>
                                </div>

                                <div className="ai-instruction-row">
                                    <textarea
                                        className="ai-instruction-input"
                                        value={customInstruction}
                                        onChange={(e) => setCustomInstruction(e.target.value)}
                                        placeholder="Example: Keep it friendly, apologize for delay, offer a replacement if needed, and ask for order number. Avoid emojis."
                                        rows={3}
                                    />
                                </div>
                                <p className="ai-instruction-hint">
                                    {/* বাংলা: এই instruction অনুযায়ী Groq reply generate করবে */}
                                    AI will follow your instruction when generating the reply.
                                </p>
                            </div>

                            <div className="ai-textarea-wrapper">
                                {/* Generated response textarea - editable */}
                                <textarea
                                    className="ai-textarea"
                                    value={aiResponse}
                                    onChange={(e) => setAiResponse(e.target.value)}
                                    rows={8}
                                />
                                {/* Floating Action Bar - regenerate & copy */}
                                <div className="ai-floating-actions">
                                    <button
                                        className="ai-action-btn"
                                        title="Regenerate"
                                        onClick={() => review && void generateAIResponse(review, selectedTone)}
                                        disabled={aiLoading}
                                    >
                                        <span className="material-symbols-outlined">refresh</span>
                                    </button>
                                    <button
                                        className="ai-action-btn"
                                        title="Copy"
                                        onClick={() => navigator.clipboard.writeText(aiResponse)}
                                        disabled={!aiResponse}
                                    >
                                        <span className="material-symbols-outlined">content_copy</span>
                                    </button>
                                </div>
                            </div>
                            {aiError && (
                                <div className="ai-error">{aiError}</div>
                            )}
                            {/* Action buttons */}
                            <div className="ai-actions">
                                <button className="btn-text">Discard</button>
                                <button className="btn-primary">
                                    <span className="material-symbols-outlined">send</span>
                                    Approve &amp; Reply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== RIGHT COLUMN ===== */}
                <div className="content-sidebar">
                    {/* Customer Profile Card - reviewer এর info */}
                    <div className="sidebar-card customer-profile">
                        <h3 className="sidebar-title">Customer Profile</h3>
                        {/* Customer info with avatar */}
                        <div className="customer-info">
                            <div className="customer-avatar" style={review.customer.avatar ? { backgroundImage: `url(${review.customer.avatar})` } : undefined}>
                                {!review.customer.avatar && (
                                    <span style={{ fontWeight: 800, fontSize: 12, color: 'white' }}>
                                        {(review.customer.name || 'C')
                                            .split(' ')
                                            .filter(Boolean)
                                            .slice(0, 2)
                                            .map(s => s[0]?.toUpperCase())
                                            .join('')}
                                    </span>
                                )}
                            </div>
                            <div className="customer-details">
                                <p className="customer-name">{review.customer.name}</p>
                                <p className="customer-location">
                                    <span className="material-symbols-outlined">location_on</span>
                                    {review.customer.location || '—'}
                                </p>
                            </div>
                        </div>
                        {/* Customer stats - spend, reviews, loyalty */}
                        <div className="customer-stats">
                            <div className="customer-stat">
                                <p className="stat-label">Total Spend</p>
                                <p className="stat-value">{typeof review.customer.totalSpend === 'number' ? `$${review.customer.totalSpend.toLocaleString()}` : '—'}</p>
                            </div>
                            <div className="customer-stat">
                                <p className="stat-label">Reviews</p>
                                <p className="stat-value">{typeof review.customer.reviewCount === 'number' ? review.customer.reviewCount : '—'}</p>
                            </div>
                            <div className="customer-stat customer-stat-full">
                                <p className="stat-label">Loyalty Tier</p>
                                <span className="loyalty-badge">
                                    <span className="material-symbols-outlined">star</span>
                                    {review.customer.loyaltyTier || '—'}
                                </span>
                            </div>
                        </div>
                        <button className="btn-outline">View Full History</button>
                    </div>

                    {/* Rating Breakdown Card - star distribution */}
                    <div className="sidebar-card rating-breakdown">
                        <div className="rating-header">
                            <h3 className="sidebar-title">Rating Analysis</h3>
                            <div className="rating-display">
                                <span className="material-symbols-outlined">star</span>
                                <span className="rating-value">{review.rating}.0</span>
                            </div>
                        </div>
                        {/* Rating bars - 5 থেকে 1 star */}
                        <div className="rating-bars">
                            {ratingBreakdown.map((item) => (
                                <div key={item.stars} className={`rating-row ${item.percentage === 0 ? 'empty' : ''}`}>
                                    <span className="rating-star">{item.stars}</span>
                                    <div className="rating-bar-bg">
                                        <div className="rating-bar-fill" style={{ width: `${item.percentage}%` }}></div>
                                    </div>
                                    <span className="rating-percent">{item.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Product Snapshot Card - product image & info */}
                    <div className="sidebar-card product-snapshot">
                        <div
                            className="product-image"
                            style={{ backgroundImage: `url(${review.product.image})` }}
                        >
                            {/* Product badge যদি থাকে */}
                            {review.product.badge && (
                                <span className="product-badge">{review.product.badge}</span>
                            )}
                        </div>
                        <p className="product-name">{review.product.name}</p>
                        <p className="product-sku">SKU: {review.product.sku}</p>
                        <button className="btn-link">View Product Analytics</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReviewDetails;
