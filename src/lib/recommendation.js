
import { Book } from '@/models/index';
import { Op } from 'sequelize';

export async function getRecommendations(userId = null, limit = 4) {
  try {
    // Trending Logic:
    // Order by views DESC.
    // Exclude own books.

    let whereClause = {};
    if (userId) {
      whereClause.sellerId = { [Op.ne]: userId }; // Exclude own books
    }

    const books = await Book.findAll({
      where: whereClause,
      order: [['views', 'DESC'], ['createdAt', 'DESC']],
      limit: limit,
    });

    return books;
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    // Fallback: fetch latest books
    try {
        const fallbackBooks = await Book.findAll({
            limit: limit,
            order: [['createdAt', 'DESC']]
        });
        return fallbackBooks;
    } catch (e) {
        return [];
    }
  }
}
