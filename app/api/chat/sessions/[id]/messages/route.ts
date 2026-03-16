import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getConversationRuntime } from '@/lib/conversation/runtime-instance';
import { serializeConversationMessage } from '@/lib/conversation/legacy-message';
import { z } from 'zod';

export const runtime = 'nodejs';

const requestSchema = z.object({
  content: z.string().min(1).max(10000),
  autoExecute: z.boolean().default(true),
});

// POST: 메시지 추가 및 응답 생성
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { content, autoExecute } = requestSchema.parse(body);

    // 세션 확인
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    });

    if (!chatSession) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
    }

    const runtime = getConversationRuntime();
    const ack = await runtime.thread(params.id).start({
      input: content,
      agentId: 'zoopibot-query',
      meta: {
        autoExecute,
        userId,
      },
    });

    return NextResponse.json({
      userMessage: serializeConversationMessage(ack.inputMessage),
      assistantMessage: serializeConversationMessage(ack.outputMessage),
    });
  } catch (error) {
    console.error('Message create error:', error);
    return NextResponse.json({ error: '메시지 처리 실패' }, { status: 500 });
  }
}
