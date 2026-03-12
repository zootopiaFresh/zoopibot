import { prisma } from '@/lib/db';
import { getMergedSchemaTags } from '@/lib/schema-taxonomy';

interface SchemaPromptRecord {
  name: string;
  content: string;
  tags: string;
}

interface SchemaKeyword {
  value: string;
  weight: number;
}

interface CachedSchemaPrompt extends SchemaPromptRecord {
  chunk: string;
  title: string;
  tables: string[];
  parsedTags: string[];
  keywords: SchemaKeyword[];
  isShared: boolean;
}

interface ChatHistoryLike {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
}

export interface RelevantSchemaResult {
  schema: string;
  selectedPromptNames: string[];
  selectedChars: number;
  totalPromptCount: number;
  fallbackUsed: boolean;
}

const SHARED_PROMPT_NAMES = ['00-enums', '00-relations'];
const FALLBACK_PROMPT_NAMES = ['01-member', '04-order', '03-item', '05-subscribe'];
const MAX_SCHEMA_CHARS = 56_000;
const MAX_DOMAIN_PROMPTS = 3;
const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'from',
  'into',
  'only',
  'show',
  'list',
  'data',
  'table',
  'tables',
  'query',
  'sql',
  '정보',
  '관련',
  '테이블',
  '컬럼',
  '목록',
  '조회',
  '확인',
  '데이터',
  '내용',
  '결과',
  '기준',
  '조건',
  '상세',
  '현황',
  '통계',
  '분석',
]);

// 캐시 설정
let schemaCache: string | null = null;
let promptCache: CachedSchemaPrompt[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkForPrompt(prompt: SchemaPromptRecord): string {
  return `\n--- ${prompt.name} ---\n${prompt.content}`;
}

function addKeyword(
  map: Map<string, number>,
  rawKeyword: string,
  weight: number
): void {
  const normalized = normalizeText(rawKeyword);
  if (!normalized || normalized.length < 2 || STOPWORDS.has(normalized)) {
    return;
  }

  const currentWeight = map.get(normalized) ?? 0;
  if (weight > currentWeight) {
    map.set(normalized, weight);
  }

  if (normalized.includes('_')) {
    const spaced = normalized.replace(/_/g, ' ');
    const spacedWeight = map.get(spaced) ?? 0;
    if (weight - 1 > spacedWeight) {
      map.set(spaced, Math.max(1, weight - 1));
    }
  }
}

function extractTitle(content: string): string {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '';
}

function extractTables(content: string): string[] {
  const tableNames = new Set<string>();
  const tableLinkPattern = /- \[([^\]]+)\]\(#/g;
  const sectionHeadingPattern = /^##\s+([a-zA-Z0-9_]+)\s*$/gm;
  let match: RegExpExecArray | null;

  while ((match = tableLinkPattern.exec(content)) !== null) {
    tableNames.add(match[1].trim());
  }

  while ((match = sectionHeadingPattern.exec(content)) !== null) {
    tableNames.add(match[1].trim());
  }

  return Array.from(tableNames);
}

function buildPromptKeywords(prompt: SchemaPromptRecord): SchemaKeyword[] {
  const keywordWeights = new Map<string, number>();
  const mergedTags = getMergedSchemaTags(prompt.name, prompt.tags);
  const title = extractTitle(prompt.content);
  const titleParts = title.split(/[()\/,&|-]/).map((part) => part.trim());
  const summaryLines = prompt.content
    .split('\n')
    .filter((line) => line.startsWith('>'))
    .slice(0, 2)
    .join(' ');
  const tables = extractTables(prompt.content);
  const nameWithoutPrefix = prompt.name.replace(/^\d+-/, '');

  addKeyword(keywordWeights, prompt.name, 6);
  addKeyword(keywordWeights, nameWithoutPrefix, 7);

  for (const part of titleParts) {
    addKeyword(keywordWeights, part, 9);
  }

  for (const token of normalizeText(summaryLines).split(' ')) {
    if (token.length >= 2 && !STOPWORDS.has(token)) {
      addKeyword(keywordWeights, token, 4);
    }
  }

  for (const table of tables) {
    addKeyword(keywordWeights, table, 12);
  }

  for (const tag of mergedTags) {
    addKeyword(keywordWeights, tag, 14);
  }

  return Array.from(keywordWeights.entries())
    .map(([value, weight]) => ({ value, weight }))
    .sort((a, b) => b.weight - a.weight || a.value.localeCompare(b.value));
}

async function loadSchemaPromptsFromDB(): Promise<CachedSchemaPrompt[]> {
  try {
    const prompts = (await prisma.schemaPrompt.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })) as Array<{ name: string; content: string; tags?: string | null }>;

    if (prompts.length === 0) {
      console.warn('[Schema] No active schema prompts found in DB');
      return [];
    }

    const cachedPrompts = prompts.map((prompt) => ({
      name: prompt.name,
      content: prompt.content,
      tags: prompt.tags ?? '',
      chunk: chunkForPrompt({
        name: prompt.name,
        content: prompt.content,
        tags: prompt.tags ?? '',
      }),
      title: extractTitle(prompt.content),
      tables: extractTables(prompt.content),
      parsedTags: getMergedSchemaTags(prompt.name, prompt.tags ?? ''),
      keywords: buildPromptKeywords({
        name: prompt.name,
        content: prompt.content,
        tags: prompt.tags ?? '',
      }),
      isShared: SHARED_PROMPT_NAMES.includes(prompt.name),
    }));

    const schema = cachedPrompts.map((prompt) => prompt.chunk).join('\n');

    console.log(
      `[Schema] Loaded ${prompts.length} prompts (${schema.length} chars) from DB`
    );

    return cachedPrompts;
  } catch (error) {
    console.error('[Schema] Failed to load schemas from DB:', error);
    return [];
  }
}

