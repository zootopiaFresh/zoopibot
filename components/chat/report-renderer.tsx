'use client';

import { useState } from 'react';
import type { QueryResultSnapshot, ReportPresentation, ReportBlock, FieldFormat } from '@/lib/presentation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function formatValue(value: unknown, format?: FieldFormat) {
  if (value === null || value === undefined) return 'NULL';

  if (format === 'currency') {
    const amount = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}원` : String(value);
  }

  if (format === 'percent') {
    const ratio = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(ratio)) return String(value);
    const normalized = Math.abs(ratio) <= 1 ? ratio * 100 : ratio;
    return `${normalized.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
  }

  if (format === 'number' && typeof value === 'number') {
    return value.toLocaleString('ko-KR');
  }

  if ((format === 'date' || format === 'datetime') && typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return format === 'date'
        ? date.toLocaleDateString('ko-KR')
        : date.toLocaleString('ko-KR');
    }
  }

  if (typeof value === 'number') {
    return value.toLocaleString('ko-KR', {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    });
  }

  return String(value);
}

function buildCsv(snapshot: QueryResultSnapshot) {
  const escapeValue = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  return [
    snapshot.fields.map((field) => escapeValue(field.name)).join(','),
    ...snapshot.rows.map((row) => snapshot.fields.map((field) => escapeValue(row[field.name])).join(',')),
  ].join('\n');
}

function resolveChartConfig(spec: Record<string, any>) {
  const mark = typeof spec?.mark === 'string' ? spec.mark : spec?.mark?.type;
  const xField = spec?.encoding?.x?.field;
  const yField = spec?.encoding?.y?.field;
  const xTitle = spec?.encoding?.x?.title || xField;
  const yTitle = spec?.encoding?.y?.title || yField;

  if (!xField || !yField || !mark) {
    return null;
  }

  return {
    mark,
    xField,
    yField,
    xTitle,
    yTitle,
  };
}

function VegaLiteChart({
  spec,
  snapshot,
}: {
  spec: Record<string, unknown>;
  snapshot: QueryResultSnapshot;
}) {
  const config = resolveChartConfig(spec as Record<string, any>);

  if (!config) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500">
        차트 설정을 해석하지 못해 표로 확인해주세요.
      </div>
    );
  }

  const { mark, xField, yField, xTitle, yTitle } = config;
  const rows = snapshot.rows.map((row) => ({
    ...row,
    [xField]: formatValue(row[xField]),
  }));
  const isBar = mark === 'bar';

  return (
    <div className="h-80 w-full min-w-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        {isBar ? (
          <BarChart data={rows} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xField} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} label={{ value: xTitle, position: 'insideBottom', offset: -4 }} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} label={{ value: yTitle, angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => formatValue(value)} />
            <Bar dataKey={yField} fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={rows} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={xField} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} label={{ value: xTitle, position: 'insideBottom', offset: -4 }} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} label={{ value: yTitle, angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => formatValue(value)} />
            <Line type="monotone" dataKey={yField} stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 6 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function blockKey(block: ReportBlock, index: number) {
  return `${block.type}-${block.title ?? 'untitled'}-${index}`;
}

export function ReportRenderer({
  presentation,
  snapshot,
}: {
  presentation: ReportPresentation;
  snapshot: QueryResultSnapshot;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyCsv = async () => {
    await navigator.clipboard.writeText(buildCsv(snapshot));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{presentation.title}</h3>
            <p className="mt-1 text-xs text-gray-500">
              결과 {snapshot.totalRows.toLocaleString('ko-KR')}행{snapshot.truncated ? ' · 상위 100행 저장' : ''}
            </p>
          </div>
          <button
            onClick={handleCopyCsv}
            className={`text-xs transition-colors ${
              copied ? 'text-green-600' : 'text-indigo-600 hover:text-indigo-700'
            }`}
          >
            {copied ? 'CSV 복사됨' : 'CSV 복사'}
          </button>
        </div>
      </div>

      {presentation.blocks.map((block, index) => {
        if (block.type === 'narrative') {
          return (
            <section key={blockKey(block, index)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              {block.title && <h4 className="text-sm font-semibold text-gray-900">{block.title}</h4>}
              <p className={`text-sm leading-6 text-gray-700 ${block.title ? 'mt-2' : ''}`}>{block.body}</p>
            </section>
          );
        }

        if (block.type === 'callout') {
          const tones = {
            info: 'border-sky-200 bg-sky-50 text-sky-900',
            success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
            warning: 'border-amber-200 bg-amber-50 text-amber-900',
          };

          return (
            <section key={blockKey(block, index)} className={`rounded-2xl border p-4 ${tones[block.tone]}`}>
              {block.title && <h4 className="text-sm font-semibold">{block.title}</h4>}
              <p className={`text-sm leading-6 ${block.title ? 'mt-1' : ''}`}>{block.body}</p>
            </section>
          );
        }

        if (block.type === 'metric-row') {
          return (
            <section key={blockKey(block, index)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              {block.title && <h4 className="text-sm font-semibold text-gray-900">{block.title}</h4>}
              {block.description && <p className="mt-1 text-sm text-gray-500">{block.description}</p>}
              <div className={`grid gap-3 ${block.items.length >= 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2'}`}>
                {block.items.map((item) => {
                  const value = snapshot.rows[0]?.[item.field];
                  return (
                    <div key={item.field} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-indigo-500">{item.label}</div>
                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {item.prefix ?? ''}
                        {formatValue(value, item.format)}
                        {item.suffix ?? ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        if (block.type === 'vega-lite') {
          return (
            <section key={blockKey(block, index)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              {block.title && <h4 className="text-sm font-semibold text-gray-900">{block.title}</h4>}
              {block.description && <p className="mt-1 text-sm text-gray-500">{block.description}</p>}
              <div className="mt-4 overflow-x-auto">
                <VegaLiteChart spec={block.spec} snapshot={snapshot} />
              </div>
            </section>
          );
        }

        return (
          <section key={blockKey(block, index)} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              {block.title && <h4 className="text-sm font-semibold text-gray-900">{block.title}</h4>}
              {block.description && <p className="mt-1 text-sm text-gray-500">{block.description}</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {block.columns.map((column) => (
                      <th key={column.key} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {snapshot.rows.slice(0, block.maxRows ?? 20).map((row, rowIndex) => (
                    <tr key={`${rowIndex}-${block.columns[0]?.key ?? 'row'}`} className="hover:bg-gray-50">
                      {block.columns.map((column) => (
                        <td key={column.key} className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {formatValue(row[column.key], column.format)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
