'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LogIn, UserPlus, LogOut } from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <nav className="flex justify-between items-center px-6 py-1 max-w-7xl mx-auto">
      {/* Brand Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
        <img src="/logo.png" alt="Pustaklinu" loading="eager" className="h-24 object-contain hover:scale-105 transition duration-300" />
      </div>

      {/* Center Navigation - Conditional based on Role */}
      <div className="hidden md:flex items-center gap-10">
        {session?.user?.role === 'seller' ? (
          <>
            <Link href="/dashboard/seller" className="text-gray-600 hover:text-amber-700 font-medium text-[15px] transition-colors relative group">
              My Listings
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </Link>
            <Link href="/dashboard/seller/messages" className="text-gray-600 hover:text-amber-700 font-medium text-[15px] transition-colors relative group">
              Messages
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/" className="text-gray-600 hover:text-amber-700 font-medium text-[15px] transition-colors relative group">
              Home
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </Link>

            <Link href="/dashboard/buyer" className="text-gray-600 hover:text-amber-700 font-medium text-[15px] transition-colors relative group">
              Categories
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </Link>

            <Link href="/dashboard/buyer/orders" className="text-gray-600 hover:text-amber-700 font-medium text-[15px] transition-colors relative group">
              Orders
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </Link>

            <Link href="/dashboard/buyer/messages" className="text-gray-600 hover:text-amber-700 font-medium text-[15px] transition-colors relative group">
              Chat
              <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-amber-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </Link>
          </>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="flex gap-4 items-center">
        {status === 'loading' ? (
          <div className="flex gap-4 animate-pulse">
            <div className="w-20 h-9 bg-gray-100 rounded-full"></div>
            <div className="w-24 h-9 bg-gray-100 rounded-full"></div>
          </div>
        ) : !session ? (
          <>
            <Link href="/login" className="flex items-center gap-2 px-5 py-2 text-gray-700 hover:text-amber-700 font-medium transition hover:bg-gray-50 rounded-full">
              <LogIn className="w-4 h-4" /> Login
            </Link>
            <Link href="/register" className="flex items-center gap-2 px-6 py-2.5 bg-amber-700 text-white font-medium rounded-full hover:bg-amber-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              <UserPlus className="w-4 h-4" /> Register
            </Link>
          </>
        ) : (
          <>
            <Link href={`/dashboard/${session.user.role}`} className="flex items-center gap-2 text-gray-600 hover:text-amber-700 font-medium transition mr-2">
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2 border border-amber-200 text-amber-700 font-medium rounded-full hover:bg-amber-50 transition"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
