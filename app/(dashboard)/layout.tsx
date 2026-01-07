'use client';

import { SessionProvider } from 'next-auth/react';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
