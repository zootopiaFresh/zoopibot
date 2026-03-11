import { NextRequest, NextResponse } from 'next/server';
import { validateServiceToken, unauthorizedResponse, linkSlackUser } from '@/lib/service-auth';
import { z } from 'zod';

const requestSchema = z.object({
  slackUserId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateServiceToken(req)) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { slackUserId, email } = requestSchema.parse(body);

    const result = await linkSlackUser(slackUserId, email);

    if (result.error) {
      const status = result.error === 'User not found' ? 404 : 403;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      message: '계정이 연결되었습니다',
      userId: result.user!.id,
      email: result.user!.email,
      name: result.user!.name,
    });
  } catch (error: any) {
    console.error('[v2/users/link] Error:', error);
    return NextResponse.json({ error: error.message || '연결 실패' }, { status: 500 });
  }
}
