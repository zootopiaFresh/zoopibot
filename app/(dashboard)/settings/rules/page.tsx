import { RuleList } from '@/components/settings/rule-list';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function RulesPage() {
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
          <h1 className="text-2xl font-bold text-gray-800">비즈니스 규칙</h1>
          <p className="text-gray-600 mt-1">
            SQL 쿼리에 자동으로 적용될 조건을 설정합니다.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <RuleList />
        </div>
      </div>
    </div>
  );
}
