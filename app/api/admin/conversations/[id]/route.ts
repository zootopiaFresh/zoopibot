import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            sql: true,
            createdAt: true
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Conversation detail fetch error:', error);
    return NextResponse.json({ error: '대화 상세 조회 실패' }, { status: 500 });
  }
}
