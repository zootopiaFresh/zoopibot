import { prisma } from './db';

export interface FrequentTableData {
  id: string;
  tableName: string;
  usageCount: number;
  lastUsedAt: Date;
}

export interface LearningLogData {
  id: string;
  userId: string;
  learnedAt: Date;
  summary: string;
}

// 테이블 사용 기록 업데이트
export async function updateTableUsage(
  userId: string,
  tableNames: string[]
): Promise<void> {
  for (const tableName of tableNames) {
    await prisma.frequentTable.upsert({
      where: { userId_tableName: { userId, tableName } },
      update: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
      create: { userId, tableName, usageCount: 1 },
    });
  }
}

// SQL에서 테이블명 추출
export function extractTableNames(sql: string): string[] {
  const tables: Set<string> = new Set();

  // FROM, JOIN 뒤의 테이블명 추출
  const patterns = [
    /\bFROM\s+(\w+)/gi,
    /\bJOIN\s+(\w+)/gi,
    /\bINTO\s+(\w+)/gi,
    /\bUPDATE\s+(\w+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sql)) !== null) {
      tables.add(match[1].toLowerCase());
    }
  }

  return Array.from(tables);
}

// 자주 사용하는 테이블 조회
export async function getFrequentTables(
  userId: string,
  limit = 10
): Promise<FrequentTableData[]> {
  return prisma.frequentTable.findMany({
    where: { userId },
    orderBy: { usageCount: 'desc' },
    take: limit,
  });
}

// 배치 학습: 사용자별 테이블 사용량 집계
export async function aggregateTableUsage(userId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 최근 7일 대화에서 SQL 추출
  const sessions = await prisma.chatSession.findMany({
    where: {
      userId,
      updatedAt: { gte: sevenDaysAgo },
    },
    include: {
      messages: {
        where: { sql: { not: null } },
        select: { sql: true },
      },
    },
  });

  const tableUsage: Record<string, number> = {};

  for (const session of sessions) {
    for (const msg of session.messages) {
      if (msg.sql) {
        const tables = extractTableNames(msg.sql);
        for (const table of tables) {
          tableUsage[table] = (tableUsage[table] || 0) + 1;
        }
      }
    }
  }

  // 집계 결과 저장
  for (const [tableName, count] of Object.entries(tableUsage)) {
    await prisma.frequentTable.upsert({
      where: { userId_tableName: { userId, tableName } },
      update: {
        usageCount: { increment: count },
        lastUsedAt: new Date(),
      },
      create: { userId, tableName, usageCount: count },
    });
  }

  return Object.keys(tableUsage).length;
}

// 배치 학습: 피드백에서 규칙 추출 (Claude CLI 사용)
export async function processFeedbacksToRules(userId: string): Promise<number> {
  const feedbacks = await prisma.promptFeedback.findMany({
    where: { userId, isProcessed: false },
  });

  if (feedbacks.length === 0) return 0;

  // 피드백을 규칙으로 변환하는 간단한 로직
  // 실제로는 Claude CLI를 호출하여 더 정교한 규칙 추출 가능
  let rulesCreated = 0;

  for (const feedback of feedbacks) {
    if (feedback.type === 'rule') {
      // "rule" 타입의 피드백은 직접 규칙으로 변환
      const ruleMatch = feedback.feedback.match(/(.+?):\s*(.+)/);
      if (ruleMatch) {
        await prisma.businessRule.create({
          data: {
            userId,
            name: ruleMatch[1].trim(),
            condition: ruleMatch[2].trim(),
            scope: 'global',
            isLearned: true,
          },
        });
        rulesCreated++;
      }
    }
  }

  // 피드백 처리 완료 표시
  await prisma.promptFeedback.updateMany({
    where: { id: { in: feedbacks.map((f) => f.id) } },
    data: { isProcessed: true },
  });

  return rulesCreated;
}

// 전체 배치 학습 실행
export async function runBatchLearning(userId: string): Promise<LearningLogData> {
  const tablesProcessed = await aggregateTableUsage(userId);
  const rulesCreated = await processFeedbacksToRules(userId);

  const summary = JSON.stringify({
    tablesProcessed,
    rulesCreated,
    timestamp: new Date().toISOString(),
  });

  const log = await prisma.learningLog.create({
    data: {
      userId,
      summary,
    },
  });

  return log;
}

// 모든 활성 사용자에 대해 배치 학습 실행
export async function runBatchLearningForAllUsers(): Promise<{
  usersProcessed: number;
  logs: LearningLogData[];
}> {
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true },
  });

  const logs: LearningLogData[] = [];

  for (const user of users) {
    try {
      const log = await runBatchLearning(user.id);
      logs.push(log);
    } catch (error) {
      console.error(`[BatchLearning] Failed for user ${user.id}:`, error);
    }
  }

  return { usersProcessed: logs.length, logs };
}

// 자주 사용하는 테이블 기반 프롬프트 생성
export function buildFrequentTablesPrompt(
  tables: { tableName: string; usageCount: number }[]
): string {
  if (tables.length === 0) return '';

  let prompt = '\n\n## 자주 사용하는 테이블\n';
  prompt += '사용자가 자주 조회하는 테이블입니다. 관련 질문 시 우선 고려하세요:\n';

  for (const t of tables.slice(0, 5)) {
    prompt += `- ${t.tableName} (사용 횟수: ${t.usageCount})\n`;
  }

  return prompt;
}
