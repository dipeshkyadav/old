// Pricing and Valuation Logic

/**
 * Estimates the price of a book based on its condition, original price (if known), and category demand.
 * This is a heuristic model.
 *
 * @param {Object} params
 * @param {string} params.category - The category of the book.
 * @param {string} params.condition - 'new', 'like-new', 'good', 'fair', 'poor'.
 * @param {number} [params.originalPrice] - The original MRP of the book.
 * @returns {Object} { estimatedPrice, range: [min, max], confidence: 'high'|'medium'|'low' }
 */
export function estimatePrice(params) {
    const { category, condition, originalPrice } = params;

    // Condition Multipliers (percentage of original price)
    const conditionMultipliers = {
        'new': 0.80,
        'like-new': 0.65,
        'good': 0.50,
        'fair': 0.35,
        'poor': 0.20
    };

    // Category Demand Multipliers (demand factor)
    const categoryDemand = {
        'academic': 1.1, // High demand for textbooks
        'technology': 1.05,
        'fiction': 0.9,
        'non-fiction': 0.95,
        'rare': 1.5 // Rare books retain value
    };

    let baseMultiplier = conditionMultipliers[condition] || 0.40;
    let demandMultiplier = categoryDemand[category?.toLowerCase()] || 1.0;

    if (originalPrice) {
        let estimated = originalPrice * baseMultiplier * demandMultiplier;
        // Round to nearest 10
        estimated = Math.round(estimated / 10) * 10;

        const variance = 0.15; // +/- 15% range

        return {
            estimatedPrice: estimated,
            range: {
                min: Math.round(estimated * (1 - variance)),
                max: Math.round(estimated * (1 + variance))
            },
            currency: 'Rs.',
            confidence: 'high'
        };
    } else {
        // Fallback without original price is hard without a database of prices.
        // We can return generic ranges based on category if we had average data.
        // For now, return specific error or low confidence guess.
        return {
            estimatedPrice: null,
            range: null,
            message: "Original price required for accurate estimation.",
            confidence: 'none'
        };
    }
}
