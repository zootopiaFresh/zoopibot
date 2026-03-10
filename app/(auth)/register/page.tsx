'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

import { AuthShell } from '@/components/auth/auth-shell';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '회원가입 중 오류가 발생했습니다.');
        return;
      }

      router.push('/login?pending=true');
    } catch (error) {
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="회원가입"
      description="새 계정을 만들고 승인 기반 SQL Assistant 워크스페이스에 참여하세요."
      footer={
        <div className="text-center">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-medium text-[#10a37f] hover:text-[#0e8b6c]">
            로그인
          </Link>
        </div>
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#353740]">
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-[#d7dbd4] bg-white px-4 py-3 shadow-sm outline-none focus:border-[#10a37f] focus:ring-4 focus:ring-[#10a37f]/10"
              />
            </div>

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
                className="mt-1 block w-full rounded-2xl border border-[#d7dbd4] bg-white px-4 py-3 shadow-sm outline-none focus:border-[#10a37f] focus:ring-4 focus:ring-[#10a37f]/10"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#353740]">
                비밀번호 (최소 6자)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-2xl border border-[#d7dbd4] bg-white px-4 py-3 shadow-sm outline-none focus:border-[#10a37f] focus:ring-4 focus:ring-[#10a37f]/10"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-2xl border border-transparent bg-[#10a37f] px-4 py-3 text-sm font-medium text-white shadow-[0_16px_30px_rgba(16,163,127,0.22)] hover:bg-[#0e8b6c] focus:outline-none focus:ring-4 focus:ring-[#10a37f]/20 disabled:opacity-50"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
      </form>
    </AuthShell>
  );
}
