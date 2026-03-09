import { NextRequest, NextResponse } from 'next/server';
import { validateServiceToken, unauthorizedResponse } from '@/lib/service-auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { slackId: string } }
) {
  try {
    if (!validateServiceToken(req)) {
      return unauthorizedResponse();
    }

    const mapping = await prisma.slackUserMapping.findUnique({
      where: { slackUserId: params.slackId },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true, status: true },
        },
      },
    });

    if (!mapping) {
      return NextResponse.json(
        { error: '연결된 계정이 없습니다', linked: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      linked: true,
      userId: mapping.user.id,
      email: mapping.user.email,
      name: mapping.user.name,
      role: mapping.user.role,
      linkedAt: mapping.linkedAt,
    });
  } catch (error: any) {
    console.error('[v2/users/by-slack] Error:', error);
    return NextResponse.json({ error: error.message || '조회 실패' }, { status: 500 });
  }
}
