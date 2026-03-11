import mysql from 'mysql2/promise';

export interface TableColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  defaultValue: string | null;
  extra: string;
  comment: string;
}

export interface TableSchemaMeta {
  tableName: string;
  columns: TableColumnMeta[];
  searchableText: string;
}

export interface SchemaSearchResult {
  tableName: string;
  score: number;
  matchedTerms: string[];
  matchedColumns: string[];
  columns: TableColumnMeta[];
}

// MySQL 연결 풀 생성
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

// 테이블 목록 조회
export async function listTables(): Promise<string[]> {
  const [rows] = await pool.query('SHOW TABLES');
  return (rows as any[]).map(row => Object.values(row)[0] as string);
}

// 테이블 구조 조회
export async function describeTable(tableName: string): Promise<TableColumnMeta[]> {
  const [rows] = await pool.query('SHOW FULL COLUMNS FROM ??', [tableName]);
  return (rows as any[]).map((row) => ({
    name: row.Field,
    type: row.Type,
    nullable: row.Null === 'YES',
    key: row.Key || '',
    defaultValue: row.Default ?? null,
    extra: row.Extra || '',
    comment: row.Comment || '',
  }));
}

function normalizeSchemaSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchableText(
  tableName: string,
  columns: TableColumnMeta[]
): string {
  return normalizeSchemaSearchText(
    [
      tableName,
      ...columns.flatMap((column) => [
        column.name,
        column.type,
        column.comment,
        column.extra,
      ]),
    ].join(' ')
  );
}

async function loadSchemaCatalog(): Promise<TableSchemaMeta[]> {
  try {
    const tables = await listTables();
    const schemaInfo: TableSchemaMeta[] = [];

    for (const table of tables) {
      const columns = await describeTable(table);
      schemaInfo.push({
        tableName: table,
        columns,
        searchableText: buildSearchableText(table, columns),
      });
    }

    return schemaInfo;
  } catch (error) {
    console.error('[MySQL] Schema fetch error:', error);
    throw error;
  }
}

function formatTableSchema(table: TableSchemaMeta): string {
  const columnDefs = table.columns
    .map((column) => {
      const flags = [
        column.nullable ? '' : 'NOT NULL',
        column.key === 'PRI' ? 'PRIMARY KEY' : '',
        column.extra,
      ]
        .filter(Boolean)
        .join(' ');
      const comment = column.comment ? ` -- ${column.comment}` : '';
      return `  ${column.name} ${column.type}${flags ? ` ${flags}` : ''}${comment}`;
    })
    .join('\n');

  return `-- ${table.tableName}\nCREATE TABLE ${table.tableName} (\n${columnDefs}\n);`;
}

// 전체 스키마 정보 조회 (캐시용)
export async function getFullSchema(): Promise<string> {
  const catalog = await getMySQLSchemaCatalog();
  return catalog.map((table) => formatTableSchema(table)).join('\n\n');
}

