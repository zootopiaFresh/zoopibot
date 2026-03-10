'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/sidebar';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // 로그인 확인
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    // 관리자 권한 확인
    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/query-generator');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f3]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#10a37f] border-t-transparent" />
      </div>
    );
  }

  if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f3]">
        <div className="text-center">
          <p className="mb-4 text-[#6e6e80]">접근 권한이 없습니다</p>
          <button
            onClick={() => router.push('/query-generator')}
            className="text-[#10a37f] hover:text-[#0e8b6c]"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f7f3]">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SessionProvider>
  );
}
