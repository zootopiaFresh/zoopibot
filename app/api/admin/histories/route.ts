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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // where 조건 구성
    const where: any = {};
    if (type && type !== 'all') {
      where.type = type;
    }
    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }

    const [histories, total] = await Promise.all([
      prisma.history.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          input: true,
          output: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      }),
      prisma.history.count({ where }),
    ]);

    return NextResponse.json({
      histories,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Histories fetch error:', error);
    return NextResponse.json({ error: '히스토리 조회 실패' }, { status: 500 });
  }
}