function uniqueTerms(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeSchemaSearchText(value);
    if (!normalized || normalized.length < 2 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function tokenizeTerms(values: string[]): string[] {
  return uniqueTerms(values.flatMap((value) => normalizeSchemaSearchText(value).split(' ')));
}

function scoreTableAgainstTerms(
  table: TableSchemaMeta,
  searchTerms: string[],
  tableCandidates: string[],
  columnCandidates: string[]
): SchemaSearchResult | null {
  const normalizedTableName = normalizeSchemaSearchText(table.tableName);
  const matchedTerms = new Set<string>();
  const matchedColumns = new Set<string>();
  let score = 0;

  for (const candidate of uniqueTerms(tableCandidates)) {
    if (normalizedTableName === candidate) {
      matchedTerms.add(candidate);
      score += 160;
    } else if (normalizedTableName.includes(candidate)) {
      matchedTerms.add(candidate);
      score += 100;
    }
  }

  for (const candidate of uniqueTerms(columnCandidates)) {
    for (const column of table.columns) {
      const normalizedColumnName = normalizeSchemaSearchText(column.name);
      if (normalizedColumnName === candidate) {
        matchedColumns.add(column.name);
        score += 70;
      } else if (normalizedColumnName.includes(candidate)) {
        matchedColumns.add(column.name);
        score += 35;
      }
    }
  }

  for (const term of tokenizeTerms(searchTerms)) {
    if (normalizedTableName.includes(term)) {
      matchedTerms.add(term);
      score += 45;
    } else if (table.searchableText.includes(term)) {
      matchedTerms.add(term);
      score += 16;
    }

    for (const column of table.columns) {
      const normalizedColumnName = normalizeSchemaSearchText(column.name);
      if (normalizedColumnName === term) {
        matchedColumns.add(column.name);
        score += 35;
      } else if (normalizedColumnName.includes(term)) {
        matchedColumns.add(column.name);
        score += 18;
      }
    }
  }

  if (score <= 0) {
    return null;
  }

  return {
    tableName: table.tableName,
    score,
    matchedTerms: Array.from(matchedTerms),
    matchedColumns: Array.from(matchedColumns),
    columns: table.columns,
  };
}

function buildSearchResultFromTable(
  table: TableSchemaMeta,
  score: number,
  matchedTerms: string[]
): SchemaSearchResult {
  return {
    tableName: table.tableName,
    score,
    matchedTerms,
    matchedColumns: [],
    columns: table.columns,
  };
}

function inferSchemaRelations(tables: SchemaSearchResult[]): string[] {
  const results: string[] = [];

  for (const sourceTable of tables) {
    for (const targetTable of tables) {
      if (sourceTable.tableName === targetTable.tableName) {
        continue;
      }

      const targetHasNo = targetTable.columns.some((column) => column.name === 'no');
      const targetHasId = targetTable.columns.some((column) => column.name === 'id');

      for (const column of sourceTable.columns) {
        if (targetHasNo && column.name === `${targetTable.tableName}_no`) {
          results.push(
            `${sourceTable.tableName}.${column.name} -> ${targetTable.tableName}.no`
          );
        } else if (targetHasId && column.name === `${targetTable.tableName}_id`) {
          results.push(
            `${sourceTable.tableName}.${column.name} -> ${targetTable.tableName}.id`
          );
        }
      }
    }
  }

  return Array.from(new Set(results));
}

function buildBooleanHints(tables: SchemaSearchResult[]): string[] {
  const allColumnNames = new Set(
    tables.flatMap((table) => table.columns.map((column) => column.name))
  );
  const hints: string[] = [];

  if (allColumnNames.has('del_yn')) {
    hints.push(`del_yn: 일반적으로 'N'은 활성/미삭제, 'Y'는 삭제를 뜻합니다.`);
  }

  if (Array.from(allColumnNames).some((column) => column.endsWith('_yn'))) {
    hints.push(`*_yn 컬럼은 일반적으로 'Y'/'N' 플래그입니다.`);
  }

  return hints;
}

export async function getMySQLSchemaCatalog(): Promise<TableSchemaMeta[]> {
  const now = Date.now();
  if (!schemaCatalogCache || now - schemaCacheTime > CACHE_TTL) {
    schemaCatalogCache = await loadSchemaCatalog();
    schemaCache = schemaCatalogCache
      .map((table) => formatTableSchema(table))
      .join('\n\n');
    schemaCacheTime = now;
    console.log(`[MySQL] Schema cached: ${schemaCache.length} chars`);
  }

  return schemaCatalogCache;
}

export async function searchMySQLSchema(options: {
  question: string;
  searchTerms?: string[];
  tableCandidates?: string[];
  columnCandidates?: string[];
  limit?: number;
}): Promise<SchemaSearchResult[]> {
  const catalog = await getMySQLSchemaCatalog();
  const searchTerms = [
    options.question,
    ...(options.searchTerms ?? []),
    ...(options.tableCandidates ?? []),
    ...(options.columnCandidates ?? []),
  ];
  const exactTableMatches = uniqueTerms(options.tableCandidates ?? [])
    .map((candidate) => {
      const exactTable = catalog.find(
        (table) => normalizeSchemaSearchText(table.tableName) === candidate
      );
      if (!exactTable) {
        return null;
      }

      return buildSearchResultFromTable(exactTable, 3000, [`exact:${candidate}`]);
    })
    .filter((value): value is SchemaSearchResult => value !== null);

  const scoredResults = catalog
    .map((table) =>
      scoreTableAgainstTerms(
        table,
        searchTerms,
        options.tableCandidates ?? [],
        options.columnCandidates ?? []
      )
    )
    .filter((value): value is SchemaSearchResult => value !== null)
    .sort((left, right) => right.score - left.score);

  const mergedResults = [...exactTableMatches, ...scoredResults];
  const dedupedResults: SchemaSearchResult[] = [];
  const seenTables = new Set<string>();

  for (const result of mergedResults) {
    if (seenTables.has(result.tableName)) {
      continue;
    }

    seenTables.add(result.tableName);
    dedupedResults.push(result);

    if (dedupedResults.length >= (options.limit ?? 5)) {
      break;
    }
  }

  return dedupedResults;
}

export function buildSchemaContextFromSearchResults(
  results: SchemaSearchResult[]
): string {
  const sections: string[] = ['# 스키마 탐색 결과'];

  for (const result of results) {
    sections.push(`## ${result.tableName}`);
    sections.push(
      `매칭 근거: terms=[${result.matchedTerms.join(', ')}] columns=[${result.matchedColumns.join(', ')}]`
    );
    sections.push('컬럼:');
    sections.push(
      result.columns
        .map((column) => {
          const flags = [
            column.nullable ? 'NULL' : 'NOT NULL',
            column.key || '',
            column.extra || '',
          ]
            .filter(Boolean)
            .join(' ');
          const comment = column.comment ? ` // ${column.comment}` : '';
          return `- ${column.name}: ${column.type}${flags ? ` (${flags})` : ''}${comment}`;
        })
        .join('\n')
    );
  }

  const relationHints = inferSchemaRelations(results);
  if (relationHints.length > 0) {
    sections.push('## 추정 관계');
    sections.push(relationHints.map((hint) => `- ${hint}`).join('\n'));
  }

  const booleanHints = buildBooleanHints(results);
  if (booleanHints.length > 0) {
    sections.push('## 컬럼 힌트');
    sections.push(booleanHints.map((hint) => `- ${hint}`).join('\n'));
  }

  return `${sections.join('\n\n')}\n`;
}

// SQL 쿼리 실행 (SELECT만 허용)
export async function executeQuery(sql: string): Promise<{ rows: any[]; fields: any[] }> {
  // SELECT 문만 허용 (안전성)
  const trimmedSql = sql.trim();
  if (!/^(SELECT|SHOW|DESCRIBE|WITH|EXPLAIN)\b/i.test(trimmedSql)) {
    throw new Error('읽기 전용: SELECT, SHOW, DESCRIBE, WITH, EXPLAIN 문만 실행 가능합니다.');
  }

  try {
    const [rows, fields] = await pool.query(sql);
    return {
      rows: rows as any[],
      fields: (fields as any[]).map(f => ({ name: f.name, type: f.type }))
    };
  } catch (error: any) {
    throw new Error(`쿼리 실행 오류: ${error.message}`);
  }
}

// 스키마 캐시
let schemaCache: string | null = null;
let schemaCatalogCache: TableSchemaMeta[] | null = null;
let schemaCacheTime: number = 0;
const CACHE_TTL = 1000 * 60 * 10; // 10분

export async function getCachedMySQLSchema(): Promise<string> {
  const now = Date.now();
  if (!schemaCache || now - schemaCacheTime > CACHE_TTL) {
    await getMySQLSchemaCatalog();
  }
  return schemaCache ?? '';
}

// 연결 테스트
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('[MySQL] Connection test failed:', error);
    return false;
  }
}
