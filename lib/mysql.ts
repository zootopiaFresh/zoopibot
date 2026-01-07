import mysql from 'mysql2/promise';

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
export async function describeTable(tableName: string): Promise<any[]> {
  const [rows] = await pool.query(`DESCRIBE \`${tableName}\``);
  return rows as any[];
}

// 전체 스키마 정보 조회 (캐시용)
export async function getFullSchema(): Promise<string> {
  try {
    const tables = await listTables();
    const schemaInfo: string[] = [];

    for (const table of tables) {
      const columns = await describeTable(table);
      const columnDefs = columns.map((col: any) =>
        `  ${col.Field} ${col.Type}${col.Null === 'NO' ? ' NOT NULL' : ''}${col.Key === 'PRI' ? ' PRIMARY KEY' : ''}`
      ).join('\n');

      schemaInfo.push(`-- ${table}\nCREATE TABLE ${table} (\n${columnDefs}\n);`);
    }

    return schemaInfo.join('\n\n');
  } catch (error) {
    console.error('[MySQL] Schema fetch error:', error);
    throw error;
  }
}

// SQL 쿼리 실행 (SELECT만 허용)
export async function executeQuery(sql: string): Promise<{ rows: any[]; fields: any[] }> {
  // SELECT 문만 허용 (안전성)
  const trimmedSql = sql.trim().toUpperCase();
  if (!trimmedSql.startsWith('SELECT') && !trimmedSql.startsWith('SHOW') && !trimmedSql.startsWith('DESCRIBE')) {
    throw new Error('읽기 전용: SELECT, SHOW, DESCRIBE 문만 실행 가능합니다.');
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
let schemaCacheTime: number = 0;
const CACHE_TTL = 1000 * 60 * 10; // 10분

export async function getCachedMySQLSchema(): Promise<string> {
  const now = Date.now();
  if (!schemaCache || now - schemaCacheTime > CACHE_TTL) {
    schemaCache = await getFullSchema();
    schemaCacheTime = now;
    console.log(`[MySQL] Schema cached: ${schemaCache.length} chars`);
  }
  return schemaCache;
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
