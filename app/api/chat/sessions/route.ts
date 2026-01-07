import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET: 세션 목록 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: { content: true }
        }
      }
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json({ error: '세션 조회 실패' }, { status: 500 });
  }
}

// POST: 새 세션 생성
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const chatSession = await prisma.chatSession.create({
      data: { userId }
    });

    return NextResponse.json({ session: chatSession });
  } catch (error) {
    console.error('Session create error:', error);
    return NextResponse.json({ error: '세션 생성 실패' }, { status: 500 });
  }
}
