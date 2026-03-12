import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

interface ScriptOptions {
  email: string;
  password?: string;
  name?: string;
}

function parseArgs(argv: string[]): ScriptOptions {
  const options: Partial<ScriptOptions> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--email' && next) {
      options.email = next;
      index += 1;
      continue;
    }

    if (arg === '--password' && next) {
      options.password = next;
      index += 1;
      continue;
    }

    if (arg === '--name' && next) {
      options.name = next;
      index += 1;
    }
  }

  const email = options.email ?? process.env.ADMIN_EMAIL ?? 'admin@zoopibot.local';
  if (!email) {
    throw new Error('관리자 이메일이 필요합니다. --email 또는 ADMIN_EMAIL을 지정하세요.');
  }

  return {
    email,
    password: options.password ?? process.env.ADMIN_PASSWORD,
    name: options.name ?? process.env.ADMIN_NAME,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const existingUser = await prisma.user.findUnique({
    where: { email: options.email },
  });

  const generatedPassword = !existingUser && !options.password
    ? randomBytes(12).toString('base64url')
    : undefined;
  const passwordToUse = options.password ?? generatedPassword;

  const updateData: {
    name?: string;
    password?: string;
    role: string;
    status: string;
  } = {
    role: 'admin',
    status: 'active',
  };

  if (options.name) {
    updateData.name = options.name;
  }

  if (passwordToUse) {
    updateData.password = await bcrypt.hash(passwordToUse, 10);
  }

  const createData = {
    email: options.email,
    name: options.name ?? options.email.split('@')[0],
    password: updateData.password ?? (await bcrypt.hash(randomBytes(12).toString('base64url'), 10)),
    role: 'admin',
    status: 'active',
  };

  const user = await prisma.user.upsert({
    where: { email: options.email },
    update: updateData,
    create: createData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(existingUser ? '관리자 계정을 업데이트했습니다.' : '관리자 계정을 생성했습니다.');
  console.log(`email: ${user.email}`);
  console.log(`name: ${user.name ?? ''}`);
  console.log(`role: ${user.role}`);
  console.log(`status: ${user.status}`);

  if (generatedPassword) {
    console.log(`temporaryPassword: ${generatedPassword}`);
  } else if (options.password) {
    console.log('temporaryPassword: (provided via argument/env)');
  } else {
    console.log('temporaryPassword: (unchanged)');
  }
}

main()
  .catch((error) => {
    console.error('관리자 계정 생성 실패:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
