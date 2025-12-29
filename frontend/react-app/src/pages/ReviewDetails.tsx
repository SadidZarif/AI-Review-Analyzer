// ============ IMPORTS ============

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/ReviewDetails.css';

// ============ TYPES ============

interface ReviewDetail {
    id: string;
    text: string;
    sentiment: string;
    confidence: number;
    rating: number;
    createdAt: string;
    // Customer info - reviewer এর তথ্য
    customer: {
        name: string;
        avatar: string;
        location: string;
        totalSpend: number;
        reviewCount: number;
        loyaltyTier: string;
    };
    // Product info - যে product এর review
    product: {
        name: string;
        sku: string;
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
    
    // State management - component এর states
    const [review, setReview] = useState<ReviewDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiResponse, setAiResponse] = useState('');
    const [selectedTone, setSelectedTone] = useState<'formal' | 'empathetic' | 'short'>('empathetic');

    // Component mount হলে review data fetch করব
    // ভবিষ্যতে এখানে actual API call হবে
    useEffect(() => {
        // Mock data - পরে API থেকে আসবে
        const mockReview: ReviewDetail = {
            id: id || '88392',
            text: "I've been using this product for about two weeks now. The build quality is absolutely fantastic, feeling very premium in hand. However, I was a bit disappointed with the shipping time; it arrived 3 days later than promised. Also, the battery life seems okay, but could be better for the price point.",
            sentiment: "positive",
            confidence: 0.88,
            rating: 4,
            createdAt: "Oct 24, 2023",
            customer: {
                name: "Michael Chen",
                avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDbkGhfaP7JD2N96Wt35RkEKBejnpu3U5KaxDlhU0CdAT8w44vs7yWoVOgDcei_NXPvZvqnAjdz4rIX27ApnIY1u3onjWSxcemWOX1NJlbaFrSms7XA8Me4HRUZls803T3f3RI9FZOw6Ig3reZgpJj-fmnwhwaKV4HVRZvk9jVSl0xhBWvbA_YnouGCwBcykjNZoGv0vznHyx9CQB8MLZzZgxZhJihIaRVUdelo2Z7wb-L-e0OIob-1q2FnjWpQyNy8W3B8Nigslg",
                location: "San Francisco, CA",
                totalSpend: 1240,
                reviewCount: 12,
                loyaltyTier: "Gold Member"
            },
            product: {
                name: "Wireless Noise-Cancelling Headphones",
                sku: "HD-400-BLK",
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuClxt07bwGNGuE0svmf8kq6VhDmJGD78-aJWjyY4d8rSbJpVPwlaGVmlfBxD8gRfxTPgNfMAloXDWQC4wupm7osDaURaOBMq94NIgBk3-moz_Cx5CHChirQUBq6uGH3RyTM9OsNbkFyHeLf5SIMxM3IFN6ZaFcmhGBSWdo_OHOLCS16bXMD5exqqxRWv0fPXkDsBrnUK8ST9g5iaayK3U_DnRaJw3nJm_zlV6sS-d_B6diPQuQbjE_c2WPpqHjYHd9QNpJJkgESIQ",
                badge: "Top Seller"
            },
            sentimentScore: 88,
            trustIndex: "High",
            urgencyLevel: "Low",
            keywords: [
                { text: "Quality: Excellent", sentiment: "positive", context: "Build quality is absolutely fantastic" },
                { text: "Shipping: Slow", sentiment: "negative", context: "Arrived 3 days later than promised" },
                { text: "Battery: Average", sentiment: "neutral", context: "Battery life seems okay" }
            ],
            highlightedPhrases: [
                { text: "The build quality is absolutely fantastic", sentiment: "positive", tooltip: "Positive Sentiment: Product Quality" },
                { text: "shipping time", sentiment: "negative", tooltip: "Negative Sentiment: Logistics" },
                { text: "battery life", sentiment: "neutral", tooltip: "Neutral Sentiment: Feature" }
            ]
        };

        // Simulating API delay - API call এর মত delay করছি
        setTimeout(() => {
            setReview(mockReview);
            generateAIResponse(mockReview, 'empathetic');
            setLoading(false);
        }, 500);
    }, [id]);

    // AI Response generate করার function
    // Tone অনুযায়ী আলাদা আলাদা response generate করে
    const generateAIResponse = (reviewData: ReviewDetail, tone: 'formal' | 'empathetic' | 'short') => {
        const responses = {
            empathetic: `Dear ${reviewData.customer.name},

Thank you for your detailed feedback! We're thrilled to hear you love the build quality of our product. We strive for premium experiences.

We sincerely apologize for the delay in shipping. We are currently investigating this with our logistics partner to prevent future delays. Regarding the battery life, your input is valuable as we continue to improve our next iterations.

Thank you for choosing us, and we hope to serve you better next time.`,
            formal: `Dear Valued Customer,

We acknowledge receipt of your review dated ${reviewData.createdAt}. We appreciate your positive feedback regarding product quality.

We apologize for the shipping delay of 3 days. This has been escalated to our logistics department. Your feedback regarding battery performance has been forwarded to our product development team for consideration.

Thank you for your business.

Best regards,
Customer Support Team`,
            short: `Hi ${reviewData.customer.name},

Thanks for your review! Glad you love the quality. Sorry about the shipping delay - we're working on it. Battery feedback noted!

Best,
Support Team`
        };
        setAiResponse(responses[tone]);
    };

    // Tone change handle করা
    // User যখন tone button click করে
    const handleToneChange = (tone: 'formal' | 'empathetic' | 'short') => {
        setSelectedTone(tone);
        if (review) {
            generateAIResponse(review, tone);
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

    // Star rating breakdown data - mock data
    // সব star rating এর distribution
    const ratingBreakdown = [
        { stars: 5, percentage: 60 },
        { stars: 4, percentage: 30 },
        { stars: 3, percentage: 10 },
        { stars: 2, percentage: 0 },
        { stars: 1, percentage: 0 }
    ];

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
                        <a onClick={() => navigate('/dashboard')}>All Reviews</a>
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
                                        onClick={() => review && generateAIResponse(review, selectedTone)}
                                    >
                                        <span className="material-symbols-outlined">refresh</span>
                                    </button>
                                    <button
                                        className="ai-action-btn"
                                        title="Copy"
                                        onClick={() => navigator.clipboard.writeText(aiResponse)}
                                    >
                                        <span className="material-symbols-outlined">content_copy</span>
                                    </button>
                                </div>
                            </div>
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
                            <div
                                className="customer-avatar"
                                style={{ backgroundImage: `url(${review.customer.avatar})` }}
                            ></div>
                            <div className="customer-details">
                                <p className="customer-name">{review.customer.name}</p>
                                <p className="customer-location">
                                    <span className="material-symbols-outlined">location_on</span>
                                    {review.customer.location}
                                </p>
                            </div>
                        </div>
                        {/* Customer stats - spend, reviews, loyalty */}
                        <div className="customer-stats">
                            <div className="customer-stat">
                                <p className="stat-label">Total Spend</p>
                                <p className="stat-value">${review.customer.totalSpend.toLocaleString()}</p>
                            </div>
                            <div className="customer-stat">
                                <p className="stat-label">Reviews</p>
                                <p className="stat-value">{review.customer.reviewCount}</p>
                            </div>
                            <div className="customer-stat customer-stat-full">
                                <p className="stat-label">Loyalty Tier</p>
                                <span className="loyalty-badge">
                                    <span className="material-symbols-outlined">star</span>
                                    {review.customer.loyaltyTier}
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