async function getCachedSchemaPrompts(): Promise<CachedSchemaPrompt[]> {
  const now = Date.now();

  if (promptCache && promptCache.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return promptCache;
  }

  promptCache = await loadSchemaPromptsFromDB();
  if (promptCache.length === 0) {
    schemaCache = null;
    cacheTimestamp = 0;
    return promptCache;
  }

  schemaCache = promptCache.map((prompt) => prompt.chunk).join('\n');
  cacheTimestamp = now;

  return promptCache;
}

function buildSelectionContext(
  query: string,
  history?: ChatHistoryLike[]
): { direct: string; expanded: string } {
  const recentUserHistory = (history ?? [])
    .filter((message) => message.role === 'user')
    .slice(-3)
    .map((message) => message.content.slice(0, 200))
    .join(' ');

  return {
    direct: normalizeText(query),
    expanded: normalizeText(`${query} ${recentUserHistory}`),
  };
}

function matchesNormalizedPhrase(source: string, phrase: string): boolean {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) {
    return false;
  }

  const spacedPhrase = normalizedPhrase.replace(/_/g, ' ');
  return source.includes(normalizedPhrase) || source.includes(spacedPhrase);
}

function classifyPromptCandidates(
  prompts: CachedSchemaPrompt[],
  selectionContext: { direct: string; expanded: string }
): Map<string, number> {
  const candidates = new Map<string, number>();

  for (const prompt of prompts) {
    let score = 0;

    for (const tag of prompt.parsedTags) {
      if (matchesNormalizedPhrase(selectionContext.direct, tag)) {
        score += 90;
      } else if (matchesNormalizedPhrase(selectionContext.expanded, tag)) {
        score += 30;
      }
    }

    if (matchesNormalizedPhrase(selectionContext.direct, prompt.title)) {
      score += 40;
    } else if (matchesNormalizedPhrase(selectionContext.expanded, prompt.title)) {
      score += 15;
    }

    for (const table of prompt.tables) {
      if (matchesNormalizedPhrase(selectionContext.direct, table)) {
        score += 120;
      } else if (matchesNormalizedPhrase(selectionContext.expanded, table)) {
        score += 35;
      }
    }

    if (score > 0) {
      candidates.set(prompt.name, score);
    }
  }

  return candidates;
}

function scorePrompt(
  prompt: CachedSchemaPrompt,
  selectionContext: { direct: string; expanded: string },
  classifierScore = 0
): number {
  let score = classifierScore;

  for (const keyword of prompt.keywords) {
    if (selectionContext.direct.includes(keyword.value)) {
      score += keyword.weight * 3;
    } else if (selectionContext.expanded.includes(keyword.value)) {
      score += keyword.weight;
    }
  }

  return score;
}

function selectPromptByNames(
  prompts: CachedSchemaPrompt[],
  promptNames: string[],
  maxChars: number
): CachedSchemaPrompt[] {
  const selected: CachedSchemaPrompt[] = [];
  let chars = 0;

  for (const promptName of promptNames) {
    const prompt = prompts.find((candidate) => candidate.name === promptName);
    if (!prompt) {
      continue;
    }

    const nextChars = chars + prompt.chunk.length;
    if (selected.length > 0 && nextChars > maxChars) {
      continue;
    }

    selected.push(prompt);
    chars = nextChars;
  }

  return selected;
}

