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
    const errorType = searchParams.get('errorType');
    const days = parseInt(searchParams.get('days') || '7');

    // 기간 필터
    const since = new Date();
    since.setDate(since.getDate() - days);

    // where 조건 구성
    const where: any = {
      createdAt: { gte: since },
    };
    if (errorType && errorType !== 'all') {
      where.errorType = errorType;
    }

    const [errors, total, stats] = await Promise.all([
      prisma.generationError.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          errorType: true,
          errorMessage: true,
          userId: true,
          sessionId: true,
          prompt: true,
          createdAt: true,
        }
      }),
      prisma.generationError.count({ where }),
      // 에러 타입별 통계
      prisma.generationError.groupBy({
        by: ['errorType'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      errors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats.map(s => ({
        type: s.errorType,
        count: s._count.id,
      })),
    });
  } catch (error) {
    console.error('Errors fetch error:', error);
    return NextResponse.json({ error: '에러 로그 조회 실패' }, { status: 500 });
  }
}

// 에러 상세 조회
export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: '에러 ID가 필요합니다' }, { status: 400 });
    }

    const error = await prisma.generationError.findUnique({
      where: { id },
    });

    if (!error) {
      return NextResponse.json({ error: '에러를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ error });
  } catch (error) {
    console.error('Error detail fetch error:', error);
    return NextResponse.json({ error: '에러 상세 조회 실패' }, { status: 500 });
  }
}

// 에러 로그 삭제 (오래된 로그 정리)
export async function DELETE(req: NextRequest) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');

    const before = new Date();
    before.setDate(before.getDate() - days);

    const result = await prisma.generationError.deleteMany({
      where: { createdAt: { lt: before } },
    });

    return NextResponse.json({
      message: `${result.count}개의 오래된 에러 로그가 삭제되었습니다`,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error delete error:', error);
    return NextResponse.json({ error: '에러 로그 삭제 실패' }, { status: 500 });
  }
}
