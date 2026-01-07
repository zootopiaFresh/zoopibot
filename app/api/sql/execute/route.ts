import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/mysql';
import { z } from 'zod';

const requestSchema = z.object({
  sql: z.string().min(1).max(10000)
});

// POST: SQL 쿼리 실행 (SELECT만)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sql } = requestSchema.parse(body);

    const result = await executeQuery(sql);

    return NextResponse.json({
      success: true,
      rows: result.rows.slice(0, 100), // 최대 100개 행
      fields: result.fields,
      totalRows: result.rows.length,
      truncated: result.rows.length > 100
    });
  } catch (error: any) {
    console.error('SQL execution error:', error);
    return NextResponse.json(
      { error: error.message || '쿼리 실행 실패' },
      { status: 400 }
    );
  }
}
