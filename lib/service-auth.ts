import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';

const SERVICE_TOKEN = process.env.ZOOPIBOT_SERVICE_TOKEN;

/**
 * 서비스 토큰 검증 (OpenClaw → Zoopibot 간 내부 통신용)
 */
export function validateServiceToken(req: NextRequest): boolean {
  if (!SERVICE_TOKEN) {
    console.error('[ServiceAuth] ZOOPIBOT_SERVICE_TOKEN is not set');
    return false;
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice(7);
  return token === SERVICE_TOKEN;
}

/**
 * 서비스 인증 실패 응답
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized: Invalid service token' },
    { status: 401 }
  );
}

/**
 * Slack User ID로 Zoopibot User ID 조회
 */
export async function getUserIdBySlackId(slackUserId: string): Promise<string | null> {
  const mapping = await prisma.slackUserMapping.findUnique({
    where: { slackUserId },
  });
  return mapping?.userId ?? null;
}

/**
 * Slack 사용자 매핑 생성
 */
export async function linkSlackUser(slackUserId: string, email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, status: true },
  });

  if (!user) {
    return { error: 'User not found', user: null };
  }

  if (user.status !== 'active') {
    return { error: 'User is not active', user: null };
  }

  const mapping = await prisma.slackUserMapping.upsert({
    where: { slackUserId },
    update: { userId: user.id },
    create: { slackUserId, userId: user.id },
  });

  return { error: null, user, mapping };
}
