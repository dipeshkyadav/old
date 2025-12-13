import Link from 'next/link';
import { BookOpen, ShoppingBag, Users, Search, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SearchHero from '@/components/SearchHero';
import FeaturedBooksList from '@/components/FeaturedBooksList';
import { Book } from '@/models/index';

// Function to fetch data on the server
async function getFeaturedBooks() {
  try {
    const books = await Book.findAll({
      limit: 4,
      order: [['createdAt', 'DESC']],
      // We might need raw: true if we were passing to Client Components directly without serialization,
      // but here we are passing to a Client Component, so we need simple objects.
      // However, Sequelize instances are not directly serializable due to methods.
      // We should use raw: true or map to JSON.
    });
    return books.map(book => book.toJSON());
  } catch (error) {
    console.error("Failed to fetch featured books", error);
    return [];
  }
}

export const dynamic = 'force-dynamic'; // Since we want fresh data on every request (or use revalidate)

export default async function Home() {
  const featuredBooks = await getFeaturedBooks();

  return (
    <div className="min-h-screen bg-amber-50 text-gray-800 font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-amber-50/95 backdrop-blur-md border-b border-amber-100 transition-all duration-300">
        <Navbar />
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-extrabold text-amber-900 leading-tight">
            Give Old Books <br /> <span className="text-amber-600">A New Story</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-lg">
            Connect with book lovers in your neighborhood. Buy, sell, and exchange pre-loved books effortlessly. Join our community today.
          </p>

          {/* Search Bar in Hero */}
          <SearchHero />

          <div className="flex gap-4 pt-4">
            <Link href="/dashboard/buyer" className="px-8 py-4 bg-amber-700 text-white text-lg font-semibold rounded-full hover:bg-amber-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Browse Books
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 bg-amber-200 rounded-full opacity-30 blur-3xl animate-pulse"></div>
          <img
            src="/landing_hero.png" // We will move the generated image here
            alt="Books Illustration"
            loading="eager"
            className="relative z-10 w-full h-auto drop-shadow-2xl rounded-2xl transform rotate-2 hover:rotate-0 transition duration-500"
          />
        </div>
      </main>

      {/* Featured Books Section */}
      <section className="bg-amber-50/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-amber-900">Recently Listed</h2>
            <Link href="/dashboard/buyer" className="text-amber-700 font-semibold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <FeaturedBooksList books={featuredBooks} />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-amber-900 mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center space-y-4 p-6 rounded-2xl hover:bg-amber-50 transition duration-300">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Sell Your Books</h3>
              <p className="text-gray-600">List your old books with ease. Add photos, set a price, and find a buyer nearby.</p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-2xl hover:bg-amber-50 transition duration-300">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Find Nearby Gems</h3>
              <p className="text-gray-600">Use geolocation to discover books available in your neighborhood. No shipping hassles.</p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-2xl hover:bg-amber-50 transition duration-300">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Connect & Exchange</h3>
              <p className="text-gray-600">Chat with sellers/buyers (via Admin) and arrange a meetup to exchange the books.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-amber-900 text-amber-100 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-100">Pustaklinu</span>
            </div>
            <p className="text-sm opacity-75">&copy; 2025 Pustaklinu. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
