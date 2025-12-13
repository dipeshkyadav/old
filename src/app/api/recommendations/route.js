import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Book, Order, User } from '@/models/index';
import sequelize from '@/lib/db';
import { Op } from 'sequelize';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit')) || 4;

    // Content-Based Filtering Strategy:
    // 1. If user is logged in, find their last purchase or viewed category (mocked here as we don't track views deeply yet)
    // 2. Recommend books from the same category or with similar keywords.
    // 3. Fallback: Popular books (most orders) or random new books.

    let recommendedBooks = [];
    let excludeIds = [];

    if (session?.user?.id) {
        // Find last order by this user
        const lastOrder = await Order.findOne({
            where: { buyerId: session.user.id },
            order: [['createdAt', 'DESC']],
            include: [{ model: Book, as: 'book' }]
        });

        if (lastOrder && lastOrder.book) {
            const category = lastOrder.book.category;
            excludeIds.push(lastOrder.book.id);

            // Fetch books in same category
            const categoryBooks = await Book.findAll({
                where: {
                    category: category,
                    id: { [Op.notIn]: excludeIds },
                    status: 'available'
                },
                limit: limit,
                order: sequelize.random() // Randomize within category
            });

            recommendedBooks = [...categoryBooks];
        }
    }

    // Fill up with random available books if not enough recommendations
    if (recommendedBooks.length < limit) {
        const remaining = limit - recommendedBooks.length;
        const randomBooks = await Book.findAll({
            where: {
                id: { [Op.notIn]: [...excludeIds, ...recommendedBooks.map(b => b.id)] },
                status: 'available'
            },
            limit: remaining,
            order: sequelize.random() // SQLite/MySQL compatible
        });
        recommendedBooks = [...recommendedBooks, ...randomBooks];
    }

    return NextResponse.json(recommendedBooks);

  } catch (error) {
    console.error("Recommendation Error:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
