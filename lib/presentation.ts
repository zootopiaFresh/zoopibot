import { z } from 'zod';

const fieldFormatSchema = z.enum([
  'text',
  'number',
  'currency',
  'percent',
  'date',
  'datetime',
]);

const tableColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  format: fieldFormatSchema.optional(),
});

const metricItemSchema = z.object({
  label: z.string().min(1),
  field: z.string().min(1),
  format: fieldFormatSchema.optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
});

const narrativeBlockSchema = z.object({
  type: z.literal('narrative'),
  title: z.string().min(1).max(80).optional(),
  body: z.string().min(1).max(2000),
});

const calloutBlockSchema = z.object({
  type: z.literal('callout'),
  tone: z.enum(['info', 'success', 'warning']),
  title: z.string().min(1).max(80).optional(),
  body: z.string().min(1).max(1000),
});

const metricRowBlockSchema = z.object({
  type: z.literal('metric-row'),
  title: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(300).optional(),
  items: z.array(metricItemSchema).min(1).max(6),
});

const tableBlockSchema = z.object({
  type: z.literal('table'),
  title: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(300).optional(),
  columns: z.array(tableColumnSchema).min(1).max(20),
  maxRows: z.number().int().min(1).max(100).optional(),
});

const vegaLiteBlockSchema = z.object({
  type: z.literal('vega-lite'),
  title: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(300).optional(),
  spec: z.record(z.any()),
});

export const reportBlockSchema = z.discriminatedUnion('type', [
  narrativeBlockSchema,
  calloutBlockSchema,
  metricRowBlockSchema,
  tableBlockSchema,
  vegaLiteBlockSchema,
]);

export const reportPresentationSchema = z.object({
  version: z.literal('v1').default('v1'),
  title: z.string().min(1).max(120),
  blocks: z.array(reportBlockSchema).min(1).max(6),
});

const queryFieldSchema = z.object({
  name: z.string().min(1),
});

const queryRowSchema = z.record(z.any());

export const queryResultSnapshotSchema = z.object({
  rows: z.array(queryRowSchema).max(100),
  fields: z.array(queryFieldSchema).min(1).max(50),
  totalRows: z.number().int().min(0),
  truncated: z.boolean(),
});

export type FieldFormat = z.infer<typeof fieldFormatSchema>;
export type TableColumn = z.infer<typeof tableColumnSchema>;
export type ReportBlock = z.infer<typeof reportBlockSchema>;
export type ReportPresentation = z.infer<typeof reportPresentationSchema>;
export type QueryResultSnapshot = z.infer<typeof queryResultSnapshotSchema>;

const directFieldLabelMap: Record<string, string> = {
  period: '기간',
  value: '값',
  category: '항목',
  user_id: '사용자 ID',
  userid: '사용자 ID',
  member_id: '회원 ID',
  order_id: '주문 ID',
  product_id: '상품 ID',
  item_id: '상품 ID',
  name: '이름',
  user_name: '사용자명',
  member_name: '회원명',
  handphone: '휴대폰 번호',
  phone: '전화번호',
  mobile: '휴대폰 번호',
  subscription_amt: '구독 금액',
  sign_date: '가입 일시',
  created_at: '생성 일시',
  createdat: '생성 일시',
  updated_at: '수정 일시',
  updatedat: '수정 일시',
  total: '합계',
  count: '건수',
  avg: '평균',
  rate: '비율',
  ratio: '비율',
  revenue: '매출',
  sales: '매출',
  amount: '금액',
  amt: '금액',
};

const tokenLabelMap: Record<string, string> = {
  user: '사용자',
  member: '회원',
  order: '주문',
  product: '상품',
  item: '상품',
  category: '항목',
  period: '기간',
  value: '값',
  total: '합계',
  count: '건수',
  avg: '평균',
  average: '평균',
  rate: '비율',
  ratio: '비율',
  revenue: '매출',
  sales: '매출',
  amount: '금액',
  amt: '금액',
  subscription: '구독',
  sign: '가입',
  created: '생성',
  updated: '수정',
  date: '일자',
  day: '일자',
  time: '시간',
  phone: '전화번호',
  handphone: '휴대폰 번호',
  mobile: '휴대폰 번호',
  status: '상태',
  type: '유형',
  name: '이름',
  id: 'ID',
};

function toNumericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/,/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isDateLike(value: unknown) {
  if (value instanceof Date) return true;
  if (typeof value !== 'string') return false;
  return !Number.isNaN(Date.parse(value));
}

function guessFormat(fieldName: string, sampleValue: unknown): FieldFormat {
  const normalized = fieldName.toLowerCase();
  if (normalized.includes('amt') || normalized.includes('price') || normalized.includes('amount') || normalized.includes('revenue') || normalized.includes('sales')) {
    return 'currency';
  }
  if (normalized.includes('rate') || normalized.includes('ratio') || normalized.includes('pct') || normalized.includes('percent')) {
    return 'percent';
  }
  if (sampleValue instanceof Date) {
    return 'datetime';
  }
  if (typeof sampleValue === 'string' && isDateLike(sampleValue)) {
    return sampleValue.includes(':') ? 'datetime' : 'date';
  }
  if (typeof sampleValue === 'number') {
    return 'number';
  }
  return 'text';
}

function containsHangul(value: string) {
  return /[가-힣]/.test(value);
}

