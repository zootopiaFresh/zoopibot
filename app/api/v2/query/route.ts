import { NextRequest, NextResponse } from 'next/server';
import { validateServiceToken, unauthorizedResponse, getUserIdBySlackId } from '@/lib/service-auth';
import { generateSQL } from '@/lib/claude';
import { resolveSchemaContext } from '@/lib/schema-explorer';
import { executeQuery } from '@/lib/mysql';
import { logGenerationError } from '@/lib/error-logger';
import { updateTableUsage, extractTableNames } from '@/lib/learning';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const requestSchema = z.object({
  question: z.string().min(1).max(10000),
  userId: z.string().optional(),
  slackUserId: z.string().optional(),
  sessionId: z.string().optional(),
  execute: z.boolean().default(false),
  interpret: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateServiceToken(req)) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { question, userId: directUserId, slackUserId, sessionId, execute, interpret } = requestSchema.parse(body);

    // userId 결정: 직접 전달 또는 Slack ID에서 조회
    let userId = directUserId;
    if (!userId && slackUserId) {
      userId = await getUserIdBySlackId(slackUserId) ?? undefined;
      if (!userId) {
        return NextResponse.json(
          { error: 'Slack 계정이 연결되지 않았습니다. /연결 명령으로 계정을 연결해주세요.' },
          { status: 404 }
        );
      }
    }

    // 세션 히스토리 로드 (있으면)
    let history: { role: 'user' | 'assistant'; content: string; sql?: string }[] = [];
    let activeSessionId = sessionId;

    if (activeSessionId) {
      const chatSession = await prisma.chatSession.findFirst({
        where: { id: activeSessionId, userId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (chatSession) {
        history = chatSession.messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          sql: msg.sql || undefined,
        }));
      }
    }

    // 세션이 없으면 자동 생성
    if (!activeSessionId && userId) {
      const title = question.length > 30 ? question.substring(0, 30) + '...' : question;
      const newSession = await prisma.chatSession.create({
        data: { userId, title },
      });
      activeSessionId = newSession.id;
    }

    // 현재 질문과 세션 맥락에 맞는 스키마를 도구형 탐색으로 결정
    const { schema } = await resolveSchemaContext(question, history, activeSessionId);

    // SQL 생성
    let result = await generateSQL(question, schema, history, undefined, userId, activeSessionId);

    // Claude가 실제 데이터 확인이 필요한 경우
    if (result.needsData && result.dataQuery) {
      try {
        const queryResult = await executeQuery(result.dataQuery);
        result = await generateSQL(question, schema, history, {
          query: result.dataQuery,
          data: queryResult.rows,
        }, userId, activeSessionId);
      } catch (queryError: any) {
        logGenerationError({
          errorType: 'db_query_error',
          errorMessage: `데이터 확인 쿼리 실패: ${queryError.message}`,
          userId,
          sessionId: activeSessionId,
          prompt: question,
          metadata: { dataQuery: result.dataQuery },
        });
      }
    }

    // 메시지 저장
    if (activeSessionId) {
      await prisma.chatMessage.create({
        data: { role: 'user', content: question, sessionId: activeSessionId },
      });
      await prisma.chatMessage.create({
        data: {
          role: 'assistant',
          content: result.explanation || '쿼리를 생성했습니다.',
          sql: result.sql || null,
          sessionId: activeSessionId,
        },
      });
    }

    // 테이블 사용 추적
    if (userId && result.sql) {
      const tables = extractTableNames(result.sql);
      if (tables.length > 0) {
        updateTableUsage(userId, tables).catch(() => {});
      }
    }

    // SQL 실행 (옵션)
    let data: any[] | undefined;
    let columns: any[] | undefined;
    if (execute && result.sql) {
      try {
        const execResult = await executeQuery(result.sql);
        data = execResult.rows;
        columns = execResult.fields;
      } catch (execError: any) {
        logGenerationError({
          errorType: 'db_query_error',
          errorMessage: `SQL 실행 실패: ${execError.message}`,
          userId,
          sessionId: activeSessionId,
          prompt: question,
          metadata: { sql: result.sql },
        });
      }
    }

    // 결과 해석 (옵션)
    let interpretation: string | undefined;
    if (interpret && data && data.length > 0) {
      try {
        const { runAI } = await import('@/lib/claude');
        const interpretPrompt = `다음 SQL 쿼리 결과를 비즈니스 관점에서 한국어로 간결하게 해석해주세요.
쿼리: ${result.sql}
결과 (${data.length}행${data.length > 20 ? ', 상위 20행만 표시' : ''}):
${JSON.stringify(data.slice(0, 20), null, 2)}`;
        interpretation = await runAI(interpretPrompt);
      } catch {
        // 해석 실패는 무시
      }
    }

    return NextResponse.json({
      sql: result.sql,
      explanation: result.explanation,
      data,
      columns,
      interpretation,
      sessionId: activeSessionId,
      parseError: result.parseError || false,
    });
  } catch (error: any) {
    console.error('[v2/query] Error:', error);
    return NextResponse.json({ error: error.message || '요청 처리 실패' }, { status: 500 });
  }
}
