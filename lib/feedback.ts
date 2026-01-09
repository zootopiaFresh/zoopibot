import { prisma } from './db';

export type FeedbackType = 'preference' | 'correction' | 'rule';

export interface FeedbackData {
  id: string;
  feedback: string;
  type: string;
  sessionId: string | null;
  messageId: string | null;
  isProcessed: boolean;
  createdAt: Date;
}

export async function saveFeedback(
  userId: string,
  feedback: string,
  type: FeedbackType,
  sessionId?: string,
  messageId?: string
): Promise<FeedbackData> {
  return prisma.promptFeedback.create({
    data: {
      userId,
      feedback,
      type,
      sessionId,
      messageId,
    },
  });
}

export async function getUnprocessedFeedbacks(
  userId: string,
  limit = 10
): Promise<FeedbackData[]> {
  return prisma.promptFeedback.findMany({
    where: { userId, isProcessed: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markFeedbacksProcessed(feedbackIds: string[]): Promise<void> {
  await prisma.promptFeedback.updateMany({
    where: { id: { in: feedbackIds } },
    data: { isProcessed: true },
  });
}

export async function getUserFeedbacks(
  userId: string,
  limit = 50
): Promise<FeedbackData[]> {
  return prisma.promptFeedback.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export function buildFeedbackPrompt(
  feedbacks: { feedback: string; type: string; createdAt: Date }[]
): string {
  if (feedbacks.length === 0) return '';

  let prompt = '\n\n## 최근 피드백\n';
  prompt += '사용자가 제공한 피드백을 반영하세요:\n';

  for (const f of feedbacks) {
    prompt += `- [${f.type}] ${f.feedback}\n`;
  }

  return prompt;
}
