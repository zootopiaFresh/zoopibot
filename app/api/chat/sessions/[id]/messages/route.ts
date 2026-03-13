import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CHAT_MESSAGE_STATUS, serializeChatMessage } from '@/lib/chat-message';
import { emitChatSessionEvent } from '@/lib/chat-events';
import { runChatMessageGeneration } from '@/lib/chat-runner';
import { z } from 'zod';

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
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!chatSession) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
    }

    // 사용자 메시지 저장
    const userMessage = await prisma.chatMessage.create({
      data: {
        role: 'user',
        content,
        sessionId: params.id,
      }
    });

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: [
          '[run] 질문 접수 - 요청을 등록했습니다.',
          '[todo] 관련 스키마 탐색',
          '[todo] SQL 검증 및 결과 확인',
          '[todo] 리포트 정리',
        ].join('\n'),
        sessionId: params.id,
        status: CHAT_MESSAGE_STATUS.PENDING,
      }
    });

    // 대화 히스토리 준비
    const history = [
      ...chatSession.messages.map((msg: { role: string; content: string; sql: string | null }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        sql: msg.sql || undefined
      })),
      {
        role: 'user' as const,
        content,
      },
    ];

    const sessionId = params.id;

    // 첫 메시지인 경우 세션 제목 업데이트
    if (chatSession.messages.length === 0) {
      const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      await prisma.chatSession.update({
        where: { id: params.id },
        data: { title, updatedAt: new Date() }
      });
    } else {
      await prisma.chatSession.update({
        where: { id: params.id },
        data: { updatedAt: new Date() }
      });
    }

    emitChatSessionEvent({
      type: 'message.created',
      sessionId,
      message: serializeChatMessage(userMessage),
    });
    emitChatSessionEvent({
      type: 'message.created',
      sessionId,
      message: serializeChatMessage(assistantMessage),
    });

    void runChatMessageGeneration({
      assistantMessageId: assistantMessage.id,
      autoExecute,
      history,
      question: content,
      sessionId,
      userId,
    }).catch((runnerError) => {
      console.error('[Chat API] Background runner failed:', runnerError);
    });

    return NextResponse.json({
      userMessage: serializeChatMessage(userMessage),
      assistantMessage: serializeChatMessage(assistantMessage),
    });
  } catch (error) {
    console.error('Message create error:', error);
    return NextResponse.json({ error: '메시지 처리 실패' }, { status: 500 });
  }
}
