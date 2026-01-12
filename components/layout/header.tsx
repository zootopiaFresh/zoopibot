'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Settings, LogOut } from 'lucide-react';

export function Header() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-2 sm:px-4">
        <div className="flex justify-between items-center h-12 sm:h-14">
          <h1 className="text-base sm:text-lg font-semibold text-gray-800">SQL Assistant</h1>

          <div className="flex items-center gap-1 sm:gap-4">
            <Link
              href="/settings"
              className="flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="설정"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">설정</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Admin
              </Link>
            )}
            <span className="hidden sm:inline text-sm text-gray-500">{session?.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
