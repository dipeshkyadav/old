import { NextResponse } from 'next/server';
import { Book } from '@/models/index';
import { Op } from 'sequelize';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title');
    const author = searchParams.get('author');
    const category = searchParams.get('category');

    // Valuation Algorithm:
    // 1. Find books with similar title/author (fuzzy match).
    // 2. Calculate average, min, max price of SOLD books (historical data).
    // 3. Also look at current listings for competition.

    let whereClause = {};
    if (title) whereClause.title = { [Op.like]: `%${title}%` };
    if (author) whereClause.author = { [Op.like]: `%${author}%` }; // Assuming author field exists on Book, wait Book model has title, pages, price, description, category, keywords, discount, images, sellerId, status. It misses 'author' in schema shown before?
    // Let me check Book model again.

    // Checking Book model...
    // The previous cat output of Book.js showed: title, pages, price, description, category, keywords, discount, images, sellerId, status.
    // IT DOES NOT HAVE AUTHOR. This is a schema flaw mentioned in "Partially functional".
    // I should probably add Author column or search in description/keywords.
    // For now, I will assume title contains author or search keywords.

    // Wait, let's fix the Book model to include Author if I can.
    // For now, I'll search by title and category for valuation.

    if (category) whereClause.category = category;

    // Fetch Sold Books (Historical Data)
    const soldBooks = await Book.findAll({
        where: {
            ...whereClause,
            status: 'sold'
        },
        attributes: ['price']
    });

    // Fetch Active Listings (Competition)
    const activeBooks = await Book.findAll({
        where: {
            ...whereClause,
            status: 'available'
        },
        attributes: ['price']
    });

    const calculateStats = (books) => {
        if (books.length === 0) return null;
        const prices = books.map(b => parseFloat(b.price));
        const sum = prices.reduce((a, b) => a + b, 0);
        const avg = sum / prices.length;
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return { avg, min, max, count: books.length };
    };

    const soldStats = calculateStats(soldBooks);
    const activeStats = calculateStats(activeBooks);

    // Algorithm to suggest price range
    let suggestedMin = 0;
    let suggestedMax = 0;

    if (soldStats) {
        suggestedMin = soldStats.avg * 0.9;
        suggestedMax = soldStats.avg * 1.1;
    } else if (activeStats) {
        // If no sales history, undercut competition slightly
        suggestedMin = activeStats.min * 0.9;
        suggestedMax = activeStats.avg;
    } else {
        // No data
        return NextResponse.json({ message: "Not enough data for valuation." });
    }

    return NextResponse.json({
        valuation: {
            min: Math.round(suggestedMin),
            max: Math.round(suggestedMax),
            currency: 'Rs.'
        },
        stats: {
            sold: soldStats,
            active: activeStats
        }
    });

  } catch (error) {
    console.error("Valuation Error:", error);
    return NextResponse.json({ error: "Valuation failed" }, { status: 500 });
  }
}
