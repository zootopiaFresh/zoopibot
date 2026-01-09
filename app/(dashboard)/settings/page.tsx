import { PreferenceForm } from '@/components/settings/preference-form';

export default function SettingsPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">설정</h1>
        <p className="text-gray-600 mb-6">
          SQL 생성 및 응답 스타일을 설정할 수 있습니다.
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">스타일 선호도</h2>
          <PreferenceForm />
        </div>
      </div>
    </div>
  );
}
