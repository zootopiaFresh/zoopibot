'use client';

import { signOut, useSession } from 'next-auth/react';

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4">
        <div className="flex justify-between items-center h-14">
          <h1 className="text-lg font-semibold text-gray-800">SQL Assistant</h1>

          <div className="flex items-center gap-4">
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
