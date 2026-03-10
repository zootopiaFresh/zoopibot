'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import { Header } from './header';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isImmersivePage = pathname.startsWith('/query-generator');

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-[#fcfcfc]',
        isImmersivePage && 'h-screen overflow-hidden bg-white'
      )}
    >
      {!isImmersivePage && <Header />}
      <main className={cn('flex-1', isImmersivePage ? 'overflow-hidden' : 'overflow-auto')}>
        {children}
      </main>
    </div>
  );
}
