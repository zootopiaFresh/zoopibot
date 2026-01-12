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
  MessagesSquare
} from 'lucide-react';

const menuItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/users', label: '회원 관리', icon: Users },
  { href: '/admin/conversations', label: '대화내역', icon: MessagesSquare },
  { href: '/admin/histories', label: '히스토리', icon: History },
  { href: '/admin/schema-prompts', label: '스키마 프롬프트', icon: FileCode },
  { href: '/admin/feedbacks', label: '피드백', icon: MessageSquareText },
  { href: '/admin/learning', label: '학습 관리', icon: Brain },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      {/* 로고 영역 */}
      <div className="p-4 border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-2">
          <Database className="w-6 h-6 text-indigo-400" />
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
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
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
      <div className="p-4 border-t border-gray-800">
        <Link
          href="/query-generator"
          className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white transition-colors"
        >
          <Database className="w-5 h-5" />
          SQL Assistant
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
