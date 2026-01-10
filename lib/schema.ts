import { prisma } from '@/lib/db';

// 캐시 설정
let schemaCache: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5분

// DB에서 스키마 프롬프트 로드
async function loadSchemaFromDB(): Promise<string> {
  try {
    const prompts = await prisma.schemaPrompt.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        content: true,
      },
    });

    if (prompts.length === 0) {
      console.warn('[Schema] No active schema prompts found in DB');
      return '';
    }

    const schema = prompts
      .map((p) => `\n--- ${p.name} ---\n${p.content}`)
      .join('\n');

    console.log(
      `[Schema] Loaded ${prompts.length} prompts (${schema.length} chars) from DB`
    );

    return schema;
  } catch (error) {
    console.error('[Schema] Failed to load schemas from DB:', error);
    return '';
  }
}

// 캐시된 스키마 반환 (TTL 적용)
export async function getCachedSchema(): Promise<string> {
  const now = Date.now();

  // 캐시가 유효하면 반환
  if (schemaCache && now - cacheTimestamp < CACHE_TTL) {
    return schemaCache;
  }

  // 캐시 갱신
  schemaCache = await loadSchemaFromDB();
  cacheTimestamp = now;

  return schemaCache;
}

// 캐시 무효화
export function invalidateSchemaCache(): void {
  schemaCache = null;
  cacheTimestamp = 0;
  console.log('[Schema] Cache invalidated');
}

// 하위 호환성을 위한 alias
export const loadAllSchemas = getCachedSchema;
