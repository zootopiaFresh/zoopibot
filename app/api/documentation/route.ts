import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateDocumentation } from '@/lib/claude';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const requestSchema = z.object({
  code: z.string().min(1).max(50000),
  type: z.enum(['explanation', 'docstring', 'readme']),
  language: z.string().default('javascript')
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, type, language } = requestSchema.parse(body);

    const result = await generateDocumentation(code, type, language);

    // 히스토리 저장
    const userId = (session.user as any).id;
    await prisma.history.create({
      data: {
        type: 'documentation',
        input: code,
        output: result.result,
        metadata: JSON.stringify({
          documentationType: type,
          language,
          usage: result.usage
        }),
        userId
      }
    });

    return NextResponse.json({
      success: true,
      result: result.result,
      usage: result.usage
    });
  } catch (error) {
    console.error('Documentation error:', error);
    return NextResponse.json(
      { error: '문서 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
