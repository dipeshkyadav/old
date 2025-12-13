import { NextResponse } from 'next/server';
import { Book } from '@/models/index';
import { Op } from 'sequelize';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title');
    const category = searchParams.get('category');

    if (!title && !category) {
        return NextResponse.json({ error: 'Please provide title or category' }, { status: 400 });
    }

    let whereClause = {};
    if (category) {
        whereClause.category = category;
    }
    if (title) {
        // Try to match title somewhat
        whereClause.title = { [Op.like]: `%${title}%` };
    }

    // Calculate average price
    const books = await Book.findAll({
        where: whereClause,
        attributes: ['price', 'createdAt']
    });

    if (books.length === 0) {
        return NextResponse.json({
            estimatedPrice: null,
            message: 'Not enough data to estimate price. Check similar categories.'
        });
    }

    const total = books.reduce((sum, book) => sum + Number(book.price), 0);
    const average = total / books.length;

    // Simple valuation: Average price.
    // Could be enhanced by factoring in "condition" if we had that field, or "pages".

    return NextResponse.json({
        estimatedPrice: Math.round(average),
        sampleSize: books.length,
        priceRange: {
            min: Math.min(...books.map(b => Number(b.price))),
            max: Math.max(...books.map(b => Number(b.price)))
        }
    });

  } catch (error) {
    console.error('Valuation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
