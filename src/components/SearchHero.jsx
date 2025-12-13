'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

export default function SearchHero() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/buyer?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative max-w-md w-full">
      <input
        type="text"
        placeholder="Search for books by title or author..."
        className="w-full pl-12 pr-4 py-3 rounded-full border border-amber-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none shadow-sm text-gray-900"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
      <button type="submit" className="absolute right-2 top-2 bg-amber-700 text-white p-1.5 rounded-full hover:bg-amber-800 transition">
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
