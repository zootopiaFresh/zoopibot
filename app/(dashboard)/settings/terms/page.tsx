import { TermList } from '@/components/settings/term-list';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            설정으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">도메인 용어집</h1>
          <p className="text-gray-600 mt-1">
            비즈니스 용어를 DB 컬럼/테이블에 매핑하여 더 정확한 SQL을 생성합니다.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <TermList />
        </div>
      </div>
    </div>
  );
}
