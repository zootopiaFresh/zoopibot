'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  History,
  LogOut,
  Database,
  FileCode,
  MessageSquareText,
  Brain,
  MessagesSquare,
  AlertTriangle
} from 'lucide-react';

const menuItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/users', label: '회원 관리', icon: Users },
  { href: '/admin/conversations', label: '대화내역', icon: MessagesSquare },
  { href: '/admin/histories', label: '히스토리', icon: History },
  { href: '/admin/schema-prompts', label: '스키마 프롬프트', icon: FileCode },
  { href: '/admin/feedbacks', label: '피드백', icon: MessageSquareText },
  { href: '/admin/errors', label: '에러 로그', icon: AlertTriangle },
  { href: '/admin/learning', label: '학습 관리', icon: Brain },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 flex-col bg-[#202123] text-white">
      {/* 로고 영역 */}
      <div className="border-b border-white/10 p-4">
        <Link href="/admin" className="flex items-center gap-2">
          <Database className="h-6 w-6 text-[#10a37f]" />
          <span className="font-semibold text-lg">Admin Panel</span>
        </Link>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    isActive
                      ? 'bg-[#10a37f] text-white shadow-[0_10px_24px_rgba(16,163,127,0.18)]'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 하단 메뉴 */}
      <div className="border-t border-white/10 p-4">
        <Link
          href="/query-generator"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Database className="w-5 h-5" />
          SQL Assistant
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="w-5 h-5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
