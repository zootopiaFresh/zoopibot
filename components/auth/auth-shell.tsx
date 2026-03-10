'use client';

import type { ReactNode } from 'react';
import { Database, Shield, Sparkles } from 'lucide-react';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

const FEATURE_ITEMS = [
  {
    icon: Sparkles,
    title: '대화형 SQL 워크플로우',
    description: '질문부터 쿼리 초안, 설명, 피드백까지 한 화면에서 정리합니다.',
  },
  {
    icon: Database,
    title: '도메인 지식 반영',
    description: '용어집과 규칙을 반영해 실제 운영 데이터에 맞는 결과를 만듭니다.',
  },
  {
    icon: Shield,
    title: '관리자 승인 기반',
    description: '조직 계정과 권한을 분리해 안전하게 배포할 수 있습니다.',
  },
];

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,163,127,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,163,127,0.08),transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/85 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden overflow-hidden bg-[#202123] px-10 py-12 text-white xl:flex xl:flex-col xl:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,163,127,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80">
                <Sparkles className="h-4 w-4 text-[#10a37f]" />
                Zoopibot for SQL
              </div>
              <h1 className="mt-6 max-w-md text-4xl font-semibold tracking-tight">
                ChatGPT 계열 톤으로 정리한 SQL Assistant
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/68">
                녹색 포인트 컬러, 조용한 뉴트럴 배경, 대화 중심 레이아웃을 기준으로
                내부 운영 도구에 맞게 다듬었습니다.
              </p>
            </div>

            <div className="relative space-y-4">
              {FEATURE_ITEMS.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
                <div
                  key={itemTitle}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#10a37f]/15 text-[#7de2c4]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-medium text-white">{itemTitle}</h2>
                      <p className="mt-1 text-sm leading-6 text-white/65">{itemDescription}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="px-6 py-8 sm:px-10 sm:py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d8ebe4] bg-[#eefaf6] px-3 py-1 text-sm text-[#116149]">
                  <Sparkles className="h-4 w-4" />
                  Welcome back
                </div>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#202123]">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6e6e80]">{description}</p>
              </div>

              {children}

              <div className="mt-8 border-t border-[#e8ebe6] pt-6 text-sm text-[#6e6e80]">
                {footer}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
