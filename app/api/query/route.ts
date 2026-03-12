import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateSQLWithRecovery } from '@/lib/query-orchestrator';
import { z } from 'zod';

const requestSchema = z.object({
  prompt: z.string().min(1).max(10000)
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt } = requestSchema.parse(body);

    const userId = (session.user as any).id;

    const { result } = await generateSQLWithRecovery({
      question: prompt,
      userId,
    });

    // 히스토리 저장
    await prisma.history.create({
      data: {
        type: 'query',
        input: prompt,
        output: JSON.stringify({
          sql: result.sql,
          explanation: result.explanation
        }),
        metadata: JSON.stringify({
          usage: result.usage
        }),
        userId
      }
    });

    return NextResponse.json({
      success: true,
      sql: result.sql,
      explanation: result.explanation,
      usage: result.usage
    });
  } catch (error) {
    console.error('Query generation error:', error);
    return NextResponse.json(
      { error: '쿼리 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
