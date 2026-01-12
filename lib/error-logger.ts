import { prisma } from './db';

export type ErrorType =
  | 'parse_error'       // JSON 파싱 실패
  | 'db_query_error'    // 데이터 확인 쿼리 실패
  | 'timeout'           // CLI 타임아웃
  | 'context_load_error' // 사용자 컨텍스트 로드 실패
  | 'cli_error';        // Claude CLI 실행 오류

interface LogErrorParams {
  errorType: ErrorType;
  errorMessage: string;
  userId?: string;
  sessionId?: string;
  messageId?: string;
  prompt?: string;
  rawResponse?: string;
  metadata?: Record<string, unknown>;
}

/**
 * SQL 생성 실패 로그를 DB에 저장
 * 비동기로 실행되며, 실패해도 메인 플로우에 영향 없음
 */
export async function logGenerationError(params: LogErrorParams): Promise<void> {
  try {
    await prisma.generationError.create({
      data: {
        errorType: params.errorType,
        errorMessage: params.errorMessage,
        userId: params.userId || null,
        sessionId: params.sessionId || null,
        messageId: params.messageId || null,
        prompt: params.prompt || null,
        rawResponse: params.rawResponse ? truncate(params.rawResponse, 10000) : null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
    console.log(`[ErrorLogger] Logged ${params.errorType}: ${params.errorMessage.substring(0, 100)}`);
  } catch (error) {
    // 로깅 실패는 무시 (메인 플로우에 영향 없음)
    console.error('[ErrorLogger] Failed to log error:', error);
  }
}

/**
 * 문자열을 최대 길이로 자르기
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '... (truncated)';
}

/**
 * 에러 통계 조회 (어드민용)
 */
export async function getErrorStats(days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const errors = await prisma.generationError.groupBy({
    by: ['errorType'],
    where: {
      createdAt: { gte: since },
    },
    _count: { id: true },
  });

  const total = await prisma.generationError.count({
    where: { createdAt: { gte: since } },
  });

  return {
    total,
    byType: errors.map(e => ({
      type: e.errorType,
      count: e._count.id,
    })),
    since,
  };
}

/**
 * 최근 에러 목록 조회 (어드민용)
 */
export async function getRecentErrors(limit: number = 50, errorType?: ErrorType) {
  return prisma.generationError.findMany({
    where: errorType ? { errorType } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      errorType: true,
      errorMessage: true,
      userId: true,
      sessionId: true,
      prompt: true,
      createdAt: true,
    },
  });
}

/**
 * 특정 에러 상세 조회 (어드민용)
 */
export async function getErrorDetail(id: string) {
  return prisma.generationError.findUnique({
    where: { id },
  });
}
