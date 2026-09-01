import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.FINDAM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.FINDAM_ADMIN_PASSWORD;
  const firstName = process.env.FINDAM_ADMIN_FIRST_NAME?.trim() || 'Findam';
  const lastName =
    process.env.FINDAM_ADMIN_LAST_NAME?.trim() || 'Administrator';

  if (!email || !email.includes('@')) {
    throw new Error('FINDAM_ADMIN_EMAIL must be a valid email address');
  }
  if (!password || password.length < 12 || password.length > 72) {
    throw new Error(
      'FINDAM_ADMIN_PASSWORD must contain between 12 and 72 characters',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === Role.ADMIN) {
      console.log(`Administrator ${email} already exists; no changes made.`);
      return;
    }
    throw new Error(
      `Account ${email} already exists and was not promoted automatically.`,
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`Administrator ${email} created.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
