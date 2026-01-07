import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: 세션 상세 (메시지 포함)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: params.id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!chatSession) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ session: chatSession });
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ error: '세션 조회 실패' }, { status: 500 });
  }
}

// DELETE: 세션 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await prisma.chatSession.deleteMany({
      where: { id: params.id, userId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session delete error:', error);
    return NextResponse.json({ error: '세션 삭제 실패' }, { status: 500 });
  }
}
