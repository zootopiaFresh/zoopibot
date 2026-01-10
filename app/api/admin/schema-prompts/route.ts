import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { invalidateSchemaCache } from '@/lib/schema';

// GET: 스키마 프롬프트 목록 조회
export async function GET() {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const prompts = await prisma.schemaPrompt.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        content: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Schema prompts fetch error:', error);
    return NextResponse.json(
      { error: '스키마 프롬프트 목록 조회 실패' },
      { status: 500 }
    );
  }
}

// POST: 스키마 프롬프트 생성
export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, content } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: '이름은 필수입니다' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: '내용은 필수입니다' },
        { status: 400 }
      );
    }

    // 이름 형식 검증 (영문, 숫자, 하이픈만)
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return NextResponse.json(
        { error: '이름은 영문, 숫자, 하이픈만 사용 가능합니다' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: '이름은 50자 이하여야 합니다' },
        { status: 400 }
      );
    }

    if (content.length < 10) {
      return NextResponse.json(
        { error: '내용은 10자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    if (content.length > 100 * 1024) {
      return NextResponse.json(
        { error: '내용은 100KB 이하여야 합니다' },
        { status: 400 }
      );
    }

    // 중복 체크
    const existing = await prisma.schemaPrompt.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 이름입니다' },
        { status: 409 }
      );
    }

    const prompt = await prisma.schemaPrompt.create({
      data: {
        name,
        content,
        isActive: true,
      },
    });

    // 캐시 무효화
    invalidateSchemaCache();

    return NextResponse.json({ success: true, prompt }, { status: 201 });
  } catch (error) {
    console.error('Schema prompt create error:', error);
    return NextResponse.json(
      { error: '스키마 프롬프트 생성 실패' },
      { status: 500 }
    );
  }
}
