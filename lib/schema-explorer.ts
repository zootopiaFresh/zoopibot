import { runAI } from './ai-runtime';
import {
  buildSchemaContextFromSearchResults,
  searchMySQLSchema,
} from './mysql';
import { getRelevantSchema } from './schema';

interface ChatHistoryLike {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
}

interface SchemaExplorationPlan {
  searchTerms: string[];
  tableCandidates: string[];
  columnCandidates: string[];
  reason: string;
}

interface SchemaExplorationOptions {
  limit?: number;
  excludedTables?: string[];
  retryReason?: string;
  previousSelectedItems?: string[];
}

export interface ResolvedSchemaContext {
  schema: string;
  source: 'mysql-explorer' | 'schema-prompts';
  selectedItems: string[];
  selectedChars: number;
  fallbackUsed: boolean;
}

function truncateText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function buildRecentUserContext(history?: ChatHistoryLike[]): string {
  if (!history || history.length === 0) {
    return '';
  }

  const recentUsers = history
    .filter((message) => message.role === 'user')
    .slice(-3)
    .map((message, index) => `${index + 1}. ${truncateText(message.content, 180)}`)
    .join('\n');

  return recentUsers ? `최근 사용자 질문:\n${recentUsers}\n\n` : '';
}

function uniqueTrimmed(values: unknown[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    const normalized = trimmed.toLowerCase();
    if (!trimmed || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(trimmed);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function parsePlannerResponse(raw: string): SchemaExplorationPlan {
  const fallback: SchemaExplorationPlan = {
    searchTerms: [],
    tableCandidates: [],
    columnCandidates: [],
    reason: '',
  };

  try {
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/);
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[1] ?? objectMatch?.[0] ?? raw);

    return {
      searchTerms: uniqueTrimmed(parsed.searchTerms ?? [], 6),
      tableCandidates: uniqueTrimmed(parsed.tableCandidates ?? [], 4),
      columnCandidates: uniqueTrimmed(parsed.columnCandidates ?? [], 8),
      reason: typeof parsed.reason === 'string' ? parsed.reason.trim() : '',
    };
  } catch {
    return fallback;
  }
}

async function planSchemaExploration(
  question: string,
  history?: ChatHistoryLike[],
  sessionId?: string,
  options?: SchemaExplorationOptions
): Promise<SchemaExplorationPlan> {
  const excludedTables = options?.excludedTables?.filter(Boolean) ?? [];
  const previousSelectedItems = options?.previousSelectedItems?.filter(Boolean) ?? [];
  const retryContext = options?.retryReason?.trim()
    ? `
이전 시도에서 충분한 스키마를 찾지 못했습니다.
- 이미 확인한 테이블: ${previousSelectedItems.length > 0 ? previousSelectedItems.join(', ') : '없음'}
- 이전 응답 요약: ${truncateText(options.retryReason, 400)}

이번에는 기존 후보를 반복하지 말고, 대체 용어/연관 엔티티/프로필·상세·매핑 테이블까지 넓혀서 찾으세요.
`
    : '';
  const exclusionRule = excludedTables.length > 0
    ? `- excludedTables에 포함된 테이블은 tableCandidates에 다시 넣지 마세요: ${excludedTables.join(', ')}`
    : '';
  const plannerPrompt = `당신은 MySQL 스키마 탐색 플래너입니다.
사용자 질문에 답하기 위해 어떤 테이블/컬럼을 먼저 찾아봐야 하는지 짧게 계획하세요.
SQL은 작성하지 마세요.

반드시 JSON으로만 답하세요:
{"searchTerms":["..."],"tableCandidates":["..."],"columnCandidates":["..."],"reason":"..."}

규칙:
- searchTerms: 비즈니스 용어와 DB 식별자 후보를 섞어서 2~6개
- tableCandidates: 추정 가능한 테이블명 후보 0~4개
- columnCandidates: 추정 가능한 컬럼명 후보 0~8개
- 가능하면 실제 MySQL 식별자 스타일을 우선하세요. 예: member, order_detail, createdAt, member_no
- 질문에 직접 나온 단어 외에도, 관계/상세/프로필/매핑/설정/가족 등 한 단계 넓은 연관 엔티티를 고려하세요.
${exclusionRule}
- JSON 외 텍스트를 쓰지 마세요.

${retryContext}
${buildRecentUserContext(history)}현재 질문:
${question}`;

  const raw = await runAI(plannerPrompt, {
    sessionKey: sessionId ? `${sessionId}:schema-plan` : undefined,
    timeout: 30000,
  });

  return parsePlannerResponse(raw);
}

export async function resolveSchemaContext(
  question: string,
  history?: ChatHistoryLike[],
  sessionId?: string,
  options?: SchemaExplorationOptions
): Promise<ResolvedSchemaContext> {
  try {
    const plan = await planSchemaExploration(question, history, sessionId, options);
    const searchResults = await searchMySQLSchema({
      question,
      searchTerms: plan.searchTerms,
      tableCandidates: plan.tableCandidates,
      columnCandidates: plan.columnCandidates,
      excludeTables: options?.excludedTables,
      limit: options?.limit ?? 4,
    });

    if (searchResults.length > 0) {
      const schema = buildSchemaContextFromSearchResults(searchResults);
      console.log(
        `[SchemaExplorer] source=mysql-explorer tables=${searchResults
          .map((result) => result.tableName)
          .join(', ')} chars=${schema.length} reason=${plan.reason || 'n/a'}`
      );

      return {
        schema,
        source: 'mysql-explorer',
        selectedItems: searchResults.map((result) => result.tableName),
        selectedChars: schema.length,
        fallbackUsed: false,
      };
    }
  } catch (error) {
    console.warn('[SchemaExplorer] Planner failed, falling back to schema prompts:', error);
  }

  const fallback = await getRelevantSchema(question, history);
  return {
    schema: fallback.schema,
    source: 'schema-prompts',
    selectedItems: fallback.selectedPromptNames,
    selectedChars: fallback.selectedChars,
    fallbackUsed: true,
  };
}
