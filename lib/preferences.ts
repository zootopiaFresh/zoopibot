import { prisma } from './db';

export interface UserPreferenceData {
  sqlKeywordCase: 'uppercase' | 'lowercase';
  aliasStyle: 'short' | 'meaningful';
  indentation: '2spaces' | '4spaces' | 'tab';
  explanationDetail: 'brief' | 'detailed';
  responseTone: 'formal' | 'casual';
}

const DEFAULT_PREFERENCE: UserPreferenceData = {
  sqlKeywordCase: 'uppercase',
  aliasStyle: 'meaningful',
  indentation: '2spaces',
  explanationDetail: 'detailed',
  responseTone: 'formal',
};

export async function getUserPreference(userId: string): Promise<UserPreferenceData> {
  const pref = await prisma.userPreference.findUnique({
    where: { userId },
  });

  return pref ? {
    sqlKeywordCase: pref.sqlKeywordCase as 'uppercase' | 'lowercase',
    aliasStyle: pref.aliasStyle as 'short' | 'meaningful',
    indentation: pref.indentation as '2spaces' | '4spaces' | 'tab',
    explanationDetail: pref.explanationDetail as 'brief' | 'detailed',
    responseTone: pref.responseTone as 'formal' | 'casual',
  } : DEFAULT_PREFERENCE;
}

export async function saveUserPreference(
  userId: string,
  data: Partial<UserPreferenceData>
): Promise<UserPreferenceData> {
  const pref = await prisma.userPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...DEFAULT_PREFERENCE, ...data },
  });

  return {
    sqlKeywordCase: pref.sqlKeywordCase as 'uppercase' | 'lowercase',
    aliasStyle: pref.aliasStyle as 'short' | 'meaningful',
    indentation: pref.indentation as '2spaces' | '4spaces' | 'tab',
    explanationDetail: pref.explanationDetail as 'brief' | 'detailed',
    responseTone: pref.responseTone as 'formal' | 'casual',
  };
}

export function buildStylePrompt(pref: UserPreferenceData): string {
  const keywordStyle = pref.sqlKeywordCase === 'uppercase'
    ? 'SQL 키워드는 대문자로 작성 (SELECT, FROM, WHERE 등)'
    : 'SQL 키워드는 소문자로 작성 (select, from, where 등)';

  const aliasStyle = pref.aliasStyle === 'short'
    ? '테이블 별칭은 짧게 (t1, t2, u, o 등)'
    : '테이블 별칭은 의미있게 (users u, orders o 등)';

  const indentStyle = {
    '2spaces': '들여쓰기는 2칸 공백',
    '4spaces': '들여쓰기는 4칸 공백',
    'tab': '들여쓰기는 탭 문자',
  }[pref.indentation];

  const detailStyle = pref.explanationDetail === 'brief'
    ? '설명은 간략하게 1-2문장으로'
    : '설명은 상세하게 (쿼리 동작, 주의사항 포함)';

  const toneStyle = pref.responseTone === 'formal'
    ? '격식체 (~습니다, ~입니다)'
    : '비격식체 (~해요, ~예요)';

  return `## 스타일 가이드
- ${keywordStyle}
- ${aliasStyle}
- ${indentStyle}
- ${detailStyle}
- ${toneStyle}`;
}

export { DEFAULT_PREFERENCE };
