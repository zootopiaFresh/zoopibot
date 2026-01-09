'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Settings } from 'lucide-react';

export function Header() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4">
        <div className="flex justify-between items-center h-14">
          <h1 className="text-lg font-semibold text-gray-800">SQL Assistant</h1>

          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              설정
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                Admin
              </Link>
            )}
            <span className="text-sm text-gray-500">{session?.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
