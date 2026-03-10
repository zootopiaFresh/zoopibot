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
  sessionId?: string
): Promise<SchemaExplorationPlan> {
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
- JSON 외 텍스트를 쓰지 마세요.

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
  sessionId?: string
): Promise<ResolvedSchemaContext> {
  try {
    const plan = await planSchemaExploration(question, history, sessionId);
    const searchResults = await searchMySQLSchema({
      question,
      searchTerms: plan.searchTerms,
      tableCandidates: plan.tableCandidates,
      columnCandidates: plan.columnCandidates,
      limit: 4,
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
