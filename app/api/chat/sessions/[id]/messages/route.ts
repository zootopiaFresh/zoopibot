import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateSQL } from '@/lib/claude';
import { getCachedSchema } from '@/lib/schema';
import { executeQuery } from '@/lib/mysql';
import { logGenerationError } from '@/lib/error-logger';
import { z } from 'zod';

const requestSchema = z.object({
  content: z.string().min(1).max(10000)
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
    const { content } = requestSchema.parse(body);

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

    // 마크다운 스키마 사용 (schema 폴더)
    const schema = await getCachedSchema();

    const sessionId = params.id;

    // Claude에게 요청 (사용자 선호도 적용, sessionId 전달)
    let result = await generateSQL(content, schema, history, undefined, userId, sessionId);

    // Claude가 실제 데이터 확인이 필요하다고 판단한 경우
    if (result.needsData && result.dataQuery) {
      console.log('[Chat API] Claude requested data verification:', result.dataQuery);
      try {
        const queryResult = await executeQuery(result.dataQuery);
        console.log('[Chat API] Data fetched:', queryResult.rows.length, 'rows');

        // 실제 데이터와 함께 다시 질문
        result = await generateSQL(content, schema, history, {
          query: result.dataQuery,
          data: queryResult.rows
        }, userId, sessionId);
      } catch (queryError: any) {
        console.error('[Chat API] Data query failed:', queryError.message);

        // 데이터 쿼리 실패 로그 저장
        logGenerationError({
          errorType: 'db_query_error',
          errorMessage: `데이터 확인 쿼리 실패: ${queryError.message}`,
          userId,
          sessionId,
          prompt: content,
          metadata: { dataQuery: result.dataQuery }
        });

        // 쿼리 실패 시 사용자에게 알림
        result = {
          ...result,
          sql: '',
          explanation: `⚠️ 데이터 확인 중 오류가 발생했습니다: ${queryError.message}\n\n시도한 쿼리:\n\`\`\`sql\n${result.dataQuery}\n\`\`\`\n\n질문을 다시 시도해주세요.`,
          needsData: false,
          parseError: true
        };
      }
    }

    // 어시스턴트 메시지 저장
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        role: 'assistant',
        content: result.explanation || '쿼리를 생성했습니다.',
        sql: result.sql || null,
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
        parseError: result.parseError || false
      }
    });
  } catch (error) {
    console.error('Message create error:', error);
    return NextResponse.json({ error: '메시지 처리 실패' }, { status: 500 });
  }
}
