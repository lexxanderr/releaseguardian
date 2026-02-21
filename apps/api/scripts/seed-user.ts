import { PrismaClient , Role } from '@prisma/client';
import { randomUUID } from 'crypto';


const prisma = new PrismaClient();

async function main() {
  const id = randomUUID();

  const user = await prisma.user.create({
    data: {
  id,
  email: 'officer@releaseguardian.dev',
  role: 'OFFICER',
  passwordHash: 'dev-placeholder-hash',
}

  });

  console.log('DEV USER CREATED');
  console.log('ID:', user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
