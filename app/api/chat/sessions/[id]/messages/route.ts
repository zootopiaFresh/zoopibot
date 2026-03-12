import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logGenerationError } from '@/lib/error-logger';
import { parseStoredPresentation, parseStoredQueryResult, serializePresentation, serializeQueryResult } from '@/lib/presentation';
import { generateSQLWithRecovery } from '@/lib/query-orchestrator';
import { buildPresentationFromSQL } from '@/lib/reporting';
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
        sessionId: params.id
      }
    });

    // 대화 히스토리 준비
    const history = chatSession.messages.map((msg: { role: string; content: string; sql: string | null }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      sql: msg.sql || undefined
    }));

    const sessionId = params.id;
    const { result } = await generateSQLWithRecovery({
      question: content,
      history,
      userId,
      sessionId,
    });
    let presentation = null;
    let resultSnapshot = null;

    if (autoExecute && result.sql) {
      try {
        const report = await buildPresentationFromSQL(content, result.sql, result.explanation, sessionId);
        presentation = report.presentation;
        resultSnapshot = report.snapshot;
      } catch (queryError: any) {
        console.error('[Chat API] Report build failed:', queryError.message);
        logGenerationError({
          errorType: 'db_query_error',
          errorMessage: `자동 실행 실패: ${queryError.message}`,
          userId,
          sessionId,
          prompt: content,
          metadata: { sql: result.sql },
        });
      }
    }

    // 어시스턴트 메시지 저장
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: result.explanation || '쿼리를 생성했습니다.',
        sql: result.sql || null,
        presentation: serializePresentation(presentation),
        resultSnapshot: serializeQueryResult(resultSnapshot),
        sessionId: params.id
      }
    });

    // 첫 메시지인 경우 세션 제목 업데이트
    if (chatSession.messages.length === 0) {
      const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      await prisma.chatSession.update({
        where: { id: params.id },
        data: { title }
      });
    }

    // 세션 updatedAt 갱신
    await prisma.chatSession.update({
      where: { id: params.id },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      userMessage,
      assistantMessage: {
        ...assistantMessage,
        sql: result.sql,
        explanation: result.explanation,
        parseError: result.parseError || false,
        presentation: parseStoredPresentation(assistantMessage.presentation),
        resultSnapshot: parseStoredQueryResult(assistantMessage.resultSnapshot),
      }
    });
  } catch (error) {
    console.error('Message create error:', error);
    return NextResponse.json({ error: '메시지 처리 실패' }, { status: 500 });
  }
}
