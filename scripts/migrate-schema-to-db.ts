import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const schemaDir = path.join(process.cwd(), 'schema');

  // schema 폴더의 모든 .md 파일 읽기
  const files = await fs.readdir(schemaDir);

  const mdFiles = files
    .filter((f) => f.endsWith('.md'))
    .sort(); // 01-member.md, 02-pet.md 순서로 정렬

  console.log(`Found ${mdFiles.length} schema files\n`);

  let created = 0;
  let skipped = 0;

  for (const file of mdFiles) {
    const name = file.replace('.md', ''); // 01-member.md -> 01-member
    const filePath = path.join(schemaDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

    // 이미 존재하는지 확인
    const existing = await prisma.schemaPrompt.findUnique({
      where: { name },
    });

    if (existing) {
      console.log(`⏭️  Skipping "${name}" (already exists)`);
      skipped++;
      continue;
    }

    // 새로 생성
    await prisma.schemaPrompt.create({
      data: {
        name,
        content,
        isActive: true,
      },
    });

    console.log(`✅ Migrated: "${name}"`);
    created++;
  }

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${mdFiles.length}`);
  console.log('========================================\n');
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
