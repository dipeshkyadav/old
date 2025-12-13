'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function FeaturedBooksList({ books }) {
  // Helper to parse images safely
  const getBookImage = (book) => {
    let imgs = book.images;
    if (typeof imgs === 'string') {
      try {
        imgs = JSON.parse(imgs);
      } catch (e) {
        // If parse fails, checks if it looks like a path
        if (imgs.startsWith('/') || imgs.startsWith('http')) {
          return imgs;
        }
        imgs = [];
      }
    }
    return Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : '/placeholder-book.png';
  };

  const calculateDiscountedPrice = (price, discount) => {
    if (!discount || discount <= 0) return price;
    return Math.round(price - (price * discount / 100));
  };

  if (!books || books.length === 0) {
    return (
      <div className="col-span-4 text-center py-10 text-gray-500">
        <p>No featured books available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {books.map(book => (
        <Link key={book.id} href={`/dashboard/buyer?q=${encodeURIComponent(book.title)}`} className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-amber-100 hover:-translate-y-1">
          <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
            <img
              src={getBookImage(book)}
              alt={book.title}
              loading="lazy"
              className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
            />
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
              {Number(book.discount) > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {book.discount}% OFF
                </span>
              )}
              <div className="bg-white/90 backdrop-blur px-2 py-0.5 rounded-md text-xs font-bold text-amber-700 shadow-sm flex flex-col items-end leading-tight">
                {Number(book.discount) > 0 ? (
                  <>
                    <span className="text-red-500 line-through text-[10px]">Rs. {book.price}</span>
                    <span>Rs. {calculateDiscountedPrice(book.price, book.discount)}</span>
                  </>
                ) : (
                  <span>Rs. {book.price}</span>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 flex-1">
            <h3 className="font-bold text-gray-800 line-clamp-1 group-hover:text-amber-700 transition">{book.title}</h3>
            <p className="text-sm text-gray-500 mb-2">{book.author}</p>
            <div className="flex justify-between items-center mt-auto pt-2">
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-md">{book.category || 'General'}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
