'use client';

import type { ReactNode } from 'react';
import { Bot } from 'lucide-react';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f7f8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,163,127,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,163,127,0.08),transparent_22%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(247,247,248,0.94))]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dce8e3] bg-white px-3 py-1 text-sm text-[#4f5b58] shadow-sm">
              <Bot className="h-4 w-4 text-indigo-600" />
              Zoopibot
            </div>
            <h2 className="mt-6 text-[2rem] font-semibold tracking-[-0.04em] text-[#202123] sm:text-[2.25rem]">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#6e6e80]">{description}</p>
          </div>

          <div className="rounded-[28px] border border-[#e5e7eb] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.06)] sm:p-7">
            {children}
          </div>

          <div className="mt-6 text-center text-sm text-[#6e6e80]">{footer}</div>
        </div>
      </div>
    </div>
  );
}
