import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin';
import { invalidateSchemaCache } from '@/lib/schema';

// POST: 스키마 캐시 무효화
export async function POST() {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    invalidateSchemaCache();

    return NextResponse.json({
      success: true,
      message: '스키마 캐시가 무효화되었습니다',
    });
  } catch (error) {
    console.error('Schema cache invalidate error:', error);
    return NextResponse.json(
      { error: '캐시 무효화 실패' },
      { status: 500 }
    );
  }
}
