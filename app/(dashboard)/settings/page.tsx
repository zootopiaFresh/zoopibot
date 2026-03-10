import { PreferenceForm } from '@/components/settings/preference-form';
import Link from 'next/link';
import { Book, Shield, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(16,163,127,0.08),transparent_24%),linear-gradient(180deg,#fbfbf8_0%,#f6f7f2_100%)] p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="mb-2 text-2xl font-bold text-[#202123]">설정</h1>
        <p className="mb-6 text-[#6e6e80]">
          SQL 생성 및 응답 스타일을 설정할 수 있습니다.
        </p>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#e6e9e3] bg-white/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <h2 className="mb-4 text-lg font-semibold text-[#202123]">스타일 선호도</h2>
            <PreferenceForm />
          </div>

          <div className="rounded-2xl border border-[#e6e9e3] bg-white/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <h2 className="mb-4 text-lg font-semibold text-[#202123]">도메인 컨텍스트</h2>
            <p className="mb-4 text-sm text-[#6e6e80]">
              비즈니스 용어와 규칙을 설정하여 더 정확한 SQL을 생성합니다.
            </p>
            <div className="space-y-2">
              <Link
                href="/settings/terms"
                className="flex items-center justify-between rounded-2xl border border-transparent bg-[#f6f7f3] p-4 transition-colors hover:border-[#d8ebe4] hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#eefaf6] p-2">
                    <Book className="h-5 w-5 text-[#10a37f]" />
                  </div>
                  <div>
                    <div className="font-medium text-[#202123]">도메인 용어집</div>
                    <div className="text-sm text-[#6e6e80]">비즈니스 용어를 DB 컬럼에 매핑</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9aa0a6]" />
              </Link>
              <Link
                href="/settings/rules"
                className="flex items-center justify-between rounded-2xl border border-transparent bg-[#f6f7f3] p-4 transition-colors hover:border-[#d8ebe4] hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#eefaf6] p-2">
                    <Shield className="h-5 w-5 text-[#10a37f]" />
                  </div>
                  <div>
                    <div className="font-medium text-[#202123]">비즈니스 규칙</div>
                    <div className="text-sm text-[#6e6e80]">쿼리에 자동 적용할 조건 설정</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9aa0a6]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
