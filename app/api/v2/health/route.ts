import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { testConnection } from '@/lib/mysql';

export async function GET() {
  try {
    // SQLite (Prisma) 연결 체크
    let dbOk = false;
    try {
      await prisma.user.count();
      dbOk = true;
    } catch {
      dbOk = false;
    }

    // MySQL 연결 체크
    const mysqlOk = await testConnection();

    // Claude CLI 체크
    let claudeOk = false;
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      await execAsync('which claude', { timeout: 5000 });
      claudeOk = true;
    } catch {
      claudeOk = false;
    }

    const allOk = dbOk && mysqlOk && claudeOk;

    return NextResponse.json(
      {
        status: allOk ? 'ok' : 'degraded',
        db: dbOk,
        mysql: mysqlOk,
        claude: claudeOk,
        timestamp: new Date().toISOString(),
      },
      { status: allOk ? 200 : 503 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: error.message },
      { status: 500 }
    );
  }
}
