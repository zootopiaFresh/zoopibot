'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, Settings, Shield, Sparkles } from 'lucide-react';

export function Header() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';
  const userInitial = session?.user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="border-b border-[#e5e5e5] bg-white/90 backdrop-blur">
      <div className="px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10a37f] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-medium tracking-tight text-[#0d0d0d] sm:text-[15px]">
                SQL Assistant
              </h1>
              <p className="hidden text-xs text-[#8e8ea0] sm:block">
                자연어로 SQL을 만들고 운영 지식을 관리합니다
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-[#6f6f7b] transition-colors hover:bg-[#f7f7f8] hover:text-[#0d0d0d]"
              title="설정"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">설정</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-[#6f6f7b] transition-colors hover:bg-[#f7f7f8] hover:text-[#0d0d0d]"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            <span className="hidden rounded-full bg-[#f7f7f8] px-3 py-1.5 text-sm text-[#6f6f7b] sm:inline">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm text-[#6f6f7b] transition-colors hover:bg-[#f7f7f8] hover:text-[#0d0d0d] sm:px-3"
              title="로그아웃"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10a37f] text-xs font-semibold text-white">
                {userInitial}
              </div>
              <LogOut className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
