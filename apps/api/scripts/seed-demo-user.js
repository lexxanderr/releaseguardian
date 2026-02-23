/* scripts/seed-demo-user.js */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const email = process.env.DEMO_USER_EMAIL || 'demo@releaseguardian.local';
  const role = process.env.DEMO_USER_ROLE || 'OFFICER';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      role,
      passwordHash: 'demo-password-hash',
    },
    select: { id: true, email: true, role: true },
  });

  console.log('DEMO_USER:', user);
  console.log('Set this on Render as DEV_ACTOR_ID:', user.id);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});