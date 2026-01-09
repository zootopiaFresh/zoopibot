import { prisma } from './db';

export interface DomainTermData {
  id: string;
  term: string;
  mapping: string;
  description: string | null;
}

export interface BusinessRuleData {
  id: string;
  name: string;
  condition: string;
  scope: string;
  isActive: boolean;
  isLearned: boolean;
}

export async function getUserContext(userId: string) {
  const [terms, rules] = await Promise.all([
    prisma.domainTerm.findMany({ where: { userId } }),
    prisma.businessRule.findMany({ where: { userId, isActive: true } }),
  ]);

  return { terms, rules };
}

export async function getDomainTerms(userId: string): Promise<DomainTermData[]> {
  return prisma.domainTerm.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createDomainTerm(
  userId: string,
  data: { term: string; mapping: string; description?: string }
): Promise<DomainTermData> {
  return prisma.domainTerm.create({
    data: { userId, ...data },
  });
}

export async function updateDomainTerm(
  id: string,
  userId: string,
  data: { term?: string; mapping?: string; description?: string }
): Promise<DomainTermData | null> {
  const term = await prisma.domainTerm.findFirst({
    where: { id, userId },
  });
  if (!term) return null;

  return prisma.domainTerm.update({
    where: { id },
    data,
  });
}

export async function deleteDomainTerm(id: string, userId: string): Promise<boolean> {
  const term = await prisma.domainTerm.findFirst({
    where: { id, userId },
  });
  if (!term) return false;

  await prisma.domainTerm.delete({ where: { id } });
  return true;
}

export async function getBusinessRules(userId: string): Promise<BusinessRuleData[]> {
  return prisma.businessRule.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createBusinessRule(
  userId: string,
  data: { name: string; condition: string; scope?: string }
): Promise<BusinessRuleData> {
  return prisma.businessRule.create({
    data: { userId, ...data },
  });
}

export async function updateBusinessRule(
  id: string,
  userId: string,
  data: { name?: string; condition?: string; scope?: string; isActive?: boolean }
): Promise<BusinessRuleData | null> {
  const rule = await prisma.businessRule.findFirst({
    where: { id, userId },
  });
  if (!rule) return null;

  return prisma.businessRule.update({
    where: { id },
    data,
  });
}

export async function deleteBusinessRule(id: string, userId: string): Promise<boolean> {
  const rule = await prisma.businessRule.findFirst({
    where: { id, userId },
  });
  if (!rule) return false;

  await prisma.businessRule.delete({ where: { id } });
  return true;
}

export function buildContextPrompt(
  terms: { term: string; mapping: string; description?: string | null }[],
  rules: { name: string; condition: string; scope: string }[]
): string {
  let prompt = '';

  if (terms.length > 0) {
    prompt += '\n\n## 도메인 용어집\n';
    prompt += '다음 비즈니스 용어가 언급되면 해당 DB 매핑을 사용하세요:\n';
    for (const t of terms) {
      prompt += `- "${t.term}" → ${t.mapping}`;
      if (t.description) prompt += ` (${t.description})`;
      prompt += '\n';
    }
  }

  if (rules.length > 0) {
    prompt += '\n\n## 비즈니스 규칙 (자동 적용)\n';
    prompt += '다음 조건을 쿼리에 자동으로 적용하세요:\n';
    for (const r of rules) {
      const scopeNote = r.scope === 'global' ? '전체' : `${r.scope} 테이블`;
      prompt += `- ${r.name}: ${r.condition} (적용: ${scopeNote})\n`;
    }
  }

  return prompt;
}
