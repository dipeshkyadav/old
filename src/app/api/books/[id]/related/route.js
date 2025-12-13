import { NextResponse } from 'next/server';
import { Book, User } from '@/models/index';
import { Op } from 'sequelize';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const book = await Book.findByPk(id);

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Find books with same category or same seller, excluding the current book
    // Limit to 4 related books
    const relatedBooks = await Book.findAll({
        where: {
            [Op.and]: [
                { id: { [Op.ne]: id } }, // Not this book
                {
                    [Op.or]: [
                        { category: book.category },
                        { sellerId: book.sellerId } // Or similar authors if we had author field separate from user (we have seller)
                        // Actually 'author' is not in Book model explicitly in the earlier `read_file`, wait.
                        // Checked src/models/Book.js: title, pages, price, description, category, keywords, discount, images, sellerId, status.
                        // No 'author' field?
                        // Let's check src/models/Book.js again.
                    ]
                }
            ]
        },
        limit: 4,
        include: [{ model: User, as: 'seller', attributes: ['name', 'city'] }],
        order: [['createdAt', 'DESC']] // Newest first
    });

    return NextResponse.json(relatedBooks);
  } catch (error) {
    console.error('Related Books GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
