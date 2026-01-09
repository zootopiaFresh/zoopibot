import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const isProcessed = searchParams.get('isProcessed');

    // where 조건 구성
    const where: any = {};
    if (type && type !== 'all') {
      where.type = type;
    }
    if (isProcessed && isProcessed !== 'all') {
      where.isProcessed = isProcessed === 'true';
    }

    const [feedbacks, total] = await Promise.all([
      prisma.promptFeedback.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          feedback: true,
          type: true,
          isProcessed: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            }
          }
        }
      }),
      prisma.promptFeedback.count({ where }),
    ]);

    return NextResponse.json({
      feedbacks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Feedbacks fetch error:', error);
    return NextResponse.json({ error: '피드백 목록 조회 실패' }, { status: 500 });
  }
}

// 피드백 처리 상태 업데이트
export async function PATCH(req: NextRequest) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, isProcessed } = await req.json();

    if (!id) {
      return NextResponse.json({ error: '피드백 ID가 필요합니다' }, { status: 400 });
    }

    const feedback = await prisma.promptFeedback.update({
      where: { id },
      data: { isProcessed },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Feedback update error:', error);
    return NextResponse.json({ error: '피드백 업데이트 실패' }, { status: 500 });
  }
}