export function toPreferredLabel(fieldName: string): string {
  if (!fieldName) return fieldName;
  if (containsHangul(fieldName)) return fieldName;

  const normalized = fieldName.trim();
  const lower = normalized.toLowerCase();

  if (directFieldLabelMap[lower]) {
    return directFieldLabelMap[lower];
  }

  const tokens = normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return normalized;
  }

  const mappedTokens = tokens.map((token) => {
    const tokenLower = token.toLowerCase();
    return tokenLabelMap[tokenLower] ?? token.toUpperCase();
  });

  return mappedTokens.join(' ');
}

function fieldLooksLikeIdentifier(fieldName: string) {
  return /(id|email|mail|phone|handphone|mobile|code|token|uuid|name)$/i.test(fieldName);
}

function fieldLooksLikeTime(fieldName: string) {
  return /(date|day|week|month|year|time|at|period)$/i.test(fieldName);
}

function buildTableBlock(snapshot: QueryResultSnapshot, title?: string): ReportBlock {
  return {
    type: 'table',
    title: title ?? '조회 결과',
    columns: snapshot.fields.map((field) => ({
      key: field.name,
      label: toPreferredLabel(field.name),
      format: guessFormat(field.name, snapshot.rows[0]?.[field.name]),
    })),
    maxRows: Math.min(snapshot.rows.length || 20, 20),
    description: `${snapshot.totalRows.toLocaleString('ko-KR')}행${snapshot.truncated ? ' 중 상위 100행을 저장했습니다.' : ' 결과입니다.'}`,
  };
}

function buildChartSpec(
  snapshot: QueryResultSnapshot,
  xField: string,
  yField: string,
  mark: 'line' | 'bar'
) {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 320,
    mark: mark === 'line'
      ? { type: 'line', point: true, interpolate: 'monotone' }
      : { type: 'bar', cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 },
    encoding: {
      x: {
        field: xField,
        type: mark === 'line' || fieldLooksLikeTime(xField) || isDateLike(snapshot.rows[0]?.[xField]) ? 'temporal' : 'nominal',
        title: toPreferredLabel(xField),
        axis: { labelAngle: mark === 'bar' ? -20 : 0 },
      },
      y: {
        field: yField,
        type: 'quantitative',
        title: toPreferredLabel(yField),
      },
      tooltip: [
        { field: xField, type: 'nominal', title: toPreferredLabel(xField) },
        { field: yField, type: 'quantitative', title: toPreferredLabel(yField) },
      ],
    },
  };
}

export function buildFallbackPresentation(
  question: string,
  explanation: string,
  snapshot: QueryResultSnapshot
): ReportPresentation {
  const title = question.length > 40 ? `${question.slice(0, 40)}...` : question;
  const rows = snapshot.rows;
  const fields = snapshot.fields;
  const blocks: ReportBlock[] = [];

  if (explanation.trim()) {
    blocks.push({
      type: 'narrative',
      title: '요약',
      body: explanation.trim(),
    });
  }

  if (rows.length === 0) {
    blocks.push({
      type: 'callout',
      tone: 'info',
      title: '조회 결과 없음',
      body: '조건에 맞는 데이터가 없습니다.',
    });
    return {
      version: 'v1',
      title,
      blocks,
    };
  }

  const numericFields = fields.filter((field) =>
    rows.some((row) => toNumericValue(row[field.name]) !== null) &&
    rows.every((row) => row[field.name] === null || row[field.name] === undefined || toNumericValue(row[field.name]) !== null)
  );
  const dimensionFields = fields.filter((field) => !numericFields.some((numericField) => numericField.name === field.name));

  if (rows.length === 1 && numericFields.length > 0) {
    blocks.push({
      type: 'metric-row',
      title: '핵심 지표',
      items: numericFields.slice(0, 4).map((field) => ({
        label: toPreferredLabel(field.name),
        field: field.name,
        format: guessFormat(field.name, rows[0][field.name]),
      })),
    });
  } else if (numericFields.length === 1 && dimensionFields.length >= 1 && rows.length >= 2 && rows.length <= 20) {
    const xField = dimensionFields[0];
    const yField = numericFields[0];
    const identifierHeavy = fieldLooksLikeIdentifier(xField.name) || rows.some((row) => {
      const value = row[xField.name];
      return typeof value === 'string' && value.length > 18;
    });

    if (!identifierHeavy) {
      blocks.push({
        type: 'vega-lite',
        title: fieldLooksLikeTime(xField.name) || isDateLike(rows[0]?.[xField.name]) ? '추이' : '비교',
        description: `${toPreferredLabel(xField.name)} 기준 ${toPreferredLabel(yField.name)}`,
        spec: buildChartSpec(
          snapshot,
          xField.name,
          yField.name,
          fieldLooksLikeTime(xField.name) || isDateLike(rows[0]?.[xField.name]) ? 'line' : 'bar'
        ),
      });
    }
  }

  blocks.push(buildTableBlock(snapshot));

  return {
    version: 'v1',
    title,
    blocks,
  };
}

export function parseStoredPresentation(raw: string | null | undefined): ReportPresentation | null {
  if (!raw) return null;

  try {
    return reportPresentationSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function parseStoredQueryResult(raw: string | null | undefined): QueryResultSnapshot | null {
  if (!raw) return null;

  try {
    return queryResultSnapshotSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function serializePresentation(presentation: ReportPresentation | null | undefined) {
  return presentation ? JSON.stringify(presentation) : null;
}

export function serializeQueryResult(snapshot: QueryResultSnapshot | null | undefined) {
  return snapshot ? JSON.stringify(snapshot) : null;
}

export function extractJsonObject(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (fenced?.[1]) {
    return fenced[1];
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  return objectMatch?.[0] ?? text;
}
