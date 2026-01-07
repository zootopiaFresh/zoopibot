import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const SCHEMA_DIR = join(process.cwd(), 'schema');

// schema 폴더의 모든 마크다운 파일을 읽어서 하나의 문자열로 반환
export async function loadAllSchemas(): Promise<string> {
  try {
    const files = await readdir(SCHEMA_DIR);
    const mdFiles = files
      .filter(f => f.endsWith('.md'))
      .sort(); // 01-member.md, 02-pet.md 순서로 정렬

    const schemas: string[] = [];

    for (const file of mdFiles) {
      const content = await readFile(join(SCHEMA_DIR, file), 'utf-8');
      schemas.push(`\n--- ${file} ---\n${content}`);
    }

    return schemas.join('\n');
  } catch (error) {
    console.error('[Schema] Failed to load schemas:', error);
    return '';
  }
}

// 캐시된 스키마 (서버 시작 시 한 번만 로드)
let cachedSchema: string | null = null;

export async function getCachedSchema(): Promise<string> {
  if (!cachedSchema) {
    cachedSchema = await loadAllSchemas();
    console.log(`[Schema] Loaded ${cachedSchema.length} characters`);
  }
  return cachedSchema;
}
