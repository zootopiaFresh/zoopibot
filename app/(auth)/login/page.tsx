'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

import { AuthShell } from '@/components/auth/auth-shell';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (searchParams.get('pending') === 'true') {
      setSuccessMessage('회원가입이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        if (result.error.includes('pending')) {
          setError('관리자 승인 대기 중입니다. 승인 후 로그인이 가능합니다.');
        } else if (result.error.includes('inactive')) {
          setError('비활성화된 계정입니다. 관리자에게 문의하세요.');
        } else {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
      } else {
        router.push('/query-generator');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="로그인"
      description="업무 질문을 바로 SQL과 리포트로 바꾸는 Zoopibot 워크스페이스에 접속합니다."
      footer={
        <div className="text-center">
          계정이 없으신가요?{' '}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
            회원가입
          </Link>
        </div>
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#353740]">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="mt-2 block w-full rounded-2xl border border-[#d9d9e3] bg-[#fbfbfc] px-4 py-3.5 text-[#202123] shadow-sm outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#353740]">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="mt-2 block w-full rounded-2xl border border-[#d9d9e3] bg-[#fbfbfc] px-4 py-3.5 text-[#202123] shadow-sm outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10"
              />
            </div>
          </div>

          {successMessage && (
            <div className="rounded-2xl border border-[#cfe8de] bg-[#eefaf6] p-3 text-center text-sm text-[#116149]">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-2xl border border-transparent bg-[#202123] px-4 py-3.5 text-sm font-medium text-white shadow-[0_18px_40px_rgba(32,33,35,0.16)] hover:bg-[#171717] focus:outline-none focus:ring-4 focus:ring-indigo-600/15 disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
