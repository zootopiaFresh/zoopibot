import { generatePresentation } from './claude';
import { executeQuery } from './mysql';
import { queryResultSnapshotSchema, type QueryResultSnapshot, type ReportPresentation } from './presentation';

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
  const presentation = await generatePresentation(question, sql, explanation, snapshot, sessionId);

  return {
    snapshot,
    presentation,
  };
}
