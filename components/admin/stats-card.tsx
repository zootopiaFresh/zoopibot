'use client';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: number; isUp: boolean };
  subtitle?: string;
}

export function StatsCard({ title, value, icon, trend, subtitle }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-[#e6e9e3] bg-white/90 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isUp ? (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trend.value}%
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-[#eefaf6] p-3 text-[#10a37f]">
          {icon}
        </div>
      </div>
    </div>
  );
}