function buildSchemaOverview(prompts: CachedSchemaPrompt[]): string {
  const lines = prompts.map((prompt) => {
    const tables = prompt.tables.slice(0, 10).join(', ');
    const tags = prompt.parsedTags.slice(0, 8).join(', ');
    return `- ${prompt.name}: tables=[${tables}] tags=[${tags}]`;
  });

  return `# 관련 스키마 요약\n${lines.join('\n')}\n`;
}

// 캐시된 스키마 반환 (TTL 적용)
export async function getCachedSchema(): Promise<string> {
  const now = Date.now();

  // 캐시가 유효하면 반환
  if (schemaCache && now - cacheTimestamp < CACHE_TTL) {
    return schemaCache;
  }

  const prompts = await getCachedSchemaPrompts();
  if (prompts.length === 0) {
    schemaCache = null;
    cacheTimestamp = 0;
    return '';
  }

  schemaCache = prompts.map((prompt) => prompt.chunk).join('\n');
  cacheTimestamp = now;

  return schemaCache;
}

export async function getRelevantSchema(
  query: string,
  history?: ChatHistoryLike[]
): Promise<RelevantSchemaResult> {
  const prompts = await getCachedSchemaPrompts();
  if (prompts.length === 0) {
    return {
      schema: '',
      selectedPromptNames: [],
      selectedChars: 0,
      totalPromptCount: 0,
      fallbackUsed: false,
    };
  }

  const sharedPrompts = prompts.filter((prompt) => prompt.isShared);
  const domainPrompts = prompts.filter((prompt) => !prompt.isShared);
  const selectionContext = buildSelectionContext(query, history);
  const classifierScores = classifyPromptCandidates(domainPrompts, selectionContext);
  const sharedChars = sharedPrompts.reduce(
    (total, prompt) => total + prompt.chunk.length,
    0
  );
  const domainBudget = Math.max(MAX_SCHEMA_CHARS - sharedChars, 0);

  const scoredPrompts = domainPrompts
    .map((prompt) => ({
      prompt,
      score: scorePrompt(
        prompt,
        selectionContext,
        classifierScores.get(prompt.name) ?? 0
      ),
      classifierScore: classifierScores.get(prompt.name) ?? 0,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.classifierScore !== left.classifierScore) {
        return right.classifierScore - left.classifierScore;
      }

      return left.prompt.name.localeCompare(right.prompt.name);
    });
  const topScore = scoredPrompts[0]?.score ?? 0;
  const scoreThreshold =
    topScore > 0 ? Math.max(24, Math.floor(topScore * 0.45)) : 0;
  const minimumClassifiedPromptCount = Math.min(2, classifierScores.size);

  const selectedDomains: CachedSchemaPrompt[] = [];
  let usedChars = sharedChars;

  for (const { prompt, score, classifierScore } of scoredPrompts) {
    const shouldKeepClassifiedPrompt =
      classifierScore > 0 &&
      selectedDomains.length < minimumClassifiedPromptCount;

    if (
      score <= 0 ||
      (!shouldKeepClassifiedPrompt && score < scoreThreshold) ||
      selectedDomains.length >= MAX_DOMAIN_PROMPTS
    ) {
      continue;
    }

    const nextChars = selectedDomains.reduce(
      (total, current) => total + current.chunk.length,
      0
    ) + prompt.chunk.length;

    if (selectedDomains.length > 0 && nextChars > domainBudget) {
      continue;
    }

    selectedDomains.push(prompt);
  }

  let fallbackUsed = false;
  let finalDomains = selectedDomains;

  if (finalDomains.length === 0) {
    fallbackUsed = true;
    finalDomains = selectPromptByNames(domainPrompts, FALLBACK_PROMPT_NAMES, domainBudget);
  }

  const selectedPrompts = [...sharedPrompts, ...finalDomains];
  const schema = `${buildSchemaOverview(selectedPrompts)}\n${selectedPrompts
    .map((prompt) => prompt.chunk)
    .join('\n')}`;
  usedChars = schema.length;

  console.log(
    `[Schema] Selected ${selectedPrompts.length}/${prompts.length} prompts (${usedChars} chars)${
      fallbackUsed ? ' [fallback]' : ''
    }${
      classifierScores.size > 0 ? ` [classified:${classifierScores.size}]` : ''
    }: ${selectedPrompts.map((prompt) => prompt.name).join(', ')}`
  );

  return {
    schema,
    selectedPromptNames: selectedPrompts.map((prompt) => prompt.name),
    selectedChars: usedChars,
    totalPromptCount: prompts.length,
    fallbackUsed,
  };
}

// 캐시 무효화
export function invalidateSchemaCache(): void {
  schemaCache = null;
  promptCache = null;
  cacheTimestamp = 0;
  console.log('[Schema] Cache invalidated');
}

// 하위 호환성을 위한 alias
export const loadAllSchemas = getCachedSchema;
