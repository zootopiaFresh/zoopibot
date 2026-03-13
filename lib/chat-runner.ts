import { prisma } from './db';
import { logGenerationError } from './error-logger';
import { serializePresentation, serializeQueryResult } from './presentation';
import { generateSQLWithRecovery, type ChatHistoryLike } from './query-orchestrator';
import { buildPresentationFromQueryResult, buildPresentationFromSQL } from './reporting';
import { CHAT_MESSAGE_STATUS, serializeChatMessage } from './chat-message';
import { emitChatSessionEvent } from './chat-events';

interface RunChatMessageGenerationOptions {
  assistantMessageId: string;
  autoExecute: boolean;
  history: ChatHistoryLike[];
  question: string;
  sessionId: string;
  userId: string;
}

const PROGRESS_STEPS = [
  ['queued', '질문 접수'],
  ['schema', '관련 스키마 탐색'],
  ['verify', 'SQL 검증 및 결과 확인'],
  ['report', '리포트 정리'],
] as const;

type ProgressStage = (typeof PROGRESS_STEPS)[number][0];

const PROGRESS_DETAILS: Record<ProgressStage, string> = {
  queued: '요청을 등록했습니다.',
  schema: '질문과 관련된 테이블과 컬럼을 찾는 중입니다.',
  verify: 'SQL을 실행하고 결과를 검증하는 중입니다.',
  report: '설명과 리포트 구성을 정리하는 중입니다.',
};

function buildProgressLog(
  activeStage: ProgressStage,
  options?: { failed?: boolean; detail?: string }
) {
  const activeIndex = PROGRESS_STEPS.findIndex(([stage]) => stage === activeStage);
  const detail = options?.detail || PROGRESS_DETAILS[activeStage];

  return PROGRESS_STEPS.map(([stage, label], index) => {
    let marker = '[todo]';

    if (index < activeIndex) {
      marker = '[done]';
    } else if (index === activeIndex) {
      marker = options?.failed ? '[fail]' : '[run]';
    }

    const text = index === activeIndex ? `${label} - ${detail}` : label;
    return `${marker} ${text}`;
  }).join('\n');
}

async function emitUpdatedMessage(
  sessionId: string,
  messageId: string,
  type:
    | 'message.updated'
    | 'message.completed'
    | 'message.failed'
) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return;
  }

  emitChatSessionEvent({
    type,
    sessionId,
    message: serializeChatMessage(message),
  });
}

async function updateProgressMessage(
  sessionId: string,
  messageId: string,
  stage: ProgressStage,
  detail?: string
) {
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      content: buildProgressLog(stage, { detail }),
      status: CHAT_MESSAGE_STATUS.RUNNING,
    },
  });

  await emitUpdatedMessage(sessionId, messageId, 'message.updated');
}

export async function runChatMessageGeneration(
  options: RunChatMessageGenerationOptions
) {
  const { assistantMessageId, autoExecute, history, question, sessionId, userId } = options;
  let currentStage: ProgressStage = 'schema';

  await prisma.chatMessage.update({
    where: { id: assistantMessageId },
    data: {
      status: CHAT_MESSAGE_STATUS.RUNNING,
      content: buildProgressLog('schema'),
      startedAt: new Date(),
    },
  });
  await emitUpdatedMessage(sessionId, assistantMessageId, 'message.updated');

  try {
    const { result, validatedExecution } = await generateSQLWithRecovery({
      question,
      history,
      userId,
      sessionId,
      validateFinalSql: autoExecute,
    });

    let presentation = null;
    let resultSnapshot = null;

    if (autoExecute && result.sql && result.validated !== false) {
      currentStage = 'verify';
      await updateProgressMessage(
        sessionId,
        assistantMessageId,
        'verify'
      );

      try {
        const report = validatedExecution
          ? await buildPresentationFromQueryResult(
              question,
              result.sql,
              result.explanation,
              validatedExecution,
              sessionId
            )
          : await buildPresentationFromSQL(
              question,
              result.sql,
              result.explanation,
              sessionId
            );

        presentation = report.presentation;
        resultSnapshot = report.snapshot;
      } catch (queryError: any) {
        console.error('[ChatRunner] Report build failed:', queryError.message);
        await logGenerationError({
          errorType: 'db_query_error',
          errorMessage: `자동 실행 실패: ${queryError.message}`,
          userId,
          sessionId,
          prompt: question,
          metadata: { sql: result.sql },
        });
      }
    }

    if (presentation || resultSnapshot) {
      currentStage = 'report';
      await updateProgressMessage(
        sessionId,
        assistantMessageId,
        'report'
      );
    }

    await prisma.chatMessage.update({
      where: { id: assistantMessageId },
      data: {
        content: result.explanation || '쿼리를 생성했습니다.',
        sql: result.sql || null,
        presentation: serializePresentation(presentation),
        resultSnapshot: serializeQueryResult(resultSnapshot),
        status: CHAT_MESSAGE_STATUS.COMPLETED,
        errorMessage: null,
        parseError: result.parseError || false,
        validated: result.validated ?? null,
        validationMode: result.validationMode || null,
        validationError: result.validationError || null,
        validationAttempts: result.validationAttempts ?? null,
        completedAt: new Date(),
      },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    await emitUpdatedMessage(sessionId, assistantMessageId, 'message.completed');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : '메시지 처리 중 오류가 발생했습니다.';
    const errorType = errorMessage.includes('시간이 초과')
      ? 'timeout'
      : 'cli_error';

    console.error('[ChatRunner] Message generation failed:', errorMessage);

    await logGenerationError({
      errorType,
      errorMessage,
      userId,
      sessionId,
      messageId: assistantMessageId,
      prompt: question,
    });

    await prisma.chatMessage.update({
      where: { id: assistantMessageId },
      data: {
        content: buildProgressLog(currentStage, { failed: true, detail: errorMessage }),
        status: CHAT_MESSAGE_STATUS.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    await emitUpdatedMessage(sessionId, assistantMessageId, 'message.failed');
  }
}
