import { prisma } from './db';
import { generatePresentation } from './claude';
import { executeQuery } from './mysql';
import {
  parseStoredPresentation,
  queryResultSnapshotSchema,
  type QueryResultSnapshot,
  type ReportPresentation,
} from './presentation';

async function getPreviousPresentation(sessionId?: string): Promise<ReportPresentation | undefined> {
  if (!sessionId) {
    return undefined;
  }

  const latestAssistantMessage = await prisma.chatMessage.findFirst({
    where: {
      sessionId,
      role: 'assistant',
      presentation: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: { presentation: true },
  });

  return parseStoredPresentation(latestAssistantMessage?.presentation) ?? undefined;
}

function buildSnapshotFromQueryResult(
  rows: any[],
  fields: any[]
): QueryResultSnapshot {
  return queryResultSnapshotSchema.parse({
    rows: rows.slice(0, 100),
    fields,
    totalRows: rows.length,
    truncated: rows.length > 100,
  });
}

export async function buildPresentationFromQueryResult(
  question: string,
  sql: string,
  explanation: string,
  queryResult: { rows: any[]; fields: any[] },
  sessionId?: string
): Promise<{ snapshot: QueryResultSnapshot; presentation: ReportPresentation }> {
  const snapshot = buildSnapshotFromQueryResult(queryResult.rows, queryResult.fields);
  const previousPresentation = await getPreviousPresentation(sessionId);
  const presentation = await generatePresentation(
    question,
    sql,
    explanation,
    snapshot,
    sessionId,
    previousPresentation
  );

  return {
    snapshot,
    presentation,
  };
}

export async function buildPresentationFromSQL(
  question: string,
  sql: string,
  explanation: string,
  sessionId?: string
): Promise<{ snapshot: QueryResultSnapshot; presentation: ReportPresentation }> {
  const result = await executeQuery(sql);
  return buildPresentationFromQueryResult(question, sql, explanation, result, sessionId);
}
