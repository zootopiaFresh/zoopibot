import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin';
import { prisma } from '@/lib/db';
import { invalidateSchemaCache } from '@/lib/schema';

// GET: 스키마 프롬프트 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const prompt = await prisma.schemaPrompt.findUnique({
      where: { id: params.id },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: '스키마 프롬프트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Schema prompt fetch error:', error);
    return NextResponse.json(
      { error: '스키마 프롬프트 조회 실패' },
      { status: 500 }
    );
  }
}

// PUT: 스키마 프롬프트 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, content, isActive } = body;

    // 존재 확인
    const existing = await prisma.schemaPrompt.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: '스키마 프롬프트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const updateData: {
      name?: string;
      content?: string;
      isActive?: boolean;
    } = {};

    // 이름 수정
    if (name !== undefined) {
      if (typeof name !== 'string' || !name) {
        return NextResponse.json(
          { error: '이름은 필수입니다' },
          { status: 400 }
        );
      }

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

      // 이름 변경 시 중복 체크
      if (name !== existing.name) {
        const duplicate = await prisma.schemaPrompt.findUnique({
          where: { name },
        });

        if (duplicate) {
          return NextResponse.json(
            { error: '이미 존재하는 이름입니다' },
            { status: 409 }
          );
        }
      }

      updateData.name = name;
    }

    // 내용 수정
    if (content !== undefined) {
      if (typeof content !== 'string' || !content) {
        return NextResponse.json(
          { error: '내용은 필수입니다' },
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

      updateData.content = content;
    }

    // 활성화 상태 수정
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json(
          { error: 'isActive는 boolean이어야 합니다' },
          { status: 400 }
        );
      }

      updateData.isActive = isActive;
    }

    // 수정할 내용이 없으면 에러
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '수정할 내용이 없습니다' },
        { status: 400 }
      );
    }

    const prompt = await prisma.schemaPrompt.update({
      where: { id: params.id },
      data: updateData,
    });

    // 캐시 무효화
    invalidateSchemaCache();

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    console.error('Schema prompt update error:', error);
    return NextResponse.json(
      { error: '스키마 프롬프트 수정 실패' },
      { status: 500 }
    );
  }
}

// DELETE: 스키마 프롬프트 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // 존재 확인
    const existing = await prisma.schemaPrompt.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: '스키마 프롬프트를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    await prisma.schemaPrompt.delete({
      where: { id: params.id },
    });

    // 캐시 무효화
    invalidateSchemaCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schema prompt delete error:', error);
    return NextResponse.json(
      { error: '스키마 프롬프트 삭제 실패' },
      { status: 500 }
    );
  }
}
