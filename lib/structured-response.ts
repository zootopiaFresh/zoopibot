import { extractJsonObject } from './presentation';

export interface StructuredSqlResponse {
  sql: string;
  explanation: string;
  needsData: boolean;
  dataQuery: string;
}

export function looksLikeStructuredSqlPayload(text: string) {
  const trimmed = text.trim();
  const hasStructuredKeys = /"sql"\s*:|"explanation"\s*:|"needsData"\s*:|"dataQuery"\s*:/i.test(trimmed);

  if (!trimmed || !hasStructuredKeys) {
    return false;
  }

  if (/^```(?:json|javascript|js)?/i.test(trimmed)) {
    return true;
  }

  return /[\[{]/.test(trimmed);
}

function normalizeStructuredSqlResponse(
  value: Record<string, unknown>
): StructuredSqlResponse | null {
  const sql = typeof value.sql === 'string' ? value.sql : '';
  const explanation = typeof value.explanation === 'string' ? value.explanation : '';
  const needsData = value.needsData === true;
  const dataQuery = typeof value.dataQuery === 'string' ? value.dataQuery : '';

  if (!sql.trim() && !explanation.trim() && !dataQuery.trim()) {
    return null;
  }

  return {
    sql,
    explanation,
    needsData,
    dataQuery,
  };
}

function extractFullCodeFence(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:[a-z0-9_-]+)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? null;
}

function decodeLooseJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}

function recoverStructuredSqlResponse(text: string): StructuredSqlResponse | null {
  const explanationMatch = text.match(/"explanation"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const sqlMatch = text.match(/"sql"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const dataQueryMatch = text.match(/"dataQuery"\s*:\s*"((?:\\.|[^"\\])*)"/);
  const needsDataMatch = text.match(/"needsData"\s*:\s*(true|false)/i);

  if (!explanationMatch && !sqlMatch && !dataQueryMatch) {
    return null;
  }

  return {
    sql: sqlMatch ? decodeLooseJsonString(sqlMatch[1]) : '',
    explanation: explanationMatch ? decodeLooseJsonString(explanationMatch[1]) : '',
    needsData: needsDataMatch?.[1]?.toLowerCase() === 'true',
    dataQuery: dataQueryMatch ? decodeLooseJsonString(dataQueryMatch[1]) : '',
  };
}

export function parseStructuredSqlResponse(text: string) {
  const candidates = Array.from(
    new Set(
      [
        text.trim(),
        extractFullCodeFence(text),
        extractJsonObject(text),
      ].filter((value): value is string => Boolean(value && value.trim()))
    )
  );

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const normalized = normalizeStructuredSqlResponse(parsed);
      if (normalized) {
        return {
          response: normalized,
          strict: true,
        };
      }
    } catch {
      const recovered = recoverStructuredSqlResponse(candidate);
      if (recovered) {
        return {
          response: recovered,
          strict: false,
        };
      }
    }
  }

  return null;
}
