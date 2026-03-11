import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { testConnection } from '@/lib/mysql';
import { getAIBackendMode, testOpenClawConnection } from '@/lib/openclaw';

export async function GET() {
  try {
    const aiBackend = getAIBackendMode();

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

    // AI 백엔드 체크
    let aiOk = false;
    if (aiBackend === 'openclaw') {
      aiOk = await testOpenClawConnection();
    } else {
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        await execAsync('which claude', { timeout: 5000 });
        aiOk = true;
      } catch {
        aiOk = false;
      }
    }

    const allOk = dbOk && mysqlOk && aiOk;

    return NextResponse.json(
      {
        status: allOk ? 'ok' : 'degraded',
        aiBackend,
        ai: aiOk,
        db: dbOk,
        mysql: mysqlOk,
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
