import { NextRequest, NextResponse } from 'next/server';
import { validateServiceToken, unauthorizedResponse } from '@/lib/service-auth';
import { executeQuery } from '@/lib/mysql';
import { logGenerationError } from '@/lib/error-logger';
import { z } from 'zod';

const requestSchema = z.object({
  sql: z.string().min(1).max(50000),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateServiceToken(req)) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { sql, userId } = requestSchema.parse(body);

    const result = await executeQuery(sql);

    return NextResponse.json({
      data: result.rows,
      columns: result.fields,
      rowCount: result.rows.length,
    });
  } catch (error: any) {
    console.error('[v2/execute] Error:', error);

    if (error.message?.includes('읽기 전용')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    logGenerationError({
      errorType: 'db_query_error',
      errorMessage: error.message,
    });

    return NextResponse.json({ error: error.message || 'SQL 실행 실패' }, { status: 500 });
  }
}
