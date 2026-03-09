import { NextRequest, NextResponse } from 'next/server';
import { validateServiceToken, unauthorizedResponse } from '@/lib/service-auth';
import { runClaudeCLI } from '@/lib/claude';
import { z } from 'zod';

const requestSchema = z.object({
  question: z.string().default('이 결과를 분석해줘'),
  sql: z.string(),
  data: z.array(z.any()),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateServiceToken(req)) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { question, sql, data } = requestSchema.parse(body);

    // 데이터가 너무 크면 상위 N건만 사용
    const limitedData = data.slice(0, 50);
    const dataPreview = JSON.stringify(limitedData, null, 2);

    const prompt = `당신은 데이터 분석 전문가입니다.
다음 SQL 쿼리 결과를 비즈니스 관점에서 한국어로 해석해주세요.

사용자 요청: ${question}

실행한 SQL:
\`\`\`sql
${sql}
\`\`\`

조회 결과 (총 ${data.length}행${data.length > 50 ? ', 상위 50행만 표시' : ''}):
${dataPreview}

다음 사항을 포함해서 분석해주세요:
1. 핵심 수치와 의미
2. 주목할 만한 패턴이나 트렌드
3. 비즈니스적 시사점 (있다면)

간결하고 이해하기 쉽게 한국어로 작성해주세요.`;

    const interpretation = await runClaudeCLI(prompt);

    return NextResponse.json({ interpretation });
  } catch (error: any) {
    console.error('[v2/interpret] Error:', error);
    return NextResponse.json({ error: error.message || '해석 실패' }, { status: 500 });
  }
}
