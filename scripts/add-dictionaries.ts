/**
 * 테이블 관계 사전과 ENUM 사전을 DB에 추가하는 스크립트
 * 실행: npm run db:seed:dict
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('📚 사전 파일을 DB에 추가합니다...\n');

  const schemaDir = path.resolve(__dirname, '../schema');

  // 추가할 스키마 및 사전 파일 목록
  const dictionaries = [
    // 사전 (우선 로드)
    { name: '00-enums', file: '00-enums.md', description: 'ENUM/상태값 사전' },
    { name: '00-relations', file: '00-relations.md', description: '테이블 관계 사전' },
    // 도메인별 스키마
    { name: '01-member', file: '01-member.md', description: '회원 스키마' },
    { name: '02-pet', file: '02-pet.md', description: '반려동물 스키마' },
    { name: '03-item', file: '03-item.md', description: '상품 스키마' },
    { name: '04-order', file: '04-order.md', description: '주문 스키마' },
    { name: '05-subscribe', file: '05-subscribe.md', description: '구독 스키마' },
    { name: '06-coupon', file: '06-coupon.md', description: '쿠폰/포인트 스키마' },
    { name: '07-event', file: '07-event.md', description: '이벤트 스키마' },
    { name: '08-content', file: '08-content.md', description: '콘텐츠 스키마' },
    { name: '09-review', file: '09-review.md', description: '리뷰 스키마' },
    { name: '10-delivery', file: '10-delivery.md', description: '배송 스키마' },
    { name: '11-alarm', file: '11-alarm.md', description: '알림 스키마' },
    { name: '12-partner', file: '12-partner.md', description: '파트너 스키마' },
    { name: '13-system', file: '13-system.md', description: '시스템 스키마' },
    { name: '99-vip', file: '99-vip.md', description: 'VIP/테스트 스키마' },
  ];

  for (const dict of dictionaries) {
    const filePath = path.join(schemaDir, dict.file);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // upsert로 추가 또는 업데이트
    const result = await prisma.schemaPrompt.upsert({
      where: { name: dict.name },
      update: {
        content,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        name: dict.name,
        content,
        isActive: true,
      },
    });

    console.log(`✅ ${dict.description} (${dict.name})`);
    console.log(`   - ID: ${result.id}`);
    console.log(`   - 크기: ${content.length.toLocaleString()} 자`);
    console.log('');
  }

  // 캐시 무효화를 위한 안내
  console.log('🔄 스키마 캐시를 무효화하려면:');
  console.log('   POST /api/admin/schema-prompts/invalidate-cache');
  console.log('');

  // 현재 등록된 스키마 프롬프트 목록 출력
  const allPrompts = await prisma.schemaPrompt.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { name: true, isActive: true },
  });

  console.log('📋 현재 등록된 스키마 프롬프트:');
  for (const p of allPrompts) {
    console.log(`   - ${p.name} ${p.isActive ? '✓' : '✗'}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
