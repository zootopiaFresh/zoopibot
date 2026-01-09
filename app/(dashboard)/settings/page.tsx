import { PreferenceForm } from '@/components/settings/preference-form';
import Link from 'next/link';
import { Book, Shield, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">설정</h1>
        <p className="text-gray-600 mb-6">
          SQL 생성 및 응답 스타일을 설정할 수 있습니다.
        </p>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">스타일 선호도</h2>
            <PreferenceForm />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">도메인 컨텍스트</h2>
            <p className="text-sm text-gray-600 mb-4">
              비즈니스 용어와 규칙을 설정하여 더 정확한 SQL을 생성합니다.
            </p>
            <div className="space-y-2">
              <Link
                href="/settings/terms"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Book className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">도메인 용어집</div>
                    <div className="text-sm text-gray-500">비즈니스 용어를 DB 컬럼에 매핑</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
              <Link
                href="/settings/rules"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">비즈니스 규칙</div>
                    <div className="text-sm text-gray-500">쿼리에 자동 적용할 조건 설정</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
