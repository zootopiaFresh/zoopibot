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

export async function buildPresentationFromSQL(
  question: string,
  sql: string,
  explanation: string,
  sessionId?: string
): Promise<{ snapshot: QueryResultSnapshot; presentation: ReportPresentation }> {
  const result = await executeQuery(sql);
  const snapshot = queryResultSnapshotSchema.parse({
    rows: result.rows.slice(0, 100),
    fields: result.fields,
    totalRows: result.rows.length,
    truncated: result.rows.length > 100,
  });
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
