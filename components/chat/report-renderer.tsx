'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  FieldFormat,
  QueryResultSnapshot,
  ReportPresentation,
} from '@/lib/presentation';
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

const markdownBodyClassName =
  'prose prose-neutral max-w-none text-sm leading-7 text-[#4b5563] prose-p:my-0 prose-p:leading-7 prose-headings:my-0 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-strong:text-[#111827] prose-code:rounded prose-code:bg-[#f3f4f6] prose-code:px-1 prose-code:py-0.5 prose-code:text-[#111827] prose-code:before:content-none prose-code:after:content-none';

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

function buildAutoMetrics(snapshot: QueryResultSnapshot) {
  const numericFields = snapshot.fields.filter((field) =>
    snapshot.rows.every((row) => {
      const value = row[field.name];
      return value === null || value === undefined || typeof value === 'number';
    })
  );

  if (numericFields.length !== 1 || snapshot.rows.length < 2) {
    return [];
  }

  const valueField = numericFields[0].name;
  const values = snapshot.rows
    .map((row) => row[valueField])
    .filter((value): value is number => typeof value === 'number');

  if (values.length === 0) {
    return [];
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  const average = total / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  return [
    { label: '합계', value: total, format: 'number' as const, tone: 'default' as const },
    { label: '평균', value: average, format: 'number' as const, tone: 'default' as const },
    { label: '최고', value: max, format: 'number' as const, tone: 'success' as const },
    { label: '최저', value: min, format: 'number' as const, tone: 'warning' as const },
  ];
}

function ChartBlock({
  spec,
  snapshot,
}: {
  spec: Record<string, unknown>;
  snapshot: QueryResultSnapshot;
}) {
  const config = resolveChartConfig(spec as Record<string, any>);

  if (!config) {
    return (
      <div className="rounded-xl border border-dashed border-[#d1d5db] bg-[#f9fafb] px-4 py-10 text-sm text-[#6b7280]">
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
    <div className="h-56 w-full min-w-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        {isBar ? (
          <BarChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={xField}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              label={{ value: xTitle, position: 'insideBottom', offset: -4 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              label={{ value: yTitle, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip formatter={(value) => formatValue(value)} />
            <Bar dataKey={yField} fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={rows} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={xField}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              label={{ value: xTitle, position: 'insideBottom', offset: -4 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              label={{ value: yTitle, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip formatter={(value) => formatValue(value)} />
            <Line
              type="monotone"
              dataKey={yField}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function ReportRenderer({
  presentation,
  snapshot,
  bodyMarkdown,
}: {
  presentation: ReportPresentation;
  snapshot: QueryResultSnapshot;
  bodyMarkdown?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showTable, setShowTable] = useState(true);
  const [showNotes, setShowNotes] = useState(true);

  const metricBlocks = presentation.blocks.filter((block) => block.type === 'metric-row');
  const narrativeBlocks = presentation.blocks.filter((block) => block.type === 'narrative');
  const chartBlocks = presentation.blocks.filter((block) => block.type === 'vega-lite');
  const tableBlocks = presentation.blocks.filter((block) => block.type === 'table');
  const noteBlocks = presentation.blocks.filter((block) => block.type === 'callout');
  const autoMetrics = metricBlocks.length === 0 ? buildAutoMetrics(snapshot) : [];

  const handleCopyCsv = async () => {
    await navigator.clipboard.writeText(buildCsv(snapshot));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h3 className="text-base font-medium text-[#111827]">{presentation.title}</h3>
            <p className="text-sm text-[#6b7280]">결과 {snapshot.totalRows.toLocaleString('ko-KR')}행</p>
          </div>

          <button
            type="button"
            onClick={handleCopyCsv}
            className="text-sm text-[#4b5563] transition-colors hover:text-[#111827]"
          >
            {copied ? '복사됨!' : 'CSV 복사'}
          </button>
        </div>

        {metricBlocks.length > 0 ? (
          <div className="grid gap-3 px-5 pb-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricBlocks.flatMap((block) => block.items).slice(0, 4).map((item) => {
              const value = snapshot.rows[0]?.[item.field];

              return (
                <div key={item.field} className="rounded-lg bg-[#f9fafb] p-3 text-center">
                  <p className="text-xs text-[#6b7280]">{item.label}</p>
                  <p className="mt-0.5 text-lg font-semibold text-[#111827]">
                    {item.prefix ?? ''}
                    {formatValue(value, item.format)}
                    {item.suffix ?? ''}
                  </p>
                </div>
              );
            })}
          </div>
        ) : autoMetrics.length > 0 ? (
          <div className="grid gap-3 px-5 pb-3 sm:grid-cols-2 xl:grid-cols-4">
            {autoMetrics.map((item) => (
              <div
                key={item.label}
                className={`rounded-lg p-3 text-center ${
                  item.tone === 'success'
                    ? 'bg-emerald-50'
                    : item.tone === 'warning'
                      ? 'bg-orange-50'
                      : 'bg-[#f9fafb]'
                }`}
              >
                <p className={`text-xs ${
                  item.tone === 'success'
                    ? 'text-emerald-600'
                    : item.tone === 'warning'
                      ? 'text-orange-600'
                      : 'text-[#6b7280]'
                }`}>
                  {item.label}
                </p>
                <p className={`mt-0.5 text-lg font-semibold ${
                  item.tone === 'success'
                    ? 'text-emerald-700'
                    : item.tone === 'warning'
                      ? 'text-orange-700'
                      : 'text-[#111827]'
                }`}>
                  {formatValue(item.value, item.format)}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {(narrativeBlocks.length > 0 || bodyMarkdown) ? (
          <div className="px-5 pb-4">
            <h4 className="mb-2 text-sm font-medium text-[#111827]">요약</h4>
            <div className="space-y-4 text-sm leading-7 text-[#4b5563]">
              {narrativeBlocks.map((block, index) => (
                <div key={`${block.title ?? 'narrative'}-${index}`}>
                  {block.title && block.title !== '요약' ? (
                    <p className="mb-2 text-sm font-medium text-[#111827]">{block.title}</p>
                  ) : null}
                  <div className={markdownBodyClassName}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {block.body}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}

              {narrativeBlocks.length === 0 && bodyMarkdown ? (
                <div className={markdownBodyClassName}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {bodyMarkdown}
                  </ReactMarkdown>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {chartBlocks.map((block, index) => (
          <div key={`${block.title ?? 'chart'}-${index}`} className="px-5 pb-4">
            <h4 className="mb-1 text-sm font-medium text-[#111827]">{block.title || '추이'}</h4>
            <p className="mb-3 text-xs text-[#6b7280]">
              {block.description || '기간 기준 값'}
            </p>
            <ChartBlock spec={block.spec} snapshot={snapshot} />
          </div>
        ))}

        {tableBlocks.map((block, index) => (
          <div key={`${block.title ?? 'table'}-${index}`} className="px-5 pb-4">
            <button
              type="button"
              onClick={() => setShowTable((prev) => !prev)}
              className="mb-2 flex items-center gap-1.5"
            >
              <h4 className="text-sm font-medium text-[#111827]">{block.title || '조회 결과'}</h4>
              <span className="text-xs text-[#6b7280]">
                {block.description || `${snapshot.totalRows.toLocaleString('ko-KR')}행 결과입니다.`}
              </span>
              {showTable ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#6b7280]" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#6b7280]" />
              )}
            </button>

            {showTable ? (
              <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                      {block.columns.map((column) => (
                        <th
                          key={column.key}
                          className="px-4 py-2.5 text-left text-xs text-[#6b7280]"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.rows.slice(0, block.maxRows ?? 20).map((row, rowIndex) => (
                      <tr
                        key={`${rowIndex}-${block.columns[0]?.key ?? 'row'}`}
                        className="border-b border-[#eef2f7] last:border-0"
                      >
                        {block.columns.map((column) => (
                          <td key={column.key} className="whitespace-nowrap px-4 py-2.5 text-[#111827]">
                            {formatValue(row[column.key], column.format)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ))}

        {noteBlocks.length > 0 ? (
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => setShowNotes((prev) => !prev)}
              className="mb-2 flex items-center gap-1.5"
            >
              <h4 className="text-sm font-medium text-[#111827]">주의사항</h4>
              {showNotes ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#6b7280]" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#6b7280]" />
              )}
            </button>

            {showNotes ? (
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-[#6b7280]">
                {noteBlocks.map((block, index) => (
                  <li key={`${block.title ?? 'note'}-${index}`}>
                    {block.title ? <span className="font-medium text-[#111827]">{block.title}</span> : null}
                    <div className={block.title ? `mt-1 ${markdownBodyClassName}` : markdownBodyClassName}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {block.body}
                      </ReactMarkdown>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
